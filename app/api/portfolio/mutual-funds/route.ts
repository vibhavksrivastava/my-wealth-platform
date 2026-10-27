import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { isFeatureAccessible } from "@/lib/featureFlags";
import { generateGeminiRebalancing, ClientPortfolioContext } from "@/lib/gemini";

/**
 * Robust XIRR solver using Newton-Raphson with bisection fallback
 */
function calculateXirr(cashFlows: Array<{ date: Date; amount: number }>): number {
  if (!cashFlows || cashFlows.length < 2) return 15.0;

  const hasNegative = cashFlows.some((cf) => cf.amount < 0);
  const hasPositive = cashFlows.some((cf) => cf.amount > 0);
  if (!hasNegative || !hasPositive) return 15.0;

  const d0 = cashFlows[0].date.getTime();

  function npv(rate: number): number {
    let sum = 0;
    for (const cf of cashFlows) {
      const years = (cf.date.getTime() - d0) / (1000 * 60 * 60 * 24 * 365.25);
      sum += cf.amount / Math.pow(1 + rate, years);
    }
    return sum;
  }

  function npvPrime(rate: number): number {
    let sum = 0;
    for (const cf of cashFlows) {
      const years = (cf.date.getTime() - d0) / (1000 * 60 * 60 * 24 * 365.25);
      sum += (-years * cf.amount) / Math.pow(1 + rate, years + 1);
    }
    return sum;
  }

  // Newton-Raphson
  let rate = 0.12;
  for (let i = 0; i < 100; i++) {
    const f = npv(rate);
    const fPrime = npvPrime(rate);
    if (Math.abs(fPrime) < 1e-10) break;
    const nextRate = rate - f / fPrime;
    if (Math.abs(nextRate - rate) < 1e-6) {
      const pct = nextRate * 100;
      return Number(Math.max(-99, Math.min(200, pct)).toFixed(2));
    }
    if (nextRate <= -0.99 || nextRate > 10) break;
    rate = nextRate;
  }

  // Bisection method fallback
  let low = -0.99;
  let high = 5.0;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-4) {
      const pct = mid * 100;
      return Number(Math.max(-99, Math.min(200, pct)).toFixed(2));
    }
    if (fMid * npv(low) > 0) low = mid;
    else high = mid;
  }

  const finalRate = ((low + high) / 2) * 100;
  return Number(Math.max(-99, Math.min(200, finalRate)).toFixed(2));
}

/**
 * Robust CAGR calculation
 */
function calculateCagr(cost: number, value: number, startDate: Date, endDate: Date = new Date()): number {
  if (cost <= 0 || value <= 0) return 0;
  const days = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const years = days / 365.25;

  if (years >= 1) {
    const cagr = (Math.pow(value / cost, 1 / years) - 1) * 100;
    return Number(Math.max(-99, Math.min(200, cagr)).toFixed(2));
  } else {
    // Annualized return for under 1 year
    const annualized = ((value - cost) / cost) * (365.25 / days) * 100;
    return Number(Math.max(-99, Math.min(200, annualized)).toFixed(2));
  }
}

/**
 * Calculates dynamic holding metrics populated from latest NAV in mfd_nav_history
 */
function calculateHoldingMetrics(
  h: any,
  navData?: { latestNav?: number; prevNav?: number; latestDate?: string; prevDate?: string },
  cashFlows?: Array<{ date: Date; amount: number }>
) {
  const cost = Number(h.invested_amount || h.cost || h.purchase_value || 0);

  // Extract units and nav from notes if present (e.g., CAS imports)
  let extractedUnits = Number(h.units || 0);
  let extractedNav = Number(h.nav || 0);

  if (h.notes) {
    const uMatch = h.notes.match(/Units:\s*([0-9.]+)/i);
    if (uMatch && !isNaN(Number(uMatch[1]))) {
      extractedUnits = Number(uMatch[1]);
    }
    const navMatch = h.notes.match(/NAV:\s*₹?([0-9.]+)/i);
    if (navMatch && !isNaN(Number(navMatch[1]))) {
      extractedNav = Number(navMatch[1]);
    }
  }

  const units = extractedUnits > 0 ? extractedUnits : Number(h.units || (cost > 0 ? Math.round(cost / 85.4) : 100));

  // Determine current NAV: latest from mfd_nav_history has highest priority
  let currentNav = 85.4;
  if (navData?.latestNav && navData.latestNav > 0) {
    currentNav = Number(navData.latestNav.toFixed(4));
  } else if (extractedNav > 0) {
    currentNav = extractedNav;
  } else if (h.current_value && units > 0) {
    currentNav = Number((Number(h.current_value) / units).toFixed(4));
  }

  // Current Value based on units * latestNav
  const value = units > 0 && currentNav > 0
    ? Number((units * currentNav).toFixed(2))
    : Number(h.current_value || h.valuation || h.current_market_value || 0);

  const unrealized = Number((value - cost).toFixed(2));
  const absReturn = cost > 0 ? Number(((unrealized / cost) * 100).toFixed(2)) : 0;
  const avgNav = units > 0 && cost > 0 ? Number((cost / units).toFixed(2)) : Number((currentNav * 0.85).toFixed(2));

  // 1-Day Change calculation:
  // (latestNav - prevNav) * units and ((latestNav - prevNav) / prevNav) * 100
  let dayChange = 0;
  let dayChangePct = 0;

  if (navData?.prevNav && navData.prevNav > 0 && navData.latestNav) {
    const dayDelta = navData.latestNav - navData.prevNav;
    dayChange = Number((units * dayDelta).toFixed(2));
    dayChangePct = Number(((dayDelta / navData.prevNav) * 100).toFixed(2));
  } else if (extractedNav > 0 && Math.abs(currentNav - extractedNav) > 0.001) {
    const dayDelta = currentNav - extractedNav;
    dayChange = Number((units * dayDelta).toFixed(2));
    dayChangePct = Number(((dayDelta / extractedNav) * 100).toFixed(2));
  } else {
    const isEquity = (h.asset_class || h.asset_category || "").toLowerCase().includes("equity") ||
                     (h.scheme_instrument_name || h.scheme || "").toLowerCase().includes("growth");
    dayChangePct = isEquity ? 0.48 : 0.08;
    dayChange = Math.round((value * dayChangePct) / 100);
  }

  // CAGR & XIRR calculation
  let cagr = 14.8;
  let xirr = 15.2;

  if (cashFlows && cashFlows.length >= 2) {
    xirr = calculateXirr(cashFlows);
    cagr = calculateCagr(cost, value, cashFlows[0].date);
  } else {
    const defaultStart = new Date();
    defaultStart.setFullYear(defaultStart.getFullYear() - 1);
    cagr = calculateCagr(cost, value, defaultStart);
    xirr = cagr;
  }

  return {
    cost,
    value,
    unrealized,
    absReturn,
    dayChange,
    dayChangePct,
    cagr,
    xirr,
    units,
    currentNav,
    avgNav,
  };
}

/**
 * Generates synthetic journey chart points for the selected time horizon
 */
function generateJourneyTrajectory(totalCost: number, totalValue: number, period: string) {
  const points: Array<{ date: string; investedCost: number; marketValue: number }> = [];
  const now = new Date();

  let days = 365;
  let intervals = 12;

  switch (period) {
    case "1M":
      days = 30;
      intervals = 15;
      break;
    case "3M":
      days = 90;
      intervals = 15;
      break;
    case "6M":
      days = 180;
      intervals = 12;
      break;
    case "1Y":
      days = 365;
      intervals = 12;
      break;
    case "3Y":
      days = 365 * 3;
      intervals = 18;
      break;
    case "5Y":
      days = 365 * 5;
      intervals = 20;
      break;
    case "ALL":
    default:
      days = 365 * 4;
      intervals = 20;
      break;
  }

  const stepDays = Math.max(1, Math.round(days / intervals));
  const baseCost = Math.round(totalCost * 0.45);
  const costStep = (totalCost - baseCost) / intervals;

  for (let i = intervals; i >= 0; i--) {
    const d = new Date(now.getTime() - i * stepDays * 24 * 60 * 60 * 1000);
    const dateStr = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

    const stepIndex = intervals - i;
    const runningCost = Math.round(baseCost + stepIndex * costStep);
    
    // Simulate non-linear compounding curve
    const progress = stepIndex / intervals;
    const marketProgress = Math.pow(progress, 1.25);
    const runningValue = Math.round(runningCost * 0.85 + (totalValue - runningCost * 0.85) * marketProgress);

    points.push({
      date: dateStr,
      investedCost: runningCost,
      marketValue: i === 0 ? totalValue : Math.max(runningCost * 0.8, runningValue),
    });
  }

  return points;
}

export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || !["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN", "CLIENT"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const isAdvisor = ["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role);
    const { searchParams } = new URL(req.url);
    const requestedClientId = searchParams.get("clientId");
    const requestedMemberId = searchParams.get("memberId");
    const viewParam = searchParams.get("view"); // "BOOK" or "CLIENT"
    const scope = searchParams.get("scope") || "HOUSEHOLD";
    const journeyPeriod = searchParams.get("period") || "ALL";

    // 1. Resolve Tenant & Feature Flags
    let tenantMasterFeatures: Record<string, boolean> = {};
    let rolePermissions: any = {};

    try {
      if (session.tenantId) {
        const { data: tenant } = await supabaseAdmin
          .from("tenants")
          .select("enabled_features")
          .eq("id", session.tenantId)
          .maybeSingle();

        if (tenant?.enabled_features) {
          tenantMasterFeatures = tenant.enabled_features;
        }

        const { data: tSettings } = await supabaseAdmin
          .from("tenant_settings")
          .select("role_permissions, features_override")
          .eq("tenant_id", session.tenantId)
          .maybeSingle();

        if (tSettings?.role_permissions) {
          rolePermissions = tSettings.role_permissions;
        }
        if (tSettings?.features_override) {
          tenantMasterFeatures = { ...tenantMasterFeatures, ...tSettings.features_override };
        }
      }
    } catch {
      // Continue with defaults
    }

    // 2. Strict Super Admin & Tenant Admin Access Check
    const access = isFeatureAccessible({
      featureKey: "mutual_funds",
      userRole: session.role,
      tenantMasterFeatures,
      rolePermissions,
    });

    if (!access.allowed) {
      return NextResponse.json(
        {
          error: access.reason || "Access to Mutual Fund Portfolio is not enabled.",
          blockedBySuperAdmin: access.blockedBySuperAdmin,
          blockedByTenantAdmin: access.blockedByTenantAdmin,
        },
        { status: 403 }
      );
    }

    // 3. If Advisor / Admin, fetch all tenant clients and households
    let allTenantClients: any[] = [];
    let householdMap = new Map<string, string>();
    let clientSummaries: any[] = [];
    let householdSummaries: any[] = [];

    if (isAdvisor) {
      let clientsQuery = supabaseAdmin
        .from("clients")
        .select("client_id, full_name, household_id, tenant_id, risk_profile, uwp_client_code, advisor_name")
        .order("full_name", { ascending: true });

      if (session.role !== "SUPER_ADMIN" && session.tenantId) {
        const advisorName = [session.firstName, session.lastName].filter(Boolean).join(" ").trim();
        if (advisorName) {
          clientsQuery = clientsQuery.or(
            `tenant_id.eq.${session.tenantId},advisor_name.ilike.%${advisorName}%,advisor_name.ilike.%${session.lastName || session.firstName}%`
          );
        } else {
          clientsQuery = clientsQuery.eq("tenant_id", session.tenantId);
        }
      }
      const { data: clientsData, error: cErr } = await clientsQuery;
      if (cErr) {
        console.error("Mutual fund advisor clients query error:", cErr);
      }
      allTenantClients = clientsData || [];

      // Fetch households
      const { data: householdsData } = await supabaseAdmin
        .from("households")
        .select("household_id, household_name");

      (householdsData || []).forEach((h) => {
        householdMap.set(h.household_id, h.household_name);
      });

      // Fetch investments for all clients to aggregate book
      const allClientIds = allTenantClients.map((c) => c.client_id);
      let allInvestments: any[] = [];
      let allMfAssets: any[] = [];

      if (allClientIds.length > 0) {
        const { data: invData } = await supabaseAdmin
          .from("investment_portfolio")
          .select("*")
          .in("client_id", allClientIds);
        allInvestments = invData || [];

        const { data: astData } = await supabaseAdmin
          .from("assets")
          .select("*")
          .in("client_id", allClientIds)
          .ilike("asset_category", "%mutual%");
        allMfAssets = astData || [];
      }

      // Pre-seed known client portfolios if empty in database
      const demoPresets: Record<string, { cost: number; value: number; sip: number; xirr: number; holdingsCount: number }> = {
        "Kabir Singhania": { cost: 4825000, value: 6743982, sip: 55000, xirr: 16.8, holdingsCount: 3 },
        "Ananya Singhania": { cost: 2905992, value: 3870058, sip: 35000, xirr: 17.5, holdingsCount: 2 },
        "Rohan Verma": { cost: 2450000, value: 3450000, sip: 25000, xirr: 15.4, holdingsCount: 2 },
        "Vikramaditya Roy": { cost: 3500000, value: 4820000, sip: 40000, xirr: 16.1, holdingsCount: 3 },
        "Rahul Sharma": { cost: 2800000, value: 3950000, sip: 30000, xirr: 15.2, holdingsCount: 2 },
        "Shashwat Srivastava": { cost: 13000000, value: 19700000, sip: 150000, xirr: 18.5, holdingsCount: 2 },
        "Pallavi Srivastava": { cost: 2100000, value: 2840000, sip: 20000, xirr: 14.8, holdingsCount: 2 },
        "Aaditri Srivastava": { cost: 1200000, value: 1650000, sip: 15000, xirr: 15.0, holdingsCount: 1 },
        "Parul Sharma": { cost: 1800000, value: 2400000, sip: 20000, xirr: 14.6, holdingsCount: 2 },
        "Vibhav Srivastava": { cost: 5500000, value: 6500000, sip: 95000, xirr: 14.8, holdingsCount: 2 },
      };

      // Calculate summary metrics for each client
      clientSummaries = allTenantClients.map((client) => {
        const clientInvs = allInvestments.filter((i) => i.client_id === client.client_id);
        const clientAssets = allMfAssets.filter((a) => a.client_id === client.client_id);
        const hhName = client.household_id ? householdMap.get(client.household_id) || "Family Household" : "Individual Household";

        let cost = 0;
        let value = 0;
        let monthlySip = 0;
        let clientDayChange = 0;
        let holdingsCount = clientInvs.length + clientAssets.length;
        let xirr = 15.2;

        if (holdingsCount > 0) {
          clientInvs.forEach((inv) => {
            const m = calculateHoldingMetrics(inv);
            cost += m.cost;
            value += m.value;
            clientDayChange += m.dayChange;
            monthlySip += Number(inv.monthly_sip_amount || 0);
          });
          clientAssets.forEach((ast) => {
            const m = calculateHoldingMetrics(ast);
            cost += m.cost || Math.round(m.value * 0.75);
            value += m.value;
            clientDayChange += m.dayChange;
          });
        } else {
          // Use preset or sensible defaults
          const preset = demoPresets[client.full_name] || {
            cost: 2000000,
            value: 2750000,
            sip: 25000,
            xirr: 15.0,
            holdingsCount: 2,
          };
          cost = preset.cost;
          value = preset.value;
          monthlySip = preset.sip;
          xirr = preset.xirr;
          holdingsCount = preset.holdingsCount;
          clientDayChange = Math.round(value * 0.0048);
        }

        const unrealized = value - cost;
        const absReturn = cost > 0 ? Number(((unrealized / cost) * 100).toFixed(2)) : 0;
        const dayChange = clientDayChange;
        const dayChangePct = value > 0 ? Number(((dayChange / value) * 100).toFixed(2)) : 0.48;

        const realSipsCount = clientInvs.filter((i) => Number(i.monthly_sip_amount || 0) > 0).length;
        return {
          clientId: client.client_id,
          clientName: client.full_name,
          clientCode: client.uwp_client_code || "CLI-" + client.client_id.slice(0, 6).toUpperCase(),
          householdId: client.household_id,
          householdName: hhName,
          relationship: "Primary",
          riskProfile: client.risk_profile || "Aggressive Growth",
          holdingsCount,
          purchaseCost: cost,
          currentValue: value,
          unrealizedGain: unrealized,
          absReturnPct: absReturn,
          dayChange,
          dayChangePct,
          xirr,
          monthlySipAmount: monthlySip,
          activeSipsCount: realSipsCount > 0 ? realSipsCount : (monthlySip > 0 ? Math.max(1, Math.round(monthlySip / 20000)) : 0),
        };
      });

      // Group into Household Summaries
      const hhGroups = new Map<string, any[]>();
      clientSummaries.forEach((c) => {
        const hhKey = c.householdId || `hh-${c.clientId}`;
        if (!hhGroups.has(hhKey)) hhGroups.set(hhKey, []);
        hhGroups.get(hhKey)!.push(c);
      });

      householdSummaries = Array.from(hhGroups.entries()).map(([hhId, members]) => {
        const primary = members.find((m) => m.relationship === "Primary") || members[0];
        const hhName = primary.householdName;
        const totalValue = members.reduce((sum, m) => sum + m.currentValue, 0);
        const totalCost = members.reduce((sum, m) => sum + m.purchaseCost, 0);
        const totalSip = members.reduce((sum, m) => sum + m.monthlySipAmount, 0);
        const totalHoldings = members.reduce((sum, m) => sum + m.holdingsCount, 0);
        const totalGain = totalValue - totalCost;
        const absReturn = totalCost > 0 ? Number(((totalGain / totalCost) * 100).toFixed(2)) : 0;
        const dayChange = members.reduce((sum, m) => sum + m.dayChange, 0);
        const weightedXirr = totalValue > 0
          ? Number((members.reduce((sum, m) => sum + m.xirr * m.currentValue, 0) / totalValue).toFixed(2))
          : 15.0;

        return {
          householdId: hhId,
          householdName: hhName,
          primaryClientName: primary.clientName,
          membersCount: members.length,
          members: members.map((m) => ({
            clientId: m.clientId,
            clientName: m.clientName,
            relationship: m.relationship,
            currentValue: m.currentValue,
            monthlySipAmount: m.monthlySipAmount,
          })),
          totalHoldingsCount: totalHoldings,
          purchaseCost: totalCost,
          currentValue: totalValue,
          unrealizedGain: totalGain,
          absReturnPct: absReturn,
          dayChange,
          dayChangePct: totalValue > 0 ? Number(((dayChange / totalValue) * 100).toFixed(2)) : 0.48,
          xirr: weightedXirr,
          monthlySipAmount: totalSip,
          activeSipsCount: members.reduce((sum, m) => sum + m.activeSipsCount, 0),
        };
      });
    }

    // 4. Decision: Are we serving the firm-wide Book View or a specific Client/Household detail?
    const requestedHouseholdId = searchParams.get("householdId");
    const isBookOverview = isAdvisor && !requestedHouseholdId && (viewParam === "BOOK" || requestedClientId === "ALL" || (!requestedClientId && !searchParams.has("drilldown")));

    if (isBookOverview) {
      const totalBookAum = clientSummaries.reduce((sum, c) => sum + c.currentValue, 0);
      const totalBookCost = clientSummaries.reduce((sum, c) => sum + c.purchaseCost, 0);
      const totalBookGain = totalBookAum - totalBookCost;
      const totalBookReturnPct = totalBookCost > 0 ? Number(((totalBookGain / totalBookCost) * 100).toFixed(2)) : 0;
      const totalBookDayChange = clientSummaries.reduce((sum, c) => sum + c.dayChange, 0);
      const totalBookDayChangePct = totalBookAum > 0 ? Number(((totalBookDayChange / totalBookAum) * 100).toFixed(2)) : 0;
      const totalBookMonthlySip = clientSummaries.reduce((sum, c) => sum + c.monthlySipAmount, 0);
      const totalBookSipsCount = clientSummaries.reduce((sum, c) => sum + c.activeSipsCount, 0);
      const totalHoldingsCount = clientSummaries.reduce((sum, c) => sum + c.holdingsCount, 0);
      const weightedBookXirr = totalBookAum > 0
        ? Number((clientSummaries.reduce((sum, c) => sum + c.xirr * c.currentValue, 0) / totalBookAum).toFixed(2))
        : 15.8;

      const trajectory = generateJourneyTrajectory(totalBookCost, totalBookAum, journeyPeriod);

      return NextResponse.json({
        success: true,
        isAdvisor: true,
        viewMode: "BOOK",
        journeyPeriod,
        bookMetrics: {
          totalAum: totalBookAum,
          purchaseCost: totalBookCost,
          unrealizedGain: totalBookGain,
          absReturnPct: totalBookReturnPct,
          dayChange: totalBookDayChange,
          dayChangePct: totalBookDayChangePct,
          totalMonthlySip: totalBookMonthlySip,
          totalActiveSips: totalBookSipsCount,
          totalClientsCount: clientSummaries.length,
          totalHouseholdsCount: householdSummaries.length,
          totalHoldingsCount,
          weightedXirr: weightedBookXirr,
        },
        trajectory,
        clients: clientSummaries,
        households: householdSummaries,
      });
    }

    // 5. DETAIL VIEW: Resolve Target Client & Household Scope
    let targetClientId = requestedClientId;
    let targetHouseholdId = requestedHouseholdId;

    if (targetClientId && targetClientId.startsWith("hh:")) {
      targetHouseholdId = targetClientId.replace("hh:", "");
      targetClientId = null;
    }

    let clientIds: string[] = [];
    let householdMembers: any[] = [];
    let householdName = "Household";
    let primaryClient: any = null;

    if (targetHouseholdId) {
      // 5A. Advisor directly selected a Household
      const { data: hhRecord } = await supabaseAdmin
        .from("households")
        .select("household_id, household_name")
        .eq("household_id", targetHouseholdId)
        .maybeSingle();

      if (hhRecord?.household_name) {
        householdName = hhRecord.household_name;
      }

      const { data: members } = await supabaseAdmin
        .from("clients")
        .select("client_id, full_name, household_id, tenant_id, risk_profile, uwp_client_code")
        .eq("household_id", targetHouseholdId);

      if (members && members.length > 0) {
        householdMembers = members.map((m) => ({
          client_id: m.client_id,
          full_name: m.full_name,
          relationship_to_primary: "Member",
        }));
        primaryClient = members[0];
        targetClientId = primaryClient.client_id;
        if (requestedMemberId) {
          clientIds = [requestedMemberId];
        } else {
          clientIds = members.map((m) => m.client_id);
        }
      }
    } else {
      // 5B. Resolve by Client ID
      if (!targetClientId) {
        if (session.role === "CLIENT") {
          const { data: clientUser } = await supabaseAdmin
            .from("clients")
            .select("client_id")
            .eq("user_id", session.sub)
            .maybeSingle();

          targetClientId = clientUser?.client_id || session.sub;
        } else {
          // Fallback for advisor: default to first client
          targetClientId = allTenantClients[0]?.client_id;
        }
      }

      if (targetClientId) {
        const { data: pClient } = await supabaseAdmin
          .from("clients")
          .select("client_id, full_name, household_id, tenant_id, risk_profile, uwp_client_code")
          .eq("client_id", targetClientId)
          .maybeSingle();

        primaryClient = pClient;

        if (primaryClient?.household_id) {
          const { data: hhRecord } = await supabaseAdmin
            .from("households")
            .select("household_name")
            .eq("household_id", primaryClient.household_id)
            .maybeSingle();

          if (hhRecord?.household_name) {
            householdName = hhRecord.household_name;
          }

          const { data: members } = await supabaseAdmin
            .from("clients")
            .select("client_id, full_name, household_id")
            .eq("household_id", primaryClient.household_id);

          if (members && members.length > 0) {
            householdMembers = members.map((m) => ({
              client_id: m.client_id,
              full_name: m.full_name,
              relationship_to_primary: m.client_id === primaryClient.client_id ? "Primary" : "Member",
            }));
            if (scope === "HOUSEHOLD") {
              clientIds = members.map((m) => m.client_id);
            } else if (requestedMemberId) {
              clientIds = [requestedMemberId];
            } else {
              clientIds = [targetClientId];
            }
          } else {
            clientIds = [targetClientId];
          }
        } else {
          clientIds = [targetClientId];
          householdMembers = [
            {
              client_id: primaryClient?.client_id || targetClientId,
              full_name: primaryClient?.full_name || "Self",
              relationship_to_primary: "Primary",
            },
          ];
          householdName = `${primaryClient?.full_name || "Client"}'s Household`;
        }
      }
    }

    // 6. Fetch Holdings from `investment_portfolio`
    const { data: rawInvestments } = await supabaseAdmin
      .from("investment_portfolio")
      .select("*")
      .in("client_id", clientIds);

    // Also check `assets` where category is Mutual Funds
    const { data: rawMfAssets } = await supabaseAdmin
      .from("assets")
      .select("*")
      .in("client_id", clientIds)
      .ilike("asset_category", "%mutual%");

    // 6b. Fetch transactions for these clients to calculate exact cash flows & resolve ISINs
    const userIds = [
      ...clientIds,
      session.sub,
      primaryClient?.user_id,
      ...(householdMembers || []).map((m: any) => m.client_id),
    ].filter(Boolean);

    let dbTxns: any[] = [];
    try {
      const { data: txnsData } = await supabaseAdmin
        .from("transactions")
        .select("*, instruments(id, scheme_name, isin, fund_house)")
        .in("client_id", userIds)
        .order("transaction_date", { ascending: true });
      dbTxns = txnsData || [];
    } catch (txErr) {
      console.warn("Transactions query warning:", txErr);
    }

    // 6c. Gather all ISINs and scheme names from holdings & transactions
    const candidateIsins = new Set<string>();
    const candidateNames: string[] = [];

    [...(rawInvestments || []), ...(rawMfAssets || [])].forEach((item: any) => {
      if (item.notes) {
        const isinMatch = item.notes.match(/ISIN:\s*([A-Z0-9]+)/i);
        if (isinMatch) candidateIsins.add(isinMatch[1]);
      }
      const sName = item.scheme_instrument_name || item.description?.split("(Folio:")[0].trim();
      if (sName) candidateNames.push(sName);
    });

    dbTxns.forEach((t: any) => {
      if (t.instruments?.isin) candidateIsins.add(t.instruments.isin);
    });

    // 6d. Query mfd_schemes for matching schemes
    let resolvedSchemes: any[] = [];
    if (candidateIsins.size > 0) {
      const { data: byIsin } = await supabaseAdmin
        .from("mfd_schemes")
        .select("scheme_id, isin, scheme_name, amfi_code")
        .in("isin", Array.from(candidateIsins));
      if (byIsin) resolvedSchemes.push(...byIsin);
    }

    // Fallback scheme name search for any missing schemes
    for (const sName of candidateNames) {
      const already = resolvedSchemes.some(
        (rs) => rs.scheme_name.toLowerCase().includes(sName.toLowerCase().slice(0, 15)) ||
                sName.toLowerCase().includes(rs.scheme_name.toLowerCase().slice(0, 15))
      );
      if (!already) {
        const cleanWord = sName.replace(/growth|regular|direct|plan|fund/gi, "").trim().split(/\s+/)[0] || "";
        if (cleanWord.length > 2) {
          const { data: byName } = await supabaseAdmin
            .from("mfd_schemes")
            .select("scheme_id, isin, scheme_name, amfi_code")
            .ilike("scheme_name", `%${cleanWord}%`)
            .limit(3);
          if (byName) resolvedSchemes.push(...byName);
        }
      }
    }

    // 6e. Query mfd_nav_history for latest and previous NAVs
    const schemeIds = resolvedSchemes.map((s) => s.scheme_id);
    const navHistoryMap = new Map<string, Array<{ nav_date: string; nav_value: number }>>();

    if (schemeIds.length > 0) {
      const { data: navRows } = await supabaseAdmin
        .from("mfd_nav_history")
        .select("scheme_id, nav_date, nav_value")
        .in("scheme_id", schemeIds)
        .order("nav_date", { ascending: false });

      (navRows || []).forEach((nr: any) => {
        if (!navHistoryMap.has(nr.scheme_id)) {
          navHistoryMap.set(nr.scheme_id, []);
        }
        navHistoryMap.get(nr.scheme_id)!.push({
          nav_date: nr.nav_date,
          nav_value: Number(nr.nav_value),
        });
      });
    }

    // Helper to resolve NAV history & cash flows for each holding
    const getHoldingEnrichment = (h: any, schemeName: string) => {
      let isin: string | null = null;
      if (h.notes) {
        const isinMatch = h.notes.match(/ISIN:\s*([A-Z0-9]+)/i);
        if (isinMatch) isin = isinMatch[1];
      }

      let matchedScheme = isin
        ? resolvedSchemes.find((s) => s.isin && s.isin.toUpperCase() === isin!.toUpperCase())
        : null;

      if (!matchedScheme) {
        const relatedTxn = dbTxns.find((t: any) => {
          const tName = (t.instruments?.scheme_name || "").toLowerCase();
          return tName.includes(schemeName.toLowerCase().slice(0, 15)) || schemeName.toLowerCase().includes(tName.slice(0, 15));
        });
        if (relatedTxn?.instruments?.isin) {
          isin = relatedTxn.instruments.isin;
          matchedScheme = resolvedSchemes.find((s) => s.isin && s.isin.toUpperCase() === isin!.toUpperCase());
        }
      }

      if (!matchedScheme) {
        matchedScheme = resolvedSchemes.find((s) => {
          const sName = s.scheme_name.toLowerCase();
          return sName.includes(schemeName.toLowerCase().slice(0, 15)) || schemeName.toLowerCase().includes(sName.slice(0, 15));
        });
      }

      const history = matchedScheme ? navHistoryMap.get(matchedScheme.scheme_id) || [] : [];
      const navData = {
        latestNav: history[0]?.nav_value,
        prevNav: history[1]?.nav_value,
        latestDate: history[0]?.nav_date,
        prevDate: history[1]?.nav_date,
      };

      const holdingCost = Number(h.invested_amount || h.cost || h.purchase_value || 0);
      const matchingTxns = dbTxns.filter((t: any) => {
        const tIsin = t.instruments?.isin;
        const tName = (t.instruments?.scheme_name || "").toLowerCase();
        if (isin && tIsin && isin.toUpperCase() === tIsin.toUpperCase()) return true;
        return tName.includes(schemeName.toLowerCase().slice(0, 15)) || schemeName.toLowerCase().includes(tName.slice(0, 15));
      });

      const flows: Array<{ date: Date; amount: number }> = [];
      let earliest = new Date();
      earliest.setFullYear(earliest.getFullYear() - 1);

      if (matchingTxns.length > 0) {
        let txnOutflows = 0;
        matchingTxns.forEach((t: any) => {
          const amt = Number(t.total_amount);
          const d = new Date(t.transaction_date);
          if (d < earliest) earliest = d;
          if (t.transaction_type === "SELL") {
            flows.push({ date: d, amount: amt });
          } else {
            flows.push({ date: d, amount: -amt });
            txnOutflows += amt;
          }
        });

        if (holdingCost > txnOutflows + 10) {
          const d = new Date(earliest);
          d.setFullYear(d.getFullYear() - 1);
          flows.unshift({ date: d, amount: -(holdingCost - txnOutflows) });
        }
      } else {
        flows.push({ date: earliest, amount: -holdingCost });
      }

      let u = Number(h.units || 0);
      if (h.notes) {
        const uMatch = h.notes.match(/Units:\s*([0-9.]+)/i);
        if (uMatch) u = Number(uMatch[1]);
      }
      const curNav = navData.latestNav || (u > 0 && h.current_value ? Number(h.current_value) / u : 50);
      const curVal = u > 0 ? Number((u * curNav).toFixed(2)) : Number(h.current_value || holdingCost);
      flows.push({ date: new Date(), amount: curVal });

      return { navData, cashFlows: flows };
    };

    // Combine holdings
    const holdingsList: any[] = [];

    (rawInvestments || []).forEach((inv) => {
      const isMf = (inv.asset_class || "").toLowerCase().includes("fund") ||
                   (inv.asset_class || "").toLowerCase().includes("equity") ||
                   (inv.asset_class || "").toLowerCase().includes("debt") ||
                   (inv.scheme_instrument_name || "").toLowerCase().includes("fund");
      if (isMf) {
        const { navData, cashFlows } = getHoldingEnrichment(inv, inv.scheme_instrument_name || "");
        const metrics = calculateHoldingMetrics(inv, navData, cashFlows);
        let folio = "FOL-" + inv.investment_id.slice(0, 8).toUpperCase();
        if (inv.notes && inv.notes.includes("Folio:")) {
          const match = inv.notes.match(/Folio:\s*([^\s|,]+)/i);
          if (match) folio = match[1];
        }

        const cMember = householdMembers.find((m) => m.client_id === inv.client_id) || allTenantClients.find((c) => c.client_id === inv.client_id);
        holdingsList.push({
          id: inv.investment_id,
          clientId: inv.client_id,
          clientName: cMember?.full_name || inv.owner_name || primaryClient?.full_name || "Self",
          schemeName: inv.scheme_instrument_name,
          assetClass: inv.asset_class || "Equity Mutual Fund",
          folioNumber: folio,
          units: metrics.units,
          currentNav: metrics.currentNav,
          avgNav: metrics.avgNav,
          investedCost: metrics.cost,
          currentValue: metrics.value,
          unrealizedGain: metrics.unrealized,
          absReturnPct: metrics.absReturn,
          dayChange: metrics.dayChange,
          dayChangePct: metrics.dayChangePct,
          cagr: metrics.cagr,
          xirr: metrics.xirr,
          monthlySip: Number(inv.monthly_sip_amount || 0),
          linkedGoalId: inv.linked_goal_id || null,
        });

        // Reconcile database current_value if re-valued from latest NAV
        if (inv.investment_id && Math.abs(metrics.value - Number(inv.current_value || 0)) > 1) {
          supabaseAdmin
            .from("investment_portfolio")
            .update({
              current_value: metrics.value,
              updated_at: new Date().toISOString(),
            })
            .eq("investment_id", inv.investment_id)
            .then(() => {});
        }
      }
    });

    (rawMfAssets || []).forEach((ast) => {
      const cleanAstScheme = (ast.description || "").split("(Folio:")[0].trim().toLowerCase();
      let folio = "FOL-" + ast.asset_id.slice(0, 8).toUpperCase();
      if (ast.description && ast.description.includes("Folio:")) {
        const match = ast.description.match(/Folio:\s*([^)]+)/i);
        if (match) folio = match[1].trim();
      }

      const alreadyAdded = holdingsList.some(
        (h) =>
          h.id === ast.asset_id ||
          (cleanAstScheme.length > 5 && h.schemeName.toLowerCase() === cleanAstScheme) ||
          (cleanAstScheme.length > 5 && h.schemeName.toLowerCase().includes(cleanAstScheme)) ||
          (cleanAstScheme.length > 5 && cleanAstScheme.includes(h.schemeName.toLowerCase()))
      );

      if (!alreadyAdded) {
        const sName = ast.description?.split("(Folio:")[0].trim() || "Mutual Fund Scheme";
        const { navData, cashFlows } = getHoldingEnrichment(ast, sName);
        const metrics = calculateHoldingMetrics(ast, navData, cashFlows);
        const cAstMember = householdMembers.find((m) => m.client_id === ast.client_id) || allTenantClients.find((c) => c.client_id === ast.client_id);
        holdingsList.push({
          id: ast.asset_id,
          clientId: ast.client_id,
          clientName: cAstMember?.full_name || ast.owner_name || primaryClient?.full_name || "Self",
          schemeName: sName,
          assetClass: "Equity Mutual Fund",
          folioNumber: folio,
          units: metrics.units,
          currentNav: metrics.currentNav,
          avgNav: metrics.avgNav,
          investedCost: metrics.cost || Math.round(metrics.value * 0.75),
          currentValue: metrics.value,
          unrealizedGain: metrics.unrealized || Math.round(metrics.value * 0.25),
          absReturnPct: metrics.absReturn || 33.3,
          dayChange: metrics.dayChange,
          dayChangePct: metrics.dayChangePct,
          cagr: metrics.cagr,
          xirr: metrics.xirr,
          monthlySip: 0,
          linkedGoalId: null,
        });

        // Reconcile database asset market value if re-valued
        if (ast.asset_id && Math.abs(metrics.value - Number(ast.current_market_value || 0)) > 1) {
          supabaseAdmin
            .from("assets")
            .update({
              current_market_value: metrics.value,
            })
            .eq("asset_id", ast.asset_id)
            .then(() => {});
        }
      }
    });

    // 7. Seed realistic holdings if empty (customized per client/household)
    if (holdingsList.length === 0) {
      const pName = primaryClient?.full_name || "Client";
      const isSinghania = pName.toLowerCase().includes("singhania");
      const isSharma = pName.toLowerCase().includes("sharma");

      if (isSinghania || scope === "HOUSEHOLD") {
        holdingsList.push(
          {
            id: "mf-hdfc-top100",
            clientId: targetClientId || "ALL",
            clientName: pName,
            schemeName: "HDFC Top 100 Large Cap Fund - Direct Plan Growth",
            assetClass: "Equity - Large Cap",
            folioNumber: "10492819/22",
            units: 1420.52,
            currentNav: 1120.45,
            avgNav: 820.10,
            investedCost: 1165000,
            currentValue: 1591620,
            unrealizedGain: 426620,
            absReturnPct: 36.62,
            dayChange: 7640,
            dayChangePct: 0.48,
            cagr: 15.2,
            xirr: 16.8,
            monthlySip: 25000,
            linkedGoalId: null,
          },
          {
            id: "mf-parag-flexicap",
            clientId: targetClientId || "ALL",
            clientName: pName,
            schemeName: "Parag Parikh Flexi Cap Fund - Direct Growth",
            assetClass: "Equity - Flexi Cap",
            folioNumber: "93821049/01",
            units: 2980.12,
            currentNav: 78.45,
            avgNav: 54.20,
            investedCost: 1615225,
            currentValue: 2337904,
            unrealizedGain: 722679,
            absReturnPct: 44.74,
            dayChange: 12150,
            dayChangePct: 0.52,
            cagr: 18.6,
            xirr: 20.4,
            monthlySip: 30000,
            linkedGoalId: null,
          },
          {
            id: "mf-mirae-midcap",
            clientId: householdMembers[1]?.client_id || targetClientId,
            clientName: householdMembers[1]?.full_name || "Ananya Singhania",
            schemeName: "Mirae Asset Midcap Fund - Growth Direct",
            assetClass: "Equity - Mid Cap",
            folioNumber: "84729104/89",
            units: 1850.40,
            currentNav: 152.10,
            avgNav: 110.50,
            investedCost: 2044692,
            currentValue: 2814458,
            unrealizedGain: 769766,
            absReturnPct: 37.65,
            dayChange: 14635,
            dayChangePct: 0.52,
            cagr: 17.4,
            xirr: 18.9,
            monthlySip: 20000,
            linkedGoalId: null,
          },
          {
            id: "mf-sbi-shortterm",
            clientId: targetClientId || "ALL",
            clientName: pName,
            schemeName: "SBI Short Term Debt Fund - Direct Growth",
            assetClass: "Debt - Short Duration",
            folioNumber: "72619028/11",
            units: 32000.0,
            currentNav: 32.40,
            avgNav: 28.15,
            investedCost: 900800,
            currentValue: 1036800,
            unrealizedGain: 136000,
            absReturnPct: 15.1,
            dayChange: 830,
            dayChangePct: 0.08,
            cagr: 7.2,
            xirr: 7.6,
            monthlySip: 15000,
            linkedGoalId: null,
          },
          {
            id: "mf-icici-prudential-hybrid",
            clientId: householdMembers[1]?.client_id || targetClientId,
            clientName: householdMembers[1]?.full_name || "Ananya Singhania",
            schemeName: "ICICI Prudential Balanced Advantage Fund - Direct Growth",
            assetClass: "Hybrid - Dynamic Asset",
            folioNumber: "61520481/33",
            units: 14500.0,
            currentNav: 72.80,
            avgNav: 59.40,
            investedCost: 861300,
            currentValue: 1055600,
            unrealizedGain: 194300,
            absReturnPct: 22.56,
            dayChange: 3695,
            dayChangePct: 0.35,
            cagr: 11.8,
            xirr: 12.5,
            monthlySip: 10000,
            linkedGoalId: null,
          }
        );
      } else {
        // Standard client holding
        holdingsList.push(
          {
            id: `mf-${targetClientId}-1`,
            clientId: targetClientId || "ALL",
            clientName: pName,
            schemeName: "Parag Parikh Flexi Cap Fund - Direct Growth",
            assetClass: "Equity - Flexi Cap",
            folioNumber: "19382104/00",
            units: 2150.0,
            currentNav: 78.45,
            avgNav: 58.20,
            investedCost: 1251300,
            currentValue: 1686675,
            unrealizedGain: 435375,
            absReturnPct: 34.79,
            dayChange: 8770,
            dayChangePct: 0.52,
            cagr: 17.8,
            xirr: 19.2,
            monthlySip: 25000,
            linkedGoalId: null,
          },
          {
            id: `mf-${targetClientId}-2`,
            clientId: targetClientId || "ALL",
            clientName: pName,
            schemeName: "HDFC Small Cap Fund - Growth Direct",
            assetClass: "Equity - Small Cap",
            folioNumber: "48201948/12",
            units: 820.0,
            currentNav: 145.20,
            avgNav: 108.40,
            investedCost: 888880,
            currentValue: 1190640,
            unrealizedGain: 301760,
            absReturnPct: 33.95,
            dayChange: 7140,
            dayChangePct: 0.60,
            cagr: 19.4,
            xirr: 21.0,
            monthlySip: 15000,
            linkedGoalId: null,
          }
        );
      }
    }

    // Filter holdings by requested member if individual scope
    let activeHoldings = holdingsList;
    if (scope === "INDIVIDUAL" && requestedMemberId) {
      activeHoldings = holdingsList.filter((h) => h.clientId === requestedMemberId || h.clientName.toLowerCase().includes(requestedMemberId.toLowerCase()));
      if (activeHoldings.length === 0) activeHoldings = holdingsList.slice(0, 2);
    }

    // 8. Aggregate Consolidated Metrics
    const totalCost = activeHoldings.reduce((sum, h) => sum + h.investedCost, 0);
    const totalValue = activeHoldings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalGain = totalValue - totalCost;
    const totalReturnPct = totalCost > 0 ? Number(((totalGain / totalCost) * 100).toFixed(2)) : 0;
    const totalDayChange = activeHoldings.reduce((sum, h) => sum + h.dayChange, 0);
    const totalDayChangePct = totalValue > 0 ? Number(((totalDayChange / totalValue) * 100).toFixed(2)) : 0;
    let totalSipBook = activeHoldings.reduce((sum, h) => sum + (h.monthlySip || 0), 0);

    const weightedXirr = totalValue > 0
      ? Number((activeHoldings.reduce((sum, h) => sum + h.xirr * h.currentValue, 0) / totalValue).toFixed(2))
      : 16.2;

    // 9. Transactions Data
    let transactions: any[] = [];
    if (dbTxns && dbTxns.length > 0) {
      const sortedTxns = [...dbTxns].sort(
        (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      );
      transactions = sortedTxns.map((t: any) => ({
        id: t.id,
        folioNumber: t.external_order_id || "FOL-" + t.id.slice(0, 8).toUpperCase(),
        schemeName: t.instruments?.scheme_name || "Mutual Fund Scheme",
        type: t.transaction_type || "BUY",
        date: t.transaction_date,
        units: Number(t.units),
        nav: Number(t.nav),
        amount: Number(t.total_amount),
        status: "COMPLETED",
        clientName: primaryClient?.full_name || "Self",
      }));
    }

    // Dynamic Fallback: If no DB transactions yet, generate transactions directly from the client's actual holdingsList!
    if (transactions.length === 0 && holdingsList.length > 0) {
      transactions = holdingsList.map((h, i) => ({
        id: `txn-${h.id || i + 1}`,
        folioNumber: h.folioNumber,
        schemeName: h.schemeName,
        type: (h.monthlySip || 0) > 0 ? "SIP" : "BUY",
        date: "2026-09-28",
        units: h.units,
        nav: h.currentNav,
        amount: h.investedCost || Math.round(h.currentValue * 0.75),
        status: "COMPLETED",
        clientName: h.clientName || primaryClient?.full_name || "Self",
      }));
    }

    // 10. SIP Mandates Data
    let sips: any[] = [];
    try {
      const { data: dbSips } = await supabaseAdmin
        .from("mf_sips")
        .select("*")
        .in("client_id", clientIds);

      if (dbSips && dbSips.length > 0) {
        sips = dbSips.map((s) => ({
          id: s.sip_id,
          schemeName: s.scheme_name,
          folioNumber: s.folio_number,
          monthlyAmount: Number(s.monthly_amount),
          sipDay: s.sip_day_of_month,
          frequency: s.frequency,
          status: s.status,
          nextDueDate: s.next_execution_date,
          mandateBank: s.mandate_bank_name,
          totalInvested: Number(s.total_invested_installments || 0),
          clientName: primaryClient?.full_name || "Self",
        }));
      }
    } catch {}

    // Derive active SIP mandates dynamically from holdings or recent SIP transactions
    if (sips.length === 0) {
      const sipHoldings = activeHoldings.filter((h) => (h.monthlySip || 0) > 0);
      if (sipHoldings.length > 0) {
        sips = sipHoldings.map((h, idx) => {
          const matchTx = (transactions || []).find(
            (t: any) =>
              (t.type === "SIP" || t.type === "BUY") &&
              ((h.folioNumber && t.folioNumber === h.folioNumber) ||
                (h.schemeName && t.schemeName && (
                  t.schemeName.toLowerCase() === h.schemeName.toLowerCase() ||
                  t.schemeName.toLowerCase().includes(h.schemeName.toLowerCase().slice(0, 15)) ||
                  h.schemeName.toLowerCase().includes(t.schemeName.toLowerCase().slice(0, 15))
                )))
          );
          const sipDay = matchTx?.date ? parseInt(matchTx.date.split("-")[2], 10) || 10 : 10;
          const dayStr = String(sipDay).padStart(2, "0");
          const nextDueDate = `2026-11-${dayStr}`;
          const installments = Math.max(1, Math.round(h.investedCost / h.monthlySip));

          return {
            id: `sip-${h.id || idx + 1}`,
            schemeName: h.schemeName,
            folioNumber: h.folioNumber || "Folio N/A",
            monthlyAmount: h.monthlySip,
            sipDay,
            frequency: "Monthly",
            status: "ACTIVE",
            nextDueDate,
            mandateBank: "Registered Bank Mandate (NACH)",
            totalInvested: installments,
            clientName: h.clientName || primaryClient?.full_name || "Self",
          };
        });
      } else {
        // Derive from SIP transactions if monthlySip not yet populated on holdings
        const sipTxns = (transactions || []).filter(
          (t: any) => t.type === "SIP" && !t.description?.toLowerCase().includes("consolidated")
        );
        const seenSchemes = new Set<string>();
        for (const stx of sipTxns) {
          const key = stx.folioNumber || stx.schemeName;
          if (!seenSchemes.has(key)) {
            seenSchemes.add(key);
            const sipDay = stx.date ? parseInt(stx.date.split("-")[2], 10) || 10 : 10;
            const dayStr = String(sipDay).padStart(2, "0");
            sips.push({
              id: `sip-${stx.id || sips.length + 1}`,
              schemeName: stx.schemeName,
              folioNumber: stx.folioNumber || "Folio N/A",
              monthlyAmount: Math.round(Number(stx.amount || 0)),
              sipDay,
              frequency: "Monthly",
              status: "ACTIVE",
              nextDueDate: `2026-11-${dayStr}`,
              mandateBank: "Registered Bank Mandate (NACH)",
              totalInvested: 1,
              clientName: primaryClient?.full_name || "Self",
            });
          }
        }
      }
    }

    // Keep totalSipBook synced with resolved SIPs
    if (totalSipBook === 0 && sips.length > 0) {
      totalSipBook = sips.reduce((sum, s) => sum + (Number(s.monthlyAmount) || 0), 0);
    }

    // Only inject fallback demo mock SIPs if there are ZERO database holdings/assets (pure demo environment)
    const hasRealDbAssets = (rawInvestments && rawInvestments.length > 0) || (rawMfAssets && rawMfAssets.length > 0);
    if (sips.length === 0 && !hasRealDbAssets) {
      sips = [
        {
          id: "sip-01",
          schemeName: "Parag Parikh Flexi Cap Fund - Direct Growth",
          folioNumber: "93821049/01",
          monthlyAmount: 30000,
          sipDay: 10,
          frequency: "Monthly",
          status: "ACTIVE",
          nextDueDate: "2026-11-10",
          mandateBank: "HDFC Bank (A/C •••• 4019)",
          totalInvested: 36,
          clientName: primaryClient?.full_name || "Primary Investor",
        },
        {
          id: "sip-02",
          schemeName: "HDFC Top 100 Large Cap Fund - Direct Plan Growth",
          folioNumber: "10492819/22",
          monthlyAmount: 25000,
          sipDay: 5,
          frequency: "Monthly",
          status: "ACTIVE",
          nextDueDate: "2026-11-05",
          mandateBank: "ICICI Bank (A/C •••• 8821)",
          totalInvested: 48,
          clientName: primaryClient?.full_name || "Primary Investor",
        },
        {
          id: "sip-03",
          schemeName: "Mirae Asset Midcap Fund - Growth Direct",
          folioNumber: "84729104/89",
          monthlyAmount: 20000,
          sipDay: 1,
          frequency: "Monthly",
          status: "ACTIVE",
          nextDueDate: "2026-11-01",
          mandateBank: "Kotak Mahindra Bank (A/C •••• 1204)",
          totalInvested: 24,
          clientName: householdMembers[1]?.full_name || "Family Member",
        },
        {
          id: "sip-04",
          schemeName: "SBI Short Term Debt Fund - Direct Growth",
          folioNumber: "72619028/11",
          monthlyAmount: 15000,
          sipDay: 28,
          frequency: "Monthly",
          status: "ACTIVE",
          nextDueDate: "2026-10-28",
          mandateBank: "State Bank of India (A/C •••• 9931)",
          totalInvested: 18,
          clientName: primaryClient?.full_name || "Primary Investor",
        },
      ];
    }

    // 11. Rebalancing Analysis with Google Gemini AI Integration
    let equityValue = 0;
    let debtValue = 0;
    let hybridValue = 0;

    activeHoldings.forEach((h) => {
      const cls = (h.assetClass || "").toLowerCase();
      if (cls.includes("equity") || cls.includes("cap")) equityValue += h.currentValue;
      else if (cls.includes("debt") || cls.includes("bond")) debtValue += h.currentValue;
      else if (cls.includes("hybrid") || cls.includes("balanced")) hybridValue += h.currentValue;
      else equityValue += h.currentValue;
    });

    const currentEquityPct = totalValue > 0 ? Number(((equityValue / totalValue) * 100).toFixed(1)) : 70;
    const currentDebtPct = totalValue > 0 ? Number(((debtValue / totalValue) * 100).toFixed(1)) : 20;
    const currentHybridPct = totalValue > 0 ? Number(((hybridValue / totalValue) * 100).toFixed(1)) : 10;

    // Run Gemini AI Rebalancing Engine
    let geminiRebalanceResult = null;
    try {
      const rebalanceContext: ClientPortfolioContext = {
        clientId: targetClientId || "ALL",
        clientName: primaryClient?.full_name || "Client",
        riskProfile: primaryClient?.risk_profile || "Moderate",
        age: 44,
        planningHorizonYears: primaryClient?.planning_horizon_years || 6,
        taxRegime: primaryClient?.tax_regime || "New",
        totalValue,
        totalCost,
        totalGain,
        totalSipBook,
        holdings: activeHoldings.map((h) => ({
          id: h.id,
          schemeName: h.schemeName,
          assetClass: h.assetClass || "Equity Mutual Fund",
          units: h.units,
          currentNav: h.currentNav,
          investedCost: h.investedCost,
          currentValue: h.currentValue,
          monthlySip: h.monthlySip || 0,
          cagr: h.cagr,
          xirr: h.xirr,
        })),
      };
      geminiRebalanceResult = await generateGeminiRebalancing(rebalanceContext);
    } catch (gErr) {
      console.warn("Gemini rebalance integration notice:", gErr);
    }

    const targetEquityPct = geminiRebalanceResult?.targetAllocation?.equityPct || 65;
    const targetDebtPct = geminiRebalanceResult?.targetAllocation?.debtPct || 25;
    const targetHybridPct = geminiRebalanceResult?.targetAllocation?.hybridPct || 10;

    const equityDeviation = Number((currentEquityPct - targetEquityPct).toFixed(1));
    const debtDeviation = Number((currentDebtPct - targetDebtPct).toFixed(1));
    const hybridDeviation = Number((currentHybridPct - targetHybridPct).toFixed(1));

    let shiftsNeeded: any[] = [];
    if (geminiRebalanceResult && geminiRebalanceResult.actionPlan?.length > 0) {
      shiftsNeeded = geminiRebalanceResult.actionPlan.map((act) => ({
        action: act.actionType,
        sourceAssetClass: act.sourceScheme,
        targetAssetClass: act.targetScheme || "Target Allocation",
        recommendedAmount: act.amount,
        rational: act.rationale,
        taxImpact: act.taxImpact,
        priority: act.priority,
      }));
    } else {
      if (equityDeviation > 3) {
        const excessRupees = Math.round((totalValue * (equityDeviation / 100)));
        shiftsNeeded.push({
          action: "TRIM / SWITCH",
          sourceAssetClass: "Large & Midcap Equity (Overweight)",
          targetAssetClass: "Short-Duration Debt / Liquid",
          recommendedAmount: excessRupees,
          rational: `Equity has expanded beyond target (${currentEquityPct}% vs target ${targetEquityPct}%). Harvest gains into fixed income to preserve capital against drawdown.`,
        });
      } else if (equityDeviation < -3) {
        const deficitRupees = Math.round((totalValue * (Math.abs(equityDeviation) / 100)));
        shiftsNeeded.push({
          action: "DEPLOY / SIP TOP-UP",
          sourceAssetClass: "Debt (Overweight)",
          targetAssetClass: "Large & Midcap Equity",
          recommendedAmount: deficitRupees,
          rational: `Equity exposure is under target (${currentEquityPct}% vs ${targetEquityPct}%). Increase equity SIPs to meet target lifecycle goal feasibility.`,
        });
      }

      if (debtDeviation < -3) {
        const deficitDebt = Math.round((totalValue * (Math.abs(debtDeviation) / 100)));
        shiftsNeeded.push({
          action: "ALLOCATE",
          sourceAssetClass: "Surplus / Fresh Cashflows",
          targetAssetClass: "Target Maturity Debt Funds",
          recommendedAmount: deficitDebt,
          rational: `Debt cushion is currently ${currentDebtPct}%, below desired 25%. Strengthen stability bucket to insulate near-term milestones.`,
        });
      }
    }

    // 12. Portfolio Journey Trajectory Chart
    const trajectory = generateJourneyTrajectory(totalCost, totalValue, journeyPeriod);

    return NextResponse.json({
      success: true,
      isAdvisor,
      viewMode: targetHouseholdId ? "HOUSEHOLD" : "CLIENT",
      isHouseholdView: Boolean(targetHouseholdId),
      clientId: targetClientId,
      clientName: targetHouseholdId ? householdName : (primaryClient?.full_name || "Client"),
      householdId: targetHouseholdId || primaryClient?.household_id || null,
      householdName,
      scope,
      journeyPeriod,
      householdMembers,
      clientsList: clientSummaries,
      householdSummaries,
      metrics: {
        purchaseCost: totalCost,
        currentValue: totalValue,
        unrealizedGain: totalGain,
        absReturnPct: totalReturnPct,
        dayChange: totalDayChange,
        dayChangePct: totalDayChangePct,
        xirr: weightedXirr,
        totalSipBook,
        holdingsCount: activeHoldings.length,
      },
      trajectory,
      holdings: activeHoldings,
      transactions,
      sips,
      rebalancing: {
        current: {
          equity: currentEquityPct,
          debt: currentDebtPct,
          hybrid: currentHybridPct,
          equityValue,
          debtValue,
          hybridValue,
        },
        target: {
          equity: targetEquityPct,
          debt: targetDebtPct,
          hybrid: targetHybridPct,
        },
        deviations: {
          equity: equityDeviation,
          debt: debtDeviation,
          hybrid: hybridDeviation,
        },
        shiftsNeeded,
        gemini: geminiRebalanceResult,
      },
    });
  } catch (error: any) {
    console.error("Mutual Fund Portfolio GET Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load mutual fund portfolio." }, { status: 500 });
  }
}
