import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { unpackAsset, unpackInvestment, unpackGoal } from "@/lib/goalAssetAlignment";


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

    // Helper for calculation
    const calculateMetrics = (cIds: string[]) => {
      const filteredAssets = assets.filter((a) => a.client_id && cIds.includes(a.client_id));
      const filteredInvestments = investments.filter((i) => i.client_id && cIds.includes(i.client_id));
      const filteredLiabilities = liabilities.filter((l) => cIds.includes(l.client_id));
      const filteredIncomes = incomes.filter((inc) => cIds.includes(inc.client_id));
      const filteredExpenses = expenses.filter((e) => cIds.includes(e.client_id));

      const physicalAssets = filteredAssets.reduce((sum, a) => sum + Number(a.current_market_value || 0), 0);
      const investmentAssets = filteredInvestments.reduce((sum, i) => sum + Number(i.current_value || 0), 0);
      const totalAssets = physicalAssets + investmentAssets;

      const liquidPhysical = filteredAssets
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
      assets,
      liabilities,
      investments,
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

