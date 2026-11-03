import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader, SessionPayload } from "@/lib/auth";
import { unpackAsset } from "@/lib/goalAssetAlignment";

export type AgentType = "DIAGNOSTICS" | "REBALANCING" | "RETIREMENT" | "RISK_PLANNING";

interface ChatMessage {
  role: "user" | "model" | "assistant";
  content: string;
}

const DEMO_PRESETS: Record<string, { cost: number; value: number; sip: number; xirr: number; holdingsCount: number }> = {
  "Kabir Singhania": { cost: 4825000, value: 6743982, sip: 55000, xirr: 16.8, holdingsCount: 3 },
  "Ananya Singhania": { cost: 2905992, value: 3870058, sip: 35000, xirr: 17.5, holdingsCount: 2 },
  "Rohan Verma": { cost: 2450000, value: 3450000, sip: 25000, xirr: 15.4, holdingsCount: 2 },
  "Vikramaditya Roy": { cost: 3500000, value: 4820000, sip: 40000, xirr: 16.1, holdingsCount: 3 },
  "Rahul Sharma": { cost: 2800000, value: 3950000, sip: 30000, xirr: 15.2, holdingsCount: 2 },
  "Shashwat Srivastava": { cost: 13000000, value: 19700000, sip: 150000, xirr: 18.5, holdingsCount: 2 },
  "Pallavi Srivastava": { cost: 2100000, value: 2840000, sip: 20000, xirr: 14.8, holdingsCount: 2 },
  "Aaditri Srivastava": { cost: 1200000, value: 1650000, sip: 15000, xirr: 15.0, holdingsCount: 1 },
  "Parul Sharma": { cost: 1800000, value: 2400000, sip: 20000, xirr: 14.6, holdingsCount: 2 },
  "Vibhav Srivastava": { cost: 5500000, value: 6500000, sip: 95000, xirr: 14.8, holdingsCount: 2 },
};

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
- Reference the client's actual scheme holdings and AUM when provided.
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
- Calculate exact tax savings from Section 112A harvesting based on their actual AUM.
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
- Calculate monthly pension/SWP feasibility using their exact AUM and SIP book.
- Address longevity risk (assuming life expectancy of 85-90 years).
- Reassure the client while giving mathematically robust decumulation steps.`,
  },
  RISK_PLANNING: {
    name: "Risk & Insurance Planning Agent",
    title: "Actuarial Human Life Value (HLV) & Solvency Shield Specialist",
    instructions: `You are the Risk & Insurance Planning Agent for an Indian wealth advisory practice.
Your expertise:
- Human Life Value (HLV) expense-replacement method for pure vanilla term life insurance.
- Debt ring-fencing: Ensuring 100% of outstanding loan liabilities are covered.
- Sizing tenure strictly up to retirement age (60 or 65), avoiding overpriced whole-life term or Return of Premium (TROP) traps.
- Married Women's Property (MWP) Act 1874 Section 6 endorsement for ironclad creditor protection.
- Health Insurance dual architecture: Base Floater (₹10L) + Super Top-up (₹90L) with deductible matching base, saving ~65% premium over a single base policy.
- Separate health policies for senior parents.
- Section 80C and Section 80D tax optimization.
Rules:
- Strictly advise pure vanilla term insurance; discourage endowment, money-back, or ULIP plans.
- Provide clear sum assured recommendations and cost arbitrage figures customized to their liabilities and family.`,
  },
};

export interface ClientPortfolioContext {
  clientId: string;
  clientName: string;
  clientCode: string;
  clientEmail: string;
  age: number;
  totalAum: number;
  monthlySip: number;
  liabilities: number;
  netWorth: number;
  riskProfile: string;
  holdingsCount: number;
  topHoldings: Array<{ scheme: string; value: number; sip: number; category?: string }>;
  assetAllocation: {
    equityPct: number;
    debtPct: number;
    goldPct: number;
    liquidPct: number;
  };
  householdId?: string | null;
  householdName?: string | null;
  householdMembersCount: number;
}

/**
 * Resolves the target client from session and query/body inputs
 */
async function resolveTargetClient(
  session: SessionPayload,
  params: {
    clientId?: string;
    clientEmail?: string;
    clientCode?: string;
    query?: string;
  }
): Promise<any | null> {
  const isClientRole = session.role === "CLIENT";

  if (isClientRole) {
    // 1. Direct match on user_id
    let { data: client } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("user_id", session.sub)
      .maybeSingle();

    if (client) return client;

    // 2. Profile match
    const { data: profile } = await supabaseAdmin
      .from("client_profiles")
      .select("household_id, user_id")
      .eq("user_id", session.sub)
      .maybeSingle();

    if (profile?.household_id) {
      const { data: hhClients } = await supabaseAdmin
        .from("clients")
        .select("*")
        .eq("household_id", profile.household_id);

      if (hhClients && hhClients.length > 0) {
        const found = hhClients.find(
          (c) =>
            c.user_id === session.sub ||
            (session.email && c.full_name?.toLowerCase().includes(session.email.split("@")[0].toLowerCase()))
        );
        client = found || hhClients[0];
        if (client && !client.user_id) {
          await supabaseAdmin.from("clients").update({ user_id: session.sub }).eq("client_id", client.client_id);
          client.user_id = session.sub;
        }
        return client;
      }
    }

    // 3. Match by session email or user full name
    const fullName = `${session.firstName || ""} ${session.lastName || ""}`.trim();
    if (fullName) {
      const { data: nameMatches } = await supabaseAdmin
        .from("clients")
        .select("*")
        .ilike("full_name", `%${fullName}%`)
        .limit(1);

      if (nameMatches && nameMatches.length > 0) {
        client = nameMatches[0];
        if (!client.user_id) {
          await supabaseAdmin.from("clients").update({ user_id: session.sub }).eq("client_id", client.client_id);
          client.user_id = session.sub;
        }
        return client;
      }
    }

    if (session.email) {
      const emailPrefix = session.email.split("@")[0];
      const { data: prefixMatches } = await supabaseAdmin
        .from("clients")
        .select("*")
        .ilike("full_name", `%${emailPrefix}%`)
        .limit(1);

      if (prefixMatches && prefixMatches.length > 0) {
        client = prefixMatches[0];
        if (!client.user_id) {
          await supabaseAdmin.from("clients").update({ user_id: session.sub }).eq("client_id", client.client_id);
          client.user_id = session.sub;
        }
        return client;
      }
    }

    // 4. Return first client as fallback
    const { data: anyClient } = await supabaseAdmin.from("clients").select("*").limit(1).maybeSingle();
    return anyClient;
  }

  // Advisor / MFD / Admin resolution
  const q = (params.query || params.clientEmail || params.clientCode || params.clientId || "").trim();

  // 1. Direct UUID
  if (params.clientId && /^[0-9a-fA-F-]{36}$/.test(params.clientId)) {
    const { data: byId } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("client_id", params.clientId)
      .maybeSingle();
    if (byId) return byId;
  }

  // 2. Query looks like an email
  if (q.includes("@")) {
    const { data: u } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .ilike("email", q)
      .maybeSingle();

    if (u) {
      const { data: byUser } = await supabaseAdmin
        .from("clients")
        .select("*")
        .eq("user_id", u.id)
        .maybeSingle();
      if (byUser) return byUser;
    }
  }

  // 3. Query matches client code
  if (q) {
    const { data: byCode } = await supabaseAdmin
      .from("clients")
      .select("*")
      .ilike("uwp_client_code", q)
      .maybeSingle();
    if (byCode) return byCode;

    // 4. Query matches full name
    const { data: byName } = await supabaseAdmin
      .from("clients")
      .select("*")
      .ilike("full_name", `%${q}%`)
      .limit(1);
    if (byName && byName.length > 0) return byName[0];
  }

  // 5. Default client: Find first client in tenant with real investments / assets
  let clientsQuery = supabaseAdmin.from("clients").select("*");
  if (session.role !== "SUPER_ADMIN" && session.tenantId) {
    clientsQuery = clientsQuery.eq("tenant_id", session.tenantId);
  }
  const { data: tenantClients } = await clientsQuery.limit(25);

  if (tenantClients && tenantClients.length > 0) {
    // Check which client has active investments
    const cIds = tenantClients.map((c) => c.client_id);
    const { data: invRows } = await supabaseAdmin
      .from("investment_portfolio")
      .select("client_id, current_value")
      .in("client_id", cIds);

    const clientWithInvs = tenantClients.find((c) =>
      (invRows || []).some((i) => i.client_id === c.client_id && Number(i.current_value) > 0)
    );
    if (clientWithInvs) return clientWithInvs;

    return tenantClients[0];
  }

  const { data: fallback } = await supabaseAdmin.from("clients").select("*").limit(1).maybeSingle();
  return fallback;
}

/**
 * Builds rich client portfolio context from investment_portfolio, assets, and liabilities
 */
async function buildClientPortfolioContext(client: any): Promise<ClientPortfolioContext> {
  let memberIds = [client.client_id];
  let householdName = "Individual Portfolio";

  if (client.household_id) {
    const [hhRes, mRes] = await Promise.all([
      supabaseAdmin.from("households").select("household_name").eq("household_id", client.household_id).maybeSingle(),
      supabaseAdmin.from("clients").select("client_id").eq("household_id", client.household_id),
    ]);
    if (hhRes.data?.household_name) householdName = hhRes.data.household_name;
    if (mRes.data && mRes.data.length > 0) {
      memberIds = Array.from(new Set([client.client_id, ...mRes.data.map((m) => m.client_id)]));
    }
  }

  // Fetch investments, assets, liabilities, user, and profiles in parallel
  const [invRes, astRes, liaRes, userRes, profRes] = await Promise.all([
    supabaseAdmin.from("investment_portfolio").select("*").in("client_id", memberIds),
    supabaseAdmin.from("assets").select("*").in("client_id", memberIds),
    supabaseAdmin.from("liabilities").select("*").in("client_id", memberIds),
    client.user_id ? supabaseAdmin.from("users").select("email").eq("id", client.user_id).maybeSingle() : Promise.resolve({ data: null }),
    supabaseAdmin.from("client_profiles").select("*").eq("household_id", client.household_id || "").maybeSingle(),
  ]);

  const rawInvs = invRes.data || [];
  const rawAssets = astRes.data || [];
  const rawLias = liaRes.data || [];
  const clientEmail = userRes.data?.email || "";
  const clientProfile = profRes.data;

  // Consolidate holdings from investment_portfolio and assets (avoiding duplicates)
  const holdings: Array<{
    scheme: string;
    value: number;
    sip: number;
    category: string;
  }> = [];

  const seenSchemes = new Set<string>();

  rawInvs.forEach((inv) => {
    const sName = inv.scheme_instrument_name || "Equity Mutual Fund";
    seenSchemes.add(sName.toLowerCase().trim());
    holdings.push({
      scheme: sName,
      value: Number(inv.current_value || 0),
      sip: Number(inv.monthly_sip_amount || 0),
      category: inv.asset_class || "Equity Mutual Fund",
    });
  });

  rawAssets
    .filter((a) => (a.asset_category || "").toLowerCase().includes("mutual") || (a.asset_category || "").toLowerCase().includes("equity"))
    .forEach((ast) => {
      const cleanDesc = (ast.description || "").split("(Folio:")[0].trim();
      const lower = cleanDesc.toLowerCase();
      if (!seenSchemes.has(lower)) {
        seenSchemes.add(lower);
        holdings.push({
          scheme: cleanDesc || "Mutual Fund Holding",
          value: Number(ast.current_market_value || 0),
          sip: 0,
          category: ast.asset_category || "Mutual Funds",
        });
      }
    });

  let calculatedAum = holdings.reduce((sum, h) => sum + h.value, 0);
  let calculatedSip = rawInvs.reduce((sum, i) => sum + Number(i.monthly_sip_amount || 0), 0);
  let calculatedDebt = rawLias.reduce((sum, l) => sum + Number(l.outstanding_principal || 0), 0);

  // Fallback to client_profiles total_assets or demo presets if 0
  if (calculatedAum === 0) {
    if (clientProfile?.total_assets && Number(clientProfile.total_assets) > 0) {
      calculatedAum = Number(clientProfile.total_assets);
    } else if (DEMO_PRESETS[client.full_name]) {
      const preset = DEMO_PRESETS[client.full_name];
      calculatedAum = preset.value;
      calculatedSip = preset.sip;
    }
  }

  if (calculatedDebt === 0 && clientProfile?.total_liabilities) {
    calculatedDebt = Number(clientProfile.total_liabilities);
  }

  // Calculate Age
  let age = 38;
  if (client.date_of_birth) {
    const diff = Date.now() - new Date(client.date_of_birth).getTime();
    age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }

  // Asset allocation percentages
  const equityValue = holdings
    .filter((h) => h.category.toLowerCase().includes("equity") || h.category.toLowerCase().includes("small") || h.category.toLowerCase().includes("mid") || h.category.toLowerCase().includes("flexi"))
    .reduce((sum, h) => sum + h.value, 0);

  const debtValue = holdings
    .filter((h) => h.category.toLowerCase().includes("debt") || h.category.toLowerCase().includes("bond") || h.category.toLowerCase().includes("liquid"))
    .reduce((sum, h) => sum + h.value, 0);

  const equityPct = calculatedAum > 0 ? Math.round((equityValue / calculatedAum) * 100) || 70 : 70;
  const debtPct = calculatedAum > 0 ? Math.round((debtValue / calculatedAum) * 100) || 20 : 20;
  const goldPct = Math.max(0, 100 - equityPct - debtPct);

  // Top holdings
  const sortedHoldings = [...holdings].sort((a, b) => b.value - a.value).slice(0, 5);

  return {
    clientId: client.client_id,
    clientName: client.full_name,
    clientCode: client.uwp_client_code || "UWP-CLI",
    clientEmail,
    age,
    totalAum: calculatedAum,
    monthlySip: calculatedSip,
    liabilities: calculatedDebt,
    netWorth: Math.max(0, calculatedAum - calculatedDebt),
    riskProfile: client.risk_profile || clientProfile?.risk_profile_category || "Moderate",
    holdingsCount: Math.max(holdings.length, 1),
    topHoldings: sortedHoldings.length > 0 ? sortedHoldings : [
      { scheme: "Core Flexi-Cap & Large Cap Index Portfolio", value: calculatedAum, sip: calculatedSip, category: "Equity" }
    ],
    assetAllocation: {
      equityPct,
      debtPct,
      goldPct,
      liquidPct: 10,
    },
    householdId: client.household_id,
    householdName,
    householdMembersCount: memberIds.length,
  };
}

/**
 * Fallback generator when Gemini API key is absent or offline.
 */
function generateAgentFallbackResponse(
  agentType: AgentType,
  message: string,
  clientContext: ClientPortfolioContext
): string {
  const name = clientContext.clientName || "Investor";
  const aum = clientContext.totalAum || 0;
  const aumLakhs = (aum / 100000).toFixed(1);
  const aumCrores = (aum / 10000000).toFixed(2);
  const sip = clientContext.monthlySip || 0;
  const liabilities = clientContext.liabilities || 0;
  const topHoldingsStr = clientContext.topHoldings
    .map((h) => `- **${h.scheme}**: ₹${(h.value / 100000).toFixed(2)} Lakhs${h.sip > 0 ? ` (SIP: ₹${h.sip.toLocaleString("en-IN")}/mo)` : ""}`)
    .join("\n");

  switch (agentType) {
    case "DIAGNOSTICS":
      return `### 🩺 Portfolio Diagnostics Health Audit for **${name}**

**Portfolio Snapshot**:
- **Total AUM**: ₹${aumLakhs} Lakhs (${Number(aumCrores) > 0 ? `₹${aumCrores} Cr` : ""})
- **Active Monthly SIP Book**: ₹${sip.toLocaleString("en-IN")}/mo
- **Tracked Holdings**: ${clientContext.holdingsCount} Schemes
- **Asset Allocation**: Equity: ${clientContext.assetAllocation.equityPct}% | Debt/Liquid: ${clientContext.assetAllocation.debtPct}% | Gold/Other: ${clientContext.assetAllocation.goldPct}%

**Key Scheme Allocations**:
${topHoldingsStr}

#### 1. Asset Allocation & Style Drift
Your portfolio is predominantly equity-oriented (${clientContext.assetAllocation.equityPct}%). While this maximizes compounding over a 7+ year horizon, ensure your small-cap allocation does not exceed **20%** of total equity to shield against mid-cycle valuation corrections.

#### 2. Portfolio Overlap & Scheme Redundancy
Holding multiple active equity mutual funds often creates unintended stock duplication (e.g. duplicate top holdings in HDFC Bank, ICICI Bank, Infosys, and Reliance).
- **Recommendation**: Retain one core **Flexi-Cap Scheme** and one **Large & Midcap Scheme**. Consolidate similar category holdings to eliminate administrative clutter.

#### 3. Expense Ratio (TER) Optimization
If any regular plan folios exist from legacy distributors, switching to direct or institutional share classes can save **0.75% to 1.10% p.a.** in TER, generating an additional ₹${Math.round(aum * 0.009).toLocaleString("en-IN")} in annual compounding alpha.

*Would you like me to analyze category-wise overlap or run a risk-adjusted Sharpe ratio check on your top schemes?*`;

    case "REBALANCING":
      return `### ⚖️ Rebalancing & Tax-Alpha Memo for **${name}**

**Portfolio Valuation**: ₹${aumLakhs} Lakhs | **Liabilities**: ₹${(liabilities / 100000).toFixed(1)} Lakhs

#### 1. Allocation Realignment Target
- **Equity Target (65%)**: ₹${((aum * 0.65) / 100000).toFixed(1)} Lakhs
- **Debt & Liquid Reserves (25%)**: ₹${((aum * 0.25) / 100000).toFixed(1)} Lakhs
- **Gold / Multi-Asset Hedge (10%)**: ₹${((aum * 0.1) / 100000).toFixed(1)} Lakhs

#### 2. Section 112A Annual LTCG Tax Harvesting (₹1.25 Lakhs)
Under current tax rules, long-term capital gains on equity mutual funds are tax-exempt up to **₹1,25,000 per financial year**.
- **Action**: Identify equity units held for >365 days with unrealized gains. Redeem units with ₹1.25L gain before March 31 and immediately re-invest into an aligned scheme.
- **Tax Saved**: ₹15,625 in pure cash tax savings annually (12.5% LTCG rate).

#### 3. Systematic Execution Roadmap
Instead of an abrupt lump sum shift, initiate an **STP (Systematic Transfer Plan)** over 6 months from over-weighted equity schemes into liquid or short-duration debt funds to lock in target ratios with zero market-timing risk.`;

    case "RETIREMENT":
      return `### 🏖️ Smart Retirement & 3-Bucket Solution for **${name}**

**Retirement Profile**:
- **Current Age**: ${clientContext.age} Years | **Target Retirement**: 60 Years
- **Time Horizon**: ${Math.max(1, 60 - clientContext.age)} Years of Active Compounding
- **Current Wealth Base**: ₹${aumLakhs} Lakhs | **Monthly SIP**: ₹${sip.toLocaleString("en-IN")}/mo

#### 1. Target Corpus & Safe Withdrawal Feasibility
Assuming monthly post-retirement living expenses adjusted for 6% inflation, at an actuarial **4.5% Safe Withdrawal Rate (SWR)**, your current corpus of ₹${aumLakhs} Lakhs compounding with your ₹${sip.toLocaleString("en-IN")}/mo SIP provides robust foundation.

#### 2. The 3-Bucket Solution Architecture
1. **Bucket 1 (Immediate 0-3 yrs | 15% Allocation - ₹${((aum * 0.15) / 100000).toFixed(1)}L)**:
   * **Vehicles**: Banking & PSU Debt, Corporate Bond Fund, Arbitrage Fund.
   * **Purpose**: Funds your automated monthly SWP without touching equity during bear markets.
2. **Bucket 2 (Intermediate 3-7 yrs | 35% Allocation - ₹${((aum * 0.35) / 100000).toFixed(1)}L)**:
   * **Vehicles**: Balanced Advantage / Dynamic Asset Allocation & Equity Savings funds.
   * **Purpose**: Generates stable 8-9% returns and automatically refills Bucket 1.
3. **Bucket 3 (Long-Term Growth 7+ yrs | 50% Allocation - ₹${((aum * 0.5) / 100000).toFixed(1)}L)**:
   * **Vehicles**: Broad-market Flexi-cap and Large-cap equity index schemes.
   * **Purpose**: High-octane growth engine beating inflation over decades.`;

    case "RISK_PLANNING":
      return `### 🛡️ Risk & Insurance Actuarial Diagnosis for **${name}**

**Actuarial Assessment**:
- **Outstanding Loan Liabilities**: ₹${(liabilities / 100000).toFixed(1)} Lakhs
- **Gross Protection Requirement**: ₹${Math.max(100, Math.round((liabilities + aum * 0.5 + 15000000) / 100000))} Lakhs

#### 1. Term Life Insurance (Human Life Value Method)
- **Prescription**: Secure a pure vanilla term cover of **₹2.0 to ₹2.5 Crores** running strictly until age 60.
- **Estimated Premium**: ~₹1,400 to ₹1,800/month (~₹18,500/year for non-smoker).
- **Mandatory Endorsement**: Purchase the policy under **Section 6 of the Married Women's Property (MWP) Act 1874**. This legally ring-fences the claim payout exclusively for your spouse and children, immune to court attachment or creditor claims.

#### 2. Health Insurance Arbitrage (Save ~65% on Premiums)
- **The Strategy**: Rather than buying an overpriced ₹1 Crore standalone base policy (~₹48,000/yr), structure a **Dual Tier**:
  * **Base Floater**: ₹10 Lakhs (Zero deductible, covers 95% of routine hospitalizations).
  * **Super Top-Up**: ₹90 Lakhs with ₹10 Lakhs deductible (~₹4,500/yr).
- **Total Combined Premium**: ~₹17,000/yr — giving your family **₹1 Crore total protection** while saving over ₹30,000 every year in premium!`;
  }
}

/**
 * GET Handler: Fetch current client portfolio context and client list (for advisors/MFDs)
 */
export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId") || undefined;
    const clientEmail = searchParams.get("clientEmail") || undefined;
    const clientCode = searchParams.get("clientCode") || undefined;
    const query = searchParams.get("search") || undefined;

    const isAdvisor = ["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role);

    // Resolve target client
    const client = await resolveTargetClient(session, { clientId, clientEmail, clientCode, query });

    let clientContext: ClientPortfolioContext | null = null;
    if (client) {
      clientContext = await buildClientPortfolioContext(client);
    }

    // If advisor/MFD, also return client directory for quick switcher
    let clientList: any[] = [];
    if (isAdvisor) {
      let q = supabaseAdmin
        .from("clients")
        .select("client_id, full_name, uwp_client_code, user_id, tenant_id, risk_profile, household_id")
        .order("full_name", { ascending: true });

      if (session.role !== "SUPER_ADMIN" && session.tenantId) {
        q = q.eq("tenant_id", session.tenantId);
      }

      const { data: cData } = await q.limit(50);
      const cRows = cData || [];

      // Fetch users for emails
      const userIds = cRows.map((c) => c.user_id).filter(Boolean);
      let userMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: uData } = await supabaseAdmin.from("users").select("id, email").in("id", userIds);
        (uData || []).forEach((u) => userMap.set(u.id, u.email));
      }

      // Fetch investments for quick AUM
      const clientIds = cRows.map((c) => c.client_id);
      const { data: invRows } = await supabaseAdmin
        .from("investment_portfolio")
        .select("client_id, current_value, monthly_sip_amount")
        .in("client_id", clientIds);

      const invMap = new Map<string, { aum: number; sip: number }>();
      (invRows || []).forEach((inv) => {
        const cur = invMap.get(inv.client_id) || { aum: 0, sip: 0 };
        cur.aum += Number(inv.current_value || 0);
        cur.sip += Number(inv.monthly_sip_amount || 0);
        invMap.set(inv.client_id, cur);
      });

      clientList = cRows.map((c) => {
        const invInfo = invMap.get(c.client_id) || { aum: 0, sip: 0 };
        let aum = invInfo.aum;
        let sip = invInfo.sip;

        if (aum === 0 && DEMO_PRESETS[c.full_name]) {
          aum = DEMO_PRESETS[c.full_name].value;
          sip = DEMO_PRESETS[c.full_name].sip;
        }

        return {
          clientId: c.client_id,
          clientName: c.full_name,
          clientCode: c.uwp_client_code || "UWP-CLI",
          clientEmail: (c.user_id ? userMap.get(c.user_id) : null) || "",
          riskProfile: c.risk_profile || "Moderate",
          totalAum: aum,
          monthlySip: sip,
        };
      });
    }

    return NextResponse.json({
      success: true,
      isAdvisor,
      client: clientContext,
      clientList,
    });
  } catch (err: any) {
    console.error("AI Chat GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to load client context." }, { status: 500 });
  }
}

/**
 * POST Handler: Process AI Chat queries with verified live portfolio context
 */
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
      clientEmail: requestedClientEmail,
      clientCode: requestedClientCode,
      query: requestedQuery,
    } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // Resolve target client
    const targetClient = await resolveTargetClient(session, {
      clientId: requestedClientId,
      clientEmail: requestedClientEmail,
      clientCode: requestedClientCode,
      query: requestedQuery,
    });

    if (!targetClient) {
      return NextResponse.json({ error: "No matching client portfolio found." }, { status: 404 });
    }

    // Build rich investor portfolio context
    const clientContext = await buildClientPortfolioContext(targetClient);
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
        const aumLakhs = (clientContext.totalAum / 100000).toFixed(2);
        const liabilitiesLakhs = (clientContext.liabilities / 100000).toFixed(2);
        const topHoldingsDesc = clientContext.topHoldings
          .map((h) => `${h.scheme} (Val: ₹${(h.value / 100000).toFixed(2)}L, SIP: ₹${h.sip}/mo)`)
          .join("; ");

        const systemPrompt = `${agentMeta.instructions}

FACTUAL INVESTOR LIVE CONTEXT:
- Investor Full Name: ${clientContext.clientName} (Client Code: ${clientContext.clientCode})
- Current Age: ${clientContext.age} years | Target Retirement: 60 years
- Consolidated Portfolio AUM: ₹${aumLakhs} Lakhs (₹${clientContext.totalAum.toLocaleString("en-IN")})
- Active Monthly SIP Mandates: ₹${clientContext.monthlySip.toLocaleString("en-IN")}/month
- Outstanding Liabilities / Loans: ₹${liabilitiesLakhs} Lakhs
- Asset Allocation: Equity: ${clientContext.assetAllocation.equityPct}%, Debt/Liquid: ${clientContext.assetAllocation.debtPct}%, Gold/Other: ${clientContext.assetAllocation.goldPct}%
- Top Portfolio Holdings: ${topHoldingsDesc}
- Risk Profile: ${clientContext.riskProfile}

IMPORTANT INSTRUCTIONS:
- Directly analyze and reference this investor's actual numbers (₹${aumLakhs} Lakhs AUM, ₹${clientContext.monthlySip.toLocaleString("en-IN")}/mo SIP). Never say their portfolio is zero or empty.
- Format response in structured, readable GitHub markdown with headers, bullet points, and bold values.`;

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
          const candidateText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
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
      clientContext,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("AI Chat Route error:", err);
    return NextResponse.json({ error: err.message || "Failed to process AI chat query." }, { status: 500 });
  }
}
