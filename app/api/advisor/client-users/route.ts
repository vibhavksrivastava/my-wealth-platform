import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { verifyAuthHeader } from "@/lib/auth";

export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || !["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // 1. Fetch all users with role 'CLIENT' in this tenant
    let usersQuery = supabaseAdmin
      .from("users")
      .select("id, email, first_name, last_name, phone_number, created_at")
      .eq("role", "CLIENT")
      .order("created_at", { ascending: false });

    if (session.role !== "SUPER_ADMIN" && session.tenantId) {
      usersQuery = usersQuery.eq("tenant_id", session.tenantId);
    }
    const { data: clientUsers, error: usersErr } = await usersQuery;
    if (usersErr) throw usersErr;

    // 2. Fetch all clients in this tenant to identify linked users
    let clientsQuery = supabaseAdmin
      .from("clients")
      .select("client_id, user_id, full_name");

    if (session.role !== "SUPER_ADMIN" && session.tenantId) {
      clientsQuery = clientsQuery.eq("tenant_id", session.tenantId);
    }
    const { data: clientsData } = await clientsQuery;

    const linkedUserIds = new Set((clientsData || []).map((c) => c.user_id).filter(Boolean));

    const enrichedUsers = (clientUsers || []).map((u) => {
      const isLinked = linkedUserIds.has(u.id);
      const linkedClient = isLinked ? (clientsData || []).find((c) => c.user_id === u.id) : null;
      return {
        ...u,
        fullName: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email,
        isLinked,
        linkedClientId: linkedClient?.client_id || null,
        linkedClientName: linkedClient?.full_name || null,
      };
    });

    const unlinkedUsers = enrichedUsers.filter((u) => !u.isLinked);

    return NextResponse.json({
      clientUsers: enrichedUsers,
      unlinkedUsers,
    });
  } catch (error: any) {
    console.error("Advisor client-users GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch client users." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || !["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json();
    const { firstName, lastName, email, phoneNumber, password } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Client email address is required." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if email already registered
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id, email, tenant_id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        {
          error: "A user account with this email address already exists.",
          existingUserId: existingUser.id,
        },
        { status: 409 }
      );
    }

    // Default password if none provided
    const rawPassword = password?.trim() || `Client@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const targetTenantId = session.role === "SUPER_ADMIN" ? body.tenantId || session.tenantId : session.tenantId;

    const { data: newUser, error: createErr } = await supabaseAdmin
      .from("users")
      .insert({
        tenant_id: targetTenantId,
        email: cleanEmail,
        password_hash: passwordHash,
        first_name: firstName?.trim() || "",
        last_name: lastName?.trim() || "",
        phone_number: phoneNumber?.trim() || null,
        role: "CLIENT",
        is_active: true,
      })
      .select("id, email, first_name, last_name, phone_number, role, created_at")
      .single();

    if (createErr || !newUser) {
      throw createErr || new Error("Failed to create client user account.");
    }

    return NextResponse.json({
      success: true,
      message: "Client user account created successfully.",
      user: {
        ...newUser,
        fullName: `${newUser.first_name} ${newUser.last_name}`.trim(),
        temporaryPassword: rawPassword,
      },
    });
  } catch (error: any) {
    console.error("Advisor client-users POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create client user." },
      { status: 500 }
    );
  }
}

