import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { generateGeminiRebalancing, ClientPortfolioContext, HoldingDetail } from "@/lib/gemini";
import { createClientSuggestion } from "@/lib/suggestions";

export async function POST(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access. Please log in." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const clientId = body.clientId;
    const advisorInstructions = body.advisorInstructions || body.customInstructions || "";
    const apiKey = body.apiKey;
    const saveToSuggestions = Boolean(body.saveToSuggestions);

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required for Gemini AI Rebalancing." }, { status: 400 });
    }

    // 1. Fetch Client Profile
    const { data: client, error: cErr } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();

    if (cErr || !client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    // 2. Fetch Holdings from investment_portfolio and assets
    const [invRes, astRes, goalsRes] = await Promise.all([
      supabaseAdmin
        .from("investment_portfolio")
        .select("*")
        .eq("client_id", clientId),
      supabaseAdmin
        .from("assets")
        .select("*")
        .eq("client_id", clientId)
        .ilike("asset_category", "%mutual%"),
      supabaseAdmin
        .from("financial_goals")
        .select("goal_title, target_amount, target_year, priority")
        .eq("client_id", clientId),
    ]);

    const holdings: HoldingDetail[] = [];
    (invRes.data || []).forEach((inv) => {
      holdings.push({
        id: inv.investment_id,
        schemeName: inv.scheme_instrument_name || "Mutual Fund Scheme",
        assetClass: inv.asset_class || "Equity Mutual Fund",
        units: Number(inv.units || 0),
        currentNav: Number(inv.current_nav || 0),
        investedCost: Number(inv.invested_amount || Math.round(Number(inv.current_value || 0) * 0.75)),
        currentValue: Number(inv.current_value || 0),
        monthlySip: Number(inv.monthly_sip_amount || 0),
      });
    });

    (astRes.data || []).forEach((ast) => {
      const sName = ast.description?.split("(Folio:")[0].trim() || "Mutual Fund Scheme";
      const already = holdings.some((h) => h.schemeName.toLowerCase() === sName.toLowerCase());
      if (!already) {
        holdings.push({
          id: ast.asset_id,
          schemeName: sName,
          assetClass: "Equity Mutual Fund",
          units: Number(ast.quantity || 0),
          currentNav: 0,
          investedCost: Number(ast.purchase_price || Math.round(Number(ast.current_market_value || 0) * 0.75)),
          currentValue: Number(ast.current_market_value || 0),
          monthlySip: 0,
        });
      }
    });

    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalCost = holdings.reduce((sum, h) => sum + h.investedCost, 0);
    const totalGain = totalValue - totalCost;
    const totalSipBook = holdings.reduce((sum, h) => sum + h.monthlySip, 0);

    // Calculate approximate age
    let age = 42;
    if (client.date_of_birth) {
      const birthYear = new Date(client.date_of_birth).getFullYear();
      if (!isNaN(birthYear)) {
        age = new Date().getFullYear() - birthYear;
      }
    }

    const context: ClientPortfolioContext = {
      clientId,
      clientName: client.full_name || "Client",
      riskProfile: client.risk_profile || "Moderate",
      age,
      planningHorizonYears: client.planning_horizon_years || 6,
      taxRegime: client.tax_regime || "New Tax Regime (Section 115BAC)",
      totalValue,
      totalCost,
      totalGain,
      totalSipBook,
      holdings,
      goals: (goalsRes.data || []).map((g) => ({
        title: g.goal_title,
        targetAmount: Number(g.target_amount || 0),
        targetYear: g.target_year,
        priority: g.priority,
      })),
      advisorInstructions,
    };

    // 3. Generate Gemini AI Rebalancing Plan
    const result = await generateGeminiRebalancing(context, apiKey);

    // 4. Save to Client Suggestions if requested
    let savedSuggestionId: string | null = null;
    if (saveToSuggestions) {
      try {
        const saved = await createClientSuggestion({
          tenantId: client.tenant_id || session.tenantId,
          clientId: client.client_id,
          advisorId: session.sub,
          systemFindings: {
            title: `Gemini AI Portfolio Rebalancing Plan (${new Date().toLocaleDateString("en-IN")})`,
            executiveSummary: result.executiveSummary,
            riskAssessment: result.clientRiskAssessment,
            targetAllocation: result.targetAllocation,
            currentAllocation: result.currentAllocation,
          },
          advisorNotes: advisorInstructions
            ? `Advisor Notes: ${advisorInstructions}\n\nGenerated via Google Gemini AI.`
            : "Generated via Google Gemini AI Mutual Fund Rebalancing Engine.",
          recommendedInvestments: result.actionPlan.map((act) => ({
            action: act.actionType,
            scheme: act.sourceScheme,
            targetScheme: act.targetScheme,
            amount: act.amount,
            priority: act.priority,
            notes: act.rationale,
            taxImpact: act.taxImpact,
          })),
          status: "DRAFT",
        });
        savedSuggestionId = saved.id;
      } catch (saveErr) {
        console.warn("Failed to save to client_suggestions:", saveErr);
      }
    }

    return NextResponse.json({
      success: true,
      clientId,
      clientName: client.full_name,
      rebalancing: result,
      savedSuggestionId,
    });
  } catch (err: any) {
    console.error("Gemini AI Rebalance API Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate Gemini AI rebalancing plan." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access. Please log in." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json({ error: "clientId search parameter is required." }, { status: 400 });
    }

    // Call POST handler internally
    const mockReq = new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify({ clientId }),
    });

    return POST(mockReq);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load rebalancing preview." }, { status: 500 });
  }
}
