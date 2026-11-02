/**
 * Google Gemini AI Integration for Smart Retirement Diagnostic & Action Plan
 */

import { RetirementDiagnosticResult } from "./retirementEngine";

export interface RetirementAiContext {
  clientId?: string | null;
  clientName: string;
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  isAlreadyRetired: boolean;
  currentMonthlyExpense: number;
  inflatedMonthlyExpenseAtRetirement: number;
  corpusNeededAtRetirement: number;
  totalProjectedCorpus: number;
  currentTotalRetirementCorpus: number;
  shortfallOrSurplus: number;
  isFullyFunded: boolean;
  readinessScorePct: number;
  requiredAdditionalMonthlySip: number;
  sustainableMonthlySpend: number;
  threeBucketPlan: RetirementDiagnosticResult["threeBucketPlan"];
  swpStpStrategy: RetirementDiagnosticResult["swpStpStrategy"];
  holdingsSummary?: Array<{
    schemeName: string;
    assetClass: string;
    currentValue: number;
    suitability: string;
  }>;
  customInstructions?: string;
}

export interface GeminiRetirementResult {
  aiModelUsed: string;
  isSimulatedFallback: boolean;
  analysisTimestamp: string;
  executiveSummary: string;
  longevityRiskDiagnostic: {
    longevityHorizonYears: number;
    inflationErosionWarning: string;
    sequenceOfReturnsRiskMitigation: string;
  };
  threeBucketAllocationGuidance: {
    bucket1CashFlowNote: string;
    bucket2StabilityNote: string;
    bucket3LongevityGrowthNote: string;
  };
  swpDecumulationTaxStrategy: {
    recommendedMonthlySwp: number;
    taxAdvantageOverFd: string;
    section112AGuidance: string;
  };
  fundSelectionVerdict: Array<{
    schemeName: string;
    verdict: "PICK_UP_FOR_SWP" | "CORE_GROWTH_STP" | "AVOID_SWP_REBALANCE";
    bucket: 1 | 2 | 3;
    rationale: string;
  }>;
  actionRoadmap: Array<{
    priority: "HIGH" | "MEDIUM" | "LOW";
    step: string;
    description: string;
    timeline: string;
  }>;
}

/**
 * Generate simulated fallback advisory if Gemini API is unreachable or not configured
 */
function generateFallbackRetirementMemo(context: RetirementAiContext): GeminiRetirementResult {
  const isRet = context.isAlreadyRetired;
  const needCr = (context.corpusNeededAtRetirement / 10000000).toFixed(2);
  const projCr = ((isRet ? context.currentTotalRetirementCorpus : context.totalProjectedCorpus) / 10000000).toFixed(2);
  const swpLakh = (context.swpStpStrategy.recommendedMonthlySwp / 100000).toFixed(2);

  const fundVerdicts = (context.swpStpStrategy.fundRecommendations || []).map((f) => ({
    schemeName: f.schemeName,
    verdict: f.status,
    bucket: f.assignedBucket,
    rationale: f.rationale,
  }));

  return {
    aiModelUsed: "Gemini 1.5 Pro (Institutional Actuarial Simulator)",
    isSimulatedFallback: true,
    analysisTimestamp: new Date().toISOString(),
    executiveSummary: isRet
      ? `Client is currently in the active distribution phase at age ${context.currentAge}. With a current retirement corpus of ₹${projCr} Cr, the recommended sustainable monthly SWP is ₹${swpLakh} Lakh. Implementing a Three-Bucket architecture shields the client from equity down-cycles while generating post-tax inflation alpha.`
      : `Comprehensive diagnostic indicates retirement readiness at ${context.readinessScorePct}%. Current investments (EPF, NPS, and Mutual Funds) are projected to deliver ₹${projCr} Cr against an inflated target corpus of ₹${needCr} Cr. ${
          context.isFullyFunded
            ? "The retirement horizon is fully pre-funded with comfortable longevity margin."
            : `To eliminate the projected gap of ₹${(Math.abs(context.shortfallOrSurplus) / 100000).toFixed(2)} Lakh, a disciplined monthly SIP top-up of ₹${context.requiredAdditionalMonthlySip.toLocaleString("en-IN")} is strongly recommended.`
        }`,
    longevityRiskDiagnostic: {
      longevityHorizonYears: Math.max(1, context.lifeExpectancy - (isRet ? context.currentAge : context.retirementAge)),
      inflationErosionWarning: `At 6.0% annual inflation, current living expenses of ₹${(context.currentMonthlyExpense / 1000).toFixed(1)}k/month will compound significantly over a ${context.lifeExpectancy - (isRet ? context.currentAge : context.retirementAge)}-year retirement window. A 100% fixed-income strategy will suffer acute purchasing power erosion by year 10.`,
      sequenceOfReturnsRiskMitigation:
        "Bucket 1 maintains 3 full years of living expenses in Arbitrage and Liquid funds. Even if equity markets undergo a severe 2008-style drawdown, zero equities will be sold during the crash, completely nullifying sequence-of-returns risk.",
    },
    threeBucketAllocationGuidance: {
      bucket1CashFlowNote: `Allocate ₹${(context.threeBucketPlan.bucket1.targetAmount / 100000).toFixed(2)} L (Years 1-3) into Arbitrage and Liquid instruments. Fuels monthly SWP directly to bank account with zero equity drawdowns.`,
      bucket2StabilityNote: `Allocate ₹${(context.threeBucketPlan.bucket2.targetAmount / 100000).toFixed(2)} L (Years 4-8) into Conservative Hybrid & Banking Debt funds. Generates 7.5-8.0% return to periodically refuel Bucket 1 every 24-36 months.`,
      bucket3LongevityGrowthNote: `Allocate ₹${(context.threeBucketPlan.bucket3.targetAmount / 100000).toFixed(2)} L (Years 9+) into Diversified Flexi-Cap & Index funds. Compounds at 12%+ to ensure long-term wealth outlives life expectancy.`,
    },
    swpDecumulationTaxStrategy: {
      recommendedMonthlySwp: context.swpStpStrategy.recommendedMonthlySwp,
      taxAdvantageOverFd:
        "Traditional FDs tax 100% of interest payout at the client's highest marginal slab (up to 39%). In contrast, SWP redemptions from mutual funds return capital plus gains, where only the capital gain portion is taxable under Section 112A (12.5% LTCG above ₹1.25L exemption), generating over 2.5% annual tax alpha.",
      section112AGuidance:
        "Structure SWP redemptions from Arbitrage and Hybrid funds first to utilize the annual ₹1.25 Lakh tax-free LTCG threshold across financial years.",
    },
    fundSelectionVerdict: fundVerdicts.length > 0 ? fundVerdicts : [
      {
        schemeName: "Arbitrage & Conservative Debt Holdings",
        verdict: "PICK_UP_FOR_SWP",
        bucket: 1,
        rationale: "Negligible volatility; optimal for systematic monthly cash flow credits.",
      },
      {
        schemeName: "Core Large & Flexi-Cap Equity Funds",
        verdict: "CORE_GROWTH_STP",
        bucket: 3,
        rationale: "Compounding engines; utilize quarterly STP to transfer profits into stability bucket.",
      },
      {
        schemeName: "Small-Cap & Sectoral/Thematic Funds",
        verdict: "AVOID_SWP_REBALANCE",
        bucket: 3,
        rationale: "High drawdown risks. Never redeem via SWP during market dips; rebalance systematically.",
      },
    ],
    actionRoadmap: [
      {
        priority: "HIGH",
        step: isRet ? "Establish Bucket 1 Liquidity Cushion" : "Formalize EPF & NPS Contribution Schedule",
        description: isRet
          ? "Ensure 36 months of living expenses are parked in Arbitrage/Liquid funds to commence automated SWP."
          : "Verify monthly EPF and corporate NPS tier 1 deposits are maintained up to target retirement horizon.",
        timeline: "Immediate / Month 1",
      },
      {
        priority: "HIGH",
        step: isRet ? "Configure Automated Monthly SWP" : "Initiate Required Additional SIP Top-Up",
        description: isRet
          ? `Set up a monthly SWP of ₹${context.swpStpStrategy.recommendedMonthlySwp.toLocaleString("en-IN")} credited on the 1st of every month.`
          : `Deploy additional monthly SIP of ₹${context.requiredAdditionalMonthlySip.toLocaleString("en-IN")} in diversified flexi-cap funds.`,
        timeline: "Next 14 Days",
      },
      {
        priority: "MEDIUM",
        step: "Institutional Three-Bucket Rebalancing Review",
        description: "Review bucket replenishment schedule annually with your wealth advisor to lock in equity gains.",
        timeline: "Annual Review",
      },
    ],
  };
}

/**
 * Call Google Gemini AI to generate an advanced personalized retirement memo
 */
export async function generateAiRetirementDiagnostic(
  context: RetirementAiContext,
  overrideApiKey?: string
): Promise<GeminiRetirementResult> {
  const apiKey =
    overrideApiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (apiKey && apiKey.trim().length > 10) {
    const prompt = `
You are an institutional Chief Actuarial Officer and Wealth Planning Specialist at a premier Indian Family Office.
Analyze the following client retirement profile and produce a structured Smart Retirement Diagnostic & Action Plan JSON.

CLIENT RETIREMENT DATA:
- Client Name: ${context.clientName}
- Current Age: ${context.currentAge}
- Retirement Age: ${context.retirementAge} (Status: ${context.isAlreadyRetired ? "ALREADY RETIRED / DECUMULATION" : "PRE-RETIREMENT ACCUMULATION"})
- Life Expectancy: ${context.lifeExpectancy} years
- Current Monthly Living Expense: ₹${context.currentMonthlyExpense.toLocaleString("en-IN")}
- Inflated Monthly Expense at Retirement: ₹${context.inflatedMonthlyExpenseAtRetirement.toLocaleString("en-IN")}
- Target Corpus Needed at Retirement: ₹${(context.corpusNeededAtRetirement / 10000000).toFixed(2)} Cr
- Total Projected Corpus by Current Investments: ₹${(context.totalProjectedCorpus / 10000000).toFixed(2)} Cr
- Current Total Retirement Wealth (EPF + NPS + MFs + Cash): ₹${(context.currentTotalRetirementCorpus / 10000000).toFixed(2)} Cr
- Readiness Score: ${context.readinessScorePct}% (Shortfall/Surplus: ₹${(context.shortfallOrSurplus / 100000).toFixed(2)} L)
- Required Additional Monthly SIP: ₹${context.requiredAdditionalMonthlySip.toLocaleString("en-IN")}
- Sustainable Monthly SWP Capacity: ₹${context.sustainableMonthlySpend.toLocaleString("en-IN")}
- Three Bucket Strategy:
  * Bucket 1 (Y1-Y3 Cashflow): ₹${(context.threeBucketPlan.bucket1.targetAmount / 100000).toFixed(2)} L
  * Bucket 2 (Y4-Y8 Stability): ₹${(context.threeBucketPlan.bucket2.targetAmount / 100000).toFixed(2)} L
  * Bucket 3 (Y9+ Growth): ₹${(context.threeBucketPlan.bucket3.targetAmount / 100000).toFixed(2)} L
- Fund Recommendations from Portfolio:
${JSON.stringify(context.swpStpStrategy.fundRecommendations || [], null, 2)}

${context.customInstructions ? `ADVISOR SPECIFIC INSTRUCTIONS:\n${context.customInstructions}\n` : ""}

REQUIREMENTS:
1. Executive summary evaluating readiness score, gap, and decumulation strategy.
2. Longevity risk diagnostic addressing medical inflation and sequence-of-returns protection.
3. Three-bucket commentary tailored to the client's figures.
4. SWP decumulation tax efficiency memo comparing mutual fund SWP (Section 112A LTCG) vs traditional Bank FD interest slab taxation.
5. Fund selection verdict specifying which current portfolio holdings to pick up for SWP, which to hold for growth, and which to avoid for SWP.
6. Actionable roadmap steps for the client and advisor.

Return ONLY a valid JSON object matching this schema:
{
  "executiveSummary": "string",
  "longevityRiskDiagnostic": {
    "longevityHorizonYears": number,
    "inflationErosionWarning": "string",
    "sequenceOfReturnsRiskMitigation": "string"
  },
  "threeBucketAllocationGuidance": {
    "bucket1CashFlowNote": "string",
    "bucket2StabilityNote": "string",
    "bucket3LongevityGrowthNote": "string"
  },
  "swpDecumulationTaxStrategy": {
    "recommendedMonthlySwp": number,
    "taxAdvantageOverFd": "string",
    "section112AGuidance": "string"
  },
  "fundSelectionVerdict": [
    {
      "schemeName": "string",
      "verdict": "PICK_UP_FOR_SWP" | "CORE_GROWTH_STP" | "AVOID_SWP_REBALANCE",
      "bucket": 1 | 2 | 3,
      "rationale": "string"
    }
  ],
  "actionRoadmap": [
    {
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "step": "string",
      "description": "string",
      "timeline": "string"
    }
  ]
}
`;

    const candidateModels = [
      "gemini-flash-lite-latest",
      "gemini-flash-latest",
      "gemini-3.8-flash",
      "gemini-3.5-flash",
    ];

    for (const model of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          }),
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText) as GeminiRetirementResult;
            parsed.aiModelUsed = `Google Gemini (${model} - Live Cloud)`;
            parsed.isSimulatedFallback = false;
            parsed.analysisTimestamp = new Date().toISOString();
            return parsed;
          }
        }
      } catch (e: any) {
        console.warn(`Gemini Retirement call notice for ${model}:`, e?.message || e);
      }
    }
  }

  return generateFallbackRetirementMemo(context);
}
