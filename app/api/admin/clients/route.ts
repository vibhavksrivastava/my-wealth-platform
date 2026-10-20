import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";


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

    const tenantId = session.tenantId;

    // 1. Fetch clients from clients table
    const { data: clients, error: clientsErr } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (clientsErr) throw clientsErr;

    // 2. Fetch client_profiles
    const { data: profiles } = await supabaseAdmin
      .from("client_profiles")
      .select("*")
      .eq("tenant_id", tenantId);

    // 3. Fetch advisor users
    const { data: advisors } = await supabaseAdmin
      .from("users")
      .select("id, email, first_name, last_name, role, is_active")
      .eq("tenant_id", tenantId)
      .in("role", ["ADVISOR", "STAFF"]);

    // 4. Fetch client users for email mapping
    const { data: clientUsers } = await supabaseAdmin
      .from("users")
      .select("id, email, phone_number")
      .eq("tenant_id", tenantId)
      .eq("role", "CLIENT");

    const advisorMap = new Map((advisors || []).map((a) => [a.id, a]));
    const profileMapByUser = new Map((profiles || []).map((p) => [p.user_id, p]));
    const userMap = new Map((clientUsers || []).map((u) => [u.id, u]));

    const mergedClients = (clients || []).map((client) => {
      const profile = client.user_id ? profileMapByUser.get(client.user_id) : null;
      const user = client.user_id ? userMap.get(client.user_id) : null;

      const assignedAdvisorId = profile?.assigned_advisor_id || null;
      const assignedAdvisor = assignedAdvisorId ? advisorMap.get(assignedAdvisorId) : null;

      return {
        id: client.client_id,
        profileId: profile?.id || null,
        userId: client.user_id || null,
        fullName: client.full_name,
        email: user?.email || null,
        phone: user?.phone_number || null,
        pan: profile?.pan_number || null,
        annualGrossIncome: client.annual_gross_income || 0,
        riskProfile: profile?.risk_profile_category || client.risk_profile || "Moderate",
        totalAssets: profile?.total_assets || 0,
        totalLiabilities: profile?.total_liabilities || 0,
        netWorth: profile?.net_worth || 0,
        assignedAdvisorId: assignedAdvisorId,
        assignedAdvisorName: assignedAdvisor
          ? `${assignedAdvisor.first_name} ${assignedAdvisor.last_name}`
          : client.advisor_name || "Unassigned",
        reviewFrequency: client.review_frequency || "Annual",
        createdAt: client.created_at,
      };
    });

    return NextResponse.json({
      clients: mergedClients,
      advisors: (advisors || []).map((a) => ({
        id: a.id,
        name: `${a.first_name} ${a.last_name}`,
        email: a.email,
        isActive: a.is_active,
      })),
    });
  } catch (error) {
    console.error("Tenant Admin Clients GET Error:", error);
    return NextResponse.json({ error: "Failed to load clients." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
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
    const { clientId, newAdvisorId } = body;

    if (!clientId) {
      return NextResponse.json({ error: "Client ID is required." }, { status: 400 });
    }

    // Verify client belongs to this tenant
    const { data: client, error: clientErr } = await supabaseAdmin
      .from("clients")
      .select("client_id, user_id, tenant_id, full_name")
      .eq("client_id", clientId)
      .maybeSingle();

    if (clientErr || !client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    if (session.role !== "SUPER_ADMIN" && client.tenant_id !== session.tenantId) {
      return NextResponse.json(
        { error: "Access denied. Client belongs to another firm." },
        { status: 403 }
      );
    }

    let advisorName = null;
    if (newAdvisorId) {
      const { data: advisor } = await supabaseAdmin
        .from("users")
        .select("id, first_name, last_name, tenant_id")
        .eq("id", newAdvisorId)
        .maybeSingle();

      if (!advisor || advisor.tenant_id !== session.tenantId) {
        return NextResponse.json(
          { error: "Selected advisor is not part of your firm." },
          { status: 400 }
        );
      }
      advisorName = `${advisor.first_name} ${advisor.last_name}`;
    }

    // Update clients table advisor_name
    await supabaseAdmin
      .from("clients")
      .update({
        advisor_name: advisorName,
        updated_at: new Date().toISOString(),
      })
      .eq("client_id", clientId);

    // Update client_profiles if user_id exists
    if (client.user_id) {
      await supabaseAdmin
        .from("client_profiles")
        .update({
          assigned_advisor_id: newAdvisorId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", client.user_id)
        .eq("tenant_id", session.tenantId);
    }

    return NextResponse.json({
      success: true,
      message: `Client ${client.full_name} reassigned to ${advisorName || "Unassigned"}.`,
      assignedAdvisorId: newAdvisorId,
      assignedAdvisorName: advisorName,
    });
  } catch (error) {
    console.error("Tenant Admin Clients PATCH Error:", error);
    return NextResponse.json(
      { error: "Failed to reassign advisor." },
      { status: 500 }
    );
  }
}

