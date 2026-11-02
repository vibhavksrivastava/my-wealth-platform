/**
 * Smart Retirement Diagnostic & Decumulation Engine
 *
 * Actuarial and financial models for:
 * 1. Pre-retirement accumulation (Inflation-adjusted corpus required, projected wealth from EPF, NPS & MFs, gap analysis, and required SIP).
 * 2. Post-retirement decumulation (Safe sustainable spend capacity, longevity runway, and SWP outflow).
 * 3. Institutional Three-Bucket Solution (Bucket 1: Cash flow, Bucket 2: Stability, Bucket 3: Growth).
 * 4. SWP & STP Blueprint with Fund Selection ("Pick Up" vs "Avoid for SWP").
 */

export interface RetirementHoldingItem {
  id: string;
  schemeName: string;
  assetClass: string;
  currentValue: number;
  monthlySip: number;
  expectedCagr: number;
  category: "LIQUID_DEBT" | "HYBRID_ARBITRAGE" | "EQUITY_DIVERSIFIED" | "EQUITY_THEMATIC_SMALL" | "OTHER";
  suitabilityForSwp: "RECOMMENDED_SWP" | "RECOMMENDED_GROWTH" | "AVOID_FOR_SWP";
  suitabilityReason: string;
  bucketPlacement: 1 | 2 | 3;
}

export interface RetirementEngineInput {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  currentMonthlyExpense: number;
  preRetirementInflation: number; // e.g. 6.0 (% p.a.)
  postRetirementInflation: number; // e.g. 5.5 (% p.a.)
  preRetirementReturn: number; // e.g. 11.5 (% p.a. on equities/SIP)
  postRetirementReturn: number; // e.g. 7.5 (% p.a. conservative blend)
  // Auto-imported savings
  epfCorpus: number;
  epfMonthlyDeposit: number;
  epfRoi: number; // e.g. 8.25 (% p.a.)
  npsCorpus: number;
  npsMonthlyDeposit: number;
  npsRoi: number; // e.g. 10.0 (% p.a.)
  ppfCorpus: number;
  ppfMonthlyDeposit: number;
  ppfRoi: number; // e.g. 7.1 (% p.a.)
  mutualFundCorpus: number;
  ongoingMonthlySip: number;
  otherLiquidCorpus: number; // FDs, Cash
  holdings?: RetirementHoldingItem[];
}

export interface ThreeBucketPlan {
  bucket1: {
    name: string;
    horizonYears: string;
    targetAmount: number;
    allocationPct: number;
    targetCagr: number;
    recommendedInstruments: string[];
    monthlySwpOutflow: number;
    purpose: string;
  };
  bucket2: {
    name: string;
    horizonYears: string;
    targetAmount: number;
    allocationPct: number;
    targetCagr: number;
    recommendedInstruments: string[];
    replenishmentStrategy: string;
    purpose: string;
  };
  bucket3: {
    name: string;
    horizonYears: string;
    targetAmount: number;
    allocationPct: number;
    targetCagr: number;
    recommendedInstruments: string[];
    stpRefuelStrategy: string;
    purpose: string;
  };
  totalCorpusAllocated: number;
}

export interface SwpStpStrategy {
  recommendedMonthlySwp: number;
  recommendedAnnualSwp: number;
  swpWithdrawalRatePct: number;
  taxEfficiencyBenefit: string;
  recommendedStpMonthly: number;
  stpTransferRoute: string;
  fundRecommendations: Array<{
    schemeName: string;
    currentValue: number;
    status: "PICK_UP_FOR_SWP" | "CORE_GROWTH_STP" | "AVOID_SWP_REBALANCE";
    recommendedAction: string;
    assignedBucket: 1 | 2 | 3;
    rationale: string;
  }>;
}

export interface RetirementDiagnosticResult {
  isAlreadyRetired: boolean;
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  yearsToRetirement: number;
  retirementTenureYears: number;

  // Expenses
  currentMonthlyExpense: number;
  currentAnnualExpense: number;
  inflatedMonthlyExpenseAtRetirement: number;
  inflatedAnnualExpenseAtRetirement: number;

  // Accumulation Phase Metrics (for age < retirement age)
  corpusNeededAtRetirement: number;
  projectedWealth: {
    epfFutureValue: number;
    npsFutureValue: number;
    ppfFutureValue: number;
    mutualFundsFutureValue: number;
    liquidAssetsFutureValue: number;
    totalProjectedCorpus: number;
  };
  shortfallOrSurplus: number;
  isFullyFunded: boolean;
  readinessScorePct: number;
  requiredAdditionalMonthlySip: number;
  requiredAdditionalLumpsum: number;

  // Decumulation Phase Metrics (for age >= retirement age or current corpus)
  currentTotalRetirementCorpus: number;
  sustainableMonthlySpend: number;
  sustainableAnnualSpend: number;
  fourPercentRuleMonthly: number;
  fourPercentRuleAnnual: number;
  runwayYearsWithCurrentExpense: number;

  // Solutions
  threeBucketPlan: ThreeBucketPlan;
  swpStpStrategy: SwpStpStrategy;
  annualCashFlowProjection: Array<{
    yearNumber: number;
    clientAge: number;
    phase: "ACCUMULATION" | "DECUMULATION";
    beginningCorpus: number;
    annualLivingExpense: number;
    annualContributions: number;
    annualReturns: number;
    endingCorpus: number;
  }>;
}

/**
 * Future value of a lump sum compounding annually
 */
function calculateFutureLumpSum(pv: number, annualRatePct: number, years: number): number {
  if (years <= 0 || pv <= 0) return Math.max(0, pv);
  const r = annualRatePct / 100;
  return Math.round(pv * Math.pow(1 + r, years));
}

/**
 * Future value of a monthly recurring investment (SIP / Deposits)
 */
function calculateFutureSip(monthlyAmount: number, annualRatePct: number, years: number): number {
  if (years <= 0 || monthlyAmount <= 0) return 0;
  const totalMonths = years * 12;
  const rMonth = Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
  if (rMonth <= 0) return monthlyAmount * totalMonths;
  const fv = (monthlyAmount * (Math.pow(1 + rMonth, totalMonths) - 1) * (1 + rMonth)) / rMonth;
  return Math.round(fv);
}

/**
 * Monthly SIP required to accumulate a target future value
 */
function calculateRequiredMonthlySip(targetFv: number, annualRatePct: number, years: number): number {
  if (targetFv <= 0 || years <= 0) return 0;
  const totalMonths = years * 12;
  const rMonth = Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
  if (rMonth <= 0) return Math.round(targetFv / totalMonths);
  const pmt = (targetFv * rMonth) / ((Math.pow(1 + rMonth, totalMonths) - 1) * (1 + rMonth));
  return Math.round(pmt);
}

/**
 * Present value required today to accumulate a target future value
 */
function calculateRequiredLumpSum(targetFv: number, annualRatePct: number, years: number): number {
  if (targetFv <= 0 || years <= 0) return 0;
  const r = annualRatePct / 100;
  return Math.round(targetFv / Math.pow(1 + r, years));
}

/**
 * Categorize holding scheme into risk & bucket profile
 */
export function classifyHoldingForRetirement(schemeName: string, assetClass: string): {
  category: RetirementHoldingItem["category"];
  suitabilityForSwp: RetirementHoldingItem["suitabilityForSwp"];
  suitabilityReason: string;
  bucketPlacement: 1 | 2 | 3;
} {
  const name = (schemeName || "").toLowerCase();
  const cls = (assetClass || "").toLowerCase();

  // 1. Liquid, Overnight, Money Market, Ultra Short -> Bucket 1 (Recommended SWP)
  if (
    name.includes("liquid") ||
    name.includes("overnight") ||
    name.includes("ultra short") ||
    name.includes("money market") ||
    name.includes("low duration") ||
    cls.includes("liquid")
  ) {
    return {
      category: "LIQUID_DEBT",
      suitabilityForSwp: "RECOMMENDED_SWP",
      suitabilityReason: "Minimal volatility, near-zero duration risk. Ideal for direct monthly SWP payout.",
      bucketPlacement: 1,
    };
  }

  // 2. Arbitrage Funds -> Bucket 1 / 2 (Highly Recommended SWP due to equity taxation without equity risk)
  if (name.includes("arbitrage")) {
    return {
      category: "HYBRID_ARBITRAGE",
      suitabilityForSwp: "RECOMMENDED_SWP",
      suitabilityReason: "Equity taxation (12.5% LTCG above ₹1.25L) with debt-like stability. Exceptional tax alpha for SWP.",
      bucketPlacement: 1,
    };
  }

  // 3. Conservative Hybrid, Banking & PSU, Corporate Bond, Multi Asset -> Bucket 2 (Income & Stability)
  if (
    name.includes("conservative hybrid") ||
    name.includes("equity savings") ||
    name.includes("banking & psu") ||
    name.includes("corporate bond") ||
    name.includes("short term debt") ||
    name.includes("floating rate") ||
    cls.includes("debt")
  ) {
    return {
      category: "HYBRID_ARBITRAGE",
      suitabilityForSwp: "RECOMMENDED_SWP",
      suitabilityReason: "Provides regular 7-8.5% yield with limited drawdown. Protects capital while refuelling Bucket 1.",
      bucketPlacement: 2,
    };
  }

  // 4. Sectoral, Thematic, Small Cap, Micro Cap -> Bucket 3 (AVOID for SWP!)
  if (
    name.includes("small cap") ||
    name.includes("micro cap") ||
    name.includes("infra") ||
    name.includes("technology") ||
    name.includes("tech") ||
    name.includes("pharma") ||
    name.includes("energy") ||
    name.includes("psu") ||
    name.includes("defense") ||
    name.includes("manufacturing") ||
    name.includes("momentum")
  ) {
    return {
      category: "EQUITY_THEMATIC_SMALL",
      suitabilityForSwp: "AVOID_FOR_SWP",
      suitabilityReason: "High volatility & cyclical drawdowns (25-40%). Withdrawing via SWP locks in permanent capital loss. Avoid SWP; rebalance into core buckets.",
      bucketPlacement: 3,
    };
  }

  // 5. Balanced Advantage, Dynamic Asset Allocation -> Bucket 2 or 3
  if (name.includes("balanced advantage") || name.includes("dynamic asset") || name.includes("baf")) {
    return {
      category: "HYBRID_ARBITRAGE",
      suitabilityForSwp: "RECOMMENDED_SWP",
      suitabilityReason: "Dynamic equity-debt rebalancing softens market crashes. Suitable as bridge between Bucket 2 and 3.",
      bucketPlacement: 2,
    };
  }

  // 6. Diversified Equity (Flexi cap, Large cap, Mid cap, Index) -> Bucket 3 (Growth)
  return {
    category: "EQUITY_DIVERSIFIED",
    suitabilityForSwp: "RECOMMENDED_GROWTH",
    suitabilityReason: "Core inflation-beating engine (12-14% CAGR). Preserve for 7+ year horizon; transfer via systematic STP instead of direct SWP.",
    bucketPlacement: 3,
  };
}

/**
 * Execute full actuarial and financial diagnosis
 */
export function calculateRetirementDiagnostics(input: RetirementEngineInput): RetirementDiagnosticResult {
  const currentAge = Math.max(18, Math.min(100, Math.round(input.currentAge || 38)));
  const retirementAge = Math.max(currentAge, Math.min(85, Math.round(input.retirementAge || 60)));
  const lifeExpectancy = Math.max(retirementAge + 5, Math.min(100, Math.round(input.lifeExpectancy || 85)));
  const isAlreadyRetired = currentAge >= retirementAge;

  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const retirementTenureYears = Math.max(1, lifeExpectancy - (isAlreadyRetired ? currentAge : retirementAge));

  const currentMonthlyExpense = Math.max(5000, Number(input.currentMonthlyExpense || 60000));
  const currentAnnualExpense = currentMonthlyExpense * 12;

  const preInf = Math.max(0.01, (input.preRetirementInflation || 6.0) / 100);
  const postInf = Math.max(0.01, (input.postRetirementInflation || 5.5) / 100);
  const preRet = Math.max(0.02, (input.preRetirementReturn || 11.5) / 100);
  const postRet = Math.max(0.02, (input.postRetirementReturn || 7.5) / 100);

  // Inflated expenses at retirement age
  const inflatedMonthlyExpenseAtRetirement = isAlreadyRetired
    ? currentMonthlyExpense
    : Math.round(currentMonthlyExpense * Math.pow(1 + preInf, yearsToRetirement));
  const inflatedAnnualExpenseAtRetirement = inflatedMonthlyExpenseAtRetirement * 12;

  // Real rate of return post-retirement: (1 + r) / (1 + i) - 1
  const postRetRealRate = (1 + postRet) / (1 + postInf) - 1;

  // Corpus Needed at Retirement: Present Value of an inflation-indexed growing annuity
  let corpusNeededAtRetirement = 0;
  if (Math.abs(postRetRealRate) < 0.0001) {
    corpusNeededAtRetirement = Math.round(inflatedAnnualExpenseAtRetirement * retirementTenureYears);
  } else {
    const annuityFactor = (1 - Math.pow(1 + postRetRealRate, -retirementTenureYears)) / postRetRealRate;
    corpusNeededAtRetirement = Math.round(inflatedAnnualExpenseAtRetirement * annuityFactor);
  }

  // Add 5% medical/emergency reserve buffer
  corpusNeededAtRetirement = Math.round(corpusNeededAtRetirement * 1.05);

  // Growth of existing wealth up to retirement age
  const epfCorpus = Math.max(0, Number(input.epfCorpus || 0));
  const epfMonthly = Math.max(0, Number(input.epfMonthlyDeposit || 0));
  const epfRoi = Number(input.epfRoi || 8.25);

  const npsCorpus = Math.max(0, Number(input.npsCorpus || 0));
  const npsMonthly = Math.max(0, Number(input.npsMonthlyDeposit || 0));
  const npsRoi = Number(input.npsRoi || 10.0);

  const ppfCorpus = Math.max(0, Number(input.ppfCorpus || 0));
  const ppfMonthly = Math.max(0, Number(input.ppfMonthlyDeposit || 0));
  const ppfRoi = Number(input.ppfRoi || 7.1);

  const mfCorpus = Math.max(0, Number(input.mutualFundCorpus || 0));
  const ongoingSip = Math.max(0, Number(input.ongoingMonthlySip || 0));
  const liquidCorpus = Math.max(0, Number(input.otherLiquidCorpus || 0));

  const currentTotalRetirementCorpus = epfCorpus + npsCorpus + ppfCorpus + mfCorpus + liquidCorpus;

  let epfFv = epfCorpus;
  let npsFv = npsCorpus;
  let ppfFv = ppfCorpus;
  let mfFv = mfCorpus;
  let liquidFv = liquidCorpus;

  if (!isAlreadyRetired && yearsToRetirement > 0) {
    epfFv = calculateFutureLumpSum(epfCorpus, epfRoi, yearsToRetirement) + calculateFutureSip(epfMonthly, epfRoi, yearsToRetirement);
    npsFv = calculateFutureLumpSum(npsCorpus, npsRoi, yearsToRetirement) + calculateFutureSip(npsMonthly, npsRoi, yearsToRetirement);
    ppfFv = calculateFutureLumpSum(ppfCorpus, ppfRoi, yearsToRetirement) + calculateFutureSip(ppfMonthly, ppfRoi, yearsToRetirement);
    mfFv = calculateFutureLumpSum(mfCorpus, input.preRetirementReturn || 11.5, yearsToRetirement) + calculateFutureSip(ongoingSip, input.preRetirementReturn || 11.5, yearsToRetirement);
    liquidFv = calculateFutureLumpSum(liquidCorpus, 6.5, yearsToRetirement);
  }

  const totalProjectedCorpus = epfFv + npsFv + ppfFv + mfFv + liquidFv;
  const shortfallOrSurplus = Math.round(corpusNeededAtRetirement - totalProjectedCorpus);
  const isFullyFunded = totalProjectedCorpus >= corpusNeededAtRetirement;
  const readinessScorePct = corpusNeededAtRetirement > 0
    ? Math.min(100, Math.round((totalProjectedCorpus / corpusNeededAtRetirement) * 100))
    : 100;

  const requiredAdditionalMonthlySip = !isFullyFunded && yearsToRetirement > 0
    ? calculateRequiredMonthlySip(shortfallOrSurplus, input.preRetirementReturn || 11.5, yearsToRetirement)
    : 0;

  const requiredAdditionalLumpsum = !isFullyFunded && yearsToRetirement > 0
    ? calculateRequiredLumpSum(shortfallOrSurplus, input.preRetirementReturn || 11.5, yearsToRetirement)
    : 0;

  // Decumulation Phase Calculations (Safe Spend & Runway)
  // For someone already retired, base on current total corpus; for someone pre-retirement, base on projected corpus
  const corpusForDecumulation = isAlreadyRetired ? currentTotalRetirementCorpus : totalProjectedCorpus;

  let sustainableAnnualSpend = 0;
  if (corpusForDecumulation > 0) {
    if (Math.abs(postRetRealRate) < 0.0001) {
      sustainableAnnualSpend = Math.round(corpusForDecumulation / retirementTenureYears);
    } else {
      const annuityFactor = (1 - Math.pow(1 + postRetRealRate, -retirementTenureYears)) / postRetRealRate;
      sustainableAnnualSpend = Math.round(corpusForDecumulation / annuityFactor);
    }
  }
  const sustainableMonthlySpend = Math.round(sustainableAnnualSpend / 12);
  const fourPercentRuleAnnual = Math.round(corpusForDecumulation * 0.04);
  const fourPercentRuleMonthly = Math.round(fourPercentRuleAnnual / 12);

  // Runway: simulate how many years the current corpus will last with current annual living expense
  let runwayYearsWithCurrentExpense = 0;
  let simCorpus = corpusForDecumulation;
  let simExp = isAlreadyRetired ? currentAnnualExpense : inflatedAnnualExpenseAtRetirement;
  for (let y = 1; y <= 50; y++) {
    simCorpus = simCorpus * (1 + postRet) - simExp;
    simExp = simExp * (1 + postInf);
    if (simCorpus <= 0) {
      runwayYearsWithCurrentExpense = y;
      break;
    }
    if (y === 50) {
      runwayYearsWithCurrentExpense = 50;
    }
  }

  // Three-Bucket Strategy Architecture
  // Bucket 1: 3 years of expenses (Immediate cash flow)
  // Bucket 2: 5 years of expenses (Stability & refill)
  // Bucket 3: Remaining balance (Longevity growth)
  const annualExpenseForBuckets = isAlreadyRetired ? currentAnnualExpense : inflatedAnnualExpenseAtRetirement;
  const b1Target = Math.round(annualExpenseForBuckets * 3);
  const b2Target = Math.round(annualExpenseForBuckets * 5);

  let b1Amount = 0;
  let b2Amount = 0;
  let b3Amount = 0;

  if (corpusForDecumulation <= b1Target) {
    b1Amount = corpusForDecumulation;
    b2Amount = 0;
    b3Amount = 0;
  } else if (corpusForDecumulation <= b1Target + b2Target) {
    b1Amount = b1Target;
    b2Amount = corpusForDecumulation - b1Target;
    b3Amount = 0;
  } else {
    b1Amount = b1Target;
    b2Amount = b2Target;
    b3Amount = corpusForDecumulation - b1Target - b2Target;
  }

  const totalBucketCorpus = Math.max(1, b1Amount + b2Amount + b3Amount);

  const threeBucketPlan: ThreeBucketPlan = {
    bucket1: {
      name: "Immediate Cash Flow & Liquidity",
      horizonYears: "Years 1 to 3",
      targetAmount: b1Amount,
      allocationPct: Math.round((b1Amount / totalBucketCorpus) * 100),
      targetCagr: 6.8,
      recommendedInstruments: [
        "Arbitrage Mutual Funds (Equity Tax Status, Zero Equity Volatility)",
        "Liquid & Ultra-Short Duration Debt Funds",
        "Senior Citizen Savings Scheme (SCSS) & Bank FDs",
      ],
      monthlySwpOutflow: Math.round(annualExpenseForBuckets / 12),
      purpose: "Zero market volatility risk. Fuels monthly automated SWP bank transfers to cover everyday living costs without ever selling equities during market corrections.",
    },
    bucket2: {
      name: "Income Stability & Capital Shield",
      horizonYears: "Years 4 to 8",
      targetAmount: b2Amount,
      allocationPct: Math.round((b2Amount / totalBucketCorpus) * 100),
      targetCagr: 8.0,
      recommendedInstruments: [
        "Conservative Hybrid & Equity Savings Funds",
        "Banking & PSU / Corporate Bond Debt Funds",
        "Dynamic Asset Allocation / Balanced Advantage Funds (BAF)",
      ],
      replenishmentStrategy: "Every 24-36 months, systematically refuels Bucket 1 with accrued gains and matured fixed income holdings.",
      purpose: "Beats post-retirement inflation with low downside drawdowns, acting as an institutional buffer between equities and immediate cash needs.",
    },
    bucket3: {
      name: "Long-Term Growth & Longevity Hedge",
      horizonYears: "Years 9+",
      targetAmount: b3Amount,
      allocationPct: Math.round((b3Amount / totalBucketCorpus) * 100),
      targetCagr: 12.2,
      recommendedInstruments: [
        "Diversified Flexi-Cap & Multi-Cap Mutual Funds",
        "Large & Mid-Cap Index Funds (Nifty 50 / Nifty Next 50)",
        "International Diversified Funds (Geographic Longevity Hedge)",
      ],
      stpRefuelStrategy: "Executes an annual or quarterly Systematic Transfer Plan (STP) shifting 2-3% of gains into Bucket 2 when markets are at fair or rich valuations.",
      purpose: "Generates inflation-beating capital growth over 10-30 years, guaranteeing the retiree never outlives their wealth and covers healthcare cost escalation.",
    },
    totalCorpusAllocated: b1Amount + b2Amount + b3Amount,
  };

  // SWP & STP Strategy
  const recommendedMonthlySwp = Math.round(annualExpenseForBuckets / 12);
  const recommendedAnnualSwp = recommendedMonthlySwp * 12;
  const swpWithdrawalRatePct = corpusForDecumulation > 0
    ? Number(((recommendedAnnualSwp / corpusForDecumulation) * 100).toFixed(2))
    : 0;

  // Process holding classifications
  const classifiedHoldings = (input.holdings || []).map((h) => {
    const cls = classifyHoldingForRetirement(h.schemeName, h.assetClass);
    return {
      ...h,
      category: cls.category,
      suitabilityForSwp: cls.suitabilityForSwp,
      suitabilityReason: cls.suitabilityReason,
      bucketPlacement: cls.bucketPlacement,
    };
  });

  const fundRecommendations = classifiedHoldings.map((h) => {
    let status: "PICK_UP_FOR_SWP" | "CORE_GROWTH_STP" | "AVOID_SWP_REBALANCE" = "CORE_GROWTH_STP";
    let action = "Keep invested in Bucket 3 for compounding.";

    if (h.suitabilityForSwp === "RECOMMENDED_SWP") {
      status = "PICK_UP_FOR_SWP";
      action = `Prime candidate for monthly SWP. Low volatility ensures cashflow safety.`;
    } else if (h.suitabilityForSwp === "AVOID_FOR_SWP") {
      status = "AVOID_SWP_REBALANCE";
      action = `Avoid SWP redemptions! High volatility triggers reverse rupee-cost averaging. Gradually trim into Bucket 2/1.`;
    }

    return {
      schemeName: h.schemeName,
      currentValue: h.currentValue,
      status,
      recommendedAction: action,
      assignedBucket: h.bucketPlacement,
      rationale: h.suitabilityReason,
    };
  });

  const swpStpStrategy: SwpStpStrategy = {
    recommendedMonthlySwp,
    recommendedAnnualSwp,
    swpWithdrawalRatePct,
    taxEfficiencyBenefit:
      "SWP redemptions from Arbitrage/Equity funds are vastly superior to FD interest: only the unrealized capital gain component is taxed (LTCG 12.5% above ₹1.25L), whereas 100% of FD interest is taxed at highest income slab rate (30%+).",
    recommendedStpMonthly: Math.round(b3Amount > 0 ? (b3Amount * 0.04) / 12 : 0),
    stpTransferRoute: "Systematic Transfer Plan (STP) from Bucket 3 Equity Funds -> Bucket 2 Arbitrage/Debt Funds on a quarterly schedule.",
    fundRecommendations,
  };

  // Generate Year-by-Year Cash Flow Projection
  const annualCashFlowProjection: RetirementDiagnosticResult["annualCashFlowProjection"] = [];
  let projCorpus = currentTotalRetirementCorpus;
  let projExp = currentAnnualExpense;
  const totalYears = Math.min(50, lifeExpectancy - currentAge);

  for (let i = 0; i <= totalYears; i++) {
    const age = currentAge + i;
    const phase: "ACCUMULATION" | "DECUMULATION" = age < retirementAge ? "ACCUMULATION" : "DECUMULATION";
    const beg = projCorpus;

    let contributions = 0;
    let expenseOutflow = 0;
    let returns = 0;

    if (phase === "ACCUMULATION") {
      contributions = (epfMonthly + npsMonthly + ppfMonthly + ongoingSip + requiredAdditionalMonthlySip) * 12;
      returns = Math.round((beg + contributions / 2) * preRet);
      expenseOutflow = 0; // Living expense funded by employment salary during accumulation
      projCorpus = beg + contributions + returns;
      projExp = Math.round(projExp * (1 + preInf));
    } else {
      expenseOutflow = projExp;
      returns = Math.round((beg - expenseOutflow / 2) * postRet);
      projCorpus = Math.max(0, beg - expenseOutflow + returns);
      projExp = Math.round(projExp * (1 + postInf));
    }

    annualCashFlowProjection.push({
      yearNumber: i,
      clientAge: age,
      phase,
      beginningCorpus: beg,
      annualLivingExpense: expenseOutflow,
      annualContributions: contributions,
      annualReturns: returns,
      endingCorpus: projCorpus,
    });

    if (phase === "DECUMULATION" && projCorpus <= 0) break;
  }

  return {
    isAlreadyRetired,
    currentAge,
    retirementAge,
    lifeExpectancy,
    yearsToRetirement,
    retirementTenureYears,
    currentMonthlyExpense,
    currentAnnualExpense,
    inflatedMonthlyExpenseAtRetirement,
    inflatedAnnualExpenseAtRetirement,
    corpusNeededAtRetirement,
    projectedWealth: {
      epfFutureValue: epfFv,
      npsFutureValue: npsFv,
      ppfFutureValue: ppfFv,
      mutualFundsFutureValue: mfFv,
      liquidAssetsFutureValue: liquidFv,
      totalProjectedCorpus,
    },
    shortfallOrSurplus,
    isFullyFunded,
    readinessScorePct,
    requiredAdditionalMonthlySip,
    requiredAdditionalLumpsum,
    currentTotalRetirementCorpus,
    sustainableMonthlySpend,
    sustainableAnnualSpend,
    fourPercentRuleMonthly,
    fourPercentRuleAnnual,
    runwayYearsWithCurrentExpense,
    threeBucketPlan,
    swpStpStrategy,
    annualCashFlowProjection,
  };
}

