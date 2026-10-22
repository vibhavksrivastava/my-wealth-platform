"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Calendar,
  Layers,
  Repeat,
  Scale,
  Sparkles,
  Search,
  Users,
  User,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Lock,
  Download,
  Clock,
  ArrowRight,
  CheckCircle2,
  X,
  FileText,
  Building,
  RefreshCw,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useFirmBranding } from "@/lib/context/FirmBrandingContext";
import { useFeatureAccess } from "@/lib/useFeatureAccess";

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

export default function MutualFundPortfolioPage() {
  const { terms, isRia } = useFirmBranding();
  const featureAccess = useFeatureAccess("mutual_funds");

  const [scope, setScope] = useState<"HOUSEHOLD" | "INDIVIDUAL">("HOUSEHOLD");
  const [journeyPeriod, setJourneyPeriod] = useState<"1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL">("ALL");
  const [activeTab, setActiveTab] = useState<"holdings" | "transactions" | "sips" | "rebalancing">("holdings");

  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Holding Detail Transaction Drawer Modal State
  const [selectedHolding, setSelectedHolding] = useState<any | null>(null);

  // Filters for Transactions Tab
  const [txnSearch, setTxnSearch] = useState("");
  const [txnTypeFilter, setTxnTypeFilter] = useState("ALL");
  const [txnMemberFilter, setTxnMemberFilter] = useState("ALL");

  // Filter for Holdings Tab
  const [holdingSearch, setHoldingSearch] = useState("");
  const [holdingClassFilter, setHoldingClassFilter] = useState("ALL");

  const fetchPortfolio = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      const res = await fetch(
        `/api/portfolio/mutual-funds?scope=${scope}&period=${journeyPeriod}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load mutual fund portfolio.");
      }

      setPortfolioData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load portfolio.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, [scope, journeyPeriod]);

  // Filtered Holdings
  const filteredHoldings = useMemo(() => {
    if (!portfolioData?.holdings) return [];
    return portfolioData.holdings.filter((h: any) => {
      const matchesSearch =
        h.schemeName.toLowerCase().includes(holdingSearch.toLowerCase()) ||
        h.folioNumber.toLowerCase().includes(holdingSearch.toLowerCase()) ||
        h.clientName.toLowerCase().includes(holdingSearch.toLowerCase());

      const matchesClass =
        holdingClassFilter === "ALL" ||
        h.assetClass.toLowerCase().includes(holdingClassFilter.toLowerCase());

      return matchesSearch && matchesClass;
    });
  }, [portfolioData?.holdings, holdingSearch, holdingClassFilter]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    if (!portfolioData?.transactions) return [];
    return portfolioData.transactions.filter((t: any) => {
      const matchesSearch =
        t.schemeName.toLowerCase().includes(txnSearch.toLowerCase()) ||
        t.folioNumber.toLowerCase().includes(txnSearch.toLowerCase());

      const matchesType =
        txnTypeFilter === "ALL" ||
        t.type.toUpperCase() === txnTypeFilter.toUpperCase();

      const matchesMember =
        txnMemberFilter === "ALL" ||
        t.clientName.toLowerCase() === txnMemberFilter.toLowerCase();

      return matchesSearch && matchesType && matchesMember;
    });
  }, [portfolioData?.transactions, txnSearch, txnTypeFilter, txnMemberFilter]);

  // Transactions specific to the selected holding (for Drawer Modal)
  const holdingTransactions = useMemo(() => {
    if (!selectedHolding || !portfolioData?.transactions) return [];
    return portfolioData.transactions.filter(
      (t: any) =>
        t.folioNumber === selectedHolding.folioNumber ||
        t.schemeName.toLowerCase() === selectedHolding.schemeName.toLowerCase()
    );
  }, [selectedHolding, portfolioData?.transactions]);

  // Feature Guard Check
  if (!featureAccess.isLoading && !featureAccess.allowed) {
    return (
      <div className="p-12 text-center max-w-xl mx-auto space-y-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-2xl mt-12">
        <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Mutual Fund Portfolio Restricted</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          {featureAccess.reason ||
            (featureAccess.blockedBySuperAdmin
              ? "This module is not included in your firm's current platform subscription plan. Please contact your Super Administrator to upgrade your capabilities."
              : "Your Firm Administrator has restricted access to the Mutual Fund Portfolio module for your account role.")}
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard/advisor"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold inline-block transition"
          >
            &larr; Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const metrics = portfolioData?.metrics || {
    purchaseCost: 0,
    currentValue: 0,
    unrealizedGain: 0,
    absReturnPct: 0,
    dayChange: 0,
    dayChangePct: 0,
    xirr: 0,
    totalSipBook: 0,
    holdingsCount: 0,
  };

  const rebalancing = portfolioData?.rebalancing;

  return (
    <div className="space-y-6">
      {/* Top Header & Context Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Wealth Console &bull; Mutual Funds
            </span>
            <span className="text-xs text-slate-400">
              {portfolioData?.clientName ? `${portfolioData.clientName} Portfolio` : "Portfolio Oversight"}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-sky-500" />
            Mutual Fund Portfolio &amp; Folio Ledger
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time valuation, consolidated purchase costs, day change, XIRR returns, and portfolio rebalancing.
          </p>
        </div>

        {/* View Scope (Household vs Individual) & Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-1 shadow-inner">
            <button
              onClick={() => setScope("HOUSEHOLD")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                scope === "HOUSEHOLD"
                  ? "bg-sky-600 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Household View</span>
            </button>
            <button
              onClick={() => setScope("INDIVIDUAL")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                scope === "INDIVIDUAL"
                  ? "bg-sky-600 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>Individual View</span>
            </button>
          </div>

          <button
            onClick={() => fetchPortfolio()}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition shadow-sm"
            title="Refresh Portfolio Data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Top Consolidated Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Current Valuation */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Current Market Value</span>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white">
            {formatINR(metrics.currentValue)}
          </div>
          <div className="text-[11px] font-medium text-emerald-500 flex items-center gap-1">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>+{formatINR(metrics.unrealizedGain)} ({metrics.absReturnPct}%)</span>
          </div>
        </div>

        {/* Card 2: Consolidated Purchase Cost */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Purchase Cost (Invested)</span>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white">
            {formatINR(metrics.purchaseCost)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Across {metrics.holdingsCount} active scheme folios
          </div>
        </div>

        {/* Card 3: Day Change */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Today&apos;s Gain / Day Change</span>
          <div className={`text-xl font-extrabold flex items-center gap-1.5 ${
            metrics.dayChange >= 0 ? "text-emerald-500" : "text-rose-500"
          }`}>
            {metrics.dayChange >= 0 ? "+" : ""}{formatINR(metrics.dayChange)}
          </div>
          <div className={`text-[11px] font-bold flex items-center gap-0.5 ${
            metrics.dayChange >= 0 ? "text-emerald-500" : "text-rose-500"
          }`}>
            {metrics.dayChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            <span>{metrics.dayChange >= 0 ? "+" : ""}{metrics.dayChangePct}% today</span>
          </div>
        </div>

        {/* Card 4: Portfolio XIRR */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Portfolio XIRR</span>
          <div className="text-xl font-extrabold text-purple-400">
            {metrics.xirr}% <span className="text-xs font-normal text-slate-400">p.a.</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Weighted compounding return
          </div>
        </div>

        {/* Card 5: Monthly SIP Book */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Monthly SIPs</span>
          <div className="text-xl font-extrabold text-sky-400">
            {formatINR(metrics.totalSipBook)}<span className="text-xs font-normal text-slate-400">/mo</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Automated monthly inflow
          </div>
        </div>
      </div>

      {/* Portfolio Journey Timeline Selection Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-sky-500" />
              Portfolio Journey &amp; Growth Trajectory
            </h3>
            <p className="text-[11px] text-slate-500">
              Track the historical compounding trajectory from initial cost to current market valuation.
            </p>
          </div>

          {/* Period Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start">
            {(["1M", "3M", "6M", "1Y", "3Y", "5Y", "ALL"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setJourneyPeriod(period)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  journeyPeriod === period
                    ? "bg-sky-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {period === "ALL" ? "Since Inception" : period}
              </button>
            ))}
          </div>
        </div>

        {/* Trajectory Timeline Bar Visualizer */}
        {portfolioData?.trajectory && portfolioData.trajectory.length > 0 && (
          <div className="pt-2">
            <div className="h-28 flex items-end gap-1.5 sm:gap-2 px-1">
              {portfolioData.trajectory.map((point: any, idx: number) => {
                const maxVal = Math.max(...portfolioData.trajectory.map((p: any) => p.marketValue));
                const heightPct = maxVal > 0 ? Math.round((point.marketValue / maxVal) * 100) : 10;
                const costPct = maxVal > 0 ? Math.round((point.investedCost / maxVal) * 100) : 5;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-12 bg-slate-950 border border-slate-700 text-white text-[10px] py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition pointer-events-none z-20 whitespace-nowrap shadow-xl">
                      <div className="font-bold">{point.date}</div>
                      <div>Val: {formatINR(point.marketValue)} | Cost: {formatINR(point.investedCost)}</div>
                    </div>

                    <div className="w-full flex items-end justify-center gap-0.5 h-20">
                      <div
                        className="w-1/2 bg-slate-400 dark:bg-slate-700 rounded-t-sm transition-all duration-300"
                        style={{ height: `${costPct}%` }}
                        title={`Cost: ${formatINR(point.investedCost)}`}
                      />
                      <div
                        className="w-1/2 bg-gradient-to-t from-sky-600 to-emerald-400 rounded-t-sm transition-all duration-300 group-hover:brightness-125"
                        style={{ height: `${heightPct}%` }}
                        title={`Valuation: ${formatINR(point.marketValue)}`}
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 truncate w-full text-center">
                      {idx % 3 === 0 || idx === portfolioData.trajectory.length - 1 ? point.date : ""}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-4 text-[10px] text-slate-500 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-slate-500" />
                <span>Invested Cost</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Current Market Valuation</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Tab Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab("holdings")}
          className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "holdings"
              ? "border-sky-500 text-sky-500"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Holdings ({filteredHoldings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("transactions")}
          className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "transactions"
              ? "border-sky-500 text-sky-500"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Repeat className="h-4 w-4" />
          <span>Transactions Ledger ({portfolioData?.transactions?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("sips")}
          className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "sips"
              ? "border-sky-500 text-sky-500"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>All My SIPs ({portfolioData?.sips?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("rebalancing")}
          className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "rebalancing"
              ? "border-sky-500 text-sky-500"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Scale className="h-4 w-4" />
          <span>Portfolio Rebalancing</span>
          {rebalancing?.shiftsNeeded?.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-400 font-bold">
              {rebalancing.shiftsNeeded.length} Action Needed
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: HOLDINGS LIST WITH DETAIL DRAWER */}
      {/* ========================================================================= */}
      {activeTab === "holdings" && (
        <div className="space-y-4">
          {/* Holdings Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search scheme name, folio number..."
                value={holdingSearch}
                onChange={(e) => setHoldingSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={holdingClassFilter}
                onChange={(e) => setHoldingClassFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">All Categories</option>
                <option value="Large Cap">Large Cap</option>
                <option value="Mid Cap">Mid Cap</option>
                <option value="Flexi Cap">Flexi Cap</option>
                <option value="Debt">Debt &amp; Liquid</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          {/* Holdings Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-bold">Scheme Name &amp; Folio</th>
                    <th className="py-3 px-4 font-bold">Investor</th>
                    <th className="py-3 px-4 font-bold text-right">Units</th>
                    <th className="py-3 px-4 font-bold text-right">Current NAV</th>
                    <th className="py-3 px-4 font-bold text-right">Purchase Cost</th>
                    <th className="py-3 px-4 font-bold text-right">Market Value</th>
                    <th className="py-3 px-4 font-bold text-right">Day Change</th>
                    <th className="py-3 px-4 font-bold text-right">XIRR</th>
                    <th className="py-3 px-4 font-bold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredHoldings.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No mutual fund holdings found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredHoldings.map((h: any) => (
                      <tr
                        key={h.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group cursor-pointer"
                        onClick={() => setSelectedHolding(h)}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white leading-tight">
                            {h.schemeName}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                            <span>Folio: <strong>{h.folioNumber}</strong></span>
                            <span>&bull;</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {h.assetClass}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {h.clientName}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-slate-800 dark:text-slate-200">
                          {Number(h.units).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">₹{h.currentNav}</div>
                          <div className="text-[10px] text-slate-400">Avg: ₹{h.avgNav}</div>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                          {formatINR(h.investedCost)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono">
                          <div className="font-bold text-slate-900 dark:text-white">{formatINR(h.currentValue)}</div>
                          <div className="text-[10px] text-emerald-500 font-semibold">
                            +{formatINR(h.unrealizedGain)}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono">
                          <div className={`font-bold ${h.dayChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                            {h.dayChange >= 0 ? "+" : ""}{formatINR(h.dayChange)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {h.dayChange >= 0 ? "+" : ""}{h.dayChangePct}%
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono">
                          <span className="font-extrabold text-purple-400">
                            {h.xirr}%
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedHolding(h)}
                            className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-600 dark:text-sky-400 font-semibold text-[11px] border border-sky-200 dark:border-sky-800/80 transition"
                          >
                            Transactions
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TRANSACTIONS LEDGER WITH FILTERS */}
      {/* ========================================================================= */}
      {activeTab === "transactions" && (
        <div className="space-y-4">
          {/* Transaction Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-72">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search scheme or folio..."
                value={txnSearch}
                onChange={(e) => setTxnSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <select
                value={txnTypeFilter}
                onChange={(e) => setTxnTypeFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              >
                <option value="ALL">All Transaction Types</option>
                <option value="PURCHASE">Purchase</option>
                <option value="SIP">SIP Installment</option>
                <option value="REDEMPTION">Redemption</option>
                <option value="STP">STP Transfer</option>
                <option value="SWP">SWP Withdrawal</option>
              </select>

              {portfolioData?.householdMembers && portfolioData.householdMembers.length > 0 && (
                <select
                  value={txnMemberFilter}
                  onChange={(e) => setTxnMemberFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="ALL">All Household Members</option>
                  {portfolioData.householdMembers.map((m: any) => (
                    <option key={m.client_id} value={m.full_name}>
                      {m.full_name} ({m.relationship_to_primary || "Primary"})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Transactions Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-bold">Date</th>
                    <th className="py-3 px-4 font-bold">Transaction Type</th>
                    <th className="py-3 px-4 font-bold">Scheme Name &amp; Folio</th>
                    <th className="py-3 px-4 font-bold">Investor</th>
                    <th className="py-3 px-4 font-bold text-right">Units</th>
                    <th className="py-3 px-4 font-bold text-right">NAV</th>
                    <th className="py-3 px-4 font-bold text-right">Amount</th>
                    <th className="py-3 px-4 font-bold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No transactions found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              t.type === "SIP"
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : t.type === "PURCHASE"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : t.type === "REDEMPTION"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                            }`}
                          >
                            {t.type}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white leading-tight">
                            {t.schemeName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            Folio: {t.folioNumber}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {t.clientName}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-slate-800 dark:text-slate-200">
                          {Number(t.units).toFixed(3)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-slate-800 dark:text-slate-200">
                          ₹{Number(t.nav).toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatINR(t.amount)}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ALL MY SIPS */}
      {/* ========================================================================= */}
      {activeTab === "sips" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active SIP Mandates ({portfolioData?.sips?.length || 0})</h3>
              <p className="text-xs text-slate-500">
                Automated monthly investments running across bank mandates and folios.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolioData?.sips?.map((s: any) => (
              <div
                key={s.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {s.status}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-1.5 leading-snug">
                      {s.schemeName}
                    </h4>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Folio: {s.folioNumber}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-extrabold text-sky-400 font-mono">{formatINR(s.amount)}</div>
                    <div className="text-[10px] text-slate-400">/{s.frequency}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">SIP Date</span>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">Day {s.sipDay} of month</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Next Deduction</span>
                    <div className="font-semibold text-purple-400">
                      {s.nextDueDate ? new Date(s.nextDueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Upcoming"}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 uppercase">Mandate Bank</span>
                    <div className="font-semibold text-slate-700 dark:text-slate-300 truncate">{s.mandateBank}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: REBALANCING & ASSET ALLOCATION */}
      {/* ========================================================================= */}
      {activeTab === "rebalancing" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="h-5 w-5 text-sky-500" />
                Portfolio Asset Allocation vs Model Target
              </h3>
              <p className="text-xs text-slate-500">
                Algorithmic rebalancing comparison against target investment risk model (65% Equity, 25% Debt, 10% Hybrid).
              </p>
            </div>

            {/* Allocation Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Equity */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Equity Funds</span>
                  <span className="text-xs font-mono font-bold text-sky-400">{rebalancing?.current?.equity}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-sky-500 h-full rounded-full" style={{ width: `${rebalancing?.current?.equity}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Target: {rebalancing?.target?.equity}%</span>
                  <span className={rebalancing?.deviations?.equity > 0 ? "text-amber-400 font-bold" : "text-slate-400"}>
                    {rebalancing?.deviations?.equity > 0 ? `+${rebalancing.deviations.equity}% Overweight` : "Balanced"}
                  </span>
                </div>
              </div>

              {/* Debt */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Debt &amp; Short Duration</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">{rebalancing?.current?.debt}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${rebalancing?.current?.debt}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Target: {rebalancing?.target?.debt}%</span>
                  <span className={rebalancing?.deviations?.debt < 0 ? "text-amber-400 font-bold" : "text-slate-400"}>
                    {rebalancing?.deviations?.debt < 0 ? `${rebalancing.deviations.debt}% Underweight` : "Balanced"}
                  </span>
                </div>
              </div>

              {/* Hybrid */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Hybrid / Dynamic</span>
                  <span className="text-xs font-mono font-bold text-purple-400">{rebalancing?.current?.hybrid}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${rebalancing?.current?.hybrid}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Target: {rebalancing?.target?.hybrid}%</span>
                  <span className="text-slate-400">
                    Deviation: {rebalancing?.deviations?.hybrid}%
                  </span>
                </div>
              </div>
            </div>

            {/* Rebalancing Recommended Shifts */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Actionable Rebalancing Shift Strategy
              </h4>

              {rebalancing?.shiftsNeeded?.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950">
                  Portfolio is currently in balance with the stated model allocation. No rebalancing shifts needed at this time.
                </div>
              ) : (
                rebalancing.shiftsNeeded.map((shift: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                        <span>{shift.sourceAssetClass}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                        <span>{shift.targetAssetClass}</span>
                      </div>
                      <div className="text-sm font-extrabold text-white font-mono">
                        Shift: {formatINR(shift.recommendedAmount)}
                      </div>
                    </div>
                    <p className="text-xs text-slate-300/90 leading-relaxed">
                      {shift.rational}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL / DRAWER: HOLDING DETAIL TRANSACTIONS */}
      {/* ========================================================================= */}
      {selectedHolding && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Folio Detail &amp; Transactions
                </span>
                <h3 className="text-base font-bold text-white mt-1">{selectedHolding.schemeName}</h3>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Folio: <strong>{selectedHolding.folioNumber}</strong> &bull; Investor: {selectedHolding.clientName}
                </div>
              </div>
              <button
                onClick={() => setSelectedHolding(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Holding KPI snapshot */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Current Value</span>
                <div className="text-sm font-bold text-white mt-0.5">{formatINR(selectedHolding.currentValue)}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Invested Cost</span>
                <div className="text-sm font-bold text-slate-300 mt-0.5">{formatINR(selectedHolding.investedCost)}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Balance Units</span>
                <div className="text-sm font-bold text-slate-300 mt-0.5 font-mono">{Number(selectedHolding.units).toFixed(3)}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Holding XIRR</span>
                <div className="text-sm font-bold text-purple-400 mt-0.5">{selectedHolding.xirr}% p.a.</div>
              </div>
            </div>

            {/* Transaction Ledger for this holding */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Transaction History ({holdingTransactions.length})
              </h4>

              <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase font-bold">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Units</th>
                      <th className="py-2.5 px-3 text-right">NAV</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {holdingTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 font-sans">
                          No past transaction records available for this folio.
                        </td>
                      </tr>
                    ) : (
                      holdingTransactions.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 text-slate-400">
                            {new Date(tx.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-slate-300">
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-300">{Number(tx.units).toFixed(3)}</td>
                          <td className="py-2 px-3 text-right text-slate-300">₹{Number(tx.nav).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-bold text-white">{formatINR(tx.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedHolding(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
