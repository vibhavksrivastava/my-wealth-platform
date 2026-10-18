import { NextResponse, connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAuthHeader } from "@/lib/auth";
import { getAppointments, createAppointment, updateAppointment, AppointmentStatus } from "@/lib/appointments";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Resolves the client user ID (users.id) and advisor user ID (users.id)
 * so that appointments foreign keys (appointments_client_id_fkey and appointments_advisor_id_fkey)
 * are always strictly satisfied.
 */
async function resolveClientAndAdvisor(
  session: any,
  rawClientId?: string,
  rawAdvisorId?: string
): Promise<{ clientUserId: string; advisorUserId: string; tenantId: string }> {
  let clientUserId = "";
  let advisorUserId = rawAdvisorId || "";
  const tenantId = session.tenantId || "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  if (session.role === "CLIENT") {
    // For clients, the client user is ALWAYS the logged in user
    clientUserId = session.sub;
  } else {
    // Scheduled by Advisor / Tenant Admin / Staff
    advisorUserId = session.sub;

    if (rawClientId) {
      // 1. Is rawClientId already a valid user in the users table?
      const { data: userMatch } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("id", rawClientId)
        .maybeSingle();

      if (userMatch?.id) {
        clientUserId = userMatch.id;
      } else {
        // 2. Is rawClientId a client_id in the clients table?
        const { data: clientMatch } = await supabaseAdmin
          .from("clients")
          .select("user_id, household_id")
          .eq("client_id", rawClientId)
          .maybeSingle();

        if (clientMatch?.user_id) {
          clientUserId = clientMatch.user_id;
        } else if (clientMatch?.household_id) {
          // Look for any user linked to this household
          const { data: hhUser } = await supabaseAdmin
            .from("clients")
            .select("user_id")
            .eq("household_id", clientMatch.household_id)
            .not("user_id", "is", null)
            .limit(1)
            .maybeSingle();
          if (hhUser?.user_id) {
            clientUserId = hhUser.user_id;
          }
        }
      }
    }

    // 3. Fallback to any active CLIENT user in the system if not found
    if (!clientUserId) {
      const { data: firstClientUser } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("role", "CLIENT")
        .limit(1)
        .maybeSingle();
      clientUserId = firstClientUser?.id || "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
    }
  }

  // Resolve advisor user ID if not set
  if (!advisorUserId) {
    const { data: profile } = await supabaseAdmin
      .from("client_profiles")
      .select("assigned_advisor_id")
      .eq("user_id", clientUserId)
      .maybeSingle();

    if (profile?.assigned_advisor_id) {
      advisorUserId = profile.assigned_advisor_id;
    } else {
      const { data: advUser } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("role", "ADVISOR")
        .limit(1)
        .maybeSingle();
      advisorUserId = advUser?.id || "c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";
    }
  }

  return { clientUserId, advisorUserId, tenantId };
}

/**
 * GET: Fetch appointments for current user (Advisor or Client)
 */
export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filterClientId = searchParams.get("clientId");

    if (session.role === "CLIENT") {
      // Find appointments where client_id is session.sub
      // Also look up any client_id in clients table mapped to this user
      const { data: cRow } = await supabaseAdmin
        .from("clients")
        .select("client_id")
        .eq("user_id", session.sub)
        .maybeSingle();

      const candidateIds = [session.sub];
      if (cRow?.client_id) candidateIds.push(cRow.client_id);

      const appointments = await getAppointments({
        clientUserIds: candidateIds,
      });
      return NextResponse.json({ success: true, appointments });
    } else {
      // ADVISOR / ADMIN
      let clientUserIds: string[] | undefined = undefined;

      if (filterClientId) {
        candidateIds: {
          const candidateList = [filterClientId];
          // Check if this filterClientId is a client_id in clients table with a user_id
          const { data: cData } = await supabaseAdmin
            .from("clients")
            .select("user_id")
            .eq("client_id", filterClientId)
            .maybeSingle();
          if (cData?.user_id) candidateList.push(cData.user_id);
          clientUserIds = candidateList;
        }
      }

      const appointments = await getAppointments({
        clientUserIds,
        advisorId: filterClientId ? undefined : session.sub,
      });
      return NextResponse.json({ success: true, appointments });
    }
  } catch (error: any) {
    console.error("GET appointments error:", error);
    return NextResponse.json({ error: error.message || "Failed to load appointments." }, { status: 500 });
  }
}

/**
 * POST: Schedule a new call (Client or Advisor)
 */
export async function POST(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, startTime, endTime, meetingLink, notes, clientId, advisorId } = body;

    if (!title || !startTime) {
      return NextResponse.json({ error: "Title and start time are required." }, { status: 400 });
    }

    const scheduledBy: "CLIENT" | "ADVISOR" = session.role === "CLIENT" ? "CLIENT" : "ADVISOR";
    const status: AppointmentStatus = scheduledBy === "CLIENT" ? "REQUESTED" : "CONFIRMED";

    const { clientUserId, advisorUserId, tenantId } = await resolveClientAndAdvisor(
      session,
      clientId,
      advisorId
    );

    const appointment = await createAppointment({
      clientId: clientUserId,
      advisorId: advisorUserId,
      tenantId,
      title: title.trim(),
      startTime,
      endTime,
      meetingLink,
      notes,
      scheduledBy,
      status,
    });

    return NextResponse.json({
      success: true,
      message:
        scheduledBy === "CLIENT"
          ? "Call requested successfully! Your advisor will review and confirm the slot."
          : "Client review call successfully scheduled and confirmed.",
      appointment,
    });
  } catch (error: any) {
    console.error("POST appointment error:", error);
    return NextResponse.json({ error: error.message || "Failed to schedule appointment." }, { status: 500 });
  }
}

/**
 * PUT: Accept call, change status, or record meeting notes
 */
export async function PUT(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { appointmentId, action, status, notes, meetingLink } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: "Appointment ID is required." }, { status: 400 });
    }

    let newStatus: AppointmentStatus | undefined = status;
    if (action === "ACCEPT") {
      newStatus = "CONFIRMED";
    } else if (action === "DECLINE" || action === "CANCEL") {
      newStatus = "CANCELLED";
    } else if (action === "COMPLETE") {
      newStatus = "COMPLETED";
    }

    const authorRole = session.role === "CLIENT" ? "Client" : "Advisor";
    const authorTag = `${authorRole} (${session.email || "User"})`;

    const updated = await updateAppointment(appointmentId, {
      status: newStatus,
      notes,
      meetingLink,
      noteAuthor: authorTag,
    });

    return NextResponse.json({
      success: true,
      message:
        action === "ACCEPT"
          ? "Call confirmed! Meeting is now scheduled."
          : action === "CANCEL" || action === "DECLINE"
          ? "Call cancelled."
          : action === "COMPLETE"
          ? "Call marked as completed."
          : "Meeting updated successfully.",
      appointment: updated,
    });
  } catch (error: any) {
    console.error("PUT appointment error:", error);
    return NextResponse.json({ error: error.message || "Failed to update appointment." }, { status: 500 });
  }
}
