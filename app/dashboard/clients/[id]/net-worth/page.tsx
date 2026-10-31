"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { 
  Wallet, 
  Building2, 
  TrendingUp, 
  PieChart, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowLeft, 
  Printer, 
  Calendar, 
  ShieldCheck, 
  User, 
  Layers, 
  Clock, 
  CheckCircle2,
  DollarSign
} from "lucide-react";

function formatINR(val: number) {
  if (isNaN(val)) return "₹0";
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  } else if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)} L`;
  } else {
    return `₹${val.toLocaleString("en-IN")}`;
  }
}

export default function ClientNetWorthPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const clientId = resolvedParams.id;

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"portfolio" | "assets" | "liabilities" | "cashflow">("portfolio");

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    fetch(`/api/clients/${clientId}/net-worth`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [clientId]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-2 text-sm">
          <div className="h-4 w-4 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
          <span>Generating Consolidated Net Worth Sheet...</span>
        </div>
      </div>
    );
  }

  if (!data?.client) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Client Record Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested client record does not exist or you lack authorization to view it.
        </p>
        <Link
          href="/dashboard/advisor"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Return to Advisor Console
        </Link>
      </div>
    );
  }

  const { client, household, summary, data: details } = data;
  const { assets = [], liabilities = [], investments = [], income = [], expenses = [] } = details || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto print:p-0">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <Link
              href="/dashboard/advisor"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-emerald-400" />
              <span>Back to Advisor Dashboard</span>
            </Link>
            <span>&bull;</span>
            <span className="text-slate-400">Clients</span>
            <span>&bull;</span>
            <span className="text-sky-400 font-medium">{client.full_name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {client.full_name}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {client.uwp_client_code}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {client.risk_profile} Risk
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
            <span>Household: <strong className="text-white">{household?.household_name || "Primary Household"}</strong></span>
            <span>&bull;</span>
            <span>Advisor: <strong className="text-white">{client.advisor_name || "Designated RIA"}</strong></span>
            <span>&bull;</span>
            <span>Review: <strong className="text-white">{client.review_frequency}</strong></span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/dashboard/clients/${clientId}/360`}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white shadow-md shadow-sky-600/20 transition"
          >
            <span>Client 360 &deg;</span>
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <Printer className="h-3.5 w-3.5" /> Print Fact-Find Report
          </button>
          <Link
            href="/dashboard/clients/new"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
          >
            + New Fact-Find
          </Link>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Worth */}
        <div className="p-5 rounded-2xl border border-sky-500/30 bg-gradient-to-b from-sky-950/40 to-slate-900/60 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">Total Net Worth</span>
            <Wallet className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {formatINR(summary.netWorth)}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Debt-to-Asset:</span>
            <span className="font-semibold text-white">{summary.debtToAssetRatio.toFixed(1)}%</span>
          </div>
        </div>

        {/* Total Assets */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Total Gross Assets</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {formatINR(summary.totalAssets)}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Portfolio + Tangible:</span>
            <span className="font-semibold text-white">{assets.length + investments.length} items</span>
          </div>
        </div>

        {/* Total Liabilities */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Total Debt Obligations</span>
            <Building2 className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-1">
            {formatINR(summary.totalLiabilities)}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Monthly EMI Load:</span>
            <span className="font-semibold text-rose-300">{formatINR(summary.totalMonthlyEMIs)}/mo</span>
          </div>
        </div>

        {/* Net Monthly Cash Flow */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">Monthly Net Surplus</span>
            <Clock className="h-4 w-4 text-purple-400" />
          </div>
          <div className={`text-2xl font-bold mt-1 ${summary.monthlyNetSurplus >= 0 ? "text-purple-400" : "text-amber-400"}`}>
            {formatINR(summary.monthlyNetSurplus)}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Savings Ratio:</span>
            <span className="font-semibold text-white">{summary.savingsRatio.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Cash Flow Waterfall Banner */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <DollarSign className="h-4 w-4 text-sky-400" />
            Monthly Cash Flow Engine & Liquidity Runway
          </div>
          <span className="text-xs text-slate-400">
            Liquid Runway: <strong className="text-white">{summary.emergencyFundRunwayMonths.toFixed(1)} Months</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400">Gross Monthly Inflow</span>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">
              +{formatINR(summary.totalMonthlyIncome)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400">Living Operating Expenses</span>
            <div className="text-sm font-bold text-rose-400 mt-0.5">
              -{formatINR(summary.totalMonthlyLivingExpenses)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400">Loan EMIs & Debt Service</span>
            <div className="text-sm font-bold text-rose-400 mt-0.5">
              -{formatINR(summary.totalMonthlyEMIs)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400">Net Investible Surplus</span>
            <div className="text-sm font-bold text-sky-400 mt-0.5">
              ={formatINR(summary.monthlyNetSurplus)}
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Section View */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "portfolio"
                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Investment Portfolio ({investments.length})
          </button>
          <button
            onClick={() => setActiveTab("assets")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "assets"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            Balance Sheet Assets ({assets.length})
          </button>
          <button
            onClick={() => setActiveTab("liabilities")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "liabilities"
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <PieChart className="h-3.5 w-3.5" />
            Liabilities & Debt ({liabilities.length})
          </button>
          <button
            onClick={() => setActiveTab("cashflow")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "cashflow"
                ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Wallet className="h-3.5 w-3.5" />
            Income & Expense Details ({income.length + expenses.length})
          </button>
        </div>

        {/* TAB 1: Investment Portfolio */}
        {activeTab === "portfolio" && (
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-400" />
                  Portfolio Allocation & Holdings
                </h3>
                <p className="text-xs text-slate-400">
                  Mutual funds, equities, and systematic investment plans (SIPs).
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span>Invested: <strong className="text-white">{formatINR(summary.totalInvestedCost)}</strong></span>
                <span>Current: <strong className="text-emerald-400">{formatINR(summary.investmentsTotal)}</strong></span>
                <span>Monthly SIP: <strong className="text-purple-400">{formatINR(summary.totalSIPAmount)}</strong></span>
              </div>
            </div>

            {investments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-3">Asset Class / Scheme</th>
                      <th className="py-3 px-3">Invested Principal</th>
                      <th className="py-3 px-3">Current Valuation</th>
                      <th className="py-3 px-3">Unrealized P&L</th>
                      <th className="py-3 px-3">Monthly SIP</th>
                      <th className="py-3 px-3">CAGR Target</th>
                      <th className="py-3 px-3">Goal Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {investments.map((inv: any) => {
                      const gain = Number(inv.current_value) - Number(inv.invested_amount);
                      const gainPct = Number(inv.invested_amount) > 0 ? (gain / Number(inv.invested_amount)) * 100 : 0;

                      return (
                        <tr key={inv.investment_id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 px-3 font-semibold text-white">
                            <div>{inv.scheme_instrument_name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{inv.asset_class}</div>
                          </td>
                          <td className="py-3 px-3">{formatINR(Number(inv.invested_amount))}</td>
                          <td className="py-3 px-3 font-bold text-white">{formatINR(Number(inv.current_value))}</td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center gap-0.5 font-bold ${gain >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {gain >= 0 ? "+" : ""}{formatINR(gain)}
                              <span className="text-[10px] font-normal ml-1">({gainPct.toFixed(1)}%)</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-purple-400 font-semibold">
                            {Number(inv.monthly_sip_amount) > 0 ? `${formatINR(Number(inv.monthly_sip_amount))}/mo` : "—"}
                          </td>
                          <td className="py-3 px-3 text-slate-300 font-mono">
                            {(Number(inv.expected_return_cagr || 0.12) * 100).toFixed(1)}%
                          </td>
                          <td className="py-3 px-3">
                            {inv.goal_purpose ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                {inv.goal_purpose}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
                No investment holdings recorded. Add mutual fund schemes and SIPs during fact-find.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Balance Sheet Assets */}
        {activeTab === "assets" && (
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-400" />
                  Tangible & Fixed Assets
                </h3>
                <p className="text-xs text-slate-400">Real estate properties, gold, deposits, and retirement balances.</p>
              </div>
              <div className="text-xs">
                Total Physical Assets: <strong className="text-emerald-400">{formatINR(summary.physicalAssetsTotal)}</strong>
              </div>
            </div>

            {assets.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-3">Asset Category</th>
                      <th className="py-3 px-3">Description / Asset Detail</th>
                      <th className="py-3 px-3">Registered Owner</th>
                      <th className="py-3 px-3">Current Market Valuation</th>
                      <th className="py-3 px-3">Liquidity Class</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {assets.map((ast: any) => (
                      <tr key={ast.asset_id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-3 font-semibold text-white">{ast.asset_category}</td>
                        <td className="py-3 px-3 text-slate-400">{ast.description || "—"}</td>
                        <td className="py-3 px-3">{ast.owner_name || client.full_name}</td>
                        <td className="py-3 px-3 font-bold text-emerald-400">{formatINR(Number(ast.current_market_value))}</td>
                        <td className="py-3 px-3">
                          {ast.is_liquid ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              Liquid Cash / Deposit
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                              Illiquid / Physical
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
                No tangible assets listed for this household.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Liabilities & Debt */}
        {activeTab === "liabilities" && (
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-rose-400" />
                  Liabilities & Debt Schedule
                </h3>
                <p className="text-xs text-slate-400">Outstanding loans, interest rates, monthly EMIs, and payoff tenures.</p>
              </div>
              <div className="text-xs">
                Total Debt: <strong className="text-rose-400">{formatINR(summary.totalLiabilities)}</strong>
              </div>
            </div>

            {liabilities.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-3">Liability Type</th>
                      <th className="py-3 px-3">Financier / Lender</th>
                      <th className="py-3 px-3">Principal Due</th>
                      <th className="py-3 px-3">Interest Rate</th>
                      <th className="py-3 px-3">Monthly EMI</th>
                      <th className="py-3 px-3">Remaining Tenure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {liabilities.map((lia: any) => (
                      <tr key={lia.liability_id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-3 font-semibold text-white">{lia.liability_type}</td>
                        <td className="py-3 px-3 text-slate-400">{lia.lender_name || "Bank Partner"}</td>
                        <td className="py-3 px-3 font-bold text-rose-400">{formatINR(Number(lia.outstanding_principal))}</td>
                        <td className="py-3 px-3 font-mono">{Number(lia.annual_interest_rate)}%</td>
                        <td className="py-3 px-3 font-semibold text-rose-300">{formatINR(Number(lia.monthly_emi))}/mo</td>
                        <td className="py-3 px-3 text-slate-400">{lia.tenure_remaining_months} Months</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
                Zero debt obligations. The household is completely debt-free!
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Cash Flow Details */}
        {activeTab === "cashflow" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Streams */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
              <h3 className="text-base font-bold text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-400" />
                  Monthly Income Sources
                </span>
                <span className="text-xs font-normal text-emerald-400">+{formatINR(summary.totalMonthlyIncome)}/mo</span>
              </h3>
              <div className="space-y-2">
                {income.map((inc: any) => (
                  <div key={inc.income_id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white">{inc.category}</div>
                      {inc.notes && <div className="text-[10px] text-slate-400">{inc.notes}</div>}
                    </div>
                    <div className="text-emerald-400 font-bold">{formatINR(Number(inc.monthly_amount))}/mo</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Living Expenses */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
              <h3 className="text-base font-bold text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-rose-400" />
                  Operating Living Expenses
                </span>
                <span className="text-xs font-normal text-rose-400">-{formatINR(summary.totalMonthlyLivingExpenses)}/mo</span>
              </h3>
              <div className="space-y-2">
                {expenses.map((exp: any) => (
                  <div key={exp.expense_id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white">{exp.category}</div>
                      <span className="text-[10px] text-slate-500">{exp.is_essential ? "Essential Living" : "Discretionary Lifestyle"}</span>
                    </div>
                    <div className="text-rose-400 font-bold">{formatINR(Number(exp.monthly_amount))}/mo</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Planning Disclosures Footer */}
      {client.planning_disclosures_notes && (
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider block mb-1">
            Advisor Fact-Find Notes & Strategy
          </span>
          <p className="text-slate-400 leading-relaxed">{client.planning_disclosures_notes}</p>
        </div>
      )}
    </div>
  );
}

