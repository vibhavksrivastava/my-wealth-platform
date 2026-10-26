/**
 * Goal & Asset Liquidation Alignment Utility
 * 
 * Provides calculation models and data serialization adapters for:
 * - Real Estate, FDs, Gold & Physical Assets liquidation planning
 * - Earmarking physical assets & investments to specific financial goals
 * - Forward projections of asset liquidation proceeds & investment compounding
 */

export interface AssetLiquidationData {
  asset_id?: string;
  client_id?: string;
  asset_category: string;
  description?: string | null;
  owner_name?: string;
  current_market_value: number;
  is_liquid?: boolean;
  notes?: string | null;
  target_liquidation_date?: string | null;
  expected_cagr?: number | null;
  expected_liquidation_value?: number | null;
  linked_goal_id?: string | null;
  clean_notes?: string | null;
  // NPS & Provident Fund specific fields
  rate_of_interest?: number | null;
  monthly_deposit?: number | null;
  expected_roi_monthly?: number | null;
  target_date?: string | null;
  expected_maturity_value?: number | null;
}

export interface InvestmentAlignmentData {
  investment_id?: string;
  client_id?: string;
  asset_class: string;
  scheme_instrument_name: string;
  owner_name?: string;
  invested_amount?: number;
  current_value: number;
  monthly_sip_amount?: number;
  expected_return_cagr?: number;
  goal_purpose?: string | null;
  linked_goal_id?: string | null;
  notes?: string | null;
  clean_notes?: string | null;
}

export interface FinancialGoalAlignmentData {
  goal_id?: string;
  client_id?: string;
  goal_name: string;
  target_year: number;
  target_amount_today: number;
  current_corpus_allocated?: number;
  expected_inflation_rate?: number;
  required_future_value?: number;
  monthly_required_sip?: number;
  priority?: string;
  notes?: string | null;
  linked_asset_ids?: string[];
  linked_investment_ids?: string[];
  clean_notes?: string | null;
}

/**
 * Default annual CAGR / Interest rates for physical and fixed asset categories in India
 */
export function getDefaultAssetCagr(category: string): number {
  const cat = (category || "").toLowerCase();
  if (cat.includes("nps") || cat.includes("national pension")) {
    return 10.0; // Benchmark NPS Equity+Corporate Debt blend
  }
  if (cat.includes("epf") || cat.includes("vpf")) {
    return 8.25; // Official EPFO Rate FY 2024-25 / 2025-26
  }
  if (cat.includes("ppf") || cat.includes("public provident")) {
    return 7.1; // Official PPF Rate
  }
  if (cat.includes("provident") || cat.includes("pension") || cat.includes("superannuation")) {
    return 8.0;
  }
  if (cat.includes("real estate") || cat.includes("property") || cat.includes("land") || cat.includes("flat") || cat.includes("villa")) {
    return 8.0;
  }
  if (cat.includes("deposit") || cat.includes("fd") || cat.includes("fixed") || cat.includes("rd") || cat.includes("bond")) {
    return 7.0;
  }
  if (cat.includes("gold") || cat.includes("precious") || cat.includes("metals") || cat.includes("sgb") || cat.includes("silver")) {
    return 9.0;
  }
  if (cat.includes("vehicle") || cat.includes("car") || cat.includes("bike")) {
    return -15.0; // Depreciating asset
  }
  if (cat.includes("art") || cat.includes("collectible") || cat.includes("private")) {
    return 10.0;
  }
  return 6.5; // General benchmark
}

/**
 * Checks if an asset record belongs to NPS or Provident Funds
 */
export function isRetirementAsset(a: any): boolean {
  if (!a) return false;
  const cat = (a.asset_category || "").toLowerCase();
  const desc = (a.description || "").toLowerCase();
  const notes = (a.notes || "").toLowerCase();

  // Guard: if it's explicitly an imported mutual fund, it's not retirement
  if (cat.includes("mutual") || notes.includes("imported via cams") || (notes.includes("isin:") && !cat.includes("nps") && !cat.includes("provident") && !cat.includes("epf") && !cat.includes("ppf"))) {
    return false;
  }

  return (
    cat.includes("nps") ||
    cat.includes("national pension") ||
    cat.includes("provident") ||
    cat.includes("ppf") ||
    cat.includes("epf") ||
    cat.includes("vpf") ||
    cat.includes("superannuation") ||
    /\b(ppf|epf|vpf|nps|pran|uan)\b/i.test(desc) ||
    /\b(ppf|epf|vpf|nps)\b/i.test(notes) ||
    desc.includes("provident") ||
    desc.includes("pension")
  );
}

/**
 * Checks if an asset record in the assets table is a market mutual fund or equity holding
 */
export function isMarketAsset(a: any): boolean {
  if (!a) return false;
  if (isRetirementAsset(a)) return false;
  const cat = (a.asset_category || "").toLowerCase();
  const desc = (a.description || "").toLowerCase();
  const notes = (a.notes || "").toLowerCase();
  return (
    cat.includes("mutual") ||
    cat.includes("stock") ||
    cat.includes("share") ||
    cat === "equity" ||
    desc.includes("(folio:") ||
    notes.includes("imported via cams") ||
    notes.includes("isin:")
  );
}

/**
 * Calculates compound future value for NPS and Provident Funds by tenure end
 */
export function calculateRetirementMaturityValue(params: {
  currentValue: number;
  rateOfInterest: number;
  monthlyDeposit: number;
  expectedRoiMonthly: number;
  targetDate: string | null;
}) {
  const v0 = Math.max(0, Number(params.currentValue || 0));
  const r1 = Math.max(0, Number(params.rateOfInterest || 0));
  const p = Math.max(0, Number(params.monthlyDeposit || 0));
  const r2 = Math.max(0, Number(params.expectedRoiMonthly || 0));

  if (!params.targetDate) {
    return {
      tenureMonths: 0,
      tenureYears: 0,
      corpusGrowth: v0,
      totalDeposits: 0,
      depositsGrowth: 0,
      expectedMaturityValue: v0,
      totalGain: 0,
    };
  }

  const now = new Date();
  const target = new Date(params.targetDate);
  const diffMonths = Math.max(
    0,
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
  );
  const tenureYears = Number((diffMonths / 12).toFixed(1));

  // Future value of existing current corpus
  const i1 = (r1 / 100) / 12;
  const corpusGrowth =
    diffMonths > 0 && i1 > 0
      ? Math.round(v0 * Math.pow(1 + i1, diffMonths))
      : Math.round(v0 * (1 + (r1 / 100) * (diffMonths / 12)));

  // Future value of monthly deposits (annuity compounding at beginning of month)
  const i2 = (r2 / 100) / 12;
  let depositsGrowth = 0;
  if (diffMonths > 0 && p > 0) {
    if (i2 > 0) {
      depositsGrowth = Math.round(p * ((Math.pow(1 + i2, diffMonths) - 1) / i2) * (1 + i2));
    } else {
      depositsGrowth = p * diffMonths;
    }
  }

  const totalDeposits = p * diffMonths;
  const expectedMaturityValue = corpusGrowth + depositsGrowth;
  const totalInvested = v0 + totalDeposits;
  const totalGain = expectedMaturityValue - totalInvested;

  return {
    tenureMonths: diffMonths,
    tenureYears,
    corpusGrowth,
    totalDeposits,
    depositsGrowth,
    expectedMaturityValue,
    totalGain,
  };
}

/**
 * Unpacks an asset record from database, merging native columns with serialized metadata fallback
 */
export function unpackAsset(a: any): AssetLiquidationData {
  if (!a) return a;
  let target_liquidation_date = a.target_liquidation_date || null;
  let expected_cagr = a.expected_cagr !== undefined && a.expected_cagr !== null ? Number(a.expected_cagr) : null;
  let expected_liquidation_value = a.expected_liquidation_value !== undefined && a.expected_liquidation_value !== null ? Number(a.expected_liquidation_value) : null;
  let linked_goal_id = a.linked_goal_id || null;
  let clean_notes = a.notes || null;

  // Retirement specific fields
  let rate_of_interest = a.rate_of_interest !== undefined && a.rate_of_interest !== null ? Number(a.rate_of_interest) : null;
  let monthly_deposit = a.monthly_deposit !== undefined && a.monthly_deposit !== null ? Number(a.monthly_deposit) : null;
  let expected_roi_monthly = a.expected_roi_monthly !== undefined && a.expected_roi_monthly !== null ? Number(a.expected_roi_monthly) : null;
  let target_date = a.target_date || null;
  let expected_maturity_value = a.expected_maturity_value !== undefined && a.expected_maturity_value !== null ? Number(a.expected_maturity_value) : null;

  // Unpack serialized metadata from notes if present
  if (a.notes && typeof a.notes === "string" && a.notes.includes("__META__:")) {
    try {
      const parts = a.notes.split("__META__:");
      clean_notes = parts[0].trim();
      for (let i = parts.length - 1; i >= 1; i--) {
        const candidate = parts[i].trim();
        if (!candidate) continue;
        try {
          const meta = JSON.parse(candidate);
          if (!target_liquidation_date && meta.target_liquidation_date) target_liquidation_date = meta.target_liquidation_date;
          if (expected_cagr === null && meta.expected_cagr !== undefined) expected_cagr = Number(meta.expected_cagr);
          if (expected_liquidation_value === null && meta.expected_liquidation_value !== undefined) expected_liquidation_value = Number(meta.expected_liquidation_value);
          if (!linked_goal_id && meta.linked_goal_id) linked_goal_id = meta.linked_goal_id;

          if (rate_of_interest === null && meta.rate_of_interest !== undefined) rate_of_interest = Number(meta.rate_of_interest);
          if (monthly_deposit === null && meta.monthly_deposit !== undefined) monthly_deposit = Number(meta.monthly_deposit);
          if (expected_roi_monthly === null && meta.expected_roi_monthly !== undefined) expected_roi_monthly = Number(meta.expected_roi_monthly);
          if (!target_date && meta.target_date) target_date = meta.target_date;
          if (expected_maturity_value === null && meta.expected_maturity_value !== undefined) expected_maturity_value = Number(meta.expected_maturity_value);
          break;
        } catch {}
      }
    } catch {}
  }

  const currentVal = Number(a.current_market_value || 0);

  // Apply sensible defaults if not set
  if (expected_cagr === null) {
    expected_cagr = getDefaultAssetCagr(a.asset_category);
  }

  // Handle NPS / Provident Fund calculations
  if (isRetirementAsset(a)) {
    if (target_date === null) target_date = target_liquidation_date;
    if (target_liquidation_date === null) target_liquidation_date = target_date;
    if (rate_of_interest === null) rate_of_interest = expected_cagr !== null ? expected_cagr : getDefaultAssetCagr(a.asset_category);
    if (expected_roi_monthly === null) expected_roi_monthly = rate_of_interest;
    if (monthly_deposit === null) monthly_deposit = 0;

    if (!expected_maturity_value && target_date) {
      const calc = calculateRetirementMaturityValue({
        currentValue: currentVal,
        rateOfInterest: rate_of_interest || 0,
        monthlyDeposit: monthly_deposit || 0,
        expectedRoiMonthly: expected_roi_monthly || 0,
        targetDate: target_date,
      });
      expected_maturity_value = calc.expectedMaturityValue;
      if (!expected_liquidation_value) expected_liquidation_value = expected_maturity_value;
    } else if (!expected_maturity_value) {
      expected_maturity_value = expected_liquidation_value || currentVal;
    }
  } else {
    // Standard physical asset liquidation value calculation
    if (target_liquidation_date && (!expected_liquidation_value || expected_liquidation_value <= 0)) {
      const currentYear = new Date().getFullYear();
      const liqYear = new Date(target_liquidation_date).getFullYear() || (currentYear + 5);
      const years = Math.max(0, liqYear - currentYear);
      expected_liquidation_value = Math.round(currentVal * Math.pow(1 + expected_cagr / 100, years));
    } else if (!expected_liquidation_value) {
      expected_liquidation_value = currentVal;
    }
  }

  return {
    ...a,
    target_liquidation_date,
    expected_cagr,
    expected_liquidation_value,
    linked_goal_id,
    clean_notes,
    rate_of_interest,
    monthly_deposit,
    expected_roi_monthly,
    target_date,
    expected_maturity_value,
  };
}

/**
 * Packs asset metadata into notes if native columns cannot be directly written
 */
export function packAssetNotes(cleanNotes: string | null | undefined, meta: {
  target_liquidation_date?: string | null;
  expected_cagr?: number | null;
  expected_liquidation_value?: number | null;
  linked_goal_id?: string | null;
  rate_of_interest?: number | null;
  monthly_deposit?: number | null;
  expected_roi_monthly?: number | null;
  target_date?: string | null;
  expected_maturity_value?: number | null;
}): string {
  const base = (cleanNotes || "").split("__META__:")[0].trim();
  const metaPayload: any = {
    target_liquidation_date: meta.target_liquidation_date || null,
    expected_cagr: meta.expected_cagr ?? null,
    expected_liquidation_value: meta.expected_liquidation_value ?? null,
    linked_goal_id: meta.linked_goal_id || null,
  };
  if (meta.rate_of_interest !== undefined && meta.rate_of_interest !== null) metaPayload.rate_of_interest = meta.rate_of_interest;
  if (meta.monthly_deposit !== undefined && meta.monthly_deposit !== null) metaPayload.monthly_deposit = meta.monthly_deposit;
  if (meta.expected_roi_monthly !== undefined && meta.expected_roi_monthly !== null) metaPayload.expected_roi_monthly = meta.expected_roi_monthly;
  if (meta.target_date !== undefined && meta.target_date !== null) metaPayload.target_date = meta.target_date;
  if (meta.expected_maturity_value !== undefined && meta.expected_maturity_value !== null) metaPayload.expected_maturity_value = meta.expected_maturity_value;

  return base ? `${base}\n__META__:${JSON.stringify(metaPayload)}` : `__META__:${JSON.stringify(metaPayload)}`;
}

/**
 * Unpacks an investment portfolio record
 */
export function unpackInvestment(inv: any): InvestmentAlignmentData {
  if (!inv) return inv;
  let linked_goal_id = inv.linked_goal_id || null;
  let clean_notes = inv.notes || null;

  if (!linked_goal_id && inv.goal_purpose && inv.goal_purpose.startsWith("GOAL_ID:")) {
    linked_goal_id = inv.goal_purpose.replace("GOAL_ID:", "").trim();
  }

  if (inv.notes && typeof inv.notes === "string" && inv.notes.includes("__META__:")) {
    try {
      const parts = inv.notes.split("__META__:");
      clean_notes = parts[0].trim();
      for (let i = parts.length - 1; i >= 1; i--) {
        const candidate = parts[i].trim();
        if (!candidate) continue;
        try {
          const meta = JSON.parse(candidate);
          if (!linked_goal_id && meta.linked_goal_id) linked_goal_id = meta.linked_goal_id;
          break;
        } catch {}
      }
    } catch {}
  }

  return {
    ...inv,
    linked_goal_id,
    clean_notes,
  };
}

export function packInvestmentNotes(cleanNotes: string | null | undefined, meta: { linked_goal_id?: string | null }): string {
  const base = (cleanNotes || "").split("__META__:")[0].trim();
  const metaPayload = { linked_goal_id: meta.linked_goal_id || null };
  return base ? `${base}\n__META__:${JSON.stringify(metaPayload)}` : `__META__:${JSON.stringify(metaPayload)}`;
}

/**
 * Unpacks a financial goal record
 */
export function unpackGoal(g: any): FinancialGoalAlignmentData {
  if (!g) return g;
  let linked_asset_ids: string[] = Array.isArray(g.linked_asset_ids) ? g.linked_asset_ids : [];
  let linked_investment_ids: string[] = Array.isArray(g.linked_investment_ids) ? g.linked_investment_ids : [];
  let clean_notes = g.notes || null;

  if (g.notes && typeof g.notes === "string" && g.notes.includes("__META__:")) {
    try {
      const parts = g.notes.split("__META__:");
      clean_notes = parts[0].trim();
      for (let i = parts.length - 1; i >= 1; i--) {
        const candidate = parts[i].trim();
        if (!candidate) continue;
        try {
          const meta = JSON.parse(candidate);
          if (linked_asset_ids.length === 0 && Array.isArray(meta.linked_asset_ids)) {
            linked_asset_ids = meta.linked_asset_ids;
          }
          if (linked_investment_ids.length === 0 && Array.isArray(meta.linked_investment_ids)) {
            linked_investment_ids = meta.linked_investment_ids;
          }
          break;
        } catch {}
      }
    } catch {}
  }

  return {
    ...g,
    linked_asset_ids,
    linked_investment_ids,
    clean_notes,
  };
}

export function packGoalNotes(cleanNotes: string | null | undefined, meta: {
  linked_asset_ids?: string[];
  linked_investment_ids?: string[];
}): string {
  const base = (cleanNotes || "").split("__META__:")[0].trim();
  const metaPayload = {
    linked_asset_ids: meta.linked_asset_ids || [],
    linked_investment_ids: meta.linked_investment_ids || [],
  };
  return base ? `${base}\n__META__:${JSON.stringify(metaPayload)}` : `__META__:${JSON.stringify(metaPayload)}`;
}

/**
 * Calculate future value of monthly SIP
 */
export function calculateSipFutureValue(monthlyAmount: number, annualReturnRate: number, years: number): number {
  if (monthlyAmount <= 0 || years <= 0) return 0;
  const monthlyRate = annualReturnRate / 100 / 12;
  const totalMonths = years * 12;
  if (monthlyRate === 0) return monthlyAmount * totalMonths;
  return monthlyAmount * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate);
}

/**
 * Calculate required monthly SIP to meet future target
 */
export function calculateRequiredMonthlySIP(futureTarget: number, annualReturnRate: number, years: number): number {
  if (futureTarget <= 0 || years <= 0) return 0;
  const monthlyRate = annualReturnRate / 100 / 12;
  const totalMonths = years * 12;
  if (monthlyRate === 0) return Math.round(futureTarget / totalMonths);
  const pmt = futureTarget * (monthlyRate / ((Math.pow(1 + monthlyRate, totalMonths) - 1) * (1 + monthlyRate)));
  return Math.round(pmt);
}

/**
 * Projects proceeds for an NPS or Provident Fund asset earmarked for a financial goal
 */
export function projectRetirementProceedsForGoal(
  asset: AssetLiquidationData,
  goalTargetYear: number
): {
  assetId: string;
  category: string;
  description: string;
  currentValue: number;
  monthlyDeposit: number;
  rateOfInterest: number;
  expectedRoiMonthly: number;
  targetDate: string | null;
  projectedProceeds: number;
  tenureYears: number;
  tenureMonths: number;
} {
  const currentVal = Number(asset.current_market_value || 0);
  const roi = asset.rate_of_interest !== undefined && asset.rate_of_interest !== null
    ? Number(asset.rate_of_interest)
    : (asset.expected_cagr || getDefaultAssetCagr(asset.asset_category));
  const mDeposit = Number(asset.monthly_deposit || 0);
  const roiMonthly = asset.expected_roi_monthly !== undefined && asset.expected_roi_monthly !== null
    ? Number(asset.expected_roi_monthly)
    : roi;
  const targetDateStr = asset.target_date || asset.target_liquidation_date || null;

  // Use asset target date or project up to goal target year
  let horizonDate = targetDateStr;
  if (!horizonDate) {
    const d = new Date();
    d.setFullYear(goalTargetYear);
    horizonDate = d.toISOString().substring(0, 10);
  }

  const calc = calculateRetirementMaturityValue({
    currentValue: currentVal,
    rateOfInterest: roi,
    monthlyDeposit: mDeposit,
    expectedRoiMonthly: roiMonthly,
    targetDate: horizonDate,
  });

  let proceeds = calc.expectedMaturityValue;

  // If the asset reaches target date before goal target year, the matured corpus grows conservatively at 6% until goal
  if (targetDateStr) {
    const matYear = new Date(targetDateStr).getFullYear();
    if (!isNaN(matYear) && matYear < goalTargetYear) {
      const interimYears = Math.max(0, goalTargetYear - matYear);
      proceeds = Math.round(proceeds * Math.pow(1 + 0.06, interimYears));
    }
  }

  return {
    assetId: asset.asset_id || "",
    category: asset.asset_category,
    description: asset.description || asset.asset_category,
    currentValue: currentVal,
    monthlyDeposit: mDeposit,
    rateOfInterest: roi,
    expectedRoiMonthly: roiMonthly,
    targetDate: targetDateStr,
    projectedProceeds: proceeds,
    tenureYears: calc.tenureYears,
    tenureMonths: calc.tenureMonths,
  };
}

/**
 * Projects proceeds for an asset earmarked to fund a target goal
 */
export function projectAssetProceedsForGoal(
  asset: AssetLiquidationData,
  goalTargetYear: number
): {
  assetId: string;
  category: string;
  description: string;
  currentValue: number;
  expectedCagr: number;
  targetLiquidationDate: string | null;
  projectedProceeds: number;
  isMaturedBeforeGoal: boolean;
} {
  if (isRetirementAsset(asset)) {
    const retProj = projectRetirementProceedsForGoal(asset, goalTargetYear);
    return {
      assetId: retProj.assetId,
      category: retProj.category,
      description: retProj.description,
      currentValue: retProj.currentValue,
      expectedCagr: retProj.rateOfInterest,
      targetLiquidationDate: retProj.targetDate,
      projectedProceeds: retProj.projectedProceeds,
      isMaturedBeforeGoal: true,
    };
  }

  const currentYear = new Date().getFullYear();
  const currentVal = Number(asset.current_market_value || 0);
  const cagr = Number(asset.expected_cagr ?? getDefaultAssetCagr(asset.asset_category));

  // Determine horizon year
  let liqYear = goalTargetYear;
  if (asset.target_liquidation_date) {
    const d = new Date(asset.target_liquidation_date);
    if (!isNaN(d.getFullYear())) {
      liqYear = d.getFullYear();
    }
  }

  const yearsToLiquidation = Math.max(0, liqYear - currentYear);
  const isMaturedBeforeGoal = liqYear <= goalTargetYear;

  let projected = 0;
  if (asset.expected_liquidation_value && Number(asset.expected_liquidation_value) > 0) {
    projected = Number(asset.expected_liquidation_value);
    // If it matures before goal, it could grow further in debt/liquid fund at 6% until goal
    if (liqYear < goalTargetYear) {
      const interimYears = Math.max(0, goalTargetYear - liqYear);
      projected = Math.round(projected * Math.pow(1 + 0.06, interimYears));
    }
  } else {
    projected = Math.round(currentVal * Math.pow(1 + cagr / 100, yearsToLiquidation));
    if (liqYear < goalTargetYear) {
      const interimYears = Math.max(0, goalTargetYear - liqYear);
      projected = Math.round(projected * Math.pow(1 + 0.06, interimYears));
    }
  }

  return {
    assetId: asset.asset_id || "",
    category: asset.asset_category,
    description: asset.description || asset.asset_category,
    currentValue: currentVal,
    expectedCagr: cagr,
    targetLiquidationDate: asset.target_liquidation_date || null,
    projectedProceeds: projected,
    isMaturedBeforeGoal,
  };
}

/**
 * Projects corpus from an investment earmarked for a target goal
 */
export function projectInvestmentCorpusForGoal(
  inv: InvestmentAlignmentData,
  goalTargetYear: number
): {
  investmentId: string;
  schemeName: string;
  assetClass: string;
  currentValue: number;
  monthlySip: number;
  expectedCagr: number;
  projectedLumpSum: number;
  projectedSipValue: number;
  totalProjectedCorpus: number;
} {
  const currentYear = new Date().getFullYear();
  const years = Math.max(1, goalTargetYear - currentYear);

  let cagr = 12.0;
  if (inv.expected_return_cagr !== undefined && inv.expected_return_cagr !== null) {
    const val = Number(inv.expected_return_cagr);
    cagr = val <= 0.35 ? val * 100 : val;
  }

  const currentVal = Number(inv.current_value || 0);
  const monthlySip = Number(inv.monthly_sip_amount || 0);

  const projectedLumpSum = Math.round(currentVal * Math.pow(1 + cagr / 100, years));
  const projectedSipValue = Math.round(calculateSipFutureValue(monthlySip, cagr, years));
  const totalProjectedCorpus = projectedLumpSum + projectedSipValue;

  return {
    investmentId: inv.investment_id || "",
    schemeName: inv.scheme_instrument_name || "Investment Holding",
    assetClass: inv.asset_class,
    currentValue: currentVal,
    monthlySip,
    expectedCagr: cagr,
    projectedLumpSum,
    projectedSipValue,
    totalProjectedCorpus,
  };
}

