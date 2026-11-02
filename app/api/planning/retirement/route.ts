import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { unpackAsset, unpackInvestment, unpackGoal, isMarketAsset } from "@/lib/goalAssetAlignment";
import {
  calculateRetirementDiagnostics,
  classifyHoldingForRetirement,
  RetirementEngineInput,
  RetirementHoldingItem,
} from "@/lib/retirement/retirementEngine";
import { generateAiRetirementDiagnostic, RetirementAiContext } from "@/lib/retirement/retirementAi";
import { createClientSuggestion } from "@/lib/suggestions";

export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access. Please log in." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedClientId = searchParams.get("clientId");
    const requestedScope = searchParams.get("scope"); // "HOUSEHOLD" | "INDIVIDUAL"
    const requestedMemberId = searchParams.get("memberId");
    const isAdvisor = session.role !== "CLIENT";

    let targetClient: any = null;
    let clientList: any[] = [];

    if (!isAdvisor) {
      // 1. CLIENT ACCESS: Strictly locate logged-in user's client record
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
        if (cClient) targetClient = cClient;
      }

      // Fallback by household
      if (!targetClient) {
        const { data: prof } = await supabaseAdmin
          .from("client_profiles")
          .select("household_id")
          .eq("user_id", session.sub)
          .maybeSingle();

        if (prof?.household_id) {
          const { data: hhClient } = await supabaseAdmin
            .from("clients")
            .select("*")
            .eq("household_id", prof.household_id)
            .limit(1)
            .maybeSingle();
          if (hhClient) targetClient = hhClient;
        }
      }

      if (!targetClient && session.tenantId) {
        const { data: defClient } = await supabaseAdmin
          .from("clients")
          .select("*")
          .eq("tenant_id", session.tenantId)
          .limit(1)
          .maybeSingle();
        targetClient = defClient;
      }
    } else {
      // 2. ADVISOR ACCESS: Allow client selection strictly within tenant
      let clientsQuery = supabaseAdmin
        .from("clients")
        .select("client_id, household_id, full_name, date_of_birth, annual_gross_income, risk_profile, marital_status, tenant_id, user_id")
        .order("full_name", { ascending: true });

      if (session.tenantId && session.role !== "SUPER_ADMIN") {
        clientsQuery = clientsQuery.eq("tenant_id", session.tenantId);
      }

      const { data: clients } = await clientsQuery;
      clientList = clients || [];

      if (requestedClientId && requestedClientId !== "ALL") {
        targetClient = clientList.find((c) => c.client_id === requestedClientId);
        if (!targetClient && session.role === "SUPER_ADMIN") {
          const { data: dirClient } = await supabaseAdmin
            .from("clients")
            .select("*")
            .eq("client_id", requestedClientId)
            .maybeSingle();
          if (dirClient) targetClient = dirClient;
        }
      }

      if (!targetClient) {
        targetClient = clientList[0] || null;
      }
    }

    if (!targetClient) {
      return NextResponse.json({
        success: true,
        clients: [],
        selectedClient: null,
        message: "No clients found.",
      });
    }

    const targetClientId = targetClient.client_id;

    // Fetch all household members if applicable
    let householdMembersData: any[] = [];
    if (targetClient.household_id) {
      const { data: hhMembers } = await supabaseAdmin
        .from("clients")
        .select("client_id, full_name, date_of_birth, annual_gross_income, marital_status, risk_profile, household_id")
        .eq("household_id", targetClient.household_id)
        .order("annual_gross_income", { ascending: false });
      householdMembersData = hhMembers || [];
    }

    if (householdMembersData.length === 0) {
      householdMembersData = [targetClient];
    }

    const householdMembers = householdMembersData.map((m) => {
      let age = 38;
      if (m.date_of_birth) {
        const dob = new Date(m.date_of_birth);
        const diffMs = Date.now() - dob.getTime();
        const calculatedAge = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
        if (!isNaN(calculatedAge) && calculatedAge > 0) age = calculatedAge;
      }
      return {
        clientId: m.client_id,
        fullName: m.full_name || "Family Member",
        dateOfBirth: m.date_of_birth,
        currentAge: age,
        annualGrossIncome: Number(m.annual_gross_income || 0),
        panNumber: m.pan_number || null,
        riskProfile: m.risk_profile || "Moderate",
        isPrimary: m.client_id === targetClient.client_id,
      };
    });

    const hasMultipleMembers = householdMembers.length > 1;
    // Default to "HOUSEHOLD" when multiple members exist unless "INDIVIDUAL" was requested
    const planningScope: "HOUSEHOLD" | "INDIVIDUAL" =
      hasMultipleMembers && requestedScope === "INDIVIDUAL"
        ? "INDIVIDUAL"
        : hasMultipleMembers
        ? "HOUSEHOLD"
        : "INDIVIDUAL";

    let activeClient = targetClient;
    if (planningScope === "INDIVIDUAL") {
      const targetMemberId = requestedMemberId || requestedClientId || targetClient.client_id;
      const found = householdMembersData.find((m) => m.client_id === targetMemberId);
      if (found) activeClient = found;
    }

    // Fetch financial entities across all household members
    const allHouseholdClientIds = householdMembers.map((m) => m.clientId);
    const [expensesRes, assetsRes, invRes, goalsRes, tenantRes] = await Promise.all([
      supabaseAdmin
        .from("expense_items")
        .select("*")
        .in("client_id", allHouseholdClientIds),
      supabaseAdmin
        .from("assets")
        .select("*")
        .in("client_id", allHouseholdClientIds),
      supabaseAdmin
        .from("investment_portfolio")
        .select("*")
        .in("client_id", allHouseholdClientIds),
      supabaseAdmin
        .from("financial_goals")
        .select("*")
        .in("client_id", allHouseholdClientIds)
        .ilike("goal_name", "%retirement%")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("tenants")
        .select("subscription_plan, enabled_features")
        .eq("tenant_id", targetClient.tenant_id || session.tenantId || "")
        .maybeSingle(),
    ]);

    const allRawInvestments = invRes.data || [];
    const allRawAssets = (assetsRes.data || []).map(unpackAsset);
    const allRawExpenses = expensesRes.data || [];

    // Calculate per-member breakdown for household overview
    const memberBreakdown = householdMembers.map((m) => {
      const mInvestments = allRawInvestments.filter((i) => i.client_id === m.clientId);
      const mAssets = allRawAssets.filter((a) => a.client_id === m.clientId);
      const mExpenses = allRawExpenses.filter((e) => e.client_id === m.clientId);

      const mSip = mInvestments.reduce((sum, i) => sum + Number(i.monthly_sip_amount || 0), 0);
      const mMfVal = mInvestments.reduce((sum, i) => sum + Number(i.current_value || 0), 0);

      let mEpf = 0;
      let mNps = 0;
      let mLiquid = 0;
      mAssets.forEach((a) => {
        const cat = (a.asset_category || "").toLowerCase();
        const val = Number(a.current_market_value || 0);
        if (cat.includes("epf") || cat.includes("vpf") || cat.includes("employees' provident")) {
          mEpf += val;
        } else if (cat.includes("nps") || cat.includes("national pension")) {
          mNps += val;
        } else if (a.is_liquid || cat.includes("deposit") || cat.includes("fd") || cat.includes("cash") || cat.includes("liquid")) {
          mLiquid += val;
        }
      });

      const mExp = mExpenses.reduce((sum, e) => sum + Number(e.monthly_amount || 0), 0);

      return {
        clientId: m.clientId,
        fullName: m.fullName,
        currentAge: m.currentAge,
        annualGrossIncome: m.annualGrossIncome,
        monthlySip: mSip,
        mutualFundValue: mMfVal,
        epfCorpus: mEpf,
        npsCorpus: mNps,
        liquidCorpus: mLiquid,
        recordedMonthlyExpenses: mExp,
      };
    });

    const totalHouseholdSip = memberBreakdown.reduce((sum, m) => sum + m.monthlySip, 0);

    // Filter scoped entities according to planningScope (Individual vs Clubbed Household)
    const scopedAssets =
      planningScope === "INDIVIDUAL"
        ? allRawAssets.filter((a) => a.client_id === activeClient.client_id)
        : allRawAssets;

    const scopedInvestments =
      planningScope === "INDIVIDUAL"
        ? allRawInvestments.filter((i) => i.client_id === activeClient.client_id).map(unpackInvestment)
        : allRawInvestments.map(unpackInvestment);

    const scopedGoals =
      planningScope === "INDIVIDUAL"
        ? (goalsRes.data || []).filter((g) => g.client_id === activeClient.client_id)
        : goalsRes.data || [];

    // 1. Calculate uneditable current age from Date of Birth
    let currentAge = 38;
    const targetDob = planningScope === "INDIVIDUAL" ? activeClient.date_of_birth : targetClient.date_of_birth;
    if (targetDob) {
      const dob = new Date(targetDob);
      const diffMs = Date.now() - dob.getTime();
      const calculatedAge = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
      if (!isNaN(calculatedAge) && calculatedAge > 0) {
        currentAge = calculatedAge;
      }
    }

    // 2. Calculate current monthly living expenses (editable)
    let currentMonthlyExpense = 0;
    if (planningScope === "HOUSEHOLD") {
      currentMonthlyExpense = allRawExpenses.reduce((sum, item) => sum + Number(item.monthly_amount || 0), 0);
      if (currentMonthlyExpense <= 0) {
        const totalHouseholdIncome = householdMembers.reduce((sum, m) => sum + m.annualGrossIncome, 0);
        currentMonthlyExpense = Math.max(35000, Math.round(((totalHouseholdIncome || 1800000) * 0.4) / 12));
      }
    } else {
      // Individual: prioritize individual expense items, else apportion by income ratio
      const memberExpenses = allRawExpenses.filter((e) => e.client_id === activeClient.client_id);
      if (memberExpenses.length > 0) {
        currentMonthlyExpense = memberExpenses.reduce((sum, item) => sum + Number(item.monthly_amount || 0), 0);
      } else if (allRawExpenses.length > 0) {
        const totalHouseholdIncome = householdMembers.reduce((sum, m) => sum + m.annualGrossIncome, 0);
        const totalHhExp = allRawExpenses.reduce((sum, item) => sum + Number(item.monthly_amount || 0), 0);
        const ratio = totalHouseholdIncome > 0 ? (Number(activeClient.annual_gross_income || 0) / totalHouseholdIncome) : (1 / householdMembers.length);
        currentMonthlyExpense = Math.max(25000, Math.round(totalHhExp * ratio));
      } else {
        const annualIncome = Number(activeClient.annual_gross_income || 1200000);
        currentMonthlyExpense = Math.max(25000, Math.round((annualIncome * 0.4) / 12));
      }
    }

    // 3. Process EPF, NPS, PPF & Fixed Assets
    let epfCorpus = 0;
    let epfMonthlyDeposit = 0;
    let npsCorpus = 0;
    let npsMonthlyDeposit = 0;
    let ppfCorpus = 0;
    let ppfMonthlyDeposit = 0;
    let otherLiquidCorpus = 0;

    scopedAssets.forEach((ast) => {
      const cat = (ast.asset_category || "").toLowerCase();
      const val = Number(ast.current_market_value || 0);
      const dep = Number(ast.monthly_deposit || 0);

      if (cat.includes("epf") || cat.includes("vpf") || cat.includes("employees' provident")) {
        epfCorpus += val;
        epfMonthlyDeposit += dep;
      } else if (cat.includes("nps") || cat.includes("national pension")) {
        npsCorpus += val;
        npsMonthlyDeposit += dep;
      } else if (cat.includes("ppf") || cat.includes("public provident")) {
        ppfCorpus += val;
        ppfMonthlyDeposit += dep;
      } else if (ast.is_liquid || cat.includes("deposit") || cat.includes("fd") || cat.includes("cash") || cat.includes("liquid")) {
        otherLiquidCorpus += val;
      }
    });

    // 4. Process Mutual Fund Portfolio & SIPs
    let mutualFundCorpus = 0;
    let ongoingMonthlySip = 0;

    const retirementHoldings: RetirementHoldingItem[] = scopedInvestments.map((inv, idx) => {
      const val = Number(inv.current_value || 0);
      const sip = Number(inv.monthly_sip_amount || 0);
      mutualFundCorpus += val;
      ongoingMonthlySip += sip;

      const classification = classifyHoldingForRetirement(inv.scheme_instrument_name, inv.asset_class);
      return {
        id: inv.investment_id || `inv-${idx}`,
        schemeName: inv.scheme_instrument_name,
        assetClass: inv.asset_class || "Equity Mutual Fund",
        currentValue: val,
        monthlySip: sip,
        expectedCagr: Number(inv.expected_return_cagr || 12.0),
        category: classification.category,
        suitabilityForSwp: classification.suitabilityForSwp,
        suitabilityReason: classification.suitabilityReason,
        bucketPlacement: classification.bucketPlacement,
      };
    });

    // 5. Existing Saved Retirement Goal (if any)
    const existingGoal = scopedGoals && scopedGoals[0] ? unpackGoal(scopedGoals[0]) : null;
    const defaultRetirementAge = existingGoal ? existingGoal.target_year - (new Date().getFullYear() - currentAge) : Math.max(currentAge, 60);

    // Initial Engine Input
    const engineInput: RetirementEngineInput = {
      currentAge,
      retirementAge: Math.max(currentAge, defaultRetirementAge || 60),
      lifeExpectancy: 85,
      currentMonthlyExpense,
      preRetirementInflation: Number(existingGoal?.expected_inflation_rate ? (existingGoal.expected_inflation_rate < 1 ? existingGoal.expected_inflation_rate * 100 : existingGoal.expected_inflation_rate) : 6.0),
      postRetirementInflation: 5.5,
      preRetirementReturn: 11.5,
      postRetirementReturn: 7.5,
      epfCorpus,
      epfMonthlyDeposit,
      epfRoi: 8.25,
      npsCorpus,
      npsMonthlyDeposit,
      npsRoi: 10.0,
      ppfCorpus,
      ppfMonthlyDeposit,
      ppfRoi: 7.1,
      mutualFundCorpus,
      ongoingMonthlySip,
      otherLiquidCorpus,
      holdings: retirementHoldings,
    };

    const diagnosticResult = calculateRetirementDiagnostics(engineInput);

    return NextResponse.json({
      success: true,
      isAdvisor,
      clients: clientList,
      selectedClient: {
        clientId: activeClient.client_id,
        fullName: activeClient.full_name,
        dateOfBirth: activeClient.date_of_birth,
        panNumber: activeClient.pan_number || activeClient.pan || null,
        annualGrossIncome: activeClient.annual_gross_income,
        riskProfile: activeClient.risk_profile || "Moderate",
        currentAge,
      },
      householdId: targetClient.household_id || null,
      householdMembers,
      memberBreakdown,
      hasMultipleMembers,
      planningScope,
      activeMemberId: activeClient.client_id,
      totalHouseholdSip,
      engineInput,
      diagnosticResult,
      savedGoal: existingGoal,
      aiSubscribed: true,
    });
  } catch (err: any) {
    console.error("Retirement Planning GET Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load retirement planning data." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access. Please log in." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "recalculate";

    // 1. Recalculate Live Diagnostic
    if (action === "recalculate") {
      const input: RetirementEngineInput = body.input;
      if (!input) {
        return NextResponse.json({ error: "Missing calculation input." }, { status: 400 });
      }
      const diagnosticResult = calculateRetirementDiagnostics(input);
      return NextResponse.json({ success: true, diagnosticResult });
    }

    // 2. Generate Gemini AI Retirement Diagnostic Memo
    if (action === "generate_ai_diagnostic") {
      const context: RetirementAiContext = body.context;
      if (!context) {
        return NextResponse.json({ error: "Missing advisory context." }, { status: 400 });
      }

      const advisory = await generateAiRetirementDiagnostic(context, body.apiKey);
      return NextResponse.json({ success: true, advisory });
    }

    // 3. Save Plan into Financial Goals
    if (action === "save_plan") {
      const { clientId, retirementAge, targetCorpusNeeded, currentAllocatedCorpus, inflationRate, notes, linkedAssetIds, linkedInvestmentIds } = body;
      if (!clientId) {
        return NextResponse.json({ error: "Client ID is required." }, { status: 400 });
      }

      const currentYear = new Date().getFullYear();
      const targetYear = currentYear + Math.max(1, (Number(retirementAge) || 60) - (Number(body.currentAge) || 38));

      // Check if retirement goal already exists
      const { data: existingGoal } = await supabaseAdmin
        .from("financial_goals")
        .select("goal_id")
        .eq("client_id", clientId)
        .ilike("goal_name", "%retirement%")
        .maybeSingle();

      const goalPayload = {
        client_id: clientId,
        goal_name: `Smart Retirement Corpus (${retirementAge} Yrs)`,
        target_year: targetYear,
        target_amount_today: Number(targetCorpusNeeded) || 0,
        current_corpus_allocated: Number(currentAllocatedCorpus) || 0,
        expected_inflation_rate: Number(inflationRate || 6.0) / 100,
        priority: "High",
        notes: notes || "Auto-modeled via Smart Retirement Diagnostic & Decumulation Suite.",
      };

      let goalId = existingGoal?.goal_id;
      if (goalId) {
        await supabaseAdmin
          .from("financial_goals")
          .update(goalPayload)
          .eq("goal_id", goalId);
      } else {
        const { data: createdGoal, error: createErr } = await supabaseAdmin
          .from("financial_goals")
          .insert([goalPayload])
          .select("goal_id")
          .single();
        if (createErr) throw createErr;
        goalId = createdGoal.goal_id;
      }

      return NextResponse.json({ success: true, goalId, message: "Retirement plan saved successfully." });
    }

    // 4. Save to Client Suggestions Feed (Actionable Recommendations)
    if (action === "save_ai_suggestion") {
      const { clientId, advisory, context } = body;
      if (!clientId || !advisory) {
        return NextResponse.json({ error: "Client ID and advisory memo required." }, { status: 400 });
      }

      const saved = await createClientSuggestion({
        tenantId: session.tenantId,
        clientId,
        advisorId: session.sub,
        systemFindings: {
          title: `Smart Retirement Action Plan (${new Date().toLocaleDateString("en-IN")})`,
          executiveSummary: advisory.executiveSummary,
          threeBucketStrategy: advisory.threeBucketAllocationGuidance,
          swpTaxStrategy: advisory.swpDecumulationTaxStrategy,
        },
        advisorNotes: context?.customInstructions
          ? `Advisor Instructions: ${context.customInstructions}\n\nPrepared via Google Gemini Smart Retirement Engine.`
          : "Smart Retirement Decumulation & 3-Bucket Solution Memo.",
        recommendedInvestments: (advisory.actionRoadmap || []).map((step: any, idx: number) => ({
          action: "RETIREMENT_STEP",
          scheme: step.step,
          amount: context?.swpStpStrategy?.recommendedMonthlySwp || 0,
          priority: step.priority || "HIGH",
          notes: `${step.description} (${step.timeline})`,
        })),
        status: "DRAFT",
      });

      return NextResponse.json({ success: true, suggestionId: saved.id });
    }

    return NextResponse.json({ error: `Unknown action '${action}'` }, { status: 400 });
  } catch (err: any) {
    console.error("Retirement Planning POST Error:", err);
    return NextResponse.json({ error: err.message || "Failed to process retirement request." }, { status: 500 });
  }
}

