import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcrypt";
import { verifyAuthHeader } from "@/lib/auth";
import { checkTenantSeatCapacity } from "@/lib/tenantPlans";


export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || !["TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json(
        { error: "Access denied. Firm Administrator privileges required." },
        { status: 403 }
      );
    }

    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select("id, tenant_id, email, phone_number, role, first_name, last_name, is_active, last_login_at, created_at")
      .eq("tenant_id", session.tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Also get client counts for advisors
    const { data: profiles } = await supabaseAdmin
      .from("client_profiles")
      .select("assigned_advisor_id")
      .eq("tenant_id", session.tenantId);

    const advisorClientCounts: Record<string, number> = {};
    (profiles || []).forEach((p) => {
      if (p.assigned_advisor_id) {
        advisorClientCounts[p.assigned_advisor_id] = (advisorClientCounts[p.assigned_advisor_id] || 0) + 1;
      }
    });

    const enrichedUsers = (users || []).map((u) => ({
      ...u,
      clientCount: advisorClientCounts[u.id] || 0,
    }));

    // Calculate seat usage for this firm
    const seatCapacity = await checkTenantSeatCapacity(session.tenantId);

    return NextResponse.json({
      users: enrichedUsers,
      seatCapacity,
    });
  } catch (error) {
    console.error("Tenant Admin Users GET Error:", error);
    return NextResponse.json({ error: "Failed to load team users." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || !["TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json(
        { error: "Access denied. Firm Administrator privileges required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { firstName, lastName, email, phoneNumber, role, password } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "First name, last name, and email are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const assignedRole = ["ADVISOR", "STAFF", "TENANT_ADMIN"].includes(role) ? role : "ADVISOR";

    // Enforce Plan Seat Limits before adding new team members
    const seatCapacity = await checkTenantSeatCapacity(session.tenantId);
    if (!seatCapacity.canAddSeat) {
      return NextResponse.json(
        {
          error: `Seat limit reached for your ${seatCapacity.planName} (${seatCapacity.currentSeats}/${seatCapacity.maxSeats} active seats used). Please upgrade your plan in Billing & Plans to add more sub-advisors.`,
          code: "SEAT_LIMIT_REACHED",
          seatCapacity,
        },
        { status: 403 }
      );
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: `User with email "${cleanEmail}" already exists.` },
        { status: 409 }
      );
    }

    const initialPassword = password?.trim() || `Advisor@${Math.random().toString(36).slice(-6)}!`;
    const passwordHash = await bcrypt.hash(initialPassword, 10);

    const { data: newUser, error } = await supabaseAdmin
      .from("users")
      .insert({
        tenant_id: session.tenantId,
        email: cleanEmail,
        password_hash: passwordHash,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber ? phoneNumber.trim() : null,
        role: assignedRole,
        is_active: true,
      })
      .select("id, tenant_id, email, phone_number, role, first_name, last_name, is_active, created_at")
      .single();

    if (error || !newUser) {
      console.error("Failed to create user:", error);
      return NextResponse.json(
        { error: error?.message || "Failed to create user account." },
        { status: 500 }
      );
    }

    const updatedSeats = await checkTenantSeatCapacity(session.tenantId);

    return NextResponse.json({
      success: true,
      message: `${assignedRole} account created successfully.`,
      user: newUser,
      temporaryPassword: initialPassword,
      seatCapacity: updatedSeats,
    });
  } catch (error) {
    console.error("Tenant Admin Users POST Error:", error);
    return NextResponse.json(
      { error: "Internal server error while creating user." },
      { status: 500 }
    );
  }
}
