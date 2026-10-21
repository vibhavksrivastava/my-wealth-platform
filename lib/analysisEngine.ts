/**
 * Automated Financial Analysis & Diagnostics Engine
 * 
 * Provides rule-based & quantitative analysis for wealth clients:
 * - Cash Flow Health: Surplus/deficit, savings rate, runway & EMI burden
 * - Net Worth & Solvency: Liquidity ratio, debt-to-asset ratio, emergency fund adequacy
 * - Goal Feasibility: Inflation-adjusted corpus projection, gap analysis & required SIP
 * - Investment Matching: Actionable recommendations for SIP step-ups, debt prepayment,
 *   and asset rebalancing tailored to client risk profile.
 */

export interface CashFlowDiagnostic {
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  essentialExpenses: number;
  discretionaryExpenses: number;
  totalMonthlyEMIs: number;
  totalOutflows: number;
  netMonthlySurplus: number;
  savingsRate: number;
  emiToIncomeRatio: number;
  status: "HEALTHY" | "MODERATE" | "DEFICIT";
  score: number; // 0 - 100
  findings: string[];
}

export interface NetWorthDiagnostic {
  totalPhysicalAssets: number;
  totalInvestments: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  liquidAssets: number;
  illiquidAssets: number;
  liquidityRatio: number;
  debtToAssetRatio: number;
  emergencyFundAdequacyMonths: number;
  emergencyFundStatus: "SUFFICIENT" | "PARTIAL" | "VULNERABLE";
  score: number; // 0 - 100
  findings: string[];
}

import {
  unpackAsset,
  unpackInvestment,
  unpackGoal,
  projectAssetProceedsForGoal,
  projectInvestmentCorpusForGoal,
} from "./goalAssetAlignment";

export interface GoalDiagnosticItem {
  goalId: string;
  goalName: string;
  targetYear: number;
  yearsRemaining: number;
  priority: string;
  targetAmount: number;
  inflationRate: number;
  expectedReturnRate: number;
  inflatedTargetAmount: number;
  currentAllocatedCorpus: number;
  projectedCorpus: number;
  shortfall: number;
  fundedPercentage: number;
  feasibilityStatus: "ON_TRACK" | "MODERATE_GAP" | "CRITICAL_GAP";
  currentMonthlySIP: number;
  additionalMonthlySipRequired: number;
  recommendationSummary: string;
  // Enhanced Earmarked Asset & Investment Alignment Breakdown
  earmarkedAssetProceeds?: number;
  earmarkedInvestmentProceeds?: number;
  totalPreFundedFutureCorpus?: number;
  linkedAssets?: Array<{
    assetId: string;
    description: string;
    category: string;
    currentValue: number;
    expectedCagr: number;
    targetLiquidationDate: string | null;
    projectedProceeds: number;
    isMaturedBeforeGoal: boolean;
  }>;
  linkedInvestments?: Array<{
    investmentId: string;
    schemeName: string;
    assetClass: string;
    currentValue: number;
    monthlySip: number;
    expectedCagr: number;
    totalProjectedCorpus: number;
  }>;
}

export interface GoalFeasibilityDiagnostic {
  overallScore: number;
  totalGoalsCount: number;
  onTrackCount: number;
  gapCount: number;
  totalInflatedTarget: number;
  totalProjectedCorpus: number;
  totalShortfall: number;
  totalMonthlyRequiredSip: number;
  totalEarmarkedAssetProceeds: number;
  totalEarmarkedInvestmentProceeds: number;
  monthlySurplus: number;
  monthlyCapacityGap: number;
  capacityStatus: "AFFORDABLE" | "DEFICIT";
  goals: GoalDiagnosticItem[];
  findings: string[];
}

export interface RecommendedAction {
  id: string;
  category: "SIP_STEP_UP" | "DEBT_RESTRUCTURING" | "ASSET_REBALANCING" | "EMERGENCY_RESERVE" | "TAX_OPTIMIZATION" | "GOAL_REALIGNMENT";
  priority: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  rationale: string;
  suggestedAction: string;
  actionDetails: {
    instrumentType?: string;
    currentAmount?: number;
    recommendedAmount?: number;
    targetInstrument?: string;
    potentialBenefit?: string;
    tenureYears?: number;
  };
  expectedImpact: string;
}

export interface DiagnosticFindingsSnapshot {
  calculatedAt: string;
  overallHealthScore: number;
  riskProfile: string;
  cashFlow: CashFlowDiagnostic;
  netWorth: NetWorthDiagnostic;
  goals: GoalFeasibilityDiagnostic;
  summaryHighlights: string[];
}

export interface ClientProfileInput {
  client: any;
  incomes: any[];
  expenses: any[];
  assets: any[];
  liabilities: any[];
  investments: any[];
  goals: any[];
}

/**
 * Helper to calculate Future Value of an ongoing monthly SIP
 */
function calculateSipFutureValue(monthlyAmount: number, annualReturnRate: number, years: number): number {
  if (monthlyAmount <= 0 || years <= 0) return 0;
  const monthlyRate = annualReturnRate / 100 / 12;
  const totalMonths = years * 12;
  if (monthlyRate === 0) return monthlyAmount * totalMonths;
  return monthlyAmount * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate);
}

/**
 * Helper to calculate required monthly SIP (PMT) to reach a target future shortfall
 */
function calculateRequiredMonthlySIP(futureTarget: number, annualReturnRate: number, years: number): number {
  if (futureTarget <= 0 || years <= 0) return 0;
  const monthlyRate = annualReturnRate / 100 / 12;
  const totalMonths = years * 12;
  if (monthlyRate === 0) return Math.round(futureTarget / totalMonths);
  const pmt = futureTarget * (monthlyRate / ((Math.pow(1 + monthlyRate, totalMonths) - 1) * (1 + monthlyRate)));
  return Math.round(pmt);
}

/**
 * Main Analysis Engine function
 */
export function generateClientDiagnostic(profile: ClientProfileInput): {
  systemFindings: DiagnosticFindingsSnapshot;
  recommendedInvestments: RecommendedAction[];
} {
  const { client, incomes = [], expenses = [], assets = [], liabilities = [], investments = [], goals = [] } = profile;
  const currentYear = new Date().getFullYear();
  const riskProfile = client?.risk_profile || "Moderate";

  // -------------------------------------------------------------
  // 1. CASH FLOW ANALYSIS
  // -------------------------------------------------------------
  const totalMonthlyIncome = incomes.reduce((sum, inc) => sum + Number(inc.monthly_amount || 0), 0);
  const totalMonthlyExpenses = expenses.reduce((sum, exp) => sum + Number(exp.monthly_amount || 0), 0);
  const essentialExpenses = expenses
    .filter((e) => e.is_essential === true || String(e.is_essential).toLowerCase() === "true")
    .reduce((sum, exp) => sum + Number(exp.monthly_amount || 0), 0);
  const discretionaryExpenses = Math.max(0, totalMonthlyExpenses - essentialExpenses);

  const totalMonthlyEMIs = liabilities.reduce((sum, l) => sum + Number(l.monthly_emi || 0), 0);
  const totalOutflows = totalMonthlyExpenses + totalMonthlyEMIs;
  const netMonthlySurplus = totalMonthlyIncome - totalOutflows;

  const savingsRate = totalMonthlyIncome > 0 ? (netMonthlySurplus / totalMonthlyIncome) * 100 : 0;
  const emiToIncomeRatio = totalMonthlyIncome > 0 ? (totalMonthlyEMIs / totalMonthlyIncome) * 100 : 0;

  let cashFlowStatus: "HEALTHY" | "MODERATE" | "DEFICIT" = "HEALTHY";
  let cashFlowScore = 85;

  if (netMonthlySurplus < 0) {
    cashFlowStatus = "DEFICIT";
    cashFlowScore = Math.max(20, Math.round(40 + (netMonthlySurplus / (totalMonthlyIncome || 1)) * 30));
  } else if (savingsRate < 20 || emiToIncomeRatio > 40) {
    cashFlowStatus = "MODERATE";
    cashFlowScore = Math.min(75, Math.max(50, Math.round(50 + savingsRate * 0.8 - (emiToIncomeRatio > 40 ? 15 : 0))));
  } else {
    cashFlowScore = Math.min(100, Math.round(75 + savingsRate * 0.5));
  }

  const cashFlowFindings: string[] = [];
  if (netMonthlySurplus < 0) {
    cashFlowFindings.push(
      `Negative cash flow deficit of ₹${Math.abs(Math.round(netMonthlySurplus)).toLocaleString("en-IN")}/month. Immediate expense pruning or debt consolidation required.`
    );
  } else {
    cashFlowFindings.push(
      `Net monthly surplus of ₹${Math.round(netMonthlySurplus).toLocaleString("en-IN")} (${savingsRate.toFixed(1)}% savings rate) available for wealth accumulation.`
    );
  }

  if (emiToIncomeRatio > 45) {
    cashFlowFindings.push(
      `High debt servicing burden: EMIs consume ${emiToIncomeRatio.toFixed(1)}% of gross monthly income, well above the recommended 35% ceiling.`
    );
  } else if (emiToIncomeRatio > 0) {
    cashFlowFindings.push(
      `Healthy debt servicing ratio: EMIs account for ${emiToIncomeRatio.toFixed(1)}% of monthly inflows.`
    );
  } else {
    cashFlowFindings.push("Client currently has zero active EMI commitments.");
  }

  // -------------------------------------------------------------
  // 2. NET WORTH & SOLVENCY ANALYSIS
  // -------------------------------------------------------------
  const totalPhysicalAssets = assets.reduce((sum, a) => sum + Number(a.current_market_value || 0), 0);
  const totalInvestments = investments.reduce((sum, i) => sum + Number(i.current_value || 0), 0);
  const totalAssets = totalPhysicalAssets + totalInvestments;
  const totalLiabilities = liabilities.reduce((sum, l) => sum + Number(l.outstanding_principal || 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  const liquidPhysical = assets
    .filter((a) => a.is_liquid === true || String(a.is_liquid).toLowerCase() === "true")
    .reduce((sum, a) => sum + Number(a.current_market_value || 0), 0);
  const liquidAssets = liquidPhysical + totalInvestments;
  const illiquidAssets = Math.max(0, totalAssets - liquidAssets);

  const liquidityRatio = totalAssets > 0 ? (liquidAssets / totalAssets) * 100 : 0;
  const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  const monthlyLivingBurn = totalMonthlyExpenses > 0 ? totalMonthlyExpenses : 1;
  const emergencyFundAdequacyMonths = Number((liquidAssets / monthlyLivingBurn).toFixed(1));

  let emergencyFundStatus: "SUFFICIENT" | "PARTIAL" | "VULNERABLE" = "SUFFICIENT";
  if (emergencyFundAdequacyMonths < 3) {
    emergencyFundStatus = "VULNERABLE";
  } else if (emergencyFundAdequacyMonths < 6) {
    emergencyFundStatus = "PARTIAL";
  } else {
    emergencyFundStatus = "SUFFICIENT";
  }

  let solvencyScore = 80;
  if (debtToAssetRatio > 50) solvencyScore -= 25;
  else if (debtToAssetRatio > 30) solvencyScore -= 10;

  if (emergencyFundStatus === "VULNERABLE") solvencyScore -= 20;
  else if (emergencyFundStatus === "PARTIAL") solvencyScore -= 10;
  else solvencyScore += 10;

  solvencyScore = Math.max(25, Math.min(100, solvencyScore));

  const netWorthFindings: string[] = [];
  netWorthFindings.push(
    `Consolidated Net Worth stands at ₹${Math.round(netWorth).toLocaleString("en-IN")} across physical assets (₹${Math.round(totalPhysicalAssets).toLocaleString("en-IN")}) and investment securities (₹${Math.round(totalInvestments).toLocaleString("en-IN")}).`
  );

  if (emergencyFundStatus === "VULNERABLE") {
    netWorthFindings.push(
      `Emergency Liquidity Gap: Available liquid reserves cover only ${emergencyFundAdequacyMonths} months of expenses (Target: 6 months / ₹${Math.round(monthlyLivingBurn * 6).toLocaleString("en-IN")}).`
    );
  } else if (emergencyFundStatus === "PARTIAL") {
    netWorthFindings.push(
      `Moderate liquidity buffer: Emergency coverage stands at ${emergencyFundAdequacyMonths} months (recommended: 6 months).`
    );
  } else {
    netWorthFindings.push(
      `Robust liquidity buffer: Emergency reserves cover ${emergencyFundAdequacyMonths} months of living expenses, fully satisfying the safety benchmark.`
    );
  }

  if (debtToAssetRatio > 40) {
    netWorthFindings.push(
      `Elevated leverage: Debt-to-Asset ratio is ${debtToAssetRatio.toFixed(1)}%, indicating high vulnerability to asset devaluations or interest rate spikes.`
    );
  } else {
    netWorthFindings.push(
      `Conservative leverage profile: Debt-to-Asset ratio is ${debtToAssetRatio.toFixed(1)}%, well within the safe 30% boundary.`
    );
  }

  // -------------------------------------------------------------
  // 3. GOAL FEASIBILITY & GAP ANALYSIS (PRIORITIZED SURPLUS WATERFALL)
  // -------------------------------------------------------------
  const goalItems: GoalDiagnosticItem[] = [];
  let totalInflatedTarget = 0;
  let totalProjectedCorpus = 0;
  let totalShortfall = 0;
  let onTrackCount = 0;
  let gapCount = 0;

  // Priority mapping weights: HIGH first, then MEDIUM, then LOW
  const priorityWeight: Record<string, number> = {
    HIGH: 3,
    High: 3,
    high: 3,
    MEDIUM: 2,
    Medium: 2,
    medium: 2,
    LOW: 1,
    Low: 1,
    low: 1,
  };

  // Sort goals by priority, then by target year (shorter horizon first)
  const sortedGoals = [...goals].sort((a, b) => {
    const pA = priorityWeight[String(a.priority)] || 2;
    const pB = priorityWeight[String(b.priority)] || 2;
    if (pA !== pB) return pB - pA;
    const yA = Number(a.target_year || 9999);
    const yB = Number(b.target_year || 9999);
    return yA - yB;
  });

  // 1. Prepare each goal's gross future requirements and required monthly SIP
  const preparedGoals = sortedGoals.map((g) => {
    // Support target_amount_today (schema column) with fallback to target_amount
    const targetAmt = Number(g.target_amount_today ?? g.target_amount ?? 0);
    const targetYr = Number(g.target_year || currentYear + 5);
    const yearsRem = Math.max(1, targetYr - currentYear);

    // Normalize inflation rate: if stored as 0.06 decimal, convert to 6.0 percentage
    let infRate = 6.0;
    if (g.expected_inflation_rate !== undefined && g.expected_inflation_rate !== null) {
      const val = Number(g.expected_inflation_rate);
      infRate = val <= 0.25 ? val * 100 : val;
    } else if (g.inflation_rate !== undefined && g.inflation_rate !== null) {
      const val = Number(g.inflation_rate);
      infRate = val <= 0.25 ? val * 100 : val;
    }

    const expReturn = g.expected_return_rate !== undefined && g.expected_return_rate !== null ? Number(g.expected_return_rate) : 11.0;

    // Compounded future value of target
    const inflatedTarget = Math.round(targetAmt * Math.pow(1 + infRate / 100, yearsRem));

    // Compounded growth of existing dedicated cash corpus
    const allocatedCorpus = Number(g.current_corpus_allocated || 0);
    const futureValCorpus = Math.round(allocatedCorpus * Math.pow(1 + expReturn / 100, yearsRem));

    // 1. Identify Earmarked Physical Assets & Project Liquidation Proceeds
    const unpackedGoalObj = unpackGoal(g);
    const linkedAssetIds = new Set(unpackedGoalObj.linked_asset_ids || []);

    const mappedAssets = (assets || [])
      .filter((a: any) => {
        const uA = unpackAsset(a);
        return uA.linked_goal_id === g.goal_id || (a.asset_id && linkedAssetIds.has(a.asset_id));
      })
      .map((a: any) => projectAssetProceedsForGoal(unpackAsset(a), targetYr));

    const totalAssetProceeds = mappedAssets.reduce((sum, item) => sum + item.projectedProceeds, 0);

    // 2. Identify Earmarked Market Investments & Project Compounded Corpus
    const linkedInvIds = new Set(unpackedGoalObj.linked_investment_ids || []);
    const mappedInvestments = (investments || [])
      .filter((inv: any) => {
        const uInv = unpackInvestment(inv);
        return uInv.linked_goal_id === g.goal_id || (inv.investment_id && linkedInvIds.has(inv.investment_id));
      })
      .map((inv: any) => projectInvestmentCorpusForGoal(unpackInvestment(inv), targetYr));

    const totalInvestmentProceeds = mappedInvestments.reduce((sum, item) => sum + item.totalProjectedCorpus, 0);

    // 3. Consolidated Pre-Funded Future Corpus (Corpus + Asset Liquidations + Investments)
    const totalPreFundedCorpus = futureValCorpus + totalAssetProceeds + totalInvestmentProceeds;

    // 4. Net Future Shortfall to be bridged by ongoing monthly cash flow surplus
    const grossShortfall = Math.max(0, inflatedTarget - totalPreFundedCorpus);

    // 5. True Monthly SIP required to bridge only the remaining gap
    const requiredSip = grossShortfall > 0
      ? calculateRequiredMonthlySIP(grossShortfall, expReturn, yearsRem)
      : 0;

    return {
      raw: g,
      goalId: g.goal_id,
      goalName: g.goal_name || "Financial Goal",
      targetYear: targetYr,
      yearsRemaining: yearsRem,
      priority: g.priority || "High",
      targetAmount: targetAmt,
      inflationRate: infRate,
      expectedReturnRate: expReturn,
      inflatedTargetAmount: inflatedTarget,
      currentAllocatedCorpus: allocatedCorpus,
      futureValCorpus,
      totalAssetProceeds,
      totalInvestmentProceeds,
      totalPreFundedCorpus,
      grossShortfall,
      requiredSip,
      mappedAssets,
      mappedInvestments,
    };
  });

  // Calculate total monthly required SIP across all family goals vs net monthly cash flow surplus
  const totalMonthlyRequiredSip = preparedGoals.reduce((sum, g) => sum + g.requiredSip, 0);
  const totalEarmarkedAssetProceeds = preparedGoals.reduce((sum, g) => sum + g.totalAssetProceeds, 0);
  const totalEarmarkedInvestmentProceeds = preparedGoals.reduce((sum, g) => sum + g.totalInvestmentProceeds, 0);
  const totalMonthlySurplus = Math.max(0, netMonthlySurplus);
  const monthlyCapacityGap = Math.max(0, totalMonthlyRequiredSip - totalMonthlySurplus);
  const capacityStatus: "AFFORDABLE" | "DEFICIT" = monthlyCapacityGap > 0 ? "DEFICIT" : "AFFORDABLE";

  // 2. Waterfall the household's available surplus across prioritized goals
  let remainingSurplus = totalMonthlySurplus;

  for (const pg of preparedGoals) {
    // How much monthly SIP can be allocated to this goal given remaining surplus?
    const allocatableSip = Math.min(pg.requiredSip, Math.max(0, remainingSurplus));
    remainingSurplus = Math.max(0, remainingSurplus - allocatableSip);

    // Unfunded monthly SIP for this goal
    const unfundedMonthlySip = Math.max(0, pg.requiredSip - allocatableSip);

    // Projected future value of the allocatable SIP
    const achievableFutureValSip = calculateSipFutureValue(allocatableSip, pg.expectedReturnRate, pg.yearsRemaining);

    // Realistic total projected corpus given available cash flows and pre-funded asset liquidations
    const projectedCorpus = Math.round(pg.totalPreFundedCorpus + achievableFutureValSip);

    // Actual realistic shortfall
    const shortfall = Math.max(0, pg.inflatedTargetAmount - projectedCorpus);

    // Funded percentage
    const fundedPct = pg.inflatedTargetAmount > 0
      ? Math.min(100, Math.round((projectedCorpus / pg.inflatedTargetAmount) * 100))
      : 100;

    let feasibilityStatus: "ON_TRACK" | "MODERATE_GAP" | "CRITICAL_GAP" = "ON_TRACK";
    if (fundedPct >= 95 || unfundedMonthlySip === 0) {
      feasibilityStatus = "ON_TRACK";
      onTrackCount++;
    } else if (fundedPct >= 65) {
      feasibilityStatus = "MODERATE_GAP";
      gapCount++;
    } else {
      feasibilityStatus = "CRITICAL_GAP";
      gapCount++;
    }

    let summary = "";
    const assetCount = pg.mappedAssets.length;
    const invCount = pg.mappedInvestments.length;

    let backingDetails: string[] = [];
    if (pg.totalAssetProceeds > 0) {
      backingDetails.push(`₹${(pg.totalAssetProceeds / 100000).toFixed(1)}L from ${assetCount} earmarked asset liquidation(s)`);
    }
    if (pg.totalInvestmentProceeds > 0) {
      backingDetails.push(`₹${(pg.totalInvestmentProceeds / 100000).toFixed(1)}L from ${invCount} mapped investment(s)`);
    }

    const backingText = backingDetails.length > 0 ? ` (backed by ${backingDetails.join(" + ")})` : "";

    if (feasibilityStatus === "ON_TRACK") {
      if (pg.requiredSip === 0) {
        summary = `Goal is fully funded & on-track for ${pg.targetYear}${backingText}. Zero additional monthly SIP needed.`;
      } else {
        summary = `Goal is on-track for ${pg.targetYear}${backingText}. Current cash flow surplus easily funds the required ₹${Math.round(allocatableSip).toLocaleString("en-IN")}/mo SIP.`;
      }
    } else if (feasibilityStatus === "MODERATE_GAP") {
      summary = `Moderate shortfall of ₹${Math.round(shortfall).toLocaleString("en-IN")}${backingText}. Current surplus funds ₹${Math.round(allocatableSip).toLocaleString("en-IN")}/mo; requires an additional ₹${Math.round(unfundedMonthlySip).toLocaleString("en-IN")}/mo.`;
    } else {
      summary = `Funding gap of ₹${Math.round(shortfall).toLocaleString("en-IN")} (${fundedPct}% funded)${backingText}. Requires an additional ₹${Math.round(unfundedMonthlySip).toLocaleString("en-IN")}/mo or extending target horizon.`;
    }

    totalInflatedTarget += pg.inflatedTargetAmount;
    totalProjectedCorpus += projectedCorpus;
    totalShortfall += shortfall;

    goalItems.push({
      goalId: pg.goalId,
      goalName: pg.goalName,
      targetYear: pg.targetYear,
      yearsRemaining: pg.yearsRemaining,
      priority: pg.priority,
      targetAmount: pg.targetAmount,
      inflationRate: pg.inflationRate,
      expectedReturnRate: pg.expectedReturnRate,
      inflatedTargetAmount: pg.inflatedTargetAmount,
      currentAllocatedCorpus: pg.currentAllocatedCorpus,
      projectedCorpus,
      shortfall,
      fundedPercentage: fundedPct,
      feasibilityStatus,
      currentMonthlySIP: allocatableSip,
      additionalMonthlySipRequired: unfundedMonthlySip,
      recommendationSummary: summary,
      earmarkedAssetProceeds: pg.totalAssetProceeds,
      earmarkedInvestmentProceeds: pg.totalInvestmentProceeds,
      totalPreFundedFutureCorpus: pg.totalPreFundedCorpus,
      linkedAssets: pg.mappedAssets,
      linkedInvestments: pg.mappedInvestments,
    });
  }

  const overallGoalHealthScore =
    goals.length > 0
      ? Math.round(
          goalItems.reduce((acc, item) => acc + item.fundedPercentage, 0) / goals.length
        )
      : 80;

  const goalFindings: string[] = [];
  if (goals.length === 0) {
    goalFindings.push("No active financial goals configured. Recommend establishing core goals (e.g. Retirement, Contingency, Education).");
  } else {
    goalFindings.push(
      `Evaluated ${goals.length} life goals: ${onTrackCount} on-track, ${gapCount} facing funding shortfalls under current cash flow capacity.`
    );
    if (monthlyCapacityGap > 0) {
      goalFindings.push(
        `Cash Flow Capacity Alert: Cumulative required SIPs (₹${Math.round(totalMonthlyRequiredSip).toLocaleString("en-IN")}/mo) exceed monthly net surplus (₹${Math.round(totalMonthlySurplus).toLocaleString("en-IN")}/mo) by ₹${Math.round(monthlyCapacityGap).toLocaleString("en-IN")}/month.`
      );
    }
    if (totalShortfall > 0) {
      goalFindings.push(
        `Total cumulative goal shortfall across all time horizons stands at ₹${Math.round(totalShortfall).toLocaleString("en-IN")}.`
      );
    } else {
      goalFindings.push("All mapped financial goals are adequately funded under current return assumptions.");
    }
  }

  // -------------------------------------------------------------
  // 4. OVERALL HEALTH SCORE & SUMMARY HIGHLIGHTS
  // -------------------------------------------------------------
  const overallHealthScore = Math.round(
    cashFlowScore * 0.35 + solvencyScore * 0.35 + overallGoalHealthScore * 0.3
  );

  const summaryHighlights: string[] = [];
  if (cashFlowStatus === "DEFICIT") {
    summaryHighlights.push("Priority 1: Arrest monthly cash flow deficit to prevent debt accumulation.");
  } else if (netMonthlySurplus > 25000) {
    summaryHighlights.push(`Substantial investable surplus of ₹${Math.round(netMonthlySurplus).toLocaleString("en-IN")}/mo ready for strategic deployment.`);
  }

  if (emergencyFundStatus !== "SUFFICIENT") {
    summaryHighlights.push("Priority: Fortify liquid emergency reserves to safeguard against income disruptions.");
  }

  if (totalEarmarkedAssetProceeds > 0) {
    summaryHighlights.push(
      `Asset Liquidation Strategy: ₹${(totalEarmarkedAssetProceeds / 10000000).toFixed(2)} Cr in planned physical asset liquidations (Real Estate, FDs & Gold) earmarked to fund long-term life goals.`
    );
  }

  if (monthlyCapacityGap > 0) {
    summaryHighlights.push(
      `Goal Cash Flow Gap: Required SIPs (₹${(totalMonthlyRequiredSip / 100000).toFixed(2)} L/mo) exceed monthly surplus (₹${(totalMonthlySurplus / 100000).toFixed(2)} L/mo) by ₹${Math.round(monthlyCapacityGap).toLocaleString("en-IN")}/mo. Trade-offs or income expansion needed.`
    );
  } else if (gapCount > 0) {
    summaryHighlights.push(`${gapCount} goal(s) require active SIP step-ups or asset rebalancing to beat long-term inflation.`);
  }

  // -------------------------------------------------------------
  // 5. INVESTMENT MATCHING & ACTIONABLE RECOMMENDATIONS
  // -------------------------------------------------------------
  const recommendations: RecommendedAction[] = [];

  // Rec 1: Emergency Reserve Fortification
  if (emergencyFundStatus !== "SUFFICIENT") {
    const targetReserve = Math.round(monthlyLivingBurn * 6);
    const deficitReserve = Math.max(0, targetReserve - liquidAssets);
    const recommendedAllocation = Math.min(deficitReserve, Math.max(10000, Math.round(netMonthlySurplus * 0.5)));

    recommendations.push({
      id: "rec-emergency-buffer",
      category: "EMERGENCY_RESERVE",
      priority: "HIGH",
      title: "Establish 6-Month Liquid Emergency Reserve",
      rationale: `Current liquid coverage is only ${emergencyFundAdequacyMonths} months (₹${Math.round(liquidAssets).toLocaleString("en-IN")}). A 6-month buffer of ₹${targetReserve.toLocaleString("en-IN")} is essential before committing additional capital to volatile assets.`,
      suggestedAction: `Direct ₹${recommendedAllocation.toLocaleString("en-IN")}/month of monthly surplus into high-liquidity instruments until emergency reserves reach ₹${targetReserve.toLocaleString("en-IN")}.`,
      actionDetails: {
        instrumentType: "Liquid / Arbitrage Mutual Funds or High-Yield Sweep FDs",
        currentAmount: liquidAssets,
        recommendedAmount: targetReserve,
        targetInstrument: "Aditya Birla Sun Life Liquid Fund / ICICI Pru Arbitrage Fund",
        potentialBenefit: "Capital preservation with instant T+0 / T+1 redemption access and 6.5–7.0% post-tax yield.",
      },
      expectedImpact: `Builds a complete ₹${targetReserve.toLocaleString("en-IN")} safety cushion against unplanned medical emergencies or income disruptions.`,
    });
  }

  // Rec 2: High-Interest Debt Restructuring
  const highInterestLoans = liabilities.filter(
    (l) => Number(l.interest_rate || 0) >= 10.5 || ["PERSONAL_LOAN", "CREDIT_CARD", "OTHER"].includes(l.liability_type)
  );

  if (highInterestLoans.length > 0) {
    const highestLoan = highInterestLoans.sort((a, b) => Number(b.interest_rate || 0) - Number(a.interest_rate || 0))[0];
    const principal = Number(highestLoan.outstanding_principal || 0);
    const rate = Number(highestLoan.interest_rate || 0);

    recommendations.push({
      id: `rec-debt-${highestLoan.liability_id || "high-rate"}`,
      category: "DEBT_RESTRUCTURING",
      priority: "HIGH",
      title: `Accelerated Prepayment of High-Cost Debt (${highestLoan.lender_name || "Loan"} at ${rate}% p.a.)`,
      rationale: `Servicing debt at ${rate}% interest creates a severe drag on portfolio returns, outstripping conservative post-tax fixed income yields.`,
      suggestedAction: `Allocate a portion of monthly cash flow surplus or idle savings to execute systematic principal prepayments against ${highestLoan.lender_name || "this loan"}.`,
      actionDetails: {
        instrumentType: "Debt Prepayment",
        currentAmount: principal,
        recommendedAmount: Math.min(principal, Math.max(50000, Math.round(principal * 0.25))),
        targetInstrument: `${highestLoan.lender_name} - ${highestLoan.liability_type}`,
        potentialBenefit: `Guaranteed risk-free return of ${rate}% annualized on every rupee prepaid.`,
        tenureYears: Number(highestLoan.remaining_tenure_months || 0) / 12,
      },
      expectedImpact: `Saves substantial cumulative interest payments and unfreezes monthly EMI cash flows for equity investments.`,
    });
  }

  // Rec 3A: Cash Flow Capacity Deficit & Goal Prioritization Trade-off
  if (monthlyCapacityGap > 0) {
    const onTrackGoals = goalItems.filter((g) => g.feasibilityStatus === "ON_TRACK");
    const gapGoals = goalItems.filter((g) => g.feasibilityStatus !== "ON_TRACK");
    const primaryGoalName = onTrackGoals[0]?.goalName || "Core Priority Goal";
    const constrainedGoalName = gapGoals[0]?.goalName || "Secondary Goal";

    recommendations.push({
      id: "rec-cashflow-goal-capacity-gap",
      category: "GOAL_REALIGNMENT",
      priority: "HIGH",
      title: `Cash Flow Capacity Deficit: Required SIPs (₹${(totalMonthlyRequiredSip / 100000).toFixed(2)} L/mo) Exceed Surplus (₹${(totalMonthlySurplus / 100000).toFixed(2)} L/mo)`,
      rationale: `The household has a net monthly surplus of ₹${Math.round(totalMonthlySurplus).toLocaleString("en-IN")}/mo, but concurrently funding all ${goals.length} goals demands ₹${Math.round(totalMonthlyRequiredSip).toLocaleString("en-IN")}/mo in monthly SIPs. This creates an immediate monthly cash flow deficit of ₹${Math.round(monthlyCapacityGap).toLocaleString("en-IN")}/mo. Under current household income, only "${primaryGoalName}" can be fully funded from cash flows, leaving "${constrainedGoalName}" severely underfunded.`,
      suggestedAction: `To achieve both goals, the household must choose one or more adjustments: (1) Increase household salary/business income by at least ₹${Math.round(monthlyCapacityGap).toLocaleString("en-IN")}/mo, (2) Reduce discretionary monthly living expenses, (3) Extend the target year for "${constrainedGoalName}" to lower the monthly SIP burden, or (4) Rationalize the target goal amount today.`,
      actionDetails: {
        instrumentType: "Comprehensive Goal Rebalancing & Cash Flow Optimization",
        currentAmount: totalMonthlySurplus,
        recommendedAmount: totalMonthlyRequiredSip,
        targetInstrument: `Fully fund ${primaryGoalName} (₹${Math.round(onTrackGoals[0]?.currentMonthlySIP || 0).toLocaleString("en-IN")}/mo), then realign ${constrainedGoalName}`,
        potentialBenefit: `Protects core family priorities from shortfall while establishing an achievable, non-deficit savings roadmap.`,
        tenureYears: gapGoals[0]?.yearsRemaining || 10,
      },
      expectedImpact: `Closes the ₹${Math.round(monthlyCapacityGap).toLocaleString("en-IN")}/month cash flow gap and aligns lifestyle targets with real household earnings.`,
    });
  }

  // Rec 3B: Goal-Oriented SIP Step-ups
  const goalsWithGaps = goalItems
    .filter((g) => g.feasibilityStatus !== "ON_TRACK" && g.additionalMonthlySipRequired > 0)
    .sort((a, b) => {
      // Prioritize High priority goals or goals with largest shortfall
      if (a.priority === "HIGH" && b.priority !== "HIGH") return -1;
      if (b.priority === "HIGH" && a.priority !== "HIGH") return 1;
      return b.shortfall - a.shortfall;
    });

  for (const goal of goalsWithGaps.slice(0, 2)) {
    // Determine suggested asset class based on risk profile and years remaining
    let targetClass = "Flexi-Cap / Large & Mid Cap Mutual Funds";
    let expectedCagr = "12–14% CAGR";
    if (riskProfile === "Conservative" || goal.yearsRemaining <= 3) {
      targetClass = "Conservative Hybrid / Multi-Asset Allocation Funds";
      expectedCagr = "8–10% CAGR";
    } else if (riskProfile === "Aggressive" && goal.yearsRemaining > 7) {
      targetClass = "Diversified Equity (70% Large/Mid Cap + 30% Small Cap / Index)";
      expectedCagr = "13–15% CAGR";
    }

    recommendations.push({
      id: `rec-goal-sip-${goal.goalId}`,
      category: "SIP_STEP_UP",
      priority: goal.priority === "HIGH" ? "HIGH" : "MEDIUM",
      title: `Step-Up Monthly SIP for "${goal.goalName}" by ₹${goal.additionalMonthlySipRequired.toLocaleString("en-IN")}/mo`,
      rationale: `Goal target of ₹${goal.inflatedTargetAmount.toLocaleString("en-IN")} by ${goal.targetYear} faces a projected shortfall of ₹${goal.shortfall.toLocaleString("en-IN")} (${goal.fundedPercentage}% funded).`,
      suggestedAction: `Initiate or increase monthly systematic investment by ₹${goal.additionalMonthlySipRequired.toLocaleString("en-IN")} aligned to ${riskProfile} risk profile.`,
      actionDetails: {
        instrumentType: targetClass,
        currentAmount: goal.currentMonthlySIP,
        recommendedAmount: goal.currentMonthlySIP + goal.additionalMonthlySipRequired,
        targetInstrument: targetClass,
        potentialBenefit: `Projected to bridge the ₹${goal.shortfall.toLocaleString("en-IN")} deficit at expected ${expectedCagr}.`,
        tenureYears: goal.yearsRemaining,
      },
      expectedImpact: `Brings goal funding to 100% feasibility before target maturity date in ${goal.targetYear}.`,
    });
  }

  // Rec 4: Idle Cash Deployment & Asset Rebalancing
  const idleCashInAssets = assets
    .filter((a) => ["SAVINGS_ACCOUNT", "CURRENT_ACCOUNT", "CASH"].includes(a.asset_type?.toUpperCase?.()) || a.asset_name?.toLowerCase?.().includes("savings"))
    .reduce((sum, a) => sum + Number(a.current_market_value || 0), 0);

  if (idleCashInAssets > monthlyLivingBurn * 8) {
    const excessCash = idleCashInAssets - monthlyLivingBurn * 6;
    recommendations.push({
      id: "rec-idle-cash-rebalance",
      category: "ASSET_REBALANCING",
      priority: "MEDIUM",
      title: `Deploy Idle Savings Cash (₹${Math.round(excessCash).toLocaleString("en-IN")}) into Productive Assets`,
      rationale: `Substantial cash balance of ₹${Math.round(idleCashInAssets).toLocaleString("en-IN")} in low-yield bank accounts (yielding 3.0–3.5%) is suffering real capital erosion against 6.0% inflation.`,
      suggestedAction: `Deploy surplus liquid reserves exceeding 6-month emergency needs into staggered STP (Systematic Transfer Plan) or Multi-Asset Allocation funds.`,
      actionDetails: {
        instrumentType: "Multi-Asset Allocation / Balanced Advantage Fund",
        currentAmount: idleCashInAssets,
        recommendedAmount: excessCash,
        targetInstrument: "ICICI Prudential Multi-Asset Fund / HDFC Balanced Advantage Fund",
        potentialBenefit: "Increases expected portfolio yield from ~3.5% to 10–12% while maintaining prudent drawdown protection.",
      },
      expectedImpact: `Unlocks higher real post-tax compounding on ₹${Math.round(excessCash).toLocaleString("en-IN")} of currently idle assets.`,
    });
  }

  // Rec 5: Tax Optimization (if New regime or Old regime check)
  if (client?.tax_regime === "Old" && totalMonthlyIncome * 12 > 1000000) {
    recommendations.push({
      id: "rec-tax-opt",
      category: "TAX_OPTIMIZATION",
      priority: "LOW",
      title: "Evaluate Tax Regime Optimization (New vs Old)",
      rationale: "With revised New Tax Regime slab benefits, clients with gross annual income above ₹10L often pay lower effective tax without locking funds into 80C instruments.",
      suggestedAction: "Conduct side-by-side annual tax liability comparison during the upcoming planning review.",
      actionDetails: {
        instrumentType: "Tax Planning Review",
        potentialBenefit: "Potential annual tax savings of ₹25,000–₹60,000 to re-channel into monthly SIPs.",
      },
      expectedImpact: "Optimizes net take-home cash flows.",
    });
  }

  const systemFindings: DiagnosticFindingsSnapshot = {
    calculatedAt: new Date().toISOString(),
    overallHealthScore,
    riskProfile,
    cashFlow: {
      totalMonthlyIncome,
      totalMonthlyExpenses,
      essentialExpenses,
      discretionaryExpenses,
      totalMonthlyEMIs,
      totalOutflows,
      netMonthlySurplus,
      savingsRate,
      emiToIncomeRatio,
      status: cashFlowStatus,
      score: cashFlowScore,
      findings: cashFlowFindings,
    },
    netWorth: {
      totalPhysicalAssets,
      totalInvestments,
      totalAssets,
      totalLiabilities,
      netWorth,
      liquidAssets,
      illiquidAssets,
      liquidityRatio,
      debtToAssetRatio,
      emergencyFundAdequacyMonths,
      emergencyFundStatus,
      score: solvencyScore,
      findings: netWorthFindings,
    },
    goals: {
      overallScore: overallGoalHealthScore,
      totalGoalsCount: goals.length,
      onTrackCount,
      gapCount,
      totalInflatedTarget,
      totalProjectedCorpus,
      totalShortfall,
      totalMonthlyRequiredSip,
      totalEarmarkedAssetProceeds,
      totalEarmarkedInvestmentProceeds,
      monthlySurplus: totalMonthlySurplus,
      monthlyCapacityGap,
      capacityStatus,
      goals: goalItems,
      findings: goalFindings,
    },
    summaryHighlights,
  };

  return {
    systemFindings,
    recommendedInvestments: recommendations,
  };
}

