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
 * Default annual CAGR rates for physical and fixed asset categories in India
 */
export function getDefaultAssetCagr(category: string): number {
  const cat = (category || "").toLowerCase();
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
 * Unpacks an asset record from database, merging native columns with serialized metadata fallback
 */
export function unpackAsset(a: any): AssetLiquidationData {
  if (!a) return a;
  let target_liquidation_date = a.target_liquidation_date || null;
  let expected_cagr = a.expected_cagr !== undefined && a.expected_cagr !== null ? Number(a.expected_cagr) : null;
  let expected_liquidation_value = a.expected_liquidation_value !== undefined && a.expected_liquidation_value !== null ? Number(a.expected_liquidation_value) : null;
  let linked_goal_id = a.linked_goal_id || null;
  let clean_notes = a.notes || null;

  // Unpack serialized metadata from notes if present
  if (a.notes && typeof a.notes === "string" && a.notes.includes("__META__:")) {
    try {
      const parts = a.notes.split("__META__:");
      clean_notes = parts[0].trim();
      const meta = JSON.parse(parts[1]);
      if (!target_liquidation_date && meta.target_liquidation_date) target_liquidation_date = meta.target_liquidation_date;
      if (expected_cagr === null && meta.expected_cagr !== undefined) expected_cagr = Number(meta.expected_cagr);
      if (expected_liquidation_value === null && meta.expected_liquidation_value !== undefined) expected_liquidation_value = Number(meta.expected_liquidation_value);
      if (!linked_goal_id && meta.linked_goal_id) linked_goal_id = meta.linked_goal_id;
    } catch {}
  }

  const currentVal = Number(a.current_market_value || 0);

  // Apply sensible defaults if not set
  if (expected_cagr === null) {
    expected_cagr = getDefaultAssetCagr(a.asset_category);
  }

  // Calculate liquidation value if date is specified but value is unset
  if (target_liquidation_date && (!expected_liquidation_value || expected_liquidation_value <= 0)) {
    const currentYear = new Date().getFullYear();
    const liqYear = new Date(target_liquidation_date).getFullYear() || (currentYear + 5);
    const years = Math.max(0, liqYear - currentYear);
    expected_liquidation_value = Math.round(currentVal * Math.pow(1 + expected_cagr / 100, years));
  } else if (!expected_liquidation_value) {
    expected_liquidation_value = currentVal;
  }

  return {
    ...a,
    target_liquidation_date,
    expected_cagr,
    expected_liquidation_value,
    linked_goal_id,
    clean_notes,
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
}): string {
  const base = (cleanNotes || "").trim();
  const metaPayload = {
    target_liquidation_date: meta.target_liquidation_date || null,
    expected_cagr: meta.expected_cagr ?? null,
    expected_liquidation_value: meta.expected_liquidation_value ?? null,
    linked_goal_id: meta.linked_goal_id || null,
  };
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
      const meta = JSON.parse(parts[1]);
      if (!linked_goal_id && meta.linked_goal_id) linked_goal_id = meta.linked_goal_id;
    } catch {}
  }

  return {
    ...inv,
    linked_goal_id,
    clean_notes,
  };
}

export function packInvestmentNotes(cleanNotes: string | null | undefined, meta: { linked_goal_id?: string | null }): string {
  const base = (cleanNotes || "").trim();
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
      const meta = JSON.parse(parts[1]);
      if (linked_asset_ids.length === 0 && Array.isArray(meta.linked_asset_ids)) {
        linked_asset_ids = meta.linked_asset_ids;
      }
      if (linked_investment_ids.length === 0 && Array.isArray(meta.linked_investment_ids)) {
        linked_investment_ids = meta.linked_investment_ids;
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
  const base = (cleanNotes || "").trim();
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
