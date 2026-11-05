import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import {
  computeCompleteRiskProfile,
  RISK_QUESTIONS,
  ClientDemographicData,
  ClientFinancialData,
  getAgeFromDob,
} from "@/lib/risk/riskProfileEngine";

async function getClientMetrics(clientId: string) {
  const [incomesRes, expensesRes, assetsRes, liabilitiesRes] = await Promise.all([
    supabaseAdmin.from("client_incomes").select("*").eq("client_id", clientId),
    supabaseAdmin.from("client_expenses").select("*").eq("client_id", clientId),
    supabaseAdmin.from("client_assets").select("*").eq("client_id", clientId),
    supabaseAdmin.from("client_liabilities").select("*").eq("client_id", clientId),
  ]);

  let totalMonthlyIncome = 0;
  (incomesRes.data || []).forEach((inc: any) => {
    const amt = Number(inc.monthly_amount ?? inc.amount ?? 0);
    totalMonthlyIncome += amt;
  });

  let totalMonthlyExpenses = 0;
  (expensesRes.data || []).forEach((exp: any) => {
    const amt = Number(exp.monthly_amount ?? exp.amount ?? 0);
    totalMonthlyExpenses += amt;
  });

  let totalAssets = 0;
  let liquidAssets = 0;
  (assetsRes.data || []).forEach((ast: any) => {
    const val = Number(ast.current_value ?? ast.amount ?? 0);
    totalAssets += val;
    const cat = (ast.asset_class || ast.asset_type || ast.category || "").toLowerCase();
    if (cat.includes("liquid") || cat.includes("cash") || cat.includes("bank") || cat.includes("mutual fund") || cat.includes("fd")) {
      liquidAssets += val;
    }
  });

  let totalLiabilities = 0;
  (liabilitiesRes.data || []).forEach((liab: any) => {
    const val = Number(liab.principal_outstanding ?? liab.outstanding_amount ?? liab.amount ?? 0);
    totalLiabilities += val;
  });

  const netWorth = totalAssets - totalLiabilities;
  const monthlySurplus = Math.max(0, totalMonthlyIncome - totalMonthlyExpenses);
  const savingsRate = totalMonthlyIncome > 0 ? (monthlySurplus / totalMonthlyIncome) * 100 : 30;
  const emergencyFundMonths = totalMonthlyExpenses > 0 ? Number((liquidAssets / totalMonthlyExpenses).toFixed(1)) : 6;
  const debtToAssetRatio = totalAssets > 0 ? Number(((totalLiabilities / totalAssets) * 100).toFixed(1)) : 10;

  return {
    totalMonthlyIncome,
    totalMonthlyExpenses,
    monthlySurplus,
    savingsRate,
    totalAssets,
    liquidAssets,
    totalLiabilities,
    netWorth,
    emergencyFundMonths,
    debtToAssetRatio,
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { id: clientId } = await params;

    // 1. Fetch client
    const { data: client, error: clientErr } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();

    if (clientErr || !client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    // 2. Fetch live financial metrics
    const metrics = await getClientMetrics(clientId);

    // 3. Demographics
    const demographics: ClientDemographicData = {
      dateOfBirth: client.date_of_birth,
      age: getAgeFromDob(client.date_of_birth),
      dependentsCount: Number(client.dependents_count || 0),
      maritalStatus: client.marital_status,
      occupation: client.occupation,
      planningHorizonYears: Number(client.planning_horizon_years || 10),
    };

    const financials: ClientFinancialData = {
      annualGrossIncome: Number(client.annual_gross_income || metrics.totalMonthlyIncome * 12),
      monthlyIncome: metrics.totalMonthlyIncome,
      monthlyExpenses: metrics.totalMonthlyExpenses,
      monthlySurplus: metrics.monthlySurplus,
      savingsRate: metrics.savingsRate,
      totalAssets: metrics.totalAssets,
      totalLiabilities: metrics.totalLiabilities,
      netWorth: metrics.netWorth,
      liquidAssets: metrics.liquidAssets,
      emergencyFundMonths: metrics.emergencyFundMonths,
      debtToAssetRatio: metrics.debtToAssetRatio,
    };

    // 4. Fetch stored assessment or default responses
    let storedResponses: Record<string, string> = {};
    let history: any[] = [];

    // Try fetching from client_risk_assessments table
    try {
      const { data: histData } = await supabaseAdmin
        .from("client_risk_assessments")
        .select("*")
        .eq("client_id", clientId)
        .order("assessed_at", { ascending: false })
        .limit(10);

      if (histData && histData.length > 0) {
        history = histData;
        if (histData[0].questionnaire_responses) {
          storedResponses = histData[0].questionnaire_responses;
        }
      }
    } catch {
      // quiet fail
    }

    // Fallback: check tenant_settings store
    if (Object.keys(storedResponses).length === 0 && client.tenant_id) {
      try {
        const { data: tData } = await supabaseAdmin
          .from("tenant_settings")
          .select("branding")
          .eq("tenant_id", client.tenant_id)
          .maybeSingle();
        const store = tData?.branding?.ria_compliance_store?.riskAssessments || [];
        const clientHist = store.filter((a: any) => a.clientId === clientId);
        if (clientHist.length > 0) {
          history = clientHist;
          storedResponses = clientHist[0].questionnaireResponses || clientHist[0].questionnaire_responses || {};
        }
      } catch {}
    }

    // If still no responses, default to neutral options
    if (Object.keys(storedResponses).length === 0) {
      RISK_QUESTIONS.forEach((q) => {
        storedResponses[q.id] = q.options[Math.floor(q.options.length / 2)].value;
      });
    }

    // 5. Compute full risk profile dynamically
    const computed = computeCompleteRiskProfile({
      responses: storedResponses,
      demographics,
      financials,
    });

    return NextResponse.json({
      success: true,
      client: {
        clientId: client.client_id,
        fullName: client.full_name,
        uwpClientCode: client.uwp_client_code,
        currentRiskProfile: client.risk_profile,
        riskScore: client.risk_score || computed.riskScore,
      },
      questions: RISK_QUESTIONS,
      responses: storedResponses,
      demographics,
      financials,
      assessment: computed,
      history,
    });
  } catch (err: any) {
    console.error("Error fetching client risk profile:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load risk profile." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { id: clientId } = await params;
    const body = await req.json();
    const { responses, assessorName } = body;

    if (!responses || typeof responses !== "object") {
      return NextResponse.json(
        { error: "Valid questionnaire responses object is required." },
        { status: 400 }
      );
    }

    // 1. Fetch client
    const { data: client, error: clientErr } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();

    if (clientErr || !client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    const tenantId = client.tenant_id || session.tenantId;

    // 2. Fetch live metrics
    const metrics = await getClientMetrics(clientId);

    const demographics: ClientDemographicData = {
      dateOfBirth: client.date_of_birth,
      age: getAgeFromDob(client.date_of_birth),
      dependentsCount: Number(client.dependents_count || 0),
      maritalStatus: client.marital_status,
      occupation: client.occupation,
      planningHorizonYears: Number(client.planning_horizon_years || 10),
    };

    const financials: ClientFinancialData = {
      annualGrossIncome: Number(client.annual_gross_income || metrics.totalMonthlyIncome * 12),
      monthlyIncome: metrics.totalMonthlyIncome,
      monthlyExpenses: metrics.totalMonthlyExpenses,
      monthlySurplus: metrics.monthlySurplus,
      savingsRate: metrics.savingsRate,
      totalAssets: metrics.totalAssets,
      totalLiabilities: metrics.totalLiabilities,
      netWorth: metrics.netWorth,
      liquidAssets: metrics.liquidAssets,
      emergencyFundMonths: metrics.emergencyFundMonths,
      debtToAssetRatio: metrics.debtToAssetRatio,
    };

    // 3. Compute risk profile
    const computed = computeCompleteRiskProfile({
      responses,
      demographics,
      financials,
    });

    const assessor = assessorName || `${session.firstName || "Licensed"} ${session.lastName || "Advisor"}`;

    // 4. Update `clients` record with new risk profile
    const clientUpdates: Record<string, any> = {
      risk_profile: computed.riskCategory,
      updated_at: new Date().toISOString(),
    };

    const { error: clientUpdateErr } = await supabaseAdmin
      .from("clients")
      .update(clientUpdates)
      .eq("client_id", clientId);

    if (clientUpdateErr) {
      throw clientUpdateErr;
    }

    // 5. Insert immutable audit record into `client_risk_assessments` (if table exists)
    try {
      // Mark previous assessments as not current
      await supabaseAdmin
        .from("client_risk_assessments")
        .update({ is_current: false })
        .eq("client_id", clientId);

      await supabaseAdmin.from("client_risk_assessments").insert({
        tenant_id: tenantId,
        client_id: clientId,
        risk_score: computed.riskScore,
        risk_category: computed.riskCategory,
        risk_capacity_score: computed.capacityScore,
        risk_tolerance_score: computed.toleranceScore,
        demographic_factors: demographics,
        financial_factors: financials,
        recommended_allocation: computed.recommendedAllocation,
        questionnaire_responses: responses,
        assessed_at: computed.assessedAt,
        next_review_due: computed.nextReviewDue,
        is_current: true,
        assessor_name: assessor,
      });
    } catch {
      // quiet fail if table not yet created
    }

    // Also persist to tenant_settings.branding.ria_compliance_store
    if (tenantId) {
      try {
        const { data: tData } = await supabaseAdmin
          .from("tenant_settings")
          .select("branding")
          .eq("tenant_id", tenantId)
          .maybeSingle();

        const currentBranding = tData?.branding || {};
        const store = currentBranding.ria_compliance_store || {};
        store.riskAssessments = store.riskAssessments || [];
        store.riskAssessments.unshift({
          assessmentId: "risk-" + Math.random().toString(36).substring(2, 9),
          tenantId,
          clientId,
          riskScore: computed.riskScore,
          riskCategory: computed.riskCategory,
          riskCapacityScore: computed.capacityScore,
          riskToleranceScore: computed.toleranceScore,
          demographicFactors: computed.capacityBreakdown,
          financialFactors: financials,
          recommendedAllocation: computed.recommendedAllocation,
          questionnaireResponses: responses,
          assessedAt: computed.assessedAt,
          nextReviewDue: computed.nextReviewDue,
          assessorName: assessor,
          isCurrent: true,
        });
        currentBranding.ria_compliance_store = store;

        await supabaseAdmin
          .from("tenant_settings")
          .update({ branding: currentBranding, updated_at: new Date().toISOString() })
          .eq("tenant_id", tenantId);
      } catch (storeErr) {
        console.error("Non-fatal error persisting risk assessment to store:", storeErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Risk profile updated to '${computed.riskCategory}' (Score: ${computed.riskScore}/100) and synced to client profile.`,
      assessment: computed,
    });
  } catch (err: any) {
    console.error("Error updating client risk profile:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update risk profile." },
      { status: 500 }
    );
  }
}

