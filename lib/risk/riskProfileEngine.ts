/**
 * Multi-Factor Investor Risk Profiling & SEBI Suitability Engine
 * 
 * Computes:
 * 1. Psychological Risk Tolerance (Structured questionnaire responses)
 * 2. Financial Risk Capacity (Dynamic calculation based on Age, Dependents,
 *    Savings Rate, Emergency Liquidity Buffer, Debt-to-Asset Leverage)
 * 3. Composite Overall Risk Score (0-100) & SEBI Risk Category
 * 4. Recommended Asset Allocation (Equity %, Debt %, Gold %, Cash %)
 * 5. Fiduciary Suitability Statement & Annual Review Renewal Tracker (365 Days)
 */

export type RiskCategory =
  | "Conservative"
  | "Moderately Conservative"
  | "Moderate"
  | "Moderately Aggressive"
  | "Aggressive";

export interface RiskQuestionOption {
  value: string;
  label: string;
  description?: string;
  points: number; // 0 to 100
}

export interface RiskQuestion {
  id: string;
  title: string;
  category: "HORIZON" | "OBJECTIVE" | "TOLERANCE" | "EXPERIENCE" | "TRADE_OFF" | "LIQUIDITY";
  question: string;
  helpText?: string;
  options: RiskQuestionOption[];
}

export const RISK_QUESTIONS: RiskQuestion[] = [
  {
    id: "horizon",
    title: "1. Investment Time Horizon",
    category: "HORIZON",
    question: "How long do you plan to keep your overall wealth invested before you need major withdrawals?",
    helpText: "Longer investment horizons allow portfolios to recover from short-term market cycles.",
    options: [
      { value: "LESS_THAN_1_YR", label: "Less than 1 year", description: "Need funds very soon; capital protection is critical.", points: 10 },
      { value: "1_TO_3_YRS", label: "1 to 3 years", description: "Short-to-medium term; low tolerance for volatility.", points: 30 },
      { value: "3_TO_5_YRS", label: "3 to 5 years", description: "Medium term; can absorb moderate market fluctuations.", points: 55 },
      { value: "5_TO_10_YRS", label: "5 to 10 years", description: "Long term; comfortable with equity market cycles for higher compounding.", points: 80 },
      { value: "MORE_THAN_10_YRS", label: "More than 10 years", description: "Very long term; multi-decadal wealth creation and retirement corpus.", points: 100 },
    ],
  },
  {
    id: "objective",
    title: "2. Primary Investment Objective",
    category: "OBJECTIVE",
    question: "What is the primary financial goal you want your portfolio to achieve?",
    helpText: "Balancing the desire for capital preservation against the need for inflation-beating real returns.",
    options: [
      { value: "PRESERVATION", label: "Capital Preservation", description: "Protect capital value from any nominal loss, even if returns lag inflation.", points: 10 },
      { value: "REGULAR_INCOME", label: "Stable Regular Income", description: "Generate consistent periodic income with minimal capital fluctuation.", points: 30 },
      { value: "BALANCED_GROWTH", label: "Balanced Capital Growth & Income", description: "Achieve moderate growth while cushioning against sharp downturns.", points: 55 },
      { value: "LONG_TERM_WEALTH", label: "Capital Appreciation", description: "Grow wealth faster than inflation; can endure periodic market volatility.", points: 80 },
      { value: "AGGRESSIVE_GROWTH", label: "Aggressive Wealth Maximization", description: "Maximize long-term capital growth; comfortable taking calculated risks.", points: 100 },
    ],
  },
  {
    id: "volatility_reaction",
    title: "3. Market Volatility & Drawdown Reaction",
    category: "TOLERANCE",
    question: "If your equity portfolio declines by 20% over a 3-month period due to market-wide correction, what would you do?",
    helpText: "Simulates emotional composure and psychological reaction to temporary unrealized portfolio drawdowns.",
    options: [
      { value: "PANIC_SELL_ALL", label: "Sell all remaining investments immediately", description: "Cut losses and move entire balance to bank fixed deposits / liquid cash.", points: 10 },
      { value: "SELL_PARTIAL", label: "Sell a significant portion to safer debt funds", description: "Reduce risk exposure to avoid further paper losses.", points: 30 },
      { value: "HOLD_PATIENT", label: "Hold investments and wait for market recovery", description: "Understand corrections are normal; stay invested according to plan.", points: 65 },
      { value: "BUY_DIP_MODERATE", label: "Invest an additional small amount at lower prices", description: "View downturn as a buying opportunity to lower average purchase cost.", points: 85 },
      { value: "BUY_DIP_AGGRESSIVE", label: "Aggressively deploy surplus capital into equities", description: "Take strong advantage of market discounts for outsized long-term gains.", points: 100 },
    ],
  },
  {
    id: "experience",
    title: "4. Investment Experience & Market Knowledge",
    category: "EXPERIENCE",
    question: "How would you describe your familiarity and active experience with capital markets?",
    helpText: "Past exposure to market volatility helps investors navigate real-world drawdowns.",
    options: [
      { value: "BEGINNER", label: "Beginner / Fixed Deposits & PPF only", description: "Little to no experience with market-linked financial instruments.", points: 15 },
      { value: "BASIC", label: "Basic / Debt Mutual Funds & Balanced Advantage", description: "Some familiarity with mutual fund schemes and bond returns.", points: 40 },
      { value: "MODERATE", label: "Moderate / Active Mutual Funds & Large-Cap Stocks (3+ yrs)", description: "Experienced in managing equity funds through at least one market cycle.", points: 70 },
      { value: "ADVANCED", label: "Experienced / Direct Equities & Multi-Asset Allocation (5+ yrs)", description: "Strong understanding of market valuations, P/E multiples, and asset classes.", points: 90 },
      { value: "PROFESSIONAL", label: "Sophisticated / PMS, AIF, Active Trading or Finance Background", description: "In-depth expertise in financial modeling, derivatives, and portfolio risk management.", points: 100 },
    ],
  },
  {
    id: "return_vs_drawdown",
    title: "5. Return Expectation vs Worst-Case Annual Loss",
    category: "TRADE_OFF",
    question: "Which of the following hypothetical 1-year performance scenarios would you feel most comfortable with?",
    helpText: "Illustrates the fundamental trade-off: higher potential upside always carries higher potential drawdowns.",
    options: [
      { value: "SCENARIO_A", label: "Gain 6% to 7% | Worst Year: 0% loss", description: "Completely capital safe with returns equivalent to bank deposits.", points: 10 },
      { value: "SCENARIO_B", label: "Gain 8% to 10% | Worst Year: -4% to -5% loss", description: "Conservative hybrid structure with mild negative year potential.", points: 35 },
      { value: "SCENARIO_C", label: "Gain 11% to 14% | Worst Year: -12% to -15% loss", description: "Balanced multi-asset portfolio with moderate periodic drawdowns.", points: 65 },
      { value: "SCENARIO_D", label: "Gain 15% to 18% | Worst Year: -20% to -25% loss", description: "Growth portfolio predominantly in equities with cyclical corrections.", points: 85 },
      { value: "SCENARIO_E", label: "Gain 20%+ | Worst Year: -35% or more loss", description: "Aggressive equity/mid-cap portfolio focused on multi-bagger upside.", points: 100 },
    ],
  },
  {
    id: "liquidity_need",
    title: "6. Liquidity & Emergency Dependency",
    category: "LIQUIDITY",
    question: "Do you foresee needing to withdraw from these advisory investments for unplanned emergencies?",
    helpText: "High liquidity needs mandate higher allocation to liquid / short-term debt instruments.",
    options: [
      { value: "HIGH_LIQUIDITY", label: "High / May need sudden access within months", description: "Do not have a separate emergency fund; must keep money accessible.", points: 15 },
      { value: "MODERATE_LIQUIDITY", label: "Moderate / Might need partial access for emergencies", description: "Have a small buffer, but might need to draw down during severe shocks.", points: 45 },
      { value: "LOW_LIQUIDITY", label: "Low / Adequate separate emergency reserve exists", description: "Emergency fund of 6+ months expenses is already maintained elsewhere.", points: 85 },
      { value: "ZERO_LIQUIDITY", label: "Zero / Completely locked for long-term goal", description: "Dedicated long-term corpus that will not be touched under any circumstances.", points: 100 },
    ],
  },
];

export interface ClientDemographicData {
  age?: number;
  dateOfBirth?: string;
  dependentsCount?: number;
  maritalStatus?: string;
  occupation?: string;
  planningHorizonYears?: number;
}

export interface ClientFinancialData {
  annualGrossIncome?: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  monthlySurplus?: number;
  savingsRate?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  netWorth?: number;
  liquidAssets?: number;
  emergencyFundMonths?: number;
  debtToAssetRatio?: number;
}

export interface RiskCapacityBreakdown {
  capacityScore: number;
  ageScore: number;
  age: number;
  dependentsScore: number;
  dependentsCount: number;
  savingsScore: number;
  savingsRate: number;
  emergencyScore: number;
  emergencyMonths: number;
  debtScore: number;
  debtToAssetRatio: number;
  factorNotes: string[];
}

export interface RiskToleranceBreakdown {
  toleranceScore: number;
  questionScores: Record<string, number>;
  responses: Record<string, string>;
}

export interface RecommendedAssetAllocation {
  equityPct: number;
  debtPct: number;
  goldPct: number;
  cashPct: number;
}

export interface RiskProfileComputationResult {
  riskScore: number; // 0 to 100
  riskCategory: RiskCategory;
  toleranceScore: number;
  capacityScore: number;
  toleranceBreakdown: RiskToleranceBreakdown;
  capacityBreakdown: RiskCapacityBreakdown;
  recommendedAllocation: RecommendedAssetAllocation;
  suitabilityStatement: string;
  fiduciaryWarnings: string[];
  assessedAt: string;
  nextReviewDue: string; // 365 days later
}

/**
 * Calculates client age from Date of Birth string
 */
export function getAgeFromDob(dobString?: string): number {
  if (!dobString) return 38; // sensible default
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return 38;
  const diffMs = Date.now() - dob.getTime();
  const ageDt = new Date(diffMs);
  return Math.abs(ageDt.getUTCFullYear() - 1970);
}

/**
 * Computes Psychological Risk Tolerance Score (0 to 100) from questionnaire
 */
export function calculateToleranceScore(responses: Record<string, string>): RiskToleranceBreakdown {
  const questionScores: Record<string, number> = {};
  let totalScore = 0;
  let count = 0;

  RISK_QUESTIONS.forEach((q) => {
    const selectedVal = responses[q.id];
    const foundOption = q.options.find((opt) => opt.value === selectedVal);
    // If not answered, default to median option (middle)
    const points = foundOption ? foundOption.points : q.options[Math.floor(q.options.length / 2)].points;
    questionScores[q.id] = points;
    totalScore += points;
    count++;
  });

  const toleranceScore = Math.round(totalScore / Math.max(1, count));
  return {
    toleranceScore,
    questionScores,
    responses,
  };
}

/**
 * Computes Financial Risk Capacity Score (0 to 100) from actual client data
 */
export function calculateCapacityScore(
  demographics: ClientDemographicData,
  financials: ClientFinancialData
): RiskCapacityBreakdown {
  const factorNotes: string[] = [];

  // 1. Age Factor (Demographic runway)
  const age = demographics.age ?? (demographics.dateOfBirth ? getAgeFromDob(demographics.dateOfBirth) : 38);
  let ageScore = 70;
  if (age < 30) {
    ageScore = 95;
    factorNotes.push(`Young demographic profile (Age ${age}): Exceptional multi-decade runway to absorb short-term market cycles.`);
  } else if (age < 40) {
    ageScore = 85;
    factorNotes.push(`Peak wealth accumulation phase (Age ${age}): Strong capacity for long-term equity compounding.`);
  } else if (age < 50) {
    ageScore = 70;
    factorNotes.push(`Prime career stage (Age ${age}): Balanced horizon with high earnings power.`);
  } else if (age < 60) {
    ageScore = 50;
    factorNotes.push(`Approaching retirement transition (Age ${age}): Glidepath towards stability recommended.`);
  } else {
    ageScore = 30;
    factorNotes.push(`Post-retirement / Capital preservation priority (Age ${age}): Lower capacity to endure extended equity drawdowns.`);
  }

  // 2. Dependents Factor
  const dependentsCount = Math.max(0, Number(demographics.dependentsCount) || 0);
  let dependentsScore = 70;
  if (dependentsCount === 0) {
    dependentsScore = 95;
    factorNotes.push(`Zero financial dependents: High personal financial flexibility.`);
  } else if (dependentsCount === 1) {
    dependentsScore = 80;
    factorNotes.push(`1 financial dependent: Moderate family commitments.`);
  } else if (dependentsCount === 2) {
    dependentsScore = 65;
    factorNotes.push(`2 financial dependents: Standard family financial obligations.`);
  } else if (dependentsCount === 3) {
    dependentsScore = 45;
    factorNotes.push(`3 financial dependents: Higher family commitments require conservative buffer.`);
  } else {
    dependentsScore = 30;
    factorNotes.push(`${dependentsCount} financial dependents: Substantial ongoing commitments constrain loss capacity.`);
  }

  // 3. Savings Rate & Monthly Surplus
  const monthlyIncome = financials.monthlyIncome ?? (financials.annualGrossIncome ? financials.annualGrossIncome / 12 : 100000);
  const monthlyExpenses = financials.monthlyExpenses ?? 50000;
  const monthlySurplus = financials.monthlySurplus ?? Math.max(0, monthlyIncome - monthlyExpenses);
  const savingsRate = financials.savingsRate ?? (monthlyIncome > 0 ? (monthlySurplus / monthlyIncome) * 100 : 30);

  let savingsScore = 60;
  if (savingsRate >= 40) {
    savingsScore = 95;
    factorNotes.push(`High savings rate (${savingsRate.toFixed(1)}%): Strong continuous inflows create robust risk-bearing capacity.`);
  } else if (savingsRate >= 25) {
    savingsScore = 80;
    factorNotes.push(`Healthy savings rate (${savingsRate.toFixed(1)}%): Consistent positive surplus.`);
  } else if (savingsRate >= 15) {
    savingsScore = 60;
    factorNotes.push(`Moderate savings rate (${savingsRate.toFixed(1)}%): Standard monthly cashflow headroom.`);
  } else if (savingsRate >= 5) {
    savingsScore = 40;
    factorNotes.push(`Tight savings rate (${savingsRate.toFixed(1)}%): Limited monthly cashflow buffer.`);
  } else {
    savingsScore = 20;
    factorNotes.push(`Low/Negative savings rate: Immediate cashflow vulnerability.`);
  }

  // 4. Emergency Cushion (Liquid Assets / Monthly Outflows)
  const liquidAssets = financials.liquidAssets ?? (financials.totalAssets ? financials.totalAssets * 0.25 : 500000);
  const emergencyMonths = financials.emergencyFundMonths ?? (monthlyExpenses > 0 ? Number((liquidAssets / monthlyExpenses).toFixed(1)) : 6);

  let emergencyScore = 60;
  if (emergencyMonths >= 6) {
    emergencyScore = 90;
    factorNotes.push(`Robust liquid emergency cushion (${emergencyMonths} months expenses): Zero risk of forced distress asset liquidation.`);
  } else if (emergencyMonths >= 3) {
    emergencyScore = 65;
    factorNotes.push(`Adequate liquid reserves (${emergencyMonths} months expenses).`);
  } else if (emergencyMonths >= 1) {
    emergencyScore = 40;
    factorNotes.push(`Sub-optimal liquid buffer (${emergencyMonths} months expenses): Minor emergency could force premature equity redemptions.`);
  } else {
    emergencyScore = 20;
    factorNotes.push(`Critical liquidity gap (<1 month reserve): Client must build emergency buffer before taking higher equity exposure.`);
  }

  // 5. Debt-to-Asset Leverage Ratio
  const totalAssets = financials.totalAssets ?? 5000000;
  const totalLiabilities = financials.totalLiabilities ?? 500000;
  const debtToAssetRatio = financials.debtToAssetRatio ?? (totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 10);

  let debtScore = 75;
  if (debtToAssetRatio <= 15) {
    debtScore = 95;
    factorNotes.push(`Low leverage (Debt-to-Asset: ${debtToAssetRatio.toFixed(1)}%): Pristine balance sheet with minimal debt servicing drag.`);
  } else if (debtToAssetRatio <= 35) {
    debtScore = 75;
    factorNotes.push(`Manageable leverage (Debt-to-Asset: ${debtToAssetRatio.toFixed(1)}%).`);
  } else if (debtToAssetRatio <= 50) {
    debtScore = 50;
    factorNotes.push(`Moderate-to-high leverage (${debtToAssetRatio.toFixed(1)}%): Substantial monthly debt service obligations.`);
  } else {
    debtScore = 25;
    factorNotes.push(`High debt burden (${debtToAssetRatio.toFixed(1)}%): Balance sheet vulnerability limits capacity for volatile assets.`);
  }

  // Weighted Capacity Formula
  const capacityScore = Math.round(
    ageScore * 0.25 +
    dependentsScore * 0.20 +
    savingsScore * 0.25 +
    emergencyScore * 0.15 +
    debtScore * 0.15
  );

  return {
    capacityScore,
    ageScore,
    age,
    dependentsScore,
    dependentsCount,
    savingsScore,
    savingsRate: Number(savingsRate.toFixed(1)),
    emergencyScore,
    emergencyMonths: Number(emergencyMonths.toFixed(1)),
    debtScore,
    debtToAssetRatio: Number(debtToAssetRatio.toFixed(1)),
    factorNotes,
  };
}

/**
 * Maps composite score to SEBI Risk Categories and recommended asset allocations
 */
export function getRiskCategoryAndAllocation(score: number): {
  category: RiskCategory;
  allocation: RecommendedAssetAllocation;
} {
  if (score <= 25) {
    return {
      category: "Conservative",
      allocation: { equityPct: 15, debtPct: 75, goldPct: 10, cashPct: 0 },
    };
  }
  if (score <= 45) {
    return {
      category: "Moderately Conservative",
      allocation: { equityPct: 35, debtPct: 55, goldPct: 10, cashPct: 0 },
    };
  }
  if (score <= 65) {
    return {
      category: "Moderate",
      allocation: { equityPct: 55, debtPct: 35, goldPct: 10, cashPct: 0 },
    };
  }
  if (score <= 80) {
    return {
      category: "Moderately Aggressive",
      allocation: { equityPct: 75, debtPct: 20, goldPct: 5, cashPct: 0 },
    };
  }
  return {
    category: "Aggressive",
    allocation: { equityPct: 85, debtPct: 10, goldPct: 5, cashPct: 0 },
  };
}

/**
 * Main calculation entrypoint: combines questionnaire + live client financial parameters
 */
export function computeCompleteRiskProfile(params: {
  responses: Record<string, string>;
  demographics: ClientDemographicData;
  financials: ClientFinancialData;
}): RiskProfileComputationResult {
  const toleranceBreakdown = calculateToleranceScore(params.responses);
  const capacityBreakdown = calculateCapacityScore(params.demographics, params.financials);

  let rawScore = Math.round(
    toleranceBreakdown.toleranceScore * 0.50 + capacityBreakdown.capacityScore * 0.50
  );

  const fiduciaryWarnings: string[] = [];

  // Fiduciary Guardrail (SEBI IA Reg. 16(1) & 17(1)):
  // If financial capacity is severely low (e.g. retiree with zero emergency buffer or high debt),
  // psychological optimism cannot override financial inability to bear losses.
  if (capacityBreakdown.capacityScore < 35 && rawScore > 45) {
    fiduciaryWarnings.push(
      "SEBI Fiduciary Guardrail Applied: Financial risk capacity score is restricted. Capping overall portfolio risk to 'Moderately Conservative' to safeguard against capital distress."
    );
    rawScore = Math.min(rawScore, 45);
  }

  // If emergency fund < 1 month, warn
  if (capacityBreakdown.emergencyMonths < 1) {
    fiduciaryWarnings.push(
      "Critical Liquidity Warning: Less than 1 month of emergency reserves. Prioritize establishing a liquid cash reserve before committing to volatile equity assets."
    );
  }

  const { category, allocation } = getRiskCategoryAndAllocation(rawScore);

  const now = new Date();
  const assessedAt = now.toISOString();
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + 365); // SEBI 365-day statutory review
  const nextReviewDue = nextReview.toISOString().split("T")[0];

  const suitabilityStatement = `Based on a comprehensive SEBI-compliant suitability assessment blending psychological risk tolerance (Score: ${toleranceBreakdown.toleranceScore}/100) and objective financial risk capacity (Score: ${capacityBreakdown.capacityScore}/100, evaluated on client Age ${capacityBreakdown.age}, ${capacityBreakdown.dependentsCount} dependent(s), ${capacityBreakdown.savingsRate}% savings rate, and ${capacityBreakdown.emergencyMonths} mos liquid buffer), the client is categorized as '${category}' (Composite Score: ${rawScore}/100). The recommended strategic asset allocation is ${allocation.equityPct}% Equity, ${allocation.debtPct}% Fixed Income / Debt, and ${allocation.goldPct}% Gold / Precious Metals.`;

  return {
    riskScore: rawScore,
    riskCategory: category,
    toleranceScore: toleranceBreakdown.toleranceScore,
    capacityScore: capacityBreakdown.capacityScore,
    toleranceBreakdown,
    capacityBreakdown,
    recommendedAllocation: allocation,
    suitabilityStatement,
    fiduciaryWarnings,
    assessedAt,
    nextReviewDue,
  };
}

