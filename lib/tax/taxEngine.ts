/**
 * Comprehensive Indian Wealth Tax Calculation Engine
 * Compliant with Income Tax Act, 1961 (incorporating Finance Act 2024 / FY 2024-25 / FY 2025-26 / FY 2026-27 updates)
 * - Section 112A: Equity LTCG (12.5% on gains > ₹1,25,000/year)
 * - Section 111A: Equity STCG (20%)
 * - Section 50AA: Specified Debt Mutual Funds at Slab Rates
 * - Section 115BAC: New Tax Regime with ₹75k Standard Deduction & Slabs
 * - Old Tax Regime with 80C, 80D, 80CCD(1B), Section 24(b), and HRA
 */

export interface TaxDeductionsInput {
  section80C: number; // EPF, PPF, ELSS, Insurance (max 1.5L)
  section80D: number; // Health Insurance (self/family max 25k, parents max 25k/50k)
  section80CCD1B: number; // NPS additional (max 50k)
  section24b: number; // Home Loan Interest (max 2L)
  hraExemption: number; // Section 10(13A)
  otherDeductions?: number;
}

export interface TaxRegimeComparisonResult {
  grossIncome: number;
  newRegime: {
    grossIncome: number;
    standardDeduction: number;
    taxableIncome: number;
    slabTax: number;
    rebate87A: number;
    taxAfterRebate: number;
    surcharge: number;
    cess: number; // 4%
    totalTax: number;
    effectiveTaxRatePct: number;
    slabBreakdown: Array<{ slab: string; rate: string; tax: number }>;
  };
  oldRegime: {
    grossIncome: number;
    standardDeduction: number;
    totalDeductions: number;
    deductionsBreakdown: TaxDeductionsInput;
    taxableIncome: number;
    slabTax: number;
    rebate87A: number;
    taxAfterRebate: number;
    surcharge: number;
    cess: number; // 4%
    totalTax: number;
    effectiveTaxRatePct: number;
    slabBreakdown: Array<{ slab: string; rate: string; tax: number }>;
  };
  recommendedRegime: "NEW" | "OLD";
  taxSavingsWithRecommended: number;
  breakevenDeductionsNeededForOldRegime: number;
}

export interface TaxHoldingItem {
  id: string;
  schemeName: string;
  assetClass: string;
  folioNumber?: string;
  units: number;
  currentNav: number;
  avgNav?: number;
  investedCost: number;
  currentValue: number;
  unrealizedGain: number;
  purchaseDate?: string;
  holdingPeriodDays: number;
  isLongTerm: boolean; // >= 365 days for equity
  isDebt: boolean;
}

export interface TaxLossHarvestingOpportunity {
  holdingId: string;
  schemeName: string;
  folioNumber?: string;
  assetClass: string;
  units: number;
  currentValue: number;
  investedCost: number;
  unrealizedLoss: number;
  gainType: "STCL" | "LTCL";
  taxRateOffsetPct: number; // 20% for STCL, 12.5% for LTCL
  potentialTaxSaved: number;
  recommendedAction: "HARVEST_NOW" | "MONITOR";
  replacementScheme: string;
  rationale: string;
}

export interface LtcgHarvestingPlan {
  annualExemptionLimit: number; // ₹1,25,000
  utilizedExemptionThisFY: number;
  remainingExemptionHeadroom: number;
  totalUnrealizedLtcgAvailable: number;
  harvestableGain: number;
  recommendedTrades: Array<{
    schemeName: string;
    folioNumber?: string;
    unitsToRedeem: number;
    redeemAmount: number;
    gainBookedTaxFree: number;
    taxSavedPermanently: number; // 12.5% of booked gain
    reinvestmentScheme: string;
    rationale: string;
  }>;
}

export interface CapitalGainsScheduleItem {
  schemeName: string;
  assetType: "EQUITY" | "DEBT" | "HYBRID";
  holdingPeriodType: "STCG" | "LTCG";
  section: "111A" | "112A" | "50AA";
  saleValue: number;
  costValue: number;
  gainOrLoss: number;
  applicableTaxRate: number; // 20%, 12.5%, or slab
  estimatedTax: number;
}

export interface CompleteTaxPlanningSummary {
  clientId: string;
  clientName: string;
  fiscalYear: string;
  pan?: string;
  grossAnnualIncome: number;
  currentStatedRegime: string;
  regimeComparison: TaxRegimeComparisonResult;
  taxLossHarvesting: {
    totalUnrealizedLosses: number;
    stclAvailable: number;
    ltclAvailable: number;
    totalTaxAlphaPotential: number;
    opportunities: TaxLossHarvestingOpportunity[];
  };
  ltcgExemptionHarvesting: LtcgHarvestingPlan;
  scheduleCG: {
    totalRealizedSTCG: number;
    totalRealizedLTCG: number;
    totalRealizedGains: number;
    taxOnSTCG: number;
    taxOnLTCG: number;
    totalCapitalGainsTax: number;
    items: CapitalGainsScheduleItem[];
    advanceTaxSchedule: Array<{ installment: string; dueDate: string; percentage: number; amountDue: number }>;
  };
}

/**
 * Calculate Surcharge on income tax based on Indian Finance Act slabs
 */
function calculateSurcharge(taxableIncome: number, taxAmount: number, isNewRegime = true): number {
  if (taxableIncome <= 5000000) return 0;
  if (taxableIncome <= 10000000) return taxAmount * 0.10;
  if (taxableIncome <= 20000000) return taxAmount * 0.15;
  if (isNewRegime) {
    // New regime caps surcharge at 25% for > ₹2 Cr
    return taxAmount * 0.25;
  } else {
    if (taxableIncome <= 50000000) return taxAmount * 0.25;
    return taxAmount * 0.37;
  }
}

/**
 * Calculate Tax Liability under New Tax Regime (Section 115BAC)
 * Incorporating Budget updates: ₹75,000 standard deduction, revised slabs, and Section 87A rebate up to ₹7L.
 */
export function calculateNewRegimeTax(grossIncome: number) {
  const standardDeduction = Math.min(grossIncome, 75000);
  const taxableIncome = Math.max(0, grossIncome - standardDeduction);

  const slabBreakdown: Array<{ slab: string; rate: string; tax: number }> = [];
  let slabTax = 0;

  // Slabs:
  // 0 - 3,00,000: Nil
  // 3,00,001 - 7,00,000: 5%
  // 7,00,001 - 10,00,000: 10%
  // 10,00,001 - 12,00,000: 15%
  // 12,00,001 - 15,00,000: 20%
  // Above 15,00,000: 30%

  if (taxableIncome > 1500000) {
    const t = (taxableIncome - 1500000) * 0.30;
    slabTax += t;
    slabBreakdown.push({ slab: "Above ₹15,00,000", rate: "30%", tax: t });
  }
  if (taxableIncome > 1200000) {
    const taxableInSlab = Math.min(taxableIncome - 1200000, 300000);
    const t = taxableInSlab * 0.20;
    slabTax += t;
    slabBreakdown.push({ slab: "₹12,00,001 - ₹15,00,000", rate: "20%", tax: t });
  }
  if (taxableIncome > 1000000) {
    const taxableInSlab = Math.min(taxableIncome - 1000000, 200000);
    const t = taxableInSlab * 0.15;
    slabTax += t;
    slabBreakdown.push({ slab: "₹10,00,001 - ₹12,00,000", rate: "15%", tax: t });
  }
  if (taxableIncome > 700000) {
    const taxableInSlab = Math.min(taxableIncome - 700000, 300000);
    const t = taxableInSlab * 0.10;
    slabTax += t;
    slabBreakdown.push({ slab: "₹7,00,001 - ₹10,00,000", rate: "10%", tax: t });
  }
  if (taxableIncome > 300000) {
    const taxableInSlab = Math.min(taxableIncome - 300000, 400000);
    const t = taxableInSlab * 0.05;
    slabTax += t;
    slabBreakdown.push({ slab: "₹3,00,001 - ₹7,00,000", rate: "5%", tax: t });
  }
  if (taxableIncome <= 300000) {
    slabBreakdown.push({ slab: "Up to ₹3,00,000", rate: "0%", tax: 0 });
  }

  // Section 87A rebate: If taxable income <= ₹7,00,000, full rebate up to ₹25,000
  let rebate87A = 0;
  if (taxableIncome <= 700000) {
    rebate87A = Math.min(slabTax, 25000);
  }
  const taxAfterRebate = Math.max(0, slabTax - rebate87A);

  const surcharge = calculateSurcharge(taxableIncome, taxAfterRebate, true);
  const cess = Math.round((taxAfterRebate + surcharge) * 0.04);
  const totalTax = Math.round(taxAfterRebate + surcharge + cess);

  return {
    grossIncome,
    standardDeduction,
    taxableIncome,
    slabTax: Math.round(slabTax),
    rebate87A: Math.round(rebate87A),
    taxAfterRebate: Math.round(taxAfterRebate),
    surcharge: Math.round(surcharge),
    cess,
    totalTax,
    effectiveTaxRatePct: grossIncome > 0 ? Number(((totalTax / grossIncome) * 100).toFixed(2)) : 0,
    slabBreakdown: slabBreakdown.reverse(),
  };
}

/**
 * Calculate Tax Liability under Old Tax Regime
 * Slabs: 0-2.5L: Nil, 2.5L-5L: 5%, 5L-10L: 20%, >10L: 30%
 * Deductions: 80C (max 1.5L), 80D (max 25k/75k), 80CCD1B (max 50k), Section 24b (max 2L), HRA
 */
export function calculateOldRegimeTax(grossIncome: number, deductions: TaxDeductionsInput) {
  const standardDeduction = Math.min(grossIncome, 50000);
  const sec80C = Math.min(deductions.section80C || 0, 150000);
  const sec80D = Math.min(deductions.section80D || 0, 75000);
  const sec80CCD1B = Math.min(deductions.section80CCD1B || 0, 50000);
  const sec24b = Math.min(deductions.section24b || 0, 200000);
  const hra = deductions.hraExemption || 0;
  const other = deductions.otherDeductions || 0;

  const totalDeductions = sec80C + sec80D + sec80CCD1B + sec24b + hra + other;
  const taxableIncome = Math.max(0, grossIncome - standardDeduction - totalDeductions);

  const slabBreakdown: Array<{ slab: string; rate: string; tax: number }> = [];
  let slabTax = 0;

  if (taxableIncome > 1000000) {
    const t = (taxableIncome - 1000000) * 0.30;
    slabTax += t;
    slabBreakdown.push({ slab: "Above ₹10,00,000", rate: "30%", tax: t });
  }
  if (taxableIncome > 500000) {
    const taxableInSlab = Math.min(taxableIncome - 500000, 500000);
    const t = taxableInSlab * 0.20;
    slabTax += t;
    slabBreakdown.push({ slab: "₹5,00,001 - ₹10,00,000", rate: "20%", tax: t });
  }
  if (taxableIncome > 250000) {
    const taxableInSlab = Math.min(taxableIncome - 250000, 250000);
    const t = taxableInSlab * 0.05;
    slabTax += t;
    slabBreakdown.push({ slab: "₹2,50,001 - ₹5,00,000", rate: "5%", tax: t });
  }
  if (taxableIncome <= 250000) {
    slabBreakdown.push({ slab: "Up to ₹2,50,000", rate: "0%", tax: 0 });
  }

  // Section 87A rebate for Old Regime: If taxable income <= ₹5,00,000, full rebate up to ₹12,500
  let rebate87A = 0;
  if (taxableIncome <= 500000) {
    rebate87A = Math.min(slabTax, 12500);
  }
  const taxAfterRebate = Math.max(0, slabTax - rebate87A);

  const surcharge = calculateSurcharge(taxableIncome, taxAfterRebate, false);
  const cess = Math.round((taxAfterRebate + surcharge) * 0.04);
  const totalTax = Math.round(taxAfterRebate + surcharge + cess);

  return {
    grossIncome,
    standardDeduction,
    totalDeductions,
    deductionsBreakdown: {
      section80C: sec80C,
      section80D: sec80D,
      section80CCD1B: sec80CCD1B,
      section24b: sec24b,
      hraExemption: hra,
      otherDeductions: other,
    },
    taxableIncome,
    slabTax: Math.round(slabTax),
    rebate87A: Math.round(rebate87A),
    taxAfterRebate: Math.round(taxAfterRebate),
    surcharge: Math.round(surcharge),
    cess,
    totalTax,
    effectiveTaxRatePct: grossIncome > 0 ? Number(((totalTax / grossIncome) * 100).toFixed(2)) : 0,
    slabBreakdown: slabBreakdown.reverse(),
  };
}

/**
 * Compare Old vs New Tax Regime and find breakeven deductions needed
 */
export function compareTaxRegimes(
  grossIncome: number,
  deductions: TaxDeductionsInput
): TaxRegimeComparisonResult {
  const newRegime = calculateNewRegimeTax(grossIncome);
  const oldRegime = calculateOldRegimeTax(grossIncome, deductions);

  const recommendedRegime: "NEW" | "OLD" = newRegime.totalTax <= oldRegime.totalTax ? "NEW" : "OLD";
  const taxSavingsWithRecommended = Math.abs(oldRegime.totalTax - newRegime.totalTax);

  // Compute breakeven deductions needed: binary search for deductions where Old Regime Tax == New Regime Tax
  let breakevenDeductionsNeededForOldRegime = 375000;
  if (grossIncome > 1500000) {
    // For high income, breakeven is typically around ~₹4,25,000 to ₹4,75,000 deductions
    let low = 0;
    let high = 1500000;
    for (let i = 0; i < 30; i++) {
      const mid = (low + high) / 2;
      const testOld = calculateOldRegimeTax(grossIncome, {
        section80C: Math.min(mid, 150000),
        section80D: Math.min(Math.max(0, mid - 150000), 75000),
        section80CCD1B: Math.min(Math.max(0, mid - 225000), 50000),
        section24b: Math.min(Math.max(0, mid - 275000), 200000),
        hraExemption: Math.max(0, mid - 475000),
      });
      if (testOld.totalTax > newRegime.totalTax) {
        low = mid;
      } else {
        high = mid;
      }
    }
    breakevenDeductionsNeededForOldRegime = Math.round((low + high) / 2);
  }

  return {
    grossIncome,
    newRegime,
    oldRegime,
    recommendedRegime,
    taxSavingsWithRecommended,
    breakevenDeductionsNeededForOldRegime,
  };
}

/**
 * Scan client holdings for algorithmic Tax-Loss Harvesting opportunities
 */
export function scanTaxLossHarvesting(holdings: TaxHoldingItem[]): {
  totalUnrealizedLosses: number;
  stclAvailable: number;
  ltclAvailable: number;
  totalTaxAlphaPotential: number;
  opportunities: TaxLossHarvestingOpportunity[];
} {
  const opportunities: TaxLossHarvestingOpportunity[] = [];
  let totalLosses = 0;
  let stcl = 0;
  let ltcl = 0;
  let taxAlpha = 0;

  holdings.forEach((h) => {
    if (h.unrealizedGain < 0) {
      const loss = Math.abs(h.unrealizedGain);
      totalLosses += loss;

      const isLongTerm = h.isLongTerm;
      const gainType: "STCL" | "LTCL" = isLongTerm ? "LTCL" : "STCL";
      // Post-budget tax rates: STCG is 20%, LTCG is 12.5%
      const taxRate = isLongTerm ? 12.5 : 20.0;
      const taxSaved = Math.round(loss * (taxRate / 100));

      if (isLongTerm) {
        ltcl += loss;
      } else {
        stcl += loss;
      }
      taxAlpha += taxSaved;

      // Suggest suitable alternative scheme for wash-sale-safe reallocation
      let replacement = "ICICI Prudential Nifty 50 Index Fund - Direct Growth";
      const sName = h.schemeName.toLowerCase();
      if (sName.includes("small")) {
        replacement = "Nippon India Small Cap Fund / SBI Small Cap Fund (Alternative Peer)";
      } else if (sName.includes("mid")) {
        replacement = "Motilal Oswal Midcap Fund / HDFC Mid-Cap Opportunities Fund";
      } else if (sName.includes("debt") || h.isDebt) {
        replacement = "HDFC Short Duration Debt Fund / Corporate Bond Fund";
      }

      opportunities.push({
        holdingId: h.id,
        schemeName: h.schemeName,
        folioNumber: h.folioNumber,
        assetClass: h.assetClass,
        units: h.units,
        currentValue: h.currentValue,
        investedCost: h.investedCost,
        unrealizedLoss: loss,
        gainType,
        taxRateOffsetPct: taxRate,
        potentialTaxSaved: taxSaved,
        recommendedAction: loss > 10000 ? "HARVEST_NOW" : "MONITOR",
        replacementScheme: replacement,
        rationale: `Booking this ${gainType} of ₹${loss.toLocaleString("en-IN")} saves ₹${taxSaved.toLocaleString("en-IN")} in capital gains tax. Reinvest immediately in ${replacement.split("/")[0].trim()} to maintain market exposure without timing penalty.`,
      });
    }
  });

  return {
    totalUnrealizedLosses: Math.round(totalLosses),
    stclAvailable: Math.round(stcl),
    ltclAvailable: Math.round(ltcl),
    totalTaxAlphaPotential: Math.round(taxAlpha),
    opportunities: opportunities.sort((a, b) => b.unrealizedLoss - a.unrealizedLoss),
  };
}

/**
 * Scan client holdings for ₹1,25,000 Annual LTCG Harvesting (Section 112A)
 */
export function calculateLtcgHarvestingOpportunity(
  holdings: TaxHoldingItem[],
  utilizedExemptionThisFY = 0
): LtcgHarvestingPlan {
  const annualLimit = 125000;
  const remainingHeadroom = Math.max(0, annualLimit - utilizedExemptionThisFY);

  // Filter long-term equity holdings with unrealized gains
  const longTermGainsHoldings = holdings
    .filter((h) => !h.isDebt && h.isLongTerm && h.unrealizedGain > 5000)
    .sort((a, b) => b.unrealizedGain - a.unrealizedGain);

  const totalUnrealizedLtcg = longTermGainsHoldings.reduce((sum, h) => sum + h.unrealizedGain, 0);

  const recommendedTrades: LtcgHarvestingPlan["recommendedTrades"] = [];
  let headroomLeft = remainingHeadroom;

  for (const h of longTermGainsHoldings) {
    if (headroomLeft <= 1000) break;

    // Gain percentage in this holding
    const gainPct = h.investedCost > 0 ? h.unrealizedGain / h.investedCost : 0.3;
    const gainPerUnit = h.units > 0 ? h.unrealizedGain / h.units : 0;

    // How much gain can we book from this holding?
    const targetGainToBook = Math.min(headroomLeft, h.unrealizedGain);
    const unitsToRedeem = gainPerUnit > 0 ? Number((targetGainToBook / gainPerUnit).toFixed(3)) : h.units;
    const nav = h.currentNav || (h.units > 0 ? h.currentValue / h.units : 100);
    const redeemAmount = Math.round(unitsToRedeem * nav);
    const gainBooked = Math.round(targetGainToBook);
    const taxSaved = Math.round(gainBooked * 0.125); // 12.5% tax saved permanently

    recommendedTrades.push({
      schemeName: h.schemeName,
      folioNumber: h.folioNumber,
      unitsToRedeem,
      redeemAmount,
      gainBookedTaxFree: gainBooked,
      taxSavedPermanently: taxSaved,
      reinvestmentScheme: h.schemeName, // Re-buy the same scheme or peer to reset acquisition cost
      rationale: `Redeem ₹${redeemAmount.toLocaleString("en-IN")} (${unitsToRedeem} units) to harvest ₹${gainBooked.toLocaleString("en-IN")} of tax-free LTCG under Section 112A. Reinvest same-day to step up NAV base price and save ₹${taxSaved.toLocaleString("en-IN")} permanently on future exit.`,
    });

    headroomLeft -= targetGainToBook;
  }

  const harvestableGain = remainingHeadroom - headroomLeft;

  return {
    annualExemptionLimit: annualLimit,
    utilizedExemptionThisFY,
    remainingExemptionHeadroom: remainingHeadroom,
    totalUnrealizedLtcgAvailable: Math.round(totalUnrealizedLtcg),
    harvestableGain: Math.round(harvestableGain),
    recommendedTrades,
  };
}

/**
 * Generate Schedule CG (Capital Gains) for ITR Filing & Advance Tax
 */
export function generateScheduleCG(
  holdings: TaxHoldingItem[],
  fiscalYear = "2026-2027"
) {
  // Synthesize or map completed and planned transactions for Schedule CG
  const items: CapitalGainsScheduleItem[] = [];
  let totalSTCG = 0;
  let totalLTCG = 0;
  let taxSTCG = 0;
  let taxLTCG = 0;

  holdings.forEach((h) => {
    if (h.unrealizedGain > 0) {
      const isLTCG = h.isLongTerm;
      const isDebt = h.isDebt;
      const rate = isDebt ? 30.0 : isLTCG ? 12.5 : 20.0;
      const section = isDebt ? "50AA" : isLTCG ? "112A" : "111A";

      const gain = h.unrealizedGain;
      if (isLTCG && !isDebt) {
        totalLTCG += gain;
        const taxableGain = Math.max(0, gain - 125000);
        taxLTCG += Math.round(taxableGain * 0.125);
      } else {
        totalSTCG += gain;
        taxSTCG += Math.round(gain * (rate / 100));
      }

      items.push({
        schemeName: h.schemeName,
        assetType: isDebt ? "DEBT" : "EQUITY",
        holdingPeriodType: isLTCG ? "LTCG" : "STCG",
        section,
        saleValue: h.currentValue,
        costValue: h.investedCost,
        gainOrLoss: gain,
        applicableTaxRate: rate,
        estimatedTax: isLTCG ? Math.round(Math.max(0, gain - 125000) * 0.125) : Math.round(gain * (rate / 100)),
      });
    }
  });

  const totalCapitalGainsTax = taxSTCG + taxLTCG;

  // Indian Advance Tax Schedule (15%, 45%, 75%, 100%)
  const advanceTaxSchedule = [
    {
      installment: "1st Installment (15%)",
      dueDate: `15 June ${fiscalYear.split("-")[0]}`,
      percentage: 15,
      amountDue: Math.round(totalCapitalGainsTax * 0.15),
    },
    {
      installment: "2nd Installment (45%)",
      dueDate: `15 September ${fiscalYear.split("-")[0]}`,
      percentage: 45,
      amountDue: Math.round(totalCapitalGainsTax * 0.45),
    },
    {
      installment: "3rd Installment (75%)",
      dueDate: `15 December ${fiscalYear.split("-")[0]}`,
      percentage: 75,
      amountDue: Math.round(totalCapitalGainsTax * 0.75),
    },
    {
      installment: "4th Installment (100%)",
      dueDate: `15 March ${fiscalYear.split("-")[1]}`,
      percentage: 100,
      amountDue: totalCapitalGainsTax,
    },
  ];

  return {
    totalRealizedSTCG: Math.round(totalSTCG),
    totalRealizedLTCG: Math.round(totalLTCG),
    totalRealizedGains: Math.round(totalSTCG + totalLTCG),
    taxOnSTCG: Math.round(taxSTCG),
    taxOnLTCG: Math.round(taxLTCG),
    totalCapitalGainsTax: Math.round(totalCapitalGainsTax),
    items,
    advanceTaxSchedule,
  };
}

