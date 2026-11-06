import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { getSuggestionsForClient } from "@/lib/suggestions";
import { isMarketAsset } from "@/lib/goalAssetAlignment";

export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedScope = searchParams.get("scope") || "INDIVIDUAL"; // "INDIVIDUAL" | "HOUSEHOLD"
    const requestedClientId = searchParams.get("clientId");

    // Fetch Client Profile
    let { data: profile } = await supabaseAdmin
      .from("client_profiles")
      .select("*")
      .eq("user_id", session.sub)
      .maybeSingle();

    // Fetch User details for name/email
    const { data: userRec } = await supabaseAdmin
      .from("users")
      .select("first_name, last_name, email")
      .eq("id", session.sub)
      .maybeSingle();

    const userFullName = userRec ? `${userRec.first_name || ""} ${userRec.last_name || ""}`.trim() : "";

    // Fetch Household Client data if linked or client by user_id
    let clientRecord = null;
    let assets: any[] = [];
    let liabilities: any[] = [];
    let investments: any[] = [];
    let goals: any[] = [];
    let scorecards: any[] = [];
    let activeSuggestions: any[] = [];

    let cData: any = null;
    // 1. Direct match on user_id
    const { data: userMatches } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("user_id", session.sub)
      .limit(1);

    if (userMatches && userMatches.length > 0) {
      cData = userMatches[0];
    }

    // 2. Household match if linked
    if (!cData && profile?.household_id) {
      const { data: hhClients } = await supabaseAdmin
        .from("clients")
        .select("*")
        .eq("household_id", profile.household_id);

      if (hhClients && hhClients.length > 0) {
        const found = hhClients.find(
          (c) =>
            (userFullName && c.full_name && c.full_name.toLowerCase().includes(userFullName.toLowerCase())) ||
            (userFullName && c.full_name && userFullName.toLowerCase().includes(c.full_name.toLowerCase()))
        );
        cData = found || hhClients[0];
        if (cData && !cData.user_id) {
          await supabaseAdmin
            .from("clients")
            .update({ user_id: session.sub })
            .eq("client_id", cData.client_id);
          cData.user_id = session.sub;
        }
      }
    }

    // 3. Name match fallback strictly within tenant
    if (!cData && userFullName && session.tenantId) {
      const { data: nameMatches } = await supabaseAdmin
        .from("clients")
        .select("*")
        .ilike("full_name", `%${userFullName}%`)
        .eq("tenant_id", session.tenantId)
        .limit(1);

      if (nameMatches && nameMatches.length > 0) {
        cData = nameMatches[0];
        if (!cData.user_id) {
          await supabaseAdmin
            .from("clients")
            .update({ user_id: session.sub })
            .eq("client_id", cData.client_id);
          cData.user_id = session.sub;
        }
      }
    }

    // 4. Create client planning record if completely new
    if (!cData) {
      const { data: newClient } = await supabaseAdmin
        .from("clients")
        .insert({
          tenant_id: session.tenantId || "00000000-0000-0000-0000-000000000000",
          user_id: session.sub,
          full_name: userFullName || session.email?.split("@")[0] || "Investor Client",
          uwp_client_code: `CL-${Math.floor(1000 + Math.random() * 9000)}`,
        })
        .select()
        .maybeSingle();
      cData = newClient;
    }

    clientRecord = cData;

    // Household Discovery
    let householdMembers: any[] = [];
    if (cData?.household_id) {
      const { data: hhList } = await supabaseAdmin
        .from("clients")
        .select("client_id, full_name, user_id, annual_gross_income, advisor_name, household_id")
        .eq("household_id", cData.household_id)
        .order("full_name", { ascending: true });
      householdMembers = hhList || [];

      // Allow switching between verified members of the same household
      if (requestedClientId && householdMembers.some((m) => m.client_id === requestedClientId)) {
        const found = householdMembers.find((m) => m.client_id === requestedClientId);
        if (found) {
          cData = found;
          clientRecord = found;
        }
      }
    }

    const isHouseholdScope = requestedScope === "HOUSEHOLD" && householdMembers.length > 1;
    const targetClientIds = isHouseholdScope
      ? householdMembers.map((m) => m.client_id)
      : cData?.client_id
      ? [cData.client_id]
      : [];

    if (targetClientIds.length > 0) {
      const [aRes, lRes, invRes, gRes, scRes, suggList] = await Promise.all([
        supabaseAdmin.from("assets").select("*").in("client_id", targetClientIds).order("current_market_value", { ascending: false }),
        supabaseAdmin.from("liabilities").select("*").in("client_id", targetClientIds).order("outstanding_principal", { ascending: false }),
        supabaseAdmin.from("investment_portfolio").select("*").in("client_id", targetClientIds).order("current_value", { ascending: false }),
        supabaseAdmin.from("financial_goals").select("*").in("client_id", targetClientIds),
        supabaseAdmin.from("cfp_scorecard_evaluations").select("*").in("client_id", targetClientIds),
        getSuggestionsForClient(cData.client_id),
      ]);

      assets = aRes.data || [];
      liabilities = lRes.data || [];
      investments = invRes.data || [];
      goals = gRes.data || [];
      scorecards = scRes.data || [];
      activeSuggestions = (suggList || []).filter((s) => s.status !== "DRAFT");
    }

    // Financial Totals Calculations
    // Deduplicate: If investments exist in investment_portfolio, filter out market investments
    // from the assets table to avoid double-counting mutual funds in both assets and investments
    const hasInvestments = investments.length > 0;
    const tangibleAssets = hasInvestments ? assets.filter((a) => !isMarketAsset(a)) : assets;

    const physicalAssetsTotal = tangibleAssets.reduce((sum, a) => sum + Number(a.current_market_value || 0), 0);
    const investmentsTotal = investments.reduce((sum, i) => sum + Number(i.current_value || 0), 0);
    const totalAssets = physicalAssetsTotal + investmentsTotal;
    const totalLiabilities = liabilities.reduce((sum, l) => sum + Number(l.outstanding_principal || 0), 0);
    const netWorth = totalAssets - totalLiabilities;

    // Fetch upcoming appointments
    const { data: appointments } = await supabaseAdmin
      .from("appointments")
      .select("id, title, meeting_link, start_time, end_time, status, advisor_id")
      .eq("client_id", session.sub)
      .order("start_time", { ascending: true })
      .limit(5);

    // Target tenant ID
    const targetTenantId = session.tenantId || profile?.tenant_id || clientRecord?.tenant_id || "00000000-0000-0000-0000-000000000000";

    // Resolve assigned advisor / distributor
    let advisor = null;
    // 1. Direct from profile.assigned_advisor_id
    if (profile?.assigned_advisor_id) {
      const { data: adv } = await supabaseAdmin
        .from("users")
        .select("id, first_name, last_name, email, phone_number")
        .eq("id", profile.assigned_advisor_id)
        .maybeSingle();
      if (adv) advisor = adv;
    }

    // 2. Inherited from household profile if available
    if (!advisor && cData?.household_id) {
      const { data: hhProfiles } = await supabaseAdmin
        .from("client_profiles")
        .select("assigned_advisor_id")
        .eq("household_id", cData.household_id)
        .not("assigned_advisor_id", "is", null)
        .limit(1);
      if (hhProfiles && hhProfiles.length > 0 && hhProfiles[0].assigned_advisor_id) {
        const { data: adv } = await supabaseAdmin
          .from("users")
          .select("id, first_name, last_name, email, phone_number")
          .eq("id", hhProfiles[0].assigned_advisor_id)
          .maybeSingle();
        if (adv) advisor = adv;
      }
    }

    // 3. Match from clients.advisor_name within tenant
    if (!advisor && cData?.advisor_name) {
      const advName = cData.advisor_name.trim();
      let q = supabaseAdmin
        .from("users")
        .select("id, first_name, last_name, email, phone_number")
        .in("role", ["ADVISOR", "TENANT_ADMIN"]);
      if (targetTenantId) q = q.eq("tenant_id", targetTenantId);
      const { data: tenantAdvisors } = await q;

      if (tenantAdvisors && tenantAdvisors.length > 0) {
        const match = tenantAdvisors.find(
          (a) =>
            `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase() === advName.toLowerCase() ||
            (a.first_name && advName.toLowerCase().includes(a.first_name.toLowerCase()))
        );
        if (match) advisor = match;
      }
    }

    // 4. Default to any active advisor / tenant admin in this tenant
    if (!advisor && targetTenantId) {
      const { data: defAdv } = await supabaseAdmin
        .from("users")
        .select("id, first_name, last_name, email, phone_number")
        .in("role", ["ADVISOR", "TENANT_ADMIN"])
        .eq("tenant_id", targetTenantId)
        .limit(1)
        .maybeSingle();
      if (defAdv) advisor = defAdv;
    }

    // 5. Fallback object based on clientRecord.advisor_name
    if (!advisor) {
      const nameStr = cData?.advisor_name || "Pallavi Srivastava";
      const parts = nameStr.split(" ");
      advisor = {
        id: null,
        first_name: parts[0] || nameStr,
        last_name: parts.slice(1).join(" ") || "",
        email: "pallavi@unifiedwealth.com",
        phone_number: null,
      };
    }

    // Sync or initialize profile record if missing
    if (!profile && session.sub) {
      const { data: newProf } = await supabaseAdmin
        .from("client_profiles")
        .insert({
          tenant_id: targetTenantId,
          user_id: session.sub,
          household_id: cData.household_id || null,
          assigned_advisor_id: advisor?.id || null,
          total_assets: totalAssets,
          total_liabilities: totalLiabilities,
          net_worth: netWorth,
          risk_profile_category: cData.risk_profile || "Moderate",
          residential_status: "RESIDENT_INDIVIDUAL",
          tax_residency_country: "India",
        })
        .select()
        .maybeSingle();
      if (newProf) profile = newProf;
    } else if (profile?.id && !isHouseholdScope) {
      await supabaseAdmin
        .from("client_profiles")
        .update({
          total_assets: totalAssets,
          total_liabilities: totalLiabilities,
          net_worth: netWorth,
          assigned_advisor_id: profile.assigned_advisor_id || advisor?.id || null,
          net_worth_updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);
    }

    // Fetch tenant white-label branding
    let tenant = null;
    if (targetTenantId) {
      const { data: t } = await supabaseAdmin
        .from("tenants")
        .select("id, subdomain, firm_legal_name, firm_brand_name, logo_url, primary_color, secondary_color, theme_mode, disclaimer_text, arn_number, ria_number")
        .eq("id", targetTenantId)
        .maybeSingle();
      tenant = t;
    }

    return NextResponse.json({
      profile: profile || {
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        net_worth: netWorth,
        risk_profile_category: cData?.risk_profile || "Moderate",
      },
      summary: {
        totalAssets,
        physicalAssetsTotal,
        investmentsTotal,
        totalLiabilities,
        netWorth,
        scope: isHouseholdScope ? "HOUSEHOLD" : "INDIVIDUAL",
        tangibleAssetsCount: tangibleAssets.length,
        investmentsCount: investments.length,
        liabilitiesCount: liabilities.length,
      },
      householdMembers: householdMembers.map((m) => ({
        clientId: m.client_id,
        fullName: m.full_name,
        isCurrent: m.client_id === cData.client_id,
      })),
      tenant,
      clientRecord: cData,
      advisor,
      assets: tangibleAssets,
      investments,
      liabilities,
      goals,
      scorecards,
      appointments: appointments || [],
      suggestions: activeSuggestions,
    });
  } catch (error) {
    console.error("Client overview error:", error);
    return NextResponse.json(
      { error: "Failed to load client overview." },
      { status: 500 }
    );
  }
}
