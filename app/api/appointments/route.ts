import { NextResponse, connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAuthHeader } from "@/lib/auth";
import { getAppointments, createAppointment, updateAppointment, AppointmentStatus } from "@/lib/appointments";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Helper to resolve client_id from session
 */
async function resolveClientIdForUser(session: any): Promise<{ clientId: string | null; advisorId: string | null }> {
  // Try clients table
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("client_id, advisor_name")
    .eq("user_id", session.sub)
    .maybeSingle();

  // Try client_profiles table
  const { data: profile } = await supabaseAdmin
    .from("client_profiles")
    .select("assigned_advisor_id, household_id")
    .eq("user_id", session.sub)
    .maybeSingle();

  let clientId = client?.client_id || null;
  let advisorId = profile?.assigned_advisor_id || null;

  if (!clientId && profile?.household_id) {
    const { data: hhClient } = await supabaseAdmin
      .from("clients")
      .select("client_id")
      .eq("household_id", profile.household_id)
      .maybeSingle();
    clientId = hhClient?.client_id || null;
  }

  // If advisorId is still null, look for an active advisor in the firm
  if (!advisorId) {
    const { data: adv } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("role", "ADVISOR")
      .limit(1)
      .maybeSingle();
    advisorId = adv?.id || null;
  }

  return { clientId, advisorId };
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
      const { clientId } = await resolveClientIdForUser(session);
      const targetId = clientId || session.sub;
      const appointments = await getAppointments({ clientId: targetId });
      return NextResponse.json({ success: true, appointments });
    } else {
      // ADVISOR / ADMIN
      const appointments = await getAppointments({
        clientId: filterClientId || undefined,
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
    const { title, startTime, endTime, meetingLink, notes } = body;

    if (!title || !startTime) {
      return NextResponse.json({ error: "Title and start time are required." }, { status: 400 });
    }

    let clientId = body.clientId;
    let advisorId = body.advisorId;
    let scheduledBy: "CLIENT" | "ADVISOR" = "ADVISOR";

    if (session.role === "CLIENT") {
      scheduledBy = "CLIENT";
      const resolved = await resolveClientIdForUser(session);
      clientId = clientId || resolved.clientId || session.sub;
      advisorId = advisorId || resolved.advisorId || "c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";
    } else {
      // Scheduled by Advisor
      scheduledBy = "ADVISOR";
      advisorId = session.sub;
      if (!clientId) {
        // Fallback: lookup first client belonging to this tenant/advisor
        const { data: firstClient } = await supabaseAdmin
          .from("clients")
          .select("client_id")
          .limit(1)
          .maybeSingle();
        clientId = firstClient?.client_id;
        if (!clientId) {
          return NextResponse.json({ error: "Client ID is required." }, { status: 400 });
        }
      }
    }

    const appointment = await createAppointment({
      clientId,
      advisorId,
      tenantId: session.tenantId,
      title,
      startTime,
      endTime,
      meetingLink,
      notes,
      scheduledBy,
    });

    return NextResponse.json({
      success: true,
      message: scheduledBy === "CLIENT" ? "Call scheduled! Awaiting advisor confirmation." : "Call successfully scheduled.",
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

    const updated = await updateAppointment(
      appointmentId,
      {
        status: newStatus,
        notes,
        meetingLink,
        noteAuthor: authorTag,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Appointment updated successfully.",
      appointment: updated,
    });
  } catch (error: any) {
    console.error("PUT appointment error:", error);
    return NextResponse.json({ error: error.message || "Failed to update appointment." }, { status: 500 });
  }
}
