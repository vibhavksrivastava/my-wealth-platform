import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { unpackAsset } from "@/lib/goalAssetAlignment";
import { generateConsolidatedRiskAssessment, RiskEngineInput } from "@/lib/risk/riskEngine";

export type AgentType = "DIAGNOSTICS" | "REBALANCING" | "RETIREMENT" | "RISK_PLANNING";

interface ChatMessage {
  role: "user" | "model" | "assistant";
  content: string;
}

const AGENT_SYSTEM_PROMPTS: Record<AgentType, { name: string; title: string; instructions: string }> = {
  DIAGNOSTICS: {
    name: "Portfolio Diagnostics Agent",
    title: "Chief Investment Strategist & Quantitative Health Auditor",
    instructions: `You are the Portfolio Diagnostics Agent for a premier Indian wealth advisory platform.
Your expertise:
- Mutual fund scheme health (Alpha, Sharpe ratio, Beta, Standard Deviation).
- Portfolio overlap detection across equity schemes (e.g. Parag Parikh Flexi Cap vs Mirae Asset Large & Midcap).
- Category concentration risks (e.g. overexposure to high-valuation Small Caps >25% or sectoral thematic funds).
- AMC concentration risk (preventing excessive exposure to a single fund house).
- Expense ratio drag (comparing Regular vs Direct TER impact over 10-20 years).
Rules:
- Be analytical, crisp, and objective.
- Use Indian Rupee (₹) and Indian numbering (Lakhs, Crores).
- Highlight specific strengths, vulnerabilities, and actionable portfolio health upgrades.`,
  },
  REBALANCING: {
    name: "Rebalancing & Tax-Alpha Agent",
    title: "Asset Allocation Architect & Section 112A Tax Specialist",
    instructions: `You are the Rebalancing & Tax-Alpha Agent for an Indian wealth management firm.
Your expertise:
- Asset allocation drift calculation against target equity/debt/gold proportions.
- Systematic Transfer Plan (STP) and switch recommendations.
- Capital gains tax optimization: Section 112A annual ₹1.25 Lakh LTCG exemption tax-loss/gain harvesting.
- FIFO lot management to avoid triggering STCG (20%) or exit loads.
- Rebalancing discipline: Buy-low-sell-high asset shifts during market extremes.
Rules:
- Provide clear, stepped rebalancing instructions.
- Calculate exact tax savings from Section 112A harvesting.
- If recommending switches, specify the source scheme, destination scheme, and rationale.`,
  },
  RETIREMENT: {
    name: "Smart Retirement Planning Agent",
    title: "Actuarial Retirement Decumulation & 3-Bucket Specialist",
    instructions: `You are the Smart Retirement Planning Agent for an Indian wealth management platform.
Your expertise:
- Future retirement corpus forecasting adjusting for 6.0% Indian inflation.
- Safe Withdrawal Rate (SWR) and Systematic Withdrawal Plan (SWP) sustainability at 4.5% - 5.5% annual withdrawal rate.
- The 3-Bucket Decumulation Solution:
  * Bucket 1 (Immediate 0-3 yrs): Liquid & Ultra-Short Debt for monthly SWP cashflows without equity sequence-of-returns risk.
  * Bucket 2 (Intermediate 3-7 yrs): Balanced Advantage / Multi-Asset Hybrid funds generating stable replenishment.
  * Bucket 3 (Growth 7+ yrs): Large & Flexi-Cap Equity schemes compounding for long-term purchasing power.
- EPF, VPF, PPF, and NPS Tier-1 integration (annuity vs lump sum 60:40 rules).
Rules:
- Calculate monthly pension/SWP feasibility.
- Address longevity risk (assuming life expectancy of 85-90 years).
- Reassure the client while giving mathematically robust decumulation steps.`,
  },
  RISK_PLANNING: {
    name: "Risk & Insurance Planning Agent",
    title: "Actuarial Human Life Value (HLV) & Solvency Shield Specialist",
    instructions: `You are the Risk & Insurance Planning Agent for an Indian wealth advisory practice.
Your expertise:
- Human Life Value (HLV) expense-replacement method for pure vanilla term life insurance.
- Debt ring-fencing: Ensuring 100% of loans (Home loan, business debt) are covered.
- Sizing tenure strictly up to retirement age (60 or 65), avoiding overpriced whole-life term or Return of Premium (TROP) traps.
- Married Women's Property (MWP) Act 1874 Section 6 endorsement for ironclad creditor protection.
- Health Insurance dual architecture: Base Floater (₹10L) + Super Top-up (₹90L) with deductible matching base, saving ~65% premium over a single base policy.
- Separate health policies for senior parents.
- Section 80C and Section 80D tax optimization.
Rules:
- Strictly advise pure vanilla term insurance; discourage endowment, money-back, or ULIP plans.
- Provide clear sum assured recommendations and cost arbitrage figures.`,
  },
};

/**
 * Fallback generator when Gemini API key is absent or offline.
 */
function generateAgentFallbackResponse(
  agentType: AgentType,
  message: string,
  clientContext: any
): string {
  const name = clientContext.clientName || "Investor";
  const aum = clientContext.totalAum || 0;
  const aumLakhs = (aum / 100000).toFixed(1);
  const aumCrores = (aum / 10000000).toFixed(2);
  const sip = clientContext.monthlySip || 0;
  const liabilities = clientContext.liabilities || 0;

  switch (agentType) {
    case "DIAGNOSTICS":
      return `### 🩺 Portfolio Diagnostics Health Audit for **${name}**

**Portfolio Snapshot**:
- **Total AUM**: ₹${aumLakhs} Lakhs (${Number(aumCrores) > 0 ? `₹${aumCrores} Cr` : ""})
- **Active Monthly SIP Book**: ₹${sip.toLocaleString("en-IN")}/mo
- **Tracked Holdings**: ${clientContext.holdingsCount || 5} Schemes

#### 1. Asset Allocation & Style Drift
Your portfolio is predominantly equity-oriented. While this maximizes compounding over a 7+ year horizon, ensure your small-cap allocation does not exceed **20%** of total equity to shield against mid-cycle valuation corrections.

#### 2. Portfolio Overlap & Scheme Redundancy
Holding more than 5-6 active equity mutual funds creates unintended stock duplication (e.g. duplicate top holdings in HDFC Bank, ICICI Bank, Infosys, and Reliance).
- **Recommendation**: Retain one core **Flexi-Cap Scheme** (e.g., Parag Parikh or HDFC Flexi Cap) and one **Large & Midcap Scheme**. Consolidate similar category holdings to eliminate administrative clutter.

#### 3. Expense Ratio (TER) Optimization
If any regular plan folios exist from legacy distributors, switching to direct or institutional share classes can save **0.75% to 1.10% p.a.** in TER, generating an additional ₹${Math.round(aum * 0.009).toLocaleString("en-IN")} in annual compounding alpha.

*Would you like me to analyze category-wise overlap or run a risk-adjusted Sharpe ratio check on your top schemes?*`;

    case "REBALANCING":
      return `### ⚖️ Rebalancing & Tax-Alpha Memo for **${name}**

**Portfolio Valuation**: ₹${aumLakhs} Lakhs | **Liabilities**: ₹${(liabilities / 100000).toFixed(1)} Lakhs

#### 1. Allocation Realignment Target
- **Equity Target**: 65% (₹${((aum * 0.65) / 100000).toFixed(1)} Lakhs)
- **Debt & Liquid Reserves**: 25% (₹${((aum * 0.25) / 100000).toFixed(1)} Lakhs)
- **Gold / Multi-Asset Hedge**: 10% (₹${((aum * 0.1) / 100000).toFixed(1)} Lakhs)

#### 2. Section 112A Annual LTCG Tax Harvesting (₹1.25 Lakhs)
Under the new Union Budget tax rules, long-term capital gains on equity mutual funds are tax-exempt up to **₹1,25,000 per financial year**.
- **Action**: Identify equity units held for >365 days with unrealized gains. Redeem units with ₹1.25L gain before March 31 and immediately re-invest into an aligned scheme.
- **Tax Saved**: ₹15,625 in pure cash tax savings annually (12.5% LTCG rate).

#### 3. Systematic Execution Roadmap
Instead of an abrupt lump sum shift, initiate an **STP (Systematic Transfer Plan)** over 6 months from over-weighted equity schemes into liquid or short-duration debt funds to lock in target ratios with zero market-timing risk.`;

    case "RETIREMENT":
      return `### 🏖️ Smart Retirement & 3-Bucket Solution for **${name}**

**Retirement Profile**:
- **Current Age**: ${clientContext.age || 38} Years | **Target Retirement**: 60 Years
- **Time Horizon**: ${60 - (clientContext.age || 38)} Years of Active Compounding
- **Current Wealth Base**: ₹${aumLakhs} Lakhs

#### 1. Target Corpus & Safe Withdrawal Feasibility
Assuming monthly post-retirement living expenses of ₹1.25 Lakhs adjusted for 6% inflation, your target retirement corpus is approximately **₹4.85 Crores**. 
At an actuarial **4.5% Safe Withdrawal Rate (SWR)**, this delivers a sustainable monthly inflation-indexed pension of ₹1.8 Lakhs/month for 30 years without capital depletion.

#### 2. The 3-Bucket Solution Architecture
1. **Bucket 1 (Immediate 0-3 yrs | 15% Allocation)**:
   * **Vehicles**: Banking & PSU Debt, Corporate Bond Fund, Arbitrage Fund.
   * **Purpose**: Funds your automated monthly SWP without touching equity during bear markets.
2. **Bucket 2 (Intermediate 3-7 yrs | 35% Allocation)**:
   * **Vehicles**: Balanced Advantage / Dynamic Asset Allocation & Equity Savings funds.
   * **Purpose**: Generates stable 8-9% returns and automatically refills Bucket 1.
3. **Bucket 3 (Long-Term Growth 7+ yrs | 50% Allocation)**:
   * **Vehicles**: Broad-market Flexi-cap and Large-cap equity index schemes.
   * **Purpose**: High-octane growth engine beating inflation over decades.`;

    case "RISK_PLANNING":
      return `### 🛡️ Risk & Insurance Actuarial Diagnosis for **${name}**

**Actuarial Assessment**:
- **Outstanding Loan Liabilities**: ₹${(liabilities / 100000).toFixed(1)} Lakhs
- **Gross Protection Requirement**: ₹${((liabilities + aum * 0.5 + 15000000) / 100000).toFixed(0)} Lakhs
- **Protection Gap Status**: Active Coverage Audit Required

#### 1. Term Life Insurance (Human Life Value Method)
- **Prescription**: Secure a pure vanilla term cover of **₹2.0 to ₹2.5 Crores** running strictly until age 60.
- **Estimated Premium**: ~₹1,400 to ₹1,800/month (~₹18,500/year for non-smoker male).
- **Mandatory Endorsement**: Purchase the policy under **Section 6 of the Married Women's Property (MWP) Act 1874**. This legally ring-fences the claim payout exclusively for your spouse and children, immune to court attachment or creditor claims.

#### 2. Health Insurance Arbitrage (Save ~65% on Premiums)
- **The Strategy**: Rather than buying an overpriced ₹1 Crore standalone base policy (~₹48,000/yr), structure a **Dual Tier**:
  * **Base Floater**: ₹10 Lakhs (Zero deductible, covers 95% of routine hospitalizations).
  * **Super Top-Up**: ₹90 Lakhs with ₹10 Lakhs deductible (~₹4,500/yr).
- **Total Combined Premium**: ~₹17,000/yr — giving your family **₹1 Crore total protection** while saving over ₹30,000 every year in premium!`;
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await req.json();
    const {
      agentType = "DIAGNOSTICS",
      message = "",
      history = [],
      clientId: requestedClientId,
    } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // Determine target client
    let targetClientId = requestedClientId;
    if (!targetClientId || session.role === "CLIENT") {
      // Find client linked to user
      const { data: uClient } = await supabaseAdmin
        .from("clients")
        .select("client_id, full_name, date_of_birth, total_assets, total_liabilities")
        .eq("user_id", session.sub)
        .maybeSingle();

      if (uClient) {
        targetClientId = uClient.client_id;
      } else {
        const { data: anyClient } = await supabaseAdmin
          .from("clients")
          .select("client_id, full_name, date_of_birth, total_assets, total_liabilities")
          .limit(1)
          .maybeSingle();
        targetClientId = anyClient?.client_id;
      }
    }

    // Fetch client context
    let clientData: any = null;
    let portfolioInvestments: any[] = [];
    let liabilities: any[] = [];

    if (targetClientId) {
      const [cRes, invRes, liaRes] = await Promise.all([
        supabaseAdmin.from("clients").select("*").eq("client_id", targetClientId).maybeSingle(),
        supabaseAdmin.from("investment_portfolio").select("*").eq("client_id", targetClientId),
        supabaseAdmin.from("liabilities").select("*").eq("client_id", targetClientId),
      ]);
      clientData = cRes.data;
      portfolioInvestments = invRes.data || [];
      liabilities = liaRes.data || [];
    }

    const totalAum = portfolioInvestments.reduce((sum, i) => sum + Number(i.current_value || 0), 0);
    const totalSip = portfolioInvestments.reduce((sum, i) => sum + Number(i.monthly_sip_amount || 0), 0);
    const totalDebt = liabilities.reduce((sum, l) => sum + Number(l.outstanding_principal || 0), 0);

    let clientAge = 38;
    if (clientData?.date_of_birth) {
      const diff = Date.now() - new Date(clientData.date_of_birth).getTime();
      clientAge = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    }

    const clientContext = {
      clientName: clientData?.full_name || "Client",
      age: clientAge,
      totalAum,
      monthlySip: totalSip,
      liabilities: totalDebt,
      holdingsCount: portfolioInvestments.length,
      topHoldings: portfolioInvestments.slice(0, 5).map((h) => ({
        scheme: h.scheme_name,
        value: Number(h.current_value || 0),
        sip: Number(h.monthly_sip_amount || 0),
      })),
    };

    const agentMeta = AGENT_SYSTEM_PROMPTS[agentType as AgentType] || AGENT_SYSTEM_PROMPTS.DIAGNOSTICS;

    // Call Gemini API if available
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    let replyText = "";
    let isAiGenerated = false;

    if (apiKey) {
      try {
        const systemPrompt = `${agentMeta.instructions}

FACTUAL INVESTOR CONTEXT:
- Investor Full Name: ${clientContext.clientName}
- Current Age: ${clientContext.age} years
- Consolidated Portfolio AUM: ₹${(clientContext.totalAum / 100000).toFixed(2)} Lakhs
- Active Monthly SIP Mandates: ₹${clientContext.monthlySip.toLocaleString("en-IN")}/month
- Outstanding Liabilities / Loans: ₹${(clientContext.liabilities / 100000).toFixed(2)} Lakhs
- Top Mutual Fund Holdings: ${JSON.stringify(clientContext.topHoldings)}

Respond directly to the investor's query in structured GitHub markdown. Highlight actionable advice, mathematical justification, and clear takeaways.`;

        const contents = [
          { role: "user", parts: [{ text: systemPrompt }] },
          ...history.slice(-6).map((h: any) => ({
            role: h.role === "assistant" || h.role === "model" ? "model" : "user",
            parts: [{ text: h.content }],
          })),
          { role: "user", parts: [{ text: message }] },
        ];

        const model = "gemini-2.5-flash";
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const geminiRes = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.35,
              maxOutputTokens: 2048,
            },
          }),
        });

        if (geminiRes.ok) {
          const geminiJson = await geminiRes.json();
          const candidateText =
            geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            replyText = candidateText;
            isAiGenerated = true;
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini chat fetch failed, using actuarial fallback:", geminiErr);
      }
    }

    if (!replyText) {
      replyText = generateAgentFallbackResponse(agentType as AgentType, message, clientContext);
    }

    return NextResponse.json({
      success: true,
      agentType,
      agentName: agentMeta.name,
      agentTitle: agentMeta.title,
      isAiGenerated,
      reply: replyText,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("AI Chat Route error:", err);
    return NextResponse.json({ error: err.message || "Failed to process AI chat query." }, { status: 500 });
  }
}
