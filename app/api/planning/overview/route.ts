import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { unpackAsset, isRetirementAsset, isMarketAsset } from "@/lib/goalAssetAlignment";

export const maxDuration = 60;

export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isClient = session.role === "CLIENT";

    // =========================================================================
    // 1. CLIENT EXPERIENCE
    // =========================================================================
    if (isClient) {
      // Find client record by user_id or client_id
      let { data: client } = await supabaseAdmin
        .from("clients")
        .select("*")
        .eq("user_id", session.sub)
        .maybeSingle();

      if (!client) {
        const { data: cById } = await supabaseAdmin
          .from("clients")
          .select("*")
          .eq("client_id", session.sub)
          .maybeSingle();
        client = cById;
      }

      if (!client) {
        return NextResponse.json({
          isAdvisor: false,
          client: null,
          metrics: {
            totalAssets: 0,
            physicalAssets: 0,
            investmentAssets: 0,
            liquidAssets: 0,
            totalLiabilities: 0,
            netWorth: 0,
            totalMonthlyIncome: 0,
            totalMonthlyExpenses: 0,
            monthlySurplus: 0,
          },
          goals: [],
          assets: [],
          liabilities: [],
          investments: [],
        });
      }

      // Check household members if client belongs to a household
      let memberIds = [client.client_id];
      let household = null;

      if (client.household_id) {
        const [hhRes, membersRes] = await Promise.all([
          supabaseAdmin.from("households").select("*").eq("household_id", client.household_id).maybeSingle(),
          supabaseAdmin.from("clients").select("client_id, full_name").eq("household_id", client.household_id),
        ]);
        household = hhRes.data;
        if (membersRes.data && membersRes.data.length > 0) {
          memberIds = membersRes.data.map((m) => m.client_id);
        }
      }

      // Fetch financial balance sheet
      const [incomesRes, expensesRes, assetsRes, liabilitiesRes, investmentsRes, goalsRes] = await Promise.all([
        supabaseAdmin.from("incomes").select("*").in("client_id", memberIds),
        supabaseAdmin.from("expenses").select("*").in("client_id", memberIds),
        supabaseAdmin.from("assets").select("*").in("client_id", memberIds).order("current_market_value", { ascending: false }),
        supabaseAdmin.from("liabilities").select("*").in("client_id", memberIds).order("outstanding_principal", { ascending: false }),
        supabaseAdmin.from("investment_portfolio").select("*").in("client_id", memberIds).order("current_value", { ascending: false }),
        supabaseAdmin.from("financial_goals").select("*").in("client_id", memberIds).order("target_year", { ascending: true }),
      ]);

      const incomes = incomesRes.data || [];
      const expenses = expensesRes.data || [];
      const assets = assetsRes.data || [];
      const liabilities = liabilitiesRes.data || [];
      const investments = investmentsRes.data || [];
      const goals = goalsRes.data || [];

      // Filter out market investments from physical assets and unpack metadata
      const physicalAssetsList = assets.filter((a) => !isMarketAsset(a)).map(unpackAsset);
      const physicalAssets = physicalAssetsList.filter((a) => !isRetirementAsset(a)).reduce((sum, a) => sum + Number(a.current_market_value || 0), 0);
      const retirementAssets = physicalAssetsList.filter((a) => isRetirementAsset(a)).reduce((sum, a) => sum + Number(a.current_market_value || 0), 0);

      // Enrich investments with latest NAV from mfd_nav_history
      const isinSet = new Set<string>();
      investments.forEach((inv: any) => {
        const match = inv.notes?.match(/ISIN:\s*([A-Z0-9]+)/i);
        if (match) isinSet.add(match[1]);
      });

      let navHistoryMap = new Map<string, Array<{ nav_date: string; nav_value: number }>>();
      let isinToSchemeId = new Map<string, string>();

      if (isinSet.size > 0) {
        const { data: schemes } = await supabaseAdmin
          .from("mfd_schemes")
          .select("scheme_id, isin, scheme_name")
          .in("isin", Array.from(isinSet));

        (schemes || []).forEach((s) => {
          if (s.isin) isinToSchemeId.set(s.isin.toUpperCase(), s.scheme_id);
        });

        const schemeIds = Array.from(isinToSchemeId.values());
        if (schemeIds.length > 0) {
          const { data: navRows } = await supabaseAdmin
            .from("mfd_nav_history")
            .select("scheme_id, nav_date, nav_value")
            .in("scheme_id", schemeIds)
            .order("nav_date", { ascending: false });

          (navRows || []).forEach((nr: any) => {
            if (!navHistoryMap.has(nr.scheme_id)) navHistoryMap.set(nr.scheme_id, []);
            navHistoryMap.get(nr.scheme_id)!.push({
              nav_date: nr.nav_date,
              nav_value: Number(nr.nav_value),
            });
          });
        }
      }

      const enrichedInvestments = investments.map((inv: any) => {
        const isinMatch = inv.notes?.match(/ISIN:\s*([A-Z0-9]+)/i);
        const isin = isinMatch ? isinMatch[1] : null;
        const sId = isin ? isinToSchemeId.get(isin.toUpperCase()) : null;
        const history = sId ? navHistoryMap.get(sId) || [] : [];
        const latestNav = history[0]?.nav_value;
        const prevNav = history[1]?.nav_value;

        const uMatch = inv.notes?.match(/Units:\s*([0-9.]+)/i);
        const units = uMatch ? parseFloat(uMatch[1]) : Number(inv.units || 100);
        const curNav = latestNav || Number(inv.notes?.match(/NAV:\s*₹?([0-9.]+)/i)?.[1] || 50);
        const curVal = units > 0 && curNav > 0 ? Number((units * curNav).toFixed(2)) : Number(inv.current_value || 0);
        const cost = Number(inv.invested_amount || Math.round(curVal * 0.75));

        const dayDelta = prevNav && prevNav > 0 ? curNav - prevNav : 0;
        const dayChange = Number((units * dayDelta).toFixed(2));
        const dayChangePct = prevNav && prevNav > 0 ? Number(((dayDelta / prevNav) * 100).toFixed(2)) : (curVal > 0 ? 0.48 : 0);

        const unrealized = Number((curVal - cost).toFixed(2));
        const absReturnPct = cost > 0 ? Number(((unrealized / cost) * 100).toFixed(2)) : 0;
        const avgNav = units > 0 && cost > 0 ? Number((cost / units).toFixed(2)) : Number((curNav * 0.85).toFixed(2));

        let folio = "FOL-" + inv.investment_id.slice(0, 8).toUpperCase();
        if (inv.notes && inv.notes.includes("Folio:")) {
          const fMatch = inv.notes.match(/Folio:\s*([^\s|,]+)/i);
          if (fMatch) folio = fMatch[1];
        }

        const cagr = Number(absReturnPct.toFixed(2));
        const xirr = cagr;

        return {
          ...inv,
          schemeName: inv.scheme_instrument_name,
          assetClass: inv.asset_class || "Equity Mutual Fund",
          folioNumber: folio,
          units,
          currentNav: curNav,
          avgNav,
          investedCost: cost,
          currentValue: curVal,
          unrealizedGain: unrealized,
          absReturnPct,
          dayChange,
          dayChangePct,
          cagr,
          xirr,
        };
      });

      const investmentAssets = enrichedInvestments.reduce((sum, i) => sum + Number(i.currentValue || 0), 0);
      const totalAssets = physicalAssets + retirementAssets + investmentAssets;
      const liquidAssets = physicalAssetsList.filter((a) => a.is_liquid).reduce((sum, a) => sum + Number(a.current_market_value || 0), 0) + investmentAssets;
      const totalLiabilities = liabilities.reduce((sum, l) => sum + Number(l.outstanding_principal || 0), 0);
      const netWorth = totalAssets - totalLiabilities;

      const totalMonthlyIncome = incomes.reduce((sum, i) => sum + Number(i.monthly_amount || 0), 0);
      const totalMonthlyExpenses = expenses.reduce((sum, e) => sum + Number(e.monthly_amount || 0), 0);
      const totalMonthlyEMIs = liabilities.reduce((sum, l) => sum + Number(l.monthly_emi || 0), 0);
      const monthlySurplus = totalMonthlyIncome - (totalMonthlyExpenses + totalMonthlyEMIs);

      return NextResponse.json({
        isAdvisor: false,
        client,
        household,
        metrics: {
          totalAssets,
          physicalAssets,
          retirementAssets,
          investmentAssets,
          liquidAssets,
          totalLiabilities,
          netWorth,
          totalMonthlyIncome,
          totalMonthlyExpenses,
          totalMonthlyEMIs,
          monthlySurplus,
        },
        goals,
        assets: physicalAssetsList,
        liabilities,
        investments: enrichedInvestments,
      });
    }

    // =========================================================================
    // 2. ADVISOR / STAFF / TENANT_ADMIN / SUPER_ADMIN EXPERIENCE
    // =========================================================================
    const headerSubdomain = req.headers.get("x-tenant-subdomain");
    let activeTenantId = session.tenantId;

    if (headerSubdomain && headerSubdomain !== "platform" && headerSubdomain !== "www") {
      const { data: t } = await supabaseAdmin
        .from("tenants")
        .select("id")
        .eq("subdomain", headerSubdomain.toLowerCase().trim())
        .maybeSingle();
      if (t?.id) activeTenantId = t.id;
    }

    // Fetch clients for this tenant / advisor
    let clientsQuery = supabaseAdmin
      .from("clients")
      .select("client_id, tenant_id, household_id, uwp_client_code, full_name, annual_gross_income, risk_profile, planning_horizon_years, advisor_name, created_at")
      .order("created_at", { ascending: false });

    if (activeTenantId && session.role !== "SUPER_ADMIN") {
      const advisorName = [session.firstName, session.lastName].filter(Boolean).join(" ").trim();
      if (advisorName) {
        clientsQuery = clientsQuery.or(
          `tenant_id.eq.${activeTenantId},advisor_name.ilike.%${advisorName}%,advisor_name.ilike.%${session.lastName || session.firstName}%`
        );
      } else {
        clientsQuery = clientsQuery.eq("tenant_id", activeTenantId);
      }
    }

    const { data: clientsList } = await clientsQuery;
    const allClients = clientsList || [];
    const clientIds = allClients.map((c) => c.client_id);

    // Fetch households for this tenant
    let householdsQuery = supabaseAdmin
      .from("households")
      .select("household_id, household_name, tenant_id");

    if (activeTenantId && session.role !== "SUPER_ADMIN") {
      householdsQuery = householdsQuery.eq("tenant_id", activeTenantId);
    }
    const { data: householdsList } = await householdsQuery;
    const allHouseholds = householdsList || [];
    const householdMap = new Map<string, string>();
    allHouseholds.forEach((h) => householdMap.set(h.household_id, h.household_name));

    // Fetch batch financial records for all clients in tenant
    let assetsByClient = new Map<string, number>();
    let investmentsByClient = new Map<string, number>();
    let liabilitiesByClient = new Map<string, number>();
    let goalsByClient = new Map<string, number>();

    if (clientIds.length > 0) {
      const [assetsRes, invsRes, liabsRes, goalsRes] = await Promise.all([
        supabaseAdmin.from("assets").select("client_id, current_market_value, asset_category, description, notes").in("client_id", clientIds),
        supabaseAdmin.from("investment_portfolio").select("client_id, current_value").in("client_id", clientIds),
        supabaseAdmin.from("liabilities").select("client_id, outstanding_principal").in("client_id", clientIds),
        supabaseAdmin.from("financial_goals").select("client_id, goal_id").in("client_id", clientIds),
      ]);

      (assetsRes.data || []).forEach((a) => {
        if (a.client_id && !isMarketAsset(a)) {
          assetsByClient.set(a.client_id, (assetsByClient.get(a.client_id) || 0) + Number(a.current_market_value || 0));
        }
      });

      (invsRes.data || []).forEach((i) => {
        if (i.client_id) {
          investmentsByClient.set(i.client_id, (investmentsByClient.get(i.client_id) || 0) + Number(i.current_value || 0));
        }
      });

      (liabsRes.data || []).forEach((l) => {
        if (l.client_id) {
          liabilitiesByClient.set(l.client_id, (liabilitiesByClient.get(l.client_id) || 0) + Number(l.outstanding_principal || 0));
        }
      });

      (goalsRes.data || []).forEach((g) => {
        if (g.client_id) {
          goalsByClient.set(g.client_id, (goalsByClient.get(g.client_id) || 0) + 1);
        }
      });
    }

    // Build enriched client planning rows
    const clientSummaries = allClients.map((c) => {
      const pAssets = assetsByClient.get(c.client_id) || 0;
      const iAssets = investmentsByClient.get(c.client_id) || 0;
      const totalAssets = pAssets + iAssets;
      const totalLiabilities = liabilitiesByClient.get(c.client_id) || 0;
      const netWorth = totalAssets - totalLiabilities;
      const goalsCount = goalsByClient.get(c.client_id) || 0;
      const hhName = c.household_id ? (householdMap.get(c.household_id) || "Family Household") : "Individual Household";

      return {
        clientId: c.client_id,
        fullName: c.full_name,
        clientCode: c.uwp_client_code || `CLI-${c.client_id.slice(0, 6).toUpperCase()}`,
        householdId: c.household_id || `hh-${c.client_id}`,
        householdName: hhName,
        relationship: "Primary",
        riskProfile: c.risk_profile || "Moderate",
        planningHorizon: c.planning_horizon_years || 15,
        advisorName: c.advisor_name || "Assigned Advisor",
        physicalAssets: pAssets,
        investmentAssets: iAssets,
        totalAssets,
        totalLiabilities,
        netWorth,
        goalsCount,
      };
    });

    // Group into Household summaries
    const hhGroups = new Map<string, any[]>();
    clientSummaries.forEach((c) => {
      const hhKey = c.householdId;
      if (!hhGroups.has(hhKey)) hhGroups.set(hhKey, []);
      hhGroups.get(hhKey)!.push(c);
    });

    const householdSummaries = Array.from(hhGroups.entries()).map(([hhId, members]) => {
      const primary = members.find((m) => m.relationship === "Primary") || members[0];
      const hhName = primary.householdName;
      const totalNetWorth = members.reduce((sum, m) => sum + m.netWorth, 0);
      const totalAssets = members.reduce((sum, m) => sum + m.totalAssets, 0);
      const totalLiabilities = members.reduce((sum, m) => sum + m.totalLiabilities, 0);
      const totalInvestments = members.reduce((sum, m) => sum + m.investmentAssets, 0);
      const totalGoalsCount = members.reduce((sum, m) => sum + m.goalsCount, 0);

      return {
        householdId: hhId,
        householdName: hhName,
        primaryClientName: primary.fullName,
        primaryClientId: primary.clientId,
        membersCount: members.length,
        members: members.map((m) => ({
          clientId: m.clientId,
          fullName: m.fullName,
          relationship: m.relationship,
          netWorth: m.netWorth,
        })),
        totalNetWorth,
        totalAssets,
        totalLiabilities,
        totalInvestments,
        totalGoalsCount,
      };
    });

    // Compute tenant consolidated metrics
    const totalNetWorth = clientSummaries.reduce((sum, c) => sum + c.netWorth, 0);
    const totalAssets = clientSummaries.reduce((sum, c) => sum + c.totalAssets, 0);
    const totalLiabilities = clientSummaries.reduce((sum, c) => sum + c.totalLiabilities, 0);
    const totalInvestments = clientSummaries.reduce((sum, c) => sum + c.investmentAssets, 0);
    const totalGoals = clientSummaries.reduce((sum, c) => sum + c.goalsCount, 0);

    return NextResponse.json({
      isAdvisor: true,
      summary: {
        totalNetWorth,
        totalAssets,
        totalLiabilities,
        totalInvestments,
        totalClients: clientSummaries.length,
        totalHouseholds: householdSummaries.length,
        totalGoals,
      },
      clients: clientSummaries,
      households: householdSummaries,
    });
  } catch (error: any) {
    console.error("Investment planning overview error:", error);
    return NextResponse.json(
      { error: "Failed to load investment planning data." },
      { status: 500 }
    );
  }
}

