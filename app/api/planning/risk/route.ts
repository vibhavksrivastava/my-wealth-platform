import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { unpackAsset } from "@/lib/goalAssetAlignment";
import {
  generateConsolidatedRiskAssessment,
  RiskEngineInput,
} from "@/lib/risk/riskEngine";
import { logAuditEvent } from "@/lib/audit";

function isLiquidOrMarketAsset(category?: string | null): boolean {
  const cat = (category || "").toLowerCase().trim();
  if (
    cat.includes("real estate") ||
    cat.includes("property") ||
    cat.includes("land") ||
    cat.includes("vehicle") ||
    cat.includes("automobile") ||
    cat.includes("gold physical") ||
    cat.includes("jewel")
  ) {
    return false;
  }
  return true;
}

export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access. Please log in." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedClientId = searchParams.get("clientId");
    const requestedMemberId = searchParams.get("memberId");
    const requestedScope = searchParams.get("scope"); // "HOUSEHOLD" | "INDIVIDUAL"
    const isAdvisor = session.role !== "CLIENT";

    let targetClient: any = null;
    let clientList: any[] = [];

    if (!isAdvisor) {
      // Client access
      let uQuery = supabaseAdmin
        .from("clients")
        .select("*")
        .eq("user_id", session.sub);
      if (session.tenantId && session.role !== "SUPER_ADMIN") {
        uQuery = uQuery.eq("tenant_id", session.tenantId);
      }
      const { data: uClient } = await uQuery.maybeSingle();

      if (uClient) {
        targetClient = uClient;
      } else {
        let cQuery = supabaseAdmin
          .from("clients")
          .select("*")
          .eq("client_id", session.sub);
        if (session.tenantId && session.role !== "SUPER_ADMIN") {
          cQuery = cQuery.eq("tenant_id", session.tenantId);
        }
        const { data: cClient } = await cQuery.maybeSingle();
        targetClient = cClient;
      }
    } else {
      // Advisor / Admin access
      let cQuery = supabaseAdmin.from("clients").select("*");
      if (session.tenantId && session.role !== "SUPER_ADMIN") {
        cQuery = cQuery.eq("tenant_id", session.tenantId);
      }
      const { data: clients } = await cQuery.order("full_name", { ascending: true });
      clientList = clients || [];

      if (requestedClientId) {
        targetClient = clientList.find((c) => c.client_id === requestedClientId);
      }
      if (!targetClient && clientList.length > 0) {
        targetClient = clientList[0];
      }
    }

    if (!targetClient) {
      return NextResponse.json({
        success: false,
        message: "No client profile found.",
        clientList,
      });
    }

    // Household resolution
    let householdMembersData: any[] = [targetClient];
    if (targetClient.household_id) {
      let hhQuery = supabaseAdmin
        .from("clients")
        .select("*")
        .eq("household_id", targetClient.household_id);
      if (session.tenantId && session.role !== "SUPER_ADMIN") {
        hhQuery = hhQuery.eq("tenant_id", session.tenantId);
      }
      const { data: hhData } = await hhQuery;
      if (hhData && hhData.length > 0) {
        householdMembersData = hhData;
      }
    }

    const householdMembers = householdMembersData.map((m) => {
      let age = 38;
      if (m.date_of_birth) {
        const diff = Date.now() - new Date(m.date_of_birth).getTime();
        age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      }
      return {
        clientId: m.client_id,
        fullName: m.full_name || "Family Member",
        email: m.email,
        currentAge: age,
        relationship: m.relationship_to_primary || "Primary",
      };
    });

    const planningScope: "HOUSEHOLD" | "INDIVIDUAL" =
      householdMembers.length > 1 && requestedScope === "INDIVIDUAL"
        ? "INDIVIDUAL"
        : householdMembers.length > 1
        ? "HOUSEHOLD"
        : "INDIVIDUAL";

    let activeClient = targetClient;
    if (planningScope === "INDIVIDUAL") {
      const targetMemberId = requestedMemberId || requestedClientId || targetClient.client_id;
      const found = householdMembersData.find((m) => m.client_id === targetMemberId);
      if (found) activeClient = found;
    }

    const allHouseholdClientIds = householdMembers.map((m) => m.clientId);
    const activeClientIds =
      planningScope === "HOUSEHOLD" ? allHouseholdClientIds : [activeClient.client_id];

    // Fetch financial entities across target clients
    const [expensesRes, assetsRes, invRes, liabilitiesRes, goalsRes] = await Promise.all([
      supabaseAdmin
        .from("expense_items")
        .select("*")
        .in("client_id", activeClientIds),
      supabaseAdmin
        .from("assets")
        .select("*")
        .in("client_id", activeClientIds),
      supabaseAdmin
        .from("investment_portfolio")
        .select("*")
        .in("client_id", activeClientIds),
      supabaseAdmin
        .from("liabilities")
        .select("*")
        .in("client_id", activeClientIds),
      supabaseAdmin
        .from("financial_goals")
        .select("*")
        .in("client_id", activeClientIds)
        .order("created_at", { ascending: false }),
    ]);

    const expenses = expensesRes.data || [];
    const assets = (assetsRes.data || []).map(unpackAsset);
    const investments = invRes.data || [];
    const liabilities = liabilitiesRes.data || [];
    const goals = goalsRes.data || [];

    // Monthly living expenses
    let monthlyExpenses = expenses.reduce((sum, e) => sum + Number(e.monthly_amount || 0), 0);
    if (monthlyExpenses === 0) {
      monthlyExpenses = planningScope === "HOUSEHOLD" ? 120000 : 75000;
    }

    // Liquid & Marketable Assets
    let totalLiquidAssets = 0;
    investments.forEach((inv) => {
      totalLiquidAssets += Number(inv.current_value || 0);
    });
    assets.forEach((ast) => {
      if (isLiquidOrMarketAsset(ast.asset_category)) {
        totalLiquidAssets += Number(ast.current_market_value || 0);
      }
    });

    // Total Outstanding Liabilities (Loans, EMIs)
    const totalLiabilities = liabilities.reduce(
      (sum, l) => sum + Number(l.outstanding_principal || 0),
      0
    );

    // Existing Insurance Policies saved in goals or assets
    let existingTermCover = 0;
    let existingHealthCover = 0;
    let isSmoker = false;
    let cityTier: "TIER_1" | "TIER_2_3" = "TIER_1";

    // Check if there is an existing risk/insurance goal
    const riskGoal = goals.find(
      (g) =>
        (g.goal_name || "").toLowerCase().includes("risk") ||
        (g.goal_name || "").toLowerCase().includes("insurance")
    );

    if (riskGoal && riskGoal.notes) {
      try {
        const parsed = typeof riskGoal.notes === "string" ? JSON.parse(riskGoal.notes) : riskGoal.notes;
        if (parsed.existingTermCover) existingTermCover = Number(parsed.existingTermCover);
        if (parsed.existingHealthCover) existingHealthCover = Number(parsed.existingHealthCover);
        if (parsed.isSmoker !== undefined) isSmoker = Boolean(parsed.isSmoker);
        if (parsed.cityTier) cityTier = parsed.cityTier;
        if (parsed.monthlyLivingExpenses) monthlyExpenses = Number(parsed.monthlyLivingExpenses);
      } catch {
        // Fall back gracefully
      }
    }

    // Determine ages
    let currentAge = 38;
    if (activeClient.date_of_birth) {
      const diff = Date.now() - new Date(activeClient.date_of_birth).getTime();
      currentAge = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    }
    const retirementAge = 60;

    // Run Actuarial Calculation
    const riskInput: RiskEngineInput = {
      clientId: activeClient.client_id,
      clientName: activeClient.full_name || "Valued Client",
      currentAge,
      retirementAge,
      gender: (activeClient.gender || "MALE").toUpperCase() as any,
      isSmoker,
      cityTier,
      monthlyLivingExpenses: monthlyExpenses,
      outstandingLiabilities: totalLiabilities,
      futureKeyMilestones: planningScope === "HOUSEHOLD" ? 4000000 : 2500000,
      existingLiquidAssets: totalLiquidAssets,
      existingTermCover,
      existingHealthCover,
      familyMembersCount: householdMembers.length,
      hasSeniorParents: true,
      corporateHealthCover: 500000,
    };

    const riskAssessment = generateConsolidatedRiskAssessment(riskInput);

    return NextResponse.json({
      success: true,
      planningScope,
      activeClient: {
        clientId: activeClient.client_id,
        fullName: activeClient.full_name,
        email: activeClient.email,
        currentAge,
        retirementAge,
      },
      householdMembers,
      clientList: isAdvisor ? clientList.map((c) => ({ clientId: c.client_id, fullName: c.full_name })) : [],
      inputs: riskInput,
      liabilitiesSummary: {
        totalOutstanding: totalLiabilities,
        count: liabilities.length,
        items: liabilities.map((l) => ({
          liabilityId: l.liability_id,
          type: l.liability_type,
          lender: l.lender_name,
          principal: Number(l.outstanding_principal || 0),
          emi: Number(l.monthly_emi || 0),
        })),
      },
      assessment: riskAssessment,
    });
  } catch (err: any) {
    console.error("Risk Planning GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to load risk assessment." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await req.json();
    const {
      clientId,
      monthlyLivingExpenses,
      outstandingLiabilities,
      futureKeyMilestones,
      existingTermCover,
      existingHealthCover,
      isSmoker,
      cityTier,
      currentAge,
      retirementAge,
    } = body;

    const targetClientId = clientId || session.sub;

    const inputData: RiskEngineInput = {
      clientId: targetClientId,
      clientName: "Client",
      currentAge: Number(currentAge) || 38,
      retirementAge: Number(retirementAge) || 60,
      monthlyLivingExpenses: Number(monthlyLivingExpenses) || 75000,
      outstandingLiabilities: Number(outstandingLiabilities) || 0,
      futureKeyMilestones: Number(futureKeyMilestones) || 2500000,
      existingLiquidAssets: 0,
      existingTermCover: Number(existingTermCover) || 0,
      existingHealthCover: Number(existingHealthCover) || 0,
      isSmoker: Boolean(isSmoker),
      cityTier: cityTier || "TIER_1",
    };

    const assessment = generateConsolidatedRiskAssessment(inputData);

    // Save as a financial goal record for persistence
    const packedNotes = JSON.stringify({
      existingTermCover: inputData.existingTermCover,
      existingHealthCover: inputData.existingHealthCover,
      isSmoker: inputData.isSmoker,
      cityTier: inputData.cityTier,
      monthlyLivingExpenses: inputData.monthlyLivingExpenses,
      assessment,
      savedAt: new Date().toISOString(),
    });

    const { data: existingGoal } = await supabaseAdmin
      .from("financial_goals")
      .select("goal_id")
      .eq("client_id", targetClientId)
      .ilike("goal_name", "%Risk & Insurance%")
      .maybeSingle();

    if (existingGoal) {
      await supabaseAdmin
        .from("financial_goals")
        .update({
          target_amount_today: assessment.termLife.recommendedSumAssured,
          required_future_value: assessment.termLife.grossProtectionNeeded,
          monthly_required_sip: assessment.termLife.monthlyEquivalentPremium,
          notes: packedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("goal_id", existingGoal.goal_id);
    } else {
      await supabaseAdmin.from("financial_goals").insert({
        client_id: targetClientId,
        goal_name: "Risk & Insurance Plan (Health & Term)",
        target_year: new Date().getFullYear() + assessment.termLife.recommendedTenureYears,
        target_amount_today: assessment.termLife.recommendedSumAssured,
        required_future_value: assessment.termLife.grossProtectionNeeded,
        current_corpus_allocated: inputData.existingTermCover,
        monthly_required_sip: assessment.termLife.monthlyEquivalentPremium,
        priority: "Critical",
        notes: packedNotes,
      });
    }

    await logAuditEvent({
      tenantId: session.tenantId,
      clientId: targetClientId,
      advisorId: session.sub,
      action: "UPDATE",
      entityType: "GOAL",
      entityId: targetClientId,
      details: { inputData, assessment },
    });

    return NextResponse.json({
      success: true,
      assessment,
      message: "Risk and insurance plan saved successfully.",
    });
  } catch (err: any) {
    console.error("Risk Planning POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to save risk plan." }, { status: 500 });
  }
}
