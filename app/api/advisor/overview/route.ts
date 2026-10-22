import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";

export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // 1. Resolve tenant from subdomain header (set by middleware) or user session
    const headerSubdomain = req.headers.get("x-tenant-subdomain");
    let tenantFromSubdomain = null;

    if (headerSubdomain && headerSubdomain !== "platform" && headerSubdomain !== "www") {
      const { data: t } = await supabaseAdmin
        .from("tenants")
        .select("id, subdomain, firm_legal_name, firm_brand_name, logo_url, primary_color, secondary_color, disclaimer_text, arn_number, ria_number, theme_mode, tenant_type, firm_type")
        .eq("subdomain", headerSubdomain.toLowerCase().trim())
        .maybeSingle();
      tenantFromSubdomain = t;
    }

    // 2. Strict Tenant Isolation Check
    if (tenantFromSubdomain && session.role !== "SUPER_ADMIN") {
      if (session.tenantId && session.tenantId !== tenantFromSubdomain.id) {
        return NextResponse.json(
          {
            error: `Cross-Tenant Access Denied: You are signed in with an account from another advisory firm. Please log into ${tenantFromSubdomain.firm_brand_name} directly.`,
            mismatchedTenant: true,
            expectedFirmName: tenantFromSubdomain.firm_brand_name,
            expectedSubdomain: tenantFromSubdomain.subdomain,
          },
          { status: 403 }
        );
      }
    }

    // Determine effective tenant ID for queries
    const activeTenantId = tenantFromSubdomain ? tenantFromSubdomain.id : session.tenantId;

    // 3. Fetch clients table records strictly for THIS tenant
    let clientsQuery = supabaseAdmin
      .from("clients")
      .select("client_id, tenant_id, household_id, uwp_client_code, full_name, annual_gross_income, risk_profile, planning_horizon_years, advisor_name, created_at")
      .order("created_at", { ascending: false });

    if (activeTenantId) {
      clientsQuery = clientsQuery.eq("tenant_id", activeTenantId);
    }
    const { data: clientsList } = await clientsQuery;
    const clientIds = (clientsList || []).map((c) => c.client_id);

    // 4. Fetch client balance sheets & investments directly from actual tables
    let totalInvestments = 0;
    let totalPhysicalAssets = 0;
    let totalLiabilities = 0;

    if (clientIds.length > 0) {
      const [invsRes, assetsRes, liabsRes] = await Promise.all([
        supabaseAdmin
          .from("investment_portfolio")
          .select("current_value, invested_amount")
          .in("client_id", clientIds),
        supabaseAdmin
          .from("assets")
          .select("current_market_value")
          .in("client_id", clientIds),
        supabaseAdmin
          .from("liabilities")
          .select("outstanding_principal")
          .in("client_id", clientIds),
      ]);

      totalInvestments = (invsRes.data || []).reduce(
        (sum, i) => sum + Number(i.current_value || 0),
        0
      );
      totalPhysicalAssets = (assetsRes.data || []).reduce(
        (sum, a) => sum + Number(a.current_market_value || 0),
        0
      );
      totalLiabilities = (liabsRes.data || []).reduce(
        (sum, l) => sum + Number(l.outstanding_principal || 0),
        0
      );
    }

    // Also check `client_profiles` if any exists
    let profilesQuery = supabaseAdmin
      .from("client_profiles")
      .select("id, user_id, household_id, risk_profile_category, total_assets, total_liabilities, net_worth");

    if (activeTenantId) {
      profilesQuery = profilesQuery.eq("tenant_id", activeTenantId);
    }
    const { data: clientProfiles } = await profilesQuery;

    const profileAssets = (clientProfiles || []).reduce(
      (acc, curr) => acc + Number(curr.total_assets || 0),
      0
    );
    const profileNetWorth = (clientProfiles || []).reduce(
      (acc, curr) => acc + Number(curr.net_worth || 0),
      0
    );

    // Dynamic resolution of AUM and Net Worth
    const calculatedTotalAssets = totalInvestments + totalPhysicalAssets;
    const calculatedNetWorth = calculatedTotalAssets - totalLiabilities;

    // Use calculated assets & net worth; fallback to profiles if higher/defined
    const effectiveAUM = totalInvestments > 0 ? totalInvestments : (profileAssets > 0 ? profileAssets : (calculatedTotalAssets > 0 ? calculatedTotalAssets : 0));
    const effectiveNetWorth = calculatedNetWorth !== 0 ? calculatedNetWorth : (profileNetWorth !== 0 ? profileNetWorth : 0);

    // 5. Fetch upcoming appointments for this advisor
    let appointmentsQuery = supabaseAdmin
      .from("appointments")
      .select("id, title, meeting_link, start_time, end_time, status, client_id")
      .order("start_time", { ascending: true });

    if (session.role !== "SUPER_ADMIN") {
      appointmentsQuery = appointmentsQuery.eq("advisor_id", session.sub);
    }
    const { data: appointments } = await appointmentsQuery;

    // 6. Active households calculation: count distinct households in this tenant
    const distinctHouseholds = new Set(
      (clientsList || []).map((c) => c.household_id || c.client_id)
    );
    const activeHouseholds = distinctHouseholds.size;

    // 7. Resolve tenant branding info
    let tenant = tenantFromSubdomain;
    if (!tenant && activeTenantId) {
      const { data: t } = await supabaseAdmin
        .from("tenants")
        .select("id, subdomain, firm_legal_name, firm_brand_name, logo_url, primary_color, secondary_color, disclaimer_text, arn_number, ria_number, theme_mode, tenant_type, firm_type")
        .eq("id", activeTenantId)
        .maybeSingle();
      tenant = t;
    }

    return NextResponse.json({
      metrics: {
        totalAUM: effectiveAUM,
        totalNetWorth: effectiveNetWorth,
        activeHouseholds,
        appointmentsCount: (appointments || []).length,
      },
      tenant,
      clients: clientsList || [],
      clientProfiles: clientProfiles || [],
      appointments: appointments || [],
    });
  } catch (error) {
    console.error("Advisor overview error:", error);
    return NextResponse.json(
      { error: "Failed to load advisor overview." },
      { status: 500 }
    );
  }
}
