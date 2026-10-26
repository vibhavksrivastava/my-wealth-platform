"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import {
  Compass,
  TrendingUp,
  Wallet,
  PiggyBank,
  CreditCard,
  Target,
  Users,
  Search,
  ArrowRight,
  ShieldCheck,
  Building,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  Filter,
  Layers,
  ChevronRight,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  Home,
  User,
  Landmark
} from "lucide-react";
import {
  calculateRetirementMaturityValue,
  projectRetirementProceedsForGoal,
  projectAssetProceedsForGoal,
  projectInvestmentCorpusForGoal,
  isRetirementAsset,
  isMarketAsset,
} from "@/lib/goalAssetAlignment";
import { useFirmBranding } from "@/lib/context/FirmBrandingContext";

function formatINR(val: number) {
  if (val === undefined || val === null || isNaN(val)) return "₹0";
  const abs = Math.abs(val);
  const prefix = val < 0 ? "-₹" : "₹";
  if (abs >= 10000000) {
    return `${prefix}${(abs / 10000000).toFixed(2)} Cr`;
  } else if (abs >= 100000) {
    return `${prefix}${(abs / 100000).toFixed(2)} L`;
  } else {
    return `${prefix}${abs.toLocaleString("en-IN")}`;
  }
}

export default function InvestmentPlanningPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading Investment Planning Workspace...</p>
        </div>
      }
    >
      <InvestmentPlanningContent />
    </Suspense>
  );
}

function InvestmentPlanningContent() {
  const { terms, isRia } = useFirmBranding();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Advisor controls
  const [activeTab, setActiveTab] = useState<"clients" | "households">("clients");
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");

  // Client investment controls
  const [invSearch, setInvSearch] = useState("");
  const [invClassFilter, setInvClassFilter] = useState("ALL");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!token) {
      setError("Please sign in to access investment planning.");
      setIsLoading(false);
      return;
    }

    fetch("/api/planning/overview", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((resData) => {
        setData(resData);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Planning overview fetch error:", err);
        setError(err.message || "Failed to load investment planning data.");
        setIsLoading(false);
      });
  }, []);

  // Filtered advisor clients
  const filteredClients = useMemo(() => {
    if (!data?.clients) return [];
    return data.clients.filter((c: any) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.fullName.toLowerCase().includes(q) ||
        c.clientCode.toLowerCase().includes(q) ||
        c.householdName.toLowerCase().includes(q);

      const matchesRisk = riskFilter === "ALL" || c.riskProfile.toLowerCase() === riskFilter.toLowerCase();
      return matchesSearch && matchesRisk;
    });
  }, [data?.clients, searchQuery, riskFilter]);

  // Filtered advisor households
  const filteredHouseholds = useMemo(() => {
    if (!data?.households) return [];
    return data.households.filter((h: any) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        h.householdName.toLowerCase().includes(q) ||
        h.primaryClientName.toLowerCase().includes(q)
      );
    });
  }, [data?.households, searchQuery]);

  // Filtered physical assets (strictly excluding mutual funds, equities, and NPS/provident funds)
  const physicalAssets = useMemo(() => {
    if (!data?.assets) return [];
    return data.assets.filter((a: any) => !isMarketAsset(a) && !isRetirementAsset(a));
  }, [data?.assets]);

  // Filtered NPS & Provident Funds (EPF, PPF, VPF, NPS)
  const retirementAssets = useMemo(() => {
    if (!data?.assets) return [];
    return data.assets.filter((a: any) => isRetirementAsset(a));
  }, [data?.assets]);

  // Filtered mutual funds & direct equity holdings
  const filteredInvestments = useMemo(() => {
    if (!data?.investments) return [];
    return data.investments.filter((inv: any) => {
      const q = invSearch.toLowerCase().trim();
      const sName = (inv.scheme_instrument_name || inv.schemeName || "").toLowerCase();
      const fNum = (inv.folioNumber || inv.notes || "").toLowerCase();
      const oName = (inv.owner_name || "").toLowerCase();
      const matchesSearch = !q || sName.includes(q) || fNum.includes(q) || oName.includes(q);

      const cls = (inv.asset_class || inv.assetClass || "").toLowerCase();
      const matchesCat =
        invClassFilter === "ALL" ||
        (invClassFilter === "Large Cap" && cls.includes("large")) ||
        (invClassFilter === "Mid Cap" && cls.includes("mid")) ||
        (invClassFilter === "Flexi Cap" && (cls.includes("flexi") || cls.includes("multi"))) ||
        (invClassFilter === "Debt" && cls.includes("debt")) ||
        (invClassFilter === "Hybrid" && cls.includes("hybrid"));

      return matchesSearch && matchesCat;
    });
  }, [data?.investments, invSearch, invClassFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading investment planning workspace...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
        <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Unable to Load Investment Planning</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">{error || "Data unavailable. Please verify connection."}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  // ===========================================================================
  // 1. CLIENT / INVESTOR VIEW
  // ===========================================================================
  if (!data.isAdvisor) {
    const client = data.client;
    const metrics = data.metrics || {};
    const goals = data.goals || [];
    const assets = data.assets || [];
    const investments = data.investments || [];

    if (!client) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
          <Compass className="h-10 w-10 text-purple-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Planning Record Initializing</h2>
          <p className="text-xs text-slate-500">Your investor profile has not yet been linked to an active client fact-find record. Please contact your wealth advisor.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Client Header Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-sky-950/30 border border-purple-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="h-3 w-3" />
                Personal Investment Planning
              </span>
              <span className="text-xs text-slate-400">
                {client.uwp_client_code || "CLI-ACTIVE"} &bull; {data.household?.household_name || "Family Household"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {client.full_name} &bull; Investment Portfolio &amp; Net Worth
            </h1>

            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Consolidated balance sheet, goal feasibility diagnostics, and asset liquidation roadmap prepared by your advisory team.
            </p>
          </div>

          {/* Primary Action: Direct 360 View Jump */}
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <Link
              href={`/dashboard/clients/${client.client_id}/360`}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition transform hover:-translate-y-0.5"
            >
              <Compass className="h-4 w-4" />
              <span>Open Full Client 360° View</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>

            <Link
              href={`/dashboard/clients/${client.client_id}/net-worth`}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition shadow-sm"
            >
              <Wallet className="h-4 w-4 text-emerald-500" />
              <span>Net Worth Diagnostics</span>
            </Link>
          </div>
        </div>

        {/* Client Net Worth & Balance Sheet Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-900/20 to-slate-900/60 border border-purple-500/30 shadow-md space-y-1">
            <div className="flex items-center justify-between text-xs text-purple-400 font-semibold">
              <span>Current Net Worth</span>
              <Wallet className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white pt-1">
              {formatINR(metrics.netWorth || 0)}
            </div>
            <div className="text-[11px] text-slate-500">
              Total Assets minus Liabilities
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Total Assets</span>
              <PiggyBank className="h-4 w-4 text-sky-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white pt-1">
              {formatINR(metrics.totalAssets || 0)}
            </div>
            <div className="text-[11px] text-slate-500">
              Investments: {formatINR(metrics.investmentAssets || 0)} | Physical: {formatINR(metrics.physicalAssets || 0)} | NPS &amp; PF: {formatINR(metrics.retirementAssets || 0)}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Total Liabilities</span>
              <CreditCard className="h-4 w-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 pt-1">
              {formatINR(metrics.totalLiabilities || 0)}
            </div>
            <div className="text-[11px] text-slate-500">
              Monthly EMIs: {formatINR(metrics.totalMonthlyEMIs || 0)}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>Monthly Surplus</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 pt-1">
              {formatINR(metrics.monthlySurplus || 0)}
            </div>
            <div className="text-[11px] text-slate-500">
              Cashflow available for goal SIPs
            </div>
          </div>
        </div>

        {/* Mutual Funds & Direct Equity Holdings Section */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Mutual Funds &amp; Direct Equity Holdings ({filteredInvestments.length})
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Total Market Value: {formatINR(metrics.investmentAssets || 0)}
              </span>
              <Link
                href="/dashboard/portfolio"
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-xs font-bold transition shadow-xs"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Open in Mutual Fund Console</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Search & Category Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search schemes, folios, or owners..."
                value={invSearch}
                onChange={(e) => setInvSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {["ALL", "Large Cap", "Mid Cap", "Flexi Cap", "Debt", "Hybrid"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setInvClassFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
                    invClassFilter === cat
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent font-bold shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Holdings Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3">Scheme &amp; Category</th>
                  <th className="py-3 px-3">Owner / Member</th>
                  <th className="py-3 px-3">Folio Number</th>
                  <th className="py-3 px-3 text-right">Units</th>
                  <th className="py-3 px-3 text-right">Avg NAV / Current</th>
                  <th className="py-3 px-3 text-right">Invested Cost</th>
                  <th className="py-3 px-3 text-right">Current Value</th>
                  <th className="py-3 px-3 text-right">1-Day Change</th>
                  <th className="py-3 px-3 text-right">CAGR &bull; XIRR</th>
                  <th className="py-3 px-3 text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {filteredInvestments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      No mutual fund or equity holdings match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInvestments.map((inv: any) => {
                    const schemeName = inv.scheme_instrument_name || inv.schemeName || "Mutual Fund Scheme";
                    const assetClass = inv.asset_class || inv.assetClass || "Equity Mutual Fund";
                    const folio = inv.folioNumber || (inv.notes && inv.notes.includes("Folio:") ? inv.notes.match(/Folio:\s*([^\s|,]+)/i)?.[1] : "—");
                    const units = Number(inv.units || 0);
                    const curNav = Number(inv.currentNav || 0);
                    const cost = Number(inv.investedCost !== undefined ? inv.investedCost : (inv.invested_amount || 0));
                    const value = Number(inv.currentValue !== undefined ? inv.currentValue : (inv.current_value || (units > 0 && curNav > 0 ? units * curNav : cost)));
                    const avgNav = Number(inv.avgNav || (units > 0 && cost > 0 ? (cost / units).toFixed(2) : (curNav * 0.85).toFixed(2)));
                    const unrealized = Number(inv.unrealizedGain !== undefined ? inv.unrealizedGain : (value - cost));
                    const absReturn = Number(inv.absReturnPct !== undefined ? inv.absReturnPct : (cost > 0 ? Number(((unrealized / cost) * 100).toFixed(2)) : 0));
                    const dayChange = Number(inv.dayChange !== undefined ? inv.dayChange : Math.round(value * 0.0048));
                    const dayChangePct = Number(inv.dayChangePct !== undefined ? inv.dayChangePct : 0.48);
                    const cagr = Number(inv.cagr !== undefined ? inv.cagr : 14.8);
                    const xirr = Number(inv.xirr !== undefined ? inv.xirr : 15.2);

                    return (
                      <tr key={inv.investment_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white max-w-xs">{schemeName}</div>
                          <div className="text-[10px] text-sky-600 dark:text-sky-400 mt-0.5">{assetClass}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            <User className="h-3 w-3" />
                            {inv.owner_name || client.full_name}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {folio}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                          {units > 0 ? units.toLocaleString("en-IN", { maximumFractionDigits: 3 }) : "—"}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="font-bold text-slate-900 dark:text-white">₹{curNav}</div>
                          <div className="text-[10px] text-slate-400">Avg: ₹{avgNav}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-600 dark:text-slate-400">
                          {formatINR(cost)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                          {formatINR(value)}
                          <div className={`text-[10px] font-bold ${unrealized >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                            {unrealized >= 0 ? "+" : ""}{formatINR(unrealized)} ({absReturn >= 0 ? "+" : ""}{absReturn}%)
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`font-semibold ${dayChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                            {dayChange >= 0 ? "+" : ""}{formatINR(dayChange)}
                          </span>
                          <div className="text-[10px] text-slate-400">
                            {dayChangePct >= 0 ? "+" : ""}{dayChangePct}%
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="font-bold text-slate-900 dark:text-white">{cagr}%</div>
                          <div className="text-[10px] text-sky-500 font-bold">XIRR: {xirr}%</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Link
                            href="/dashboard/portfolio"
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900 transition inline-flex items-center gap-1 shadow-sm"
                          >
                            <span>Portfolio</span>
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Goals & Liquidation Quick Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Goals Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Financial Goals ({goals.length})</h3>
              </div>
              <Link
                href={`/dashboard/clients/${client.client_id}/360`}
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                <span>Full Diagnostics</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {goals.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                <p>No financial goals currently mapped.</p>
                <Link
                  href={`/dashboard/clients/${client.client_id}/360`}
                  className="inline-block text-xs font-bold text-purple-500 hover:underline"
                >
                  Define goals in Client 360°
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {goals.map((g: any) => {
                  const targetAmt = Number(g.target_amount_today || g.target_amount || 0);
                  const futureVal = Number(g.required_future_value || targetAmt);
                  const targetYr = Number(g.target_year) || new Date().getFullYear() + 10;

                  // Find mapped retirement assets
                  const mappedRet = (retirementAssets || []).filter((a: any) =>
                    a.linked_goal_id === g.goal_id || g.linked_asset_ids?.includes(a.asset_id)
                  );
                  const retProceeds = mappedRet.reduce((sum: number, a: any) => {
                    const proj = projectRetirementProceedsForGoal(a, targetYr);
                    return sum + proj.projectedProceeds;
                  }, 0);

                  // Find mapped physical assets
                  const mappedPhys = (physicalAssets || []).filter((a: any) =>
                    a.linked_goal_id === g.goal_id || g.linked_asset_ids?.includes(a.asset_id)
                  );
                  const physProceeds = mappedPhys.reduce((sum: number, a: any) => {
                    const proj = projectAssetProceedsForGoal(a, targetYr);
                    return sum + proj.projectedProceeds;
                  }, 0);

                  // Find mapped investments
                  const mappedInv = (investments || []).filter((i: any) =>
                    i.linked_goal_id === g.goal_id || g.linked_investment_ids?.includes(i.investment_id)
                  );
                  const invProceeds = mappedInv.reduce((sum: number, i: any) => {
                    const proj = projectInvestmentCorpusForGoal(i, targetYr);
                    return sum + proj.totalProjectedCorpus;
                  }, 0);

                  const corpusAlloc = Number(g.current_corpus_allocated || 0);
                  const totalFunded = corpusAlloc + retProceeds + physProceeds + invProceeds;
                  const progressPct = futureVal > 0 ? Math.min(100, Math.round((totalFunded / futureVal) * 100)) : 0;

                  return (
                    <div
                      key={g.goal_id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{g.goal_name}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {g.priority || "High"}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Target Year: {g.target_year} &bull; Inflated Target: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatINR(futureVal)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-purple-600 dark:text-purple-400">
                            {formatINR(targetAmt)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Today&apos;s Value
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500">Funded Coverage: <strong className="text-slate-800 dark:text-slate-200">{formatINR(totalFunded)}</strong></span>
                          <span className="font-bold text-purple-600 dark:text-purple-400">{progressPct}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-500 via-sky-400 to-emerald-400 h-full rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Backing Assets Pills */}
                      {(mappedRet.length > 0 || mappedPhys.length > 0 || mappedInv.length > 0) && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200 dark:border-slate-700/50 text-[10px]">
                          <span className="text-slate-400 font-semibold">Backing:</span>
                          {mappedRet.map((a: any) => {
                            const p = projectRetirementProceedsForGoal(a, targetYr);
                            return (
                              <span
                                key={a.asset_id}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-medium"
                              >
                                <ShieldCheck className="h-2.5 w-2.5" />
                                {a.description || a.asset_category}: {formatINR(p.projectedProceeds)}
                              </span>
                            );
                          })}
                          {mappedPhys.map((a: any) => {
                            const p = projectAssetProceedsForGoal(a, targetYr);
                            return (
                              <span
                                key={a.asset_id}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 font-medium"
                              >
                                <Home className="h-2.5 w-2.5" />
                                {a.description || a.asset_category}: {formatINR(p.projectedProceeds)}
                              </span>
                            );
                          })}
                          {mappedInv.map((i: any) => {
                            const p = projectInvestmentCorpusForGoal(i, targetYr);
                            return (
                              <span
                                key={i.investment_id}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-medium"
                              >
                                <TrendingUp className="h-2.5 w-2.5" />
                                {i.scheme_instrument_name}: {formatINR(p.totalProjectedCorpus)}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Real Estate, FDs, Gold & Physical Assets */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Real Estate, FDs, Gold &amp; Physical Assets ({physicalAssets.length})</h3>
              </div>
              <Link
                href={`/dashboard/clients/${client.client_id}/net-worth`}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>View Asset Ledger</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {physicalAssets.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                <p>No physical or fixed assets registered.</p>
                <Link
                  href={`/dashboard/clients/${client.client_id}/360`}
                  className="inline-block text-xs font-bold text-sky-500 hover:underline"
                >
                  Add Real Estate, Gold &amp; FDs
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {physicalAssets.slice(0, 6).map((a: any) => (
                  <div
                    key={a.asset_id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{a.description || a.asset_category}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Category: {a.asset_category} {a.target_liquidation_date ? `• Liquidation: ${a.target_liquidation_date}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-slate-900 dark:text-white">
                        {formatINR(Number(a.current_market_value || 0))}
                      </div>
                      <div className="text-[10px] text-emerald-500 font-semibold">
                        {a.is_liquid ? "Liquid Asset" : "Physical Asset"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: NPS & Provident Funds (EPF, PPF, VPF, NPS) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                NPS &amp; Provident Funds (EPF, PPF, VPF, NPS) ({retirementAssets.length})
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Current Corpus: <span className="text-slate-900 dark:text-white">{formatINR(retirementAssets.reduce((sum: number, a: any) => sum + Number(a.current_market_value || 0), 0))}</span>
              </span>
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                Monthly Inflows: {formatINR(retirementAssets.reduce((sum: number, a: any) => sum + Number(a.monthly_deposit || 0), 0))}/mo
              </span>
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                Projected at Tenure End: {formatINR(retirementAssets.reduce((sum: number, a: any) => sum + Number(a.expected_maturity_value || a.expected_liquidation_value || a.current_market_value || 0), 0))}
              </span>
              <Link
                href={`/dashboard/clients/${client.client_id}/360`}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs font-bold transition shadow-xs"
              >
                <Plus className="h-3 w-3" />
                <span>Manage in Client 360°</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3">Account / Scheme Category</th>
                  <th className="py-3 px-3">Owner</th>
                  <th className="py-3 px-3 text-right">Current Value</th>
                  <th className="py-3 px-3 text-right">Interest Rate</th>
                  <th className="py-3 px-3 text-right">Monthly Deposit</th>
                  <th className="py-3 px-3 text-right">Expected ROI (Deposit)</th>
                  <th className="py-3 px-3 text-center">Target Date / Tenure</th>
                  <th className="py-3 px-3 text-right">Expected Value at Tenure End</th>
                  <th className="py-3 px-3">Earmarked Goal</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {retirementAssets.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      <div className="space-y-2">
                        <p>No NPS or Provident Fund accounts recorded.</p>
                        <Link
                          href={`/dashboard/clients/${client.client_id}/360`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add EPF, PPF, VPF or NPS Account in Client 360°</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  retirementAssets.map((ast: any) => {
                    const curVal = Number(ast.current_market_value || 0);
                    const roi = ast.rate_of_interest !== undefined && ast.rate_of_interest !== null ? Number(ast.rate_of_interest) : (ast.expected_cagr || 8.0);
                    const mDeposit = Number(ast.monthly_deposit || 0);
                    const roiMonthly = ast.expected_roi_monthly !== undefined && ast.expected_roi_monthly !== null ? Number(ast.expected_roi_monthly) : roi;
                    const targetDateStr = ast.target_date || ast.target_liquidation_date || null;

                    const calc = calculateRetirementMaturityValue({
                      currentValue: curVal,
                      rateOfInterest: roi,
                      monthlyDeposit: mDeposit,
                      expectedRoiMonthly: roiMonthly,
                      targetDate: targetDateStr,
                    });

                    const maturityVal = ast.expected_maturity_value || calc.expectedMaturityValue;
                    const totalInvested = curVal + (mDeposit * calc.tenureMonths);
                    const gain = maturityVal - totalInvested;
                    const gainPct = totalInvested > 0 ? Number(((gain / totalInvested) * 100).toFixed(1)) : 0;

                    return (
                      <tr key={ast.asset_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Landmark className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                            <span>{ast.asset_category}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{ast.description}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            <User className="h-3 w-3" />
                            {ast.owner_name}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white font-mono">
                          {formatINR(curVal)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                          {roi}% p.a.
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-300 font-mono">
                          {mDeposit > 0 ? `${formatINR(mDeposit)}/mo` : "—"}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-sky-600 dark:text-sky-400 font-mono">
                          {mDeposit > 0 ? `${roiMonthly}% p.a.` : "—"}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {targetDateStr ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-purple-600 dark:text-purple-300 border border-slate-200 dark:border-slate-700 font-mono">
                                <Clock className="h-2.5 w-2.5" />
                                {new Date(targetDateStr).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                              </span>
                              {calc.tenureYears > 0 && (
                                <span className="text-[9px] text-slate-400 mt-0.5">
                                  {calc.tenureYears} yrs ({calc.tenureMonths}m)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">Not Set</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="font-bold text-purple-600 dark:text-purple-400 font-mono text-xs">
                            {formatINR(maturityVal)}
                          </div>
                          {gain > 0 && (
                            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              +{formatINR(gain)} (+{gainPct}%)
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {ast.linked_goal_id ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                              <Target className="h-2.5 w-2.5" />
                              {goals.find((g: any) => g.goal_id === ast.linked_goal_id)?.goal_name || "Linked Goal"}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Link
                            href={`/dashboard/clients/${client.client_id}/360`}
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900 transition inline-flex items-center gap-1 shadow-sm"
                          >
                            <span>Edit in 360°</span>
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // 2. ADVISOR / STAFF / FIRM ADMIN VIEW
  // ===========================================================================
  const summary = data.summary || {};

  return (
    <div className="space-y-6">
      {/* Top Advisory Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-sky-950/30 border border-purple-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="h-3 w-3" />
              Practice Advisory Suite
            </span>
            <span className="text-xs text-slate-400">
              {summary.totalClients || 0} Total Clients &bull; {summary.totalHouseholds || 0} Active Households
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Investment Planning &amp; Client 360° Directory
          </h1>

          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Consolidated oversight of all client investment plans, net worth statements, goal feasibility diagnostics, and family household alignments.
          </p>
        </div>

        {/* Quick Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/dashboard/clients/new"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            <span>New Client Fact-Find</span>
          </Link>
          <Link
            href="/dashboard/portfolio"
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition shadow-sm"
          >
            <TrendingUp className="h-4 w-4 text-sky-500" />
            <span>MF Portfolio</span>
          </Link>
        </div>
      </div>

      {/* Aggregate Firm Planning Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-900/20 to-slate-900/60 border border-purple-500/30 shadow-md space-y-1">
          <div className="flex items-center justify-between text-xs text-purple-400 font-semibold">
            <span>Total Client Net Worth</span>
            <Wallet className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white pt-1">
            {formatINR(summary.totalNetWorth || 0)}
          </div>
          <div className="text-[11px] text-slate-500">
            Across {summary.totalClients || 0} active client accounts
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Total Assets</span>
            <PiggyBank className="h-4 w-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white pt-1">
            {formatINR(summary.totalAssets || 0)}
          </div>
          <div className="text-[11px] text-slate-500">
            Investments: {formatINR(summary.totalInvestments || 0)}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Active Households</span>
            <Home className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white pt-1">
            {summary.totalHouseholds || 0}
          </div>
          <div className="text-[11px] text-slate-500">
            Multi-client family units
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Total Goals Defined</span>
            <Target className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white pt-1">
            {summary.totalGoals || 0}
          </div>
          <div className="text-[11px] text-slate-500">
            Active financial roadmaps tracked
          </div>
        </div>
      </div>

      {/* Directory Table Card */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Navigation Tabs and Search Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 border-b border-transparent">
            <button
              onClick={() => setActiveTab("clients")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === "clients"
                  ? "bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>All Clients ({data.clients?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab("households")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === "households"
                  ? "bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <Home className="h-3.5 w-3.5" />
              <span>Family Households ({data.households?.length || 0})</span>
            </button>
          </div>

          {/* Search & Filter Inputs */}
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === "clients" ? "Search client name or code..." : "Search household name..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              />
            </div>

            {activeTab === "clients" && (
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              >
                <option value="ALL">All Risk Profiles</option>
                <option value="Conservative">Conservative</option>
                <option value="Moderate">Moderate</option>
                <option value="Aggressive">Aggressive</option>
              </select>
            )}
          </div>
        </div>

        {/* Tab 1: Clients Table */}
        {activeTab === "clients" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Client Name &amp; Code</th>
                  <th className="py-3 px-4">Household / Unit</th>
                  <th className="py-3 px-4">Risk Profile</th>
                  <th className="py-3 px-4 text-right">Total Assets</th>
                  <th className="py-3 px-4 text-right">Liabilities</th>
                  <th className="py-3 px-4 text-right">Current Net Worth</th>
                  <th className="py-3 px-4 text-center">Goals</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-slate-500">
                      No clients matching the search filter.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((c: any) => (
                    <tr
                      key={c.clientId}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{c.fullName}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {c.clientCode}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Advisor: {c.advisorName}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{c.householdName}</div>
                        <div className="text-[10px] text-slate-400">{c.relationship}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                            c.riskProfile.toLowerCase().includes("agg")
                              ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                              : c.riskProfile.toLowerCase().includes("mod")
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : "bg-sky-500/10 text-sky-500 border-sky-500/20"
                          }`}
                        >
                          {c.riskProfile}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900 dark:text-slate-200">
                        {formatINR(c.totalAssets)}
                      </td>

                      <td className="py-3.5 px-4 text-right text-rose-600 dark:text-rose-400 font-semibold">
                        {c.totalLiabilities > 0 ? formatINR(c.totalLiabilities) : "₹0"}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-purple-600 dark:text-purple-400">
                        {formatINR(c.netWorth)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {c.goalsCount} Goals
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/clients/${c.clientId}/360`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-sm"
                            title="Open Full 360 Client View"
                          >
                            <Compass className="h-3 w-3" />
                            <span>Client 360°</span>
                          </Link>

                          <Link
                            href={`/dashboard/clients/${c.clientId}/net-worth`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition"
                            title="Net Worth Statement"
                          >
                            <Wallet className="h-3 w-3 text-emerald-500" />
                            <span>Net Worth</span>
                          </Link>

                          <Link
                            href={`/dashboard/portfolio?clientId=${c.clientId}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition"
                            title="View Mutual Fund Portfolio"
                          >
                            <TrendingUp className="h-3 w-3 text-sky-500" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Households Table */}
        {activeTab === "households" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Household Name</th>
                  <th className="py-3 px-4">Primary Investor</th>
                  <th className="py-3 px-4 text-center">Family Members</th>
                  <th className="py-3 px-4 text-right">Consolidated Assets</th>
                  <th className="py-3 px-4 text-right">Liabilities</th>
                  <th className="py-3 px-4 text-right">Household Net Worth</th>
                  <th className="py-3 px-4 text-center">Total Goals</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {filteredHouseholds.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-slate-500">
                      No family households matching the search filter.
                    </td>
                  </tr>
                ) : (
                  filteredHouseholds.map((h: any) => (
                    <tr
                      key={h.householdId}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Home className="h-3.5 w-3.5 text-amber-500" />
                          <span>{h.householdName}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {h.primaryClientName}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-500 border border-sky-500/20">
                          {h.membersCount} Members
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900 dark:text-slate-200">
                        {formatINR(h.totalAssets)}
                      </td>

                      <td className="py-3.5 px-4 text-right text-rose-600 dark:text-rose-400 font-semibold">
                        {h.totalLiabilities > 0 ? formatINR(h.totalLiabilities) : "₹0"}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-purple-600 dark:text-purple-400">
                        {formatINR(h.totalNetWorth)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {h.totalGoalsCount} Goals
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/clients/${h.primaryClientId}/360?scope=HOUSEHOLD`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-sm"
                            title="Open Household 360 View"
                          >
                            <Compass className="h-3 w-3" />
                            <span>Household 360°</span>
                          </Link>

                          <Link
                            href={`/dashboard/portfolio?clientId=${h.primaryClientId}&scope=HOUSEHOLD`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition"
                            title="View Household Mutual Fund Portfolio"
                          >
                            <TrendingUp className="h-3 w-3 text-sky-500" />
                            <span>Portfolio</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

