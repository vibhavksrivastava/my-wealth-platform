import { NextResponse, connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAuthHeader } from "@/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id: clientId } = await params;

    // Fetch Client Master Record
    const { data: client, error: clientErr } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();

    if (clientErr || !client) {
      return NextResponse.json({ error: "Client record not found." }, { status: 404 });
    }

    // Fetch Household Details
    let household = null;
    if (client.household_id) {
      const { data: hh } = await supabaseAdmin
        .from("households")
        .select("*")
        .eq("household_id", client.household_id)
        .maybeSingle();
      household = hh;
    }

    // Parallel queries for all client financial balance sheet & portfolio tables
    const [incomeRes, expenseRes, assetRes, liabRes, investRes, snapshotRes] = await Promise.all([
      supabaseAdmin.from("income_sources").select("*").eq("client_id", clientId),
      supabaseAdmin.from("expense_items").select("*").eq("client_id", clientId),
      supabaseAdmin.from("assets").select("*").eq("client_id", clientId),
      supabaseAdmin.from("liabilities").select("*").eq("client_id", clientId),
      supabaseAdmin.from("investment_portfolio").select("*").eq("client_id", clientId),
      supabaseAdmin
        .from("client_dashboard_snapshots")
        .select("*")
        .eq("client_id", clientId)
        .order("snapshot_date", { ascending: false })
        .limit(10),
    ]);

    const income = incomeRes.data || [];
    const expenses = expenseRes.data || [];
    const assets = assetRes.data || [];
    const liabilities = liabRes.data || [];
    const investments = investRes.data || [];
    const snapshots = snapshotRes.data || [];

    // Financial Totals Calculations
    const physicalAssetsTotal = assets.reduce((sum, a) => sum + Number(a.current_market_value || 0), 0);
    const investmentsTotal = investments.reduce((sum, i) => sum + Number(i.current_value || 0), 0);
    const totalInvestedCost = investments.reduce((sum, i) => sum + Number(i.invested_amount || 0), 0);
    const totalUnrealizedGain = investmentsTotal - totalInvestedCost;
    const totalSIPAmount = investments.reduce((sum, i) => sum + Number(i.monthly_sip_amount || 0), 0);

    const totalAssets = physicalAssetsTotal + investmentsTotal;
    const totalLiabilities = liabilities.reduce((sum, l) => sum + Number(l.outstanding_principal || 0), 0);
    const netWorth = totalAssets - totalLiabilities;

    const liquidAssets = assets
      .filter((a) => a.is_liquid)
      .reduce((sum, a) => sum + Number(a.current_market_value || 0), 0);

    const totalMonthlyIncome = income.reduce((sum, inc) => sum + Number(inc.monthly_amount || 0), 0);
    const totalMonthlyLivingExpenses = expenses.reduce((sum, exp) => sum + Number(exp.monthly_amount || 0), 0);
    const totalMonthlyEMIs = liabilities.reduce((sum, lia) => sum + Number(lia.monthly_emi || 0), 0);
    const totalMonthlyOutflow = totalMonthlyLivingExpenses + totalMonthlyEMIs;
    const monthlyNetSurplus = totalMonthlyIncome - totalMonthlyOutflow;
    const savingsRatio = totalMonthlyIncome > 0 ? (monthlyNetSurplus / totalMonthlyIncome) * 100 : 0;
    const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
    const emergencyFundRunwayMonths = totalMonthlyLivingExpenses > 0 ? liquidAssets / totalMonthlyLivingExpenses : 0;

    return NextResponse.json({
      client,
      household,
      summary: {
        totalAssets,
        physicalAssetsTotal,
        investmentsTotal,
        totalInvestedCost,
        totalUnrealizedGain,
        totalSIPAmount,
        totalLiabilities,
        netWorth,
        liquidAssets,
        totalMonthlyIncome,
        totalMonthlyLivingExpenses,
        totalMonthlyEMIs,
        totalMonthlyOutflow,
        monthlyNetSurplus,
        savingsRatio,
        debtToAssetRatio,
        emergencyFundRunwayMonths,
      },
      data: {
        income,
        expenses,
        assets,
        liabilities,
        investments,
        snapshots,
      },
    });
  } catch (error) {
    console.error("Net worth detail API error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching net worth." },
      { status: 500 }
    );
  }
}

