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
    if (!tenantId) {
      return NextResponse.json(
        { error: "No associated tenant organization found in session." },
        { status: 400 }
      );
    }

    // 1. Fetch Tenant details
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .maybeSingle();

    // 2. Fetch Users of this tenant
    const { data: users } = await supabaseAdmin
      .from("users")
      .select("id, role, first_name, last_name, email, is_active, created_at")
      .eq("tenant_id", tenantId);

    const allUsers = users || [];
    const clientUsers = allUsers.filter((u) => u.role === "CLIENT");
    const advisorUsers = allUsers.filter((u) => u.role === "ADVISOR" || u.role === "STAFF");

    // 3. Fetch Client Profiles for this tenant
    const { data: profiles } = await supabaseAdmin
      .from("client_profiles")
      .select("id, user_id, assigned_advisor_id, total_assets, total_liabilities, net_worth, risk_profile_category, created_at")
      .eq("tenant_id", tenantId);

    const clientProfiles = profiles || [];
    const totalAUM = clientProfiles.reduce((sum, p) => sum + Number(p.total_assets || 0), 0);
    const totalNetWorth = clientProfiles.reduce((sum, p) => sum + Number(p.net_worth || 0), 0);

    // 4. Fetch Clients table for this tenant
    const { data: clients } = await supabaseAdmin
      .from("clients")
      .select("client_id, full_name, user_id, annual_gross_income, risk_profile, created_at")
      .eq("tenant_id", tenantId);

    const allClients = clients || [];
    const clientIds = allClients.map((c) => c.client_id);

    // 5. Calculate Monthly SIP Book from investment_portfolio
    let monthlySIPBook = 0;
    let totalInvestmentsValue = 0;
    if (clientIds.length > 0) {
      const { data: investments } = await supabaseAdmin
        .from("investment_portfolio")
        .select("monthly_sip_amount, current_value")
        .in("client_id", clientIds);

      if (investments) {
        monthlySIPBook = investments.reduce((sum, inv) => sum + Number(inv.monthly_sip_amount || 0), 0);
        totalInvestmentsValue = investments.reduce((sum, inv) => sum + Number(inv.current_value || 0), 0);
      }
    }

    // Aggregate advisor metrics
    const advisorStats = advisorUsers.map((adv) => {
      const assignedProfiles = clientProfiles.filter((p) => p.assigned_advisor_id === adv.id);
      const advAUM = assignedProfiles.reduce((sum, p) => sum + Number(p.total_assets || 0), 0);
      return {
        id: adv.id,
        name: `${adv.first_name} ${adv.last_name}`,
        email: adv.email,
        role: adv.role,
        isActive: adv.is_active,
        clientCount: assignedProfiles.length,
        aum: advAUM,
      };
    });

    return NextResponse.json({
      tenant,
      kpis: {
        totalAUM: totalAUM || totalInvestmentsValue,
        totalNetWorth,
        activeClients: Math.max(clientUsers.length, allClients.length),
        activeAdvisors: advisorUsers.filter((a) => a.is_active).length,
        monthlySIPBook,
      },
      advisors: advisorStats,
      recentClients: allClients.slice(0, 5),
    });
  } catch (error) {
    console.error("Tenant Admin Metrics GET Error:", error);
    return NextResponse.json(
      { error: "Failed to load firm metrics." },
      { status: 500 }
    );
  }
}

