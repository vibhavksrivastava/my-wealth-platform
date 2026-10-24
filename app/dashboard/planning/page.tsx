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
  Home
} from "lucide-react";
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
              Investments: {formatINR(metrics.investmentAssets || 0)} | Physical: {formatINR(metrics.physicalAssets || 0)}
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
              <div className="space-y-2.5">
                {goals.map((g: any) => (
                  <div
                    key={g.goal_id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{g.goal_name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Target Year: {g.target_year} &bull; Priority: {g.priority || "Medium"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-purple-600 dark:text-purple-400">
                        {formatINR(Number(g.target_amount || 0))}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Target Value
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Physical Assets & Liquidation Roadmap */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Physical Assets &amp; Liquidation ({assets.length})</h3>
              </div>
              <Link
                href={`/dashboard/clients/${client.client_id}/net-worth`}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>View Asset Ledger</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {assets.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                <p>No physical assets registered.</p>
                <Link
                  href={`/dashboard/clients/${client.client_id}/360`}
                  className="inline-block text-xs font-bold text-sky-500 hover:underline"
                >
                  Add Real Estate, Gold &amp; FDs
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {assets.slice(0, 4).map((a: any) => (
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

