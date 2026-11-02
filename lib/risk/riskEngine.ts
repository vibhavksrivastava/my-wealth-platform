/**
 * Actuarial Risk & Insurance Planning Engine
 * 
 * Provides:
 * 1. Human Life Value (HLV) Term Life Insurance sizing (Expense Replacement + Debt Protection - Liquid Cushion)
 * 2. Premium actuarial estimator (Smoker / Non-Smoker, Age bands, Gender)
 * 3. Health Floater + Super Top-up dual architecture sizing & cost arbitrage
 * 4. Critical illness & rider recommendations
 */

export interface RiskEngineInput {
  clientId?: string;
  clientName: string;
  currentAge: number;
  retirementAge: number;
  gender?: "MALE" | "FEMALE" | "OTHER";
  isSmoker?: boolean;
  cityTier?: "TIER_1" | "TIER_2_3"; // Tier 1: Mumbai, Delhi NCR, Bengaluru, Hyderabad, etc.
  monthlyLivingExpenses: number;
  outstandingLiabilities: number; // Loans, mortgages, personal debt
  futureKeyMilestones: number; // Children's higher education, marriage, etc.
  existingLiquidAssets: number; // Liquid MF, Equities, FDs (excluding primary home)
  existingTermCover: number;
  existingHealthCover: number;
  familyMembersCount?: number;
  hasSeniorParents?: boolean;
  corporateHealthCover?: number;
}

export interface TermLifePlanResult {
  currentAge: number;
  retirementAge: number;
  yearsToProtect: number;
  annualLivingExpenses: number;
  expenseReplacementCorpus: number;
  totalLiabilities: number;
  futureMilestones: number;
  grossProtectionNeeded: number;
  existingLiquidAssets: number;
  existingTermCover: number;
  netCoverageGap: number;
  recommendedSumAssured: number;
  recommendedTenureYears: number;
  estimatedAnnualPremium: number;
  monthlyEquivalentPremium: number;
  mwpActRecommended: boolean;
  advisoryNotes: string[];
}

export interface HealthPlanResult {
  cityTier: "TIER_1" | "TIER_2_3";
  recommendedTotalCover: number;
  existingHealthCover: number;
  healthCoverageGap: number;
  hasCorporateOnly: boolean;
  recommendedBaseCover: number;
  recommendedSuperTopUp: number;
  deductibleAmount: number;
  estimatedBasePremium: number;
  estimatedSuperTopUpPremium: number;
  totalCombinedPremium: number;
  standaloneFullCoverPremium: number;
  annualArbitrageSavings: number;
  savingsPercentage: number;
  separateSeniorParentsCoverRecommended: boolean;
  advisoryNotes: string[];
}

export interface ConsolidatedRiskAssessment {
  termLife: TermLifePlanResult;
  health: HealthPlanResult;
  overallRiskScore: "ADEQUATE" | "MODERATE_GAP" | "CRITICAL_GAP";
  urgentActions: string[];
  totalAnnualProtectionBudget: number;
}

/**
 * Calculates actuarial Human Life Value (HLV) pure term insurance coverage.
 */
export function calculateTermLifePlan(input: RiskEngineInput): TermLifePlanResult {
  const currentAge = Math.max(18, Math.min(75, Number(input.currentAge) || 35));
  const retirementAge = Math.max(currentAge + 1, Number(input.retirementAge) || 60);
  const yearsToProtect = Math.max(1, retirementAge - currentAge);

  const monthlyExp = Math.max(0, Number(input.monthlyLivingExpenses) || 50000);
  const annualLivingExpenses = monthlyExp * 12;

  // Real discount rate formula for present value of future expenses:
  // Inflation ~ 6.0%, Safe Investment yield ~ 7.5% -> Real rate r ~ 1.415%
  // PV Factor = (1 - (1+r)^(-n)) / r
  const realRate = 0.015;
  const pvFactor = (1 - Math.pow(1 + realRate, -yearsToProtect)) / realRate;
  const expenseReplacementCorpus = Math.round(annualLivingExpenses * pvFactor);

  const totalLiabilities = Math.max(0, Number(input.outstandingLiabilities) || 0);
  const futureMilestones = Math.max(0, Number(input.futureKeyMilestones) || 0);
  const existingLiquidAssets = Math.max(0, Number(input.existingLiquidAssets) || 0);
  const existingTermCover = Math.max(0, Number(input.existingTermCover) || 0);

  const grossProtectionNeeded = expenseReplacementCorpus + totalLiabilities + futureMilestones;
  
  // Available cushion = Liquid & semi-liquid assets + existing term insurance
  const availableCushion = existingLiquidAssets + existingTermCover;
  const netCoverageGap = Math.max(0, grossProtectionNeeded - availableCushion);

  // Round up to nearest standard insurance cover block (min 25L, 50L increments)
  let recommendedSumAssured = 0;
  if (netCoverageGap > 0) {
    if (netCoverageGap <= 5000000) {
      recommendedSumAssured = Math.ceil(netCoverageGap / 2500000) * 2500000;
    } else {
      recommendedSumAssured = Math.ceil(netCoverageGap / 5000000) * 5000000;
    }
  }

  // Actuarial Annual Premium Estimator per ₹1 Crore of Sum Assured
  let baseRatePerCrore = 9500;
  if (currentAge <= 25) baseRatePerCrore = 8000;
  else if (currentAge <= 30) baseRatePerCrore = 9500;
  else if (currentAge <= 35) baseRatePerCrore = 12500;
  else if (currentAge <= 40) baseRatePerCrore = 17500;
  else if (currentAge <= 45) baseRatePerCrore = 25000;
  else if (currentAge <= 50) baseRatePerCrore = 38000;
  else if (currentAge <= 55) baseRatePerCrore = 56000;
  else baseRatePerCrore = 85000;

  // Smoker loading: +60%
  if (input.isSmoker) {
    baseRatePerCrore *= 1.6;
  }
  // Female discount: -12%
  if (input.gender === "FEMALE") {
    baseRatePerCrore *= 0.88;
  }

  const crores = recommendedSumAssured / 10000000;
  const estimatedAnnualPremium = Math.round(crores * baseRatePerCrore * 1.18); // 18% GST included
  const monthlyEquivalentPremium = Math.round(estimatedAnnualPremium / 12);

  const advisoryNotes: string[] = [];
  if (netCoverageGap > 0) {
    advisoryNotes.push(
      `Protection gap of ₹${(netCoverageGap / 100000).toFixed(1)} Lakhs detected based on human life value and loan liabilities.`
    );
  } else {
    advisoryNotes.push(
      "Your existing liquid net worth and life insurance comfortably exceed your family's future expense replacement requirements."
    );
  }

  if (totalLiabilities > 0) {
    advisoryNotes.push(
      `Your ₹${(totalLiabilities / 100000).toFixed(1)} Lakhs in outstanding loans must be protected with term cover so family real estate is never seized.`
    );
  }

  advisoryNotes.push(
    `Opt for a pure vanilla term plan up to age ${retirementAge}. Avoid Return of Premium (TROP) or ULIPs, which charge up to 3x higher premiums with subpar yields.`
  );

  advisoryNotes.push(
    "Crucial: Purchase policy under the Married Women's Property (MWP) Act 1874 to protect the sum assured from creditors and legal claims."
  );

  return {
    currentAge,
    retirementAge,
    yearsToProtect,
    annualLivingExpenses,
    expenseReplacementCorpus,
    totalLiabilities,
    futureMilestones,
    grossProtectionNeeded,
    existingLiquidAssets,
    existingTermCover,
    netCoverageGap,
    recommendedSumAssured,
    recommendedTenureYears: yearsToProtect,
    estimatedAnnualPremium,
    monthlyEquivalentPremium,
    mwpActRecommended: true,
    advisoryNotes,
  };
}

/**
 * Calculates Health Insurance sizing, super top-up split, and premium arbitrage savings.
 */
export function calculateHealthPlan(input: RiskEngineInput): HealthPlanResult {
  const isTier1 = input.cityTier !== "TIER_2_3";
  const existingCover = Math.max(0, Number(input.existingHealthCover) || 0);
  const corporateCover = Math.max(0, Number(input.corporateHealthCover) || 0);
  const hasCorporateOnly = corporateCover > 0 && existingCover === 0;

  // Benchmark recommended total cover:
  // Tier 1 Metro (Mumbai, Bengaluru, Delhi NCR): ₹1 Crore recommended
  // Tier 2/3 Cities: ₹50 Lakhs recommended
  const recommendedTotalCover = isTier1 ? 10000000 : 5000000;
  const healthCoverageGap = Math.max(0, recommendedTotalCover - existingCover);

  // Dual Architecture:
  // Base Floater: ₹10 Lakhs (covers all routine hospitalizations, day-care, zero deductible)
  // Super Top-up: Rest of the cover (₹90 Lakhs or ₹40 Lakhs) with deductible equal to base cover
  const recommendedBaseCover = Math.min(1000000, recommendedTotalCover);
  const recommendedSuperTopUp = Math.max(0, recommendedTotalCover - recommendedBaseCover);
  const deductibleAmount = recommendedBaseCover;

  // Actuarial Premium Estimates
  const age = Number(input.currentAge) || 35;
  let base10LakhPremium = 14000;
  if (age <= 30) base10LakhPremium = 11000;
  else if (age <= 40) base10LakhPremium = 15000;
  else if (age <= 50) base10LakhPremium = 24000;
  else base10LakhPremium = 38000;

  // Super Top-up premium is astonishingly affordable (typically ₹3,500 - ₹6,500/yr for ₹90L cover)
  let superTopUpPremium = 4500;
  if (age <= 35) superTopUpPremium = 3800;
  else if (age <= 45) superTopUpPremium = 5500;
  else superTopUpPremium = 8500;

  const estimatedBasePremium = Math.round(base10LakhPremium * 1.18);
  const estimatedSuperTopUpPremium = Math.round(superTopUpPremium * 1.18);
  const totalCombinedPremium = estimatedBasePremium + estimatedSuperTopUpPremium;

  // Cost of a single standalone ₹1 Crore base cover from a private insurer:
  // Typically ₹45,000 - ₹58,000 / year
  const standaloneFullCoverPremium = Math.round(totalCombinedPremium * 2.65);
  const annualArbitrageSavings = Math.max(0, standaloneFullCoverPremium - totalCombinedPremium);
  const savingsPercentage = Math.round((annualArbitrageSavings / standaloneFullCoverPremium) * 100);

  const advisoryNotes: string[] = [];
  if (hasCorporateOnly) {
    advisoryNotes.push(
      "Warning: Relying solely on corporate group insurance leaves your family unprotected during job switches, sabbaticals, or post-retirement."
    );
  }

  advisoryNotes.push(
    `Smart Dual Setup: Opt for a ₹${(recommendedBaseCover / 100000).toFixed(0)} Lakhs Base Floater + ₹${(recommendedSuperTopUp / 100000).toFixed(0)} Lakhs Super Top-up (Deductible: ₹${(deductibleAmount / 100000).toFixed(0)} Lakhs).`
  );

  advisoryNotes.push(
    `Arbitrage Advantage: This 2-tier architecture provides ₹${(recommendedTotalCover / 10000000).toFixed(0)} Cr coverage while saving ${savingsPercentage}% (₹${annualArbitrageSavings.toLocaleString("en-IN")}/yr) vs a pure ₹1 Cr base policy.`
  );

  if (input.hasSeniorParents) {
    advisoryNotes.push(
      "Take a separate senior citizen health policy for parents. Including parents in your family floater inflates the entire floater premium to their age bracket and risks exhausting the family sum assured."
    );
  }

  advisoryNotes.push(
    "Ensure policy features: (1) Zero Room Rent capping, (2) No disease-wise sub-limits, (3) 100% restoration benefit, and (4) No co-payment clause."
  );

  return {
    cityTier: input.cityTier || "TIER_1",
    recommendedTotalCover,
    existingHealthCover: existingCover,
    healthCoverageGap,
    hasCorporateOnly,
    recommendedBaseCover,
    recommendedSuperTopUp,
    deductibleAmount,
    estimatedBasePremium,
    estimatedSuperTopUpPremium,
    totalCombinedPremium,
    standaloneFullCoverPremium,
    annualArbitrageSavings,
    savingsPercentage,
    separateSeniorParentsCoverRecommended: Boolean(input.hasSeniorParents),
    advisoryNotes,
  };
}

/**
 * Generates an end-to-end consolidated actuarial risk assessment.
 */
export function generateConsolidatedRiskAssessment(
  input: RiskEngineInput
): ConsolidatedRiskAssessment {
  const termLife = calculateTermLifePlan(input);
  const health = calculateHealthPlan(input);

  const urgentActions: string[] = [];
  let overallRiskScore: "ADEQUATE" | "MODERATE_GAP" | "CRITICAL_GAP" = "ADEQUATE";

  if (termLife.netCoverageGap > 5000000 || health.healthCoverageGap > 5000000) {
    overallRiskScore = "CRITICAL_GAP";
  } else if (termLife.netCoverageGap > 0 || health.healthCoverageGap > 0) {
    overallRiskScore = "MODERATE_GAP";
  }

  if (termLife.netCoverageGap > 0) {
    urgentActions.push(
      `Secure ₹${(termLife.recommendedSumAssured / 100000).toFixed(0)} Lakhs Pure Term Cover for ${termLife.recommendedTenureYears} years (~₹${termLife.monthlyEquivalentPremium.toLocaleString("en-IN")}/mo).`
    );
  }

  if (health.healthCoverageGap > 0) {
    urgentActions.push(
      `Add ₹${(health.recommendedSuperTopUp / 100000).toFixed(0)} Lakhs Super Top-up policy with ₹${(health.deductibleAmount / 100000).toFixed(0)} Lakhs deductible (~₹${health.estimatedSuperTopUpPremium.toLocaleString("en-IN")}/yr).`
    );
  }

  if (termLife.totalLiabilities > 0 && termLife.existingTermCover < termLife.totalLiabilities) {
    urgentActions.push(
      "Outstanding loan balance is exposed. Execute Term Insurance under MWP Act endorsement immediately."
    );
  }

  const totalAnnualProtectionBudget = termLife.estimatedAnnualPremium + health.totalCombinedPremium;

  return {
    termLife,
    health,
    overallRiskScore,
    urgentActions,
    totalAnnualProtectionBudget,
  };
}

