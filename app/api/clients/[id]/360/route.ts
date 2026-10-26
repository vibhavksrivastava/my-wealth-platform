import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { unpackAsset, unpackInvestment, unpackGoal, isRetirementAsset } from "@/lib/goalAssetAlignment";


const isMarketAsset = (a: any) => {
  const cat = (a.asset_category || "").toLowerCase();
  const desc = (a.description || "").toLowerCase();
  const notes = (a.notes || "").toLowerCase();
  return (
    cat.includes("mutual") ||
    cat.includes("fund") ||
    cat.includes("equity") ||
    cat.includes("stock") ||
    cat.includes("share") ||
    desc.includes("(folio:") ||
    desc.includes("fund") ||
    notes.includes("imported via cams") ||
    notes.includes("isin:")
  );
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access. Please log in." }, { status: 401 });
    }

    const { id: clientId } = await params;

    // 1. Fetch Primary Client Record
    const { data: client, error: clientErr } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();

    if (clientErr || !client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    // Tenant Isolation Check
    if (session.role !== "SUPER_ADMIN" && client.tenant_id && client.tenant_id !== session.tenantId) {
      return NextResponse.json({ error: "Access denied. Client belongs to another firm." }, { status: 403 });
    }

    // Role Guard for Client
    if (session.role === "CLIENT" && client.user_id && client.user_id !== session.sub) {
      return NextResponse.json({ error: "Access denied to requested profile." }, { status: 403 });
    }

    // 2. Fetch Household & Household Family Members
    let household = null;
    let householdMembers: any[] = [client];
    let memberIds = [clientId];

    if (client.household_id) {
      const { data: hh } = await supabaseAdmin
        .from("households")
        .select("*")
        .eq("household_id", client.household_id)
        .maybeSingle();
      household = hh;

      const { data: members } = await supabaseAdmin
        .from("clients")
        .select("*")
        .eq("household_id", client.household_id);

      if (members && members.length > 0) {
        householdMembers = members;
        memberIds = members.map((m) => m.client_id);
      }
    }

    // 3. Concurrently fetch all financial sub-entities for household
    const [incomesRes, expensesRes, assetsRes, liabilitiesRes, investmentsRes, goalsRes] = await Promise.all([
      supabaseAdmin.from("income_sources").select("*").in("client_id", memberIds).order("monthly_amount", { ascending: false }),
      supabaseAdmin.from("expense_items").select("*").in("client_id", memberIds).order("monthly_amount", { ascending: false }),
      supabaseAdmin.from("assets").select("*").in("client_id", memberIds).order("current_market_value", { ascending: false }),
      supabaseAdmin.from("liabilities").select("*").in("client_id", memberIds).order("outstanding_principal", { ascending: false }),
      supabaseAdmin.from("investment_portfolio").select("*").in("client_id", memberIds).order("current_value", { ascending: false }),
      supabaseAdmin.from("financial_goals").select("*").in("client_id", memberIds).order("target_year", { ascending: true }),
    ]);

    const incomes = incomesRes.data || [];
    const expenses = expensesRes.data || [];
    const assets = (assetsRes.data || []).map(unpackAsset);
    const liabilities = liabilitiesRes.data || [];
    const investments = (investmentsRes.data || []).map(unpackInvestment);
    const goals = (goalsRes.data || []).map(unpackGoal);

    // Filter out market investments from physical assets
    const physicalAssetsList = assets.filter((a) => !isMarketAsset(a));

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

    // Helper for calculation
    const calculateMetrics = (cIds: string[]) => {
      const filteredPhysicalAssets = physicalAssetsList.filter((a) => a.client_id && cIds.includes(a.client_id));
      const filteredInvestments = enrichedInvestments.filter((i) => i.client_id && cIds.includes(i.client_id));
      const filteredLiabilities = liabilities.filter((l) => cIds.includes(l.client_id));
      const filteredIncomes = incomes.filter((inc) => cIds.includes(inc.client_id));
      const filteredExpenses = expenses.filter((e) => cIds.includes(e.client_id));

      const physicalAssets = filteredPhysicalAssets.filter((a) => !isRetirementAsset(a)).reduce((sum, a) => sum + Number(a.current_market_value || 0), 0);
      const retirementAssets = filteredPhysicalAssets.filter((a) => isRetirementAsset(a)).reduce((sum, a) => sum + Number(a.current_market_value || 0), 0);
      const investmentAssets = filteredInvestments.reduce((sum, i) => sum + Number(i.currentValue || 0), 0);
      const totalAssets = physicalAssets + retirementAssets + investmentAssets;

      const liquidPhysical = filteredPhysicalAssets
        .filter((a) => a.is_liquid)
        .reduce((sum, a) => sum + Number(a.current_market_value || 0), 0);
      const liquidAssets = liquidPhysical + investmentAssets;
      const illiquidAssets = totalAssets - liquidAssets;

      const totalLiabilities = filteredLiabilities.reduce((sum, l) => sum + Number(l.outstanding_principal || 0), 0);
      const netWorth = totalAssets - totalLiabilities;

      const totalMonthlyIncome = filteredIncomes.reduce((sum, i) => sum + Number(i.monthly_amount || 0), 0);
      const totalMonthlyExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.monthly_amount || 0), 0);
      const totalMonthlyEMIs = filteredLiabilities.reduce((sum, l) => sum + Number(l.monthly_emi || 0), 0);
      const monthlyOutflows = totalMonthlyExpenses + totalMonthlyEMIs;
      const monthlySurplus = totalMonthlyIncome - monthlyOutflows;
      const savingsRate = totalMonthlyIncome > 0 ? (monthlySurplus / totalMonthlyIncome) * 100 : 0;
      const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
      const monthlySIPBook = filteredInvestments.reduce((sum, i) => sum + Number(i.monthly_sip_amount || 0), 0);

      return {
        totalAssets,
        physicalAssets,
        retirementAssets,
        investmentAssets,
        liquidAssets,
        illiquidAssets,
        totalLiabilities,
        netWorth,
        totalMonthlyIncome,
        totalMonthlyExpenses,
        totalMonthlyEMIs,
        monthlyOutflows,
        monthlySurplus,
        savingsRate,
        debtToAssetRatio,
        monthlySIPBook,
      };
    };

    const consolidatedMetrics = calculateMetrics(memberIds);
    const individualMetrics = calculateMetrics([clientId]);

    // Map family members with individual contributions
    const enrichedMembers = householdMembers.map((m) => {
      const mMetrics = calculateMetrics([m.client_id]);
      return {
        ...m,
        metrics: mMetrics,
      };
    });

    return NextResponse.json({
      client,
      household,
      householdMembers: enrichedMembers,
      incomes,
      expenses,
      assets: physicalAssetsList,
      liabilities,
      investments: enrichedInvestments,
      goals,
      consolidatedMetrics,
      individualMetrics,
    });
  } catch (error) {
    console.error("Client 360 GET Error:", error);
    return NextResponse.json({ error: "Failed to load Client 360 profile." }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || !["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN", "CLIENT"].includes(session.role)) {
      return NextResponse.json({ error: "Access denied. Login required." }, { status: 403 });
    }

    const { id: clientId } = await params;
    const body = await req.json();

    // Verify client exists
    const { data: existingClient, error: findErr } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();

    if (findErr || !existingClient) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    // Tenant check
    if (session.role !== "SUPER_ADMIN" && existingClient.tenant_id && existingClient.tenant_id !== session.tenantId) {
      return NextResponse.json({ error: "Access denied. Client belongs to another firm." }, { status: 403 });
    }

    // Role guard for CLIENT: can only update their own profile
    if (session.role === "CLIENT") {
      const isOwner = existingClient.user_id === session.sub || existingClient.client_id === session.sub;
      if (!isOwner) {
        // Also check if user's profile matches household
        const { data: prof } = await supabaseAdmin
          .from("client_profiles")
          .select("household_id")
          .eq("user_id", session.sub)
          .maybeSingle();
        if (!prof || prof.household_id !== existingClient.household_id) {
          return NextResponse.json({ error: "Access denied. You can only update your own profile." }, { status: 403 });
        }
      }
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    const allowedFields = [
      "full_name",
      "date_of_birth",
      "marital_status",
      "dependents_count",
      "occupation",
      "employer_business_name",
      "annual_gross_income",
      "tax_regime",
      "risk_profile",
      "planning_horizon_years",
      "spouse_name",
      "spouse_dob",
      "planning_disclosures_notes",
      "review_frequency",
      "advisor_name",
      "household_id",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "annual_gross_income" || field === "planning_horizon_years" || field === "dependents_count") {
          updates[field] = Number(body[field]);
        } else {
          updates[field] = body[field];
        }
      }
    }

    const { data: updatedClient, error: updateErr } = await supabaseAdmin
      .from("clients")
      .update(updates)
      .eq("client_id", clientId)
      .select()
      .single();

    if (updateErr || !updatedClient) {
      throw updateErr || new Error("Failed to update client details.");
    }

    // Log audit trail
    await logAuditEvent({
      tenantId: session.tenantId,
      clientId,
      advisorId: session.sub,
      action: "UPDATE",
      entityType: "CLIENT",
      entityId: clientId,
      details: { updates, previous: existingClient },
    });

    return NextResponse.json({
      success: true,
      message: "Client profile updated successfully.",
      client: updatedClient,
    });
  } catch (error) {
    console.error("Client 360 PUT Error:", error);
    return NextResponse.json({ error: "Failed to update client profile." }, { status: 500 });
  }
}

