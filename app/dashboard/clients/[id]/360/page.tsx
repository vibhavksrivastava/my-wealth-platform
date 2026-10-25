"use client";

import { use, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  TrendingUp,
  DollarSign,
  ShieldAlert,
  Wallet,
  PiggyBank,
  CreditCard,
  Target,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Home,
  Briefcase,
  ChevronRight,
  PieChart,
  Layers,
  Sparkles,
  Info,
  Clock,
  X,
  UserPlus,
  Check,
  User,
  Search,
  ExternalLink,
} from "lucide-react";
import SuggestionsTab from "./SuggestionsTab";
import {
  projectAssetProceedsForGoal,
  projectInvestmentCorpusForGoal,
  calculateRequiredMonthlySIP,
  getDefaultAssetCagr,
} from "@/lib/goalAssetAlignment";

interface Client360Data {
  client: any;
  household: any;
  householdMembers: any[];
  incomes: any[];
  expenses: any[];
  assets: any[];
  liabilities: any[];
  investments: any[];
  goals: any[];
  consolidatedMetrics: {
    totalAssets: number;
    physicalAssets: number;
    investmentAssets: number;
    liquidAssets: number;
    illiquidAssets: number;
    totalLiabilities: number;
    netWorth: number;
    totalMonthlyIncome: number;
    totalMonthlyExpenses: number;
    totalMonthlyEMIs: number;
    monthlyOutflows: number;
    monthlySurplus: number;
    savingsRate: number;
    debtToAssetRatio: number;
    monthlySIPBook: number;
  };
  individualMetrics: {
    totalAssets: number;
    physicalAssets: number;
    investmentAssets: number;
    liquidAssets: number;
    illiquidAssets: number;
    totalLiabilities: number;
    netWorth: number;
    totalMonthlyIncome: number;
    totalMonthlyExpenses: number;
    totalMonthlyEMIs: number;
    monthlyOutflows: number;
    monthlySurplus: number;
    savingsRate: number;
    debtToAssetRatio: number;
    monthlySIPBook: number;
  };
}

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

export default function Client360Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const clientId = resolvedParams.id;

  const [data, setData] = useState<Client360Data | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Active Tab: overview | cashflow | assets | liabilities | goals | suggestions
  const [activeTab, setActiveTab] = useState<"overview" | "cashflow" | "assets" | "liabilities" | "goals" | "suggestions">("overview");
  const [suggestionsCount, setSuggestionsCount] = useState<number>(0);
  const [currentUserRole, setCurrentUserRole] = useState<string>("ADVISOR");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user_profile");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.role) setCurrentUserRole(u.role);
      }
    } catch {}
  }, []);

  // Household Consolidated vs Individual Mode
  const [viewScope, setViewScope] = useState<"HOUSEHOLD" | "INDIVIDUAL">("HOUSEHOLD");

  // Modals state
  const [modalType, setModalType] = useState<
    "EDIT_PROFILE" | "ADD_MEMBER" | "RENAME_HOUSEHOLD" |
    "INCOME" | "EXPENSE" | "ASSET" | "INVESTMENT" | "LIABILITY" | "GOAL" | null
  >(null);
  const [modalItem, setModalItem] = useState<any>(null); // for edit mode
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetch360Data = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/clients/${clientId}/360`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load Client 360 profile.");
      }

      const json = await res.json();
      setData(json);

      // Concurrently fetch suggestions count
      fetch(`/api/clients/${clientId}/suggestions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((j) => {
          if (j.suggestions) setSuggestionsCount(j.suggestions.length);
        })
        .catch(() => {});
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetch360Data();
  }, [clientId]);

  // Derived metrics based on ViewScope
  const activeMetrics = useMemo(() => {
    if (!data) return null;
    return viewScope === "HOUSEHOLD" ? data.consolidatedMetrics : data.individualMetrics;
  }, [data, viewScope]);

  // Filtered items based on ViewScope
  const visibleIncomes = useMemo(() => {
    if (!data) return [];
    return viewScope === "HOUSEHOLD" ? data.incomes : data.incomes.filter((i) => i.client_id === clientId);
  }, [data, viewScope, clientId]);

  const visibleExpenses = useMemo(() => {
    if (!data) return [];
    return viewScope === "HOUSEHOLD" ? data.expenses : data.expenses.filter((e) => e.client_id === clientId);
  }, [data, viewScope, clientId]);

  const [invSearch, setInvSearch] = useState("");
  const [invClassFilter, setInvClassFilter] = useState("ALL");

  const visibleAssets = useMemo(() => {
    if (!data) return [];
    const list = viewScope === "HOUSEHOLD" ? data.assets : data.assets.filter((a) => a.client_id === clientId);
    return list.filter((a: any) => {
      const cat = (a.asset_category || "").toLowerCase();
      const desc = (a.description || "").toLowerCase();
      const notes = (a.notes || "").toLowerCase();
      return !(
        cat.includes("mutual") ||
        cat.includes("fund") ||
        cat.includes("equity") ||
        cat.includes("stock") ||
        cat.includes("share") ||
        desc.includes("(folio:") ||
        desc.includes("fund") ||
        notes.includes("imported via cams") ||
        notes.includes("isin:")
      );
    });
  }, [data, viewScope, clientId]);

  const visibleInvestments = useMemo(() => {
    if (!data) return [];
    return viewScope === "HOUSEHOLD" ? data.investments : data.investments.filter((i) => i.client_id === clientId);
  }, [data, viewScope, clientId]);

  const filteredInvestments = useMemo(() => {
    return visibleInvestments.filter((inv: any) => {
      const q = invSearch.toLowerCase();
      const sName = (inv.scheme_instrument_name || inv.schemeName || "").toLowerCase();
      const fNum = (inv.folioNumber || inv.notes || "").toLowerCase();
      const oName = (inv.owner_name || "").toLowerCase();
      const matchesSearch = !q || sName.includes(q) || fNum.includes(q) || oName.includes(q);

      const cls = (inv.asset_class || inv.assetClass || "").toLowerCase();
      const matchesClass =
        invClassFilter === "ALL" ||
        cls.includes(invClassFilter.toLowerCase()) ||
        sName.includes(invClassFilter.toLowerCase());

      return matchesSearch && matchesClass;
    });
  }, [visibleInvestments, invSearch, invClassFilter]);

  const visibleLiabilities = useMemo(() => {
    if (!data) return [];
    return viewScope === "HOUSEHOLD" ? data.liabilities : data.liabilities.filter((l) => l.client_id === clientId);
  }, [data, viewScope, clientId]);

  const visibleGoals = useMemo(() => {
    if (!data) return [];
    return viewScope === "HOUSEHOLD" ? data.goals : data.goals.filter((g) => g.client_id === clientId);
  }, [data, viewScope, clientId]);

  // Generic Sub-Entity Delete Handler
  const handleDeleteItem = async (entityType: "incomes" | "expenses" | "assets" | "liabilities" | "investments" | "goals", idParamName: string, idVal: string) => {
    if (!confirm("Are you sure you want to delete this record? This action will be recorded in compliance audit logs.")) return;

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/clients/${clientId}/${entityType}?${idParamName}=${idVal}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Delete failed.");

      showToast("Record deleted successfully.");
      fetch360Data();
    } catch (err: any) {
      showToast(err.message || "Failed to delete record.", "error");
    }
  };

  if (isLoading && !data) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 text-sky-400 animate-spin" />
        <span className="text-sm font-semibold text-slate-300">Loading Client 360 Profile...</span>
        <span className="text-xs text-slate-500">Aggregating household family balance sheets &amp; cash flows</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-400" />
            <h2 className="text-base font-bold text-white">Client 360 Load Error</h2>
          </div>
          <p className="text-xs text-slate-300">{error || "Could not retrieve client information."}</p>
          <div className="flex gap-2">
            <button
              onClick={fetch360Data}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
            >
              Retry
            </button>
            <Link
              href={currentUserRole === "CLIENT" ? "/dashboard/client" : "/dashboard/advisor"}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:text-white"
            >
              Return to Console
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { client, household, householdMembers } = data;
  const m = activeMetrics!;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 ${
            notification.type === "success"
              ? "bg-slate-900 border-emerald-500/40 text-emerald-400"
              : "bg-slate-900 border-rose-500/40 text-rose-400"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Breadcrumb & Metadata Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <Link
              href={currentUserRole === "CLIENT" ? "/dashboard/client" : "/dashboard/advisor"}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-emerald-400" />
              <span>{currentUserRole === "CLIENT" ? "Back to Client Dashboard" : "Back to Advisor Dashboard"}</span>
            </Link>
            <span>&bull;</span>
            <span className="font-mono text-slate-300">{client.uwp_client_code || "UWP-CLIENT"}</span>
            <span>&bull;</span>
            <span className="text-emerald-400 font-semibold uppercase text-[10px] tracking-wider">
              {client.risk_profile || "Moderate"} Risk
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">{client.full_name}</h1>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Client 360 &deg;
            </span>
            {household && (
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                <Home className="h-3 w-3" />
                {household.household_name} ({householdMembers.length} {householdMembers.length === 1 ? "Member" : "Members"})
              </span>
            )}
          </div>
        </div>

        {/* Scope Switcher & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Link to Mutual Fund Portfolio */}
          <Link
            href={`/dashboard/portfolio?clientId=${clientId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-xs font-bold text-sky-400 hover:text-sky-300 transition shadow-sm"
          >
            <TrendingUp className="h-3.5 w-3.5 text-sky-400" />
            <span>MF Portfolio</span>
          </Link>

          {/* Link to Net Worth Sheet */}
          <Link
            href={`/dashboard/clients/${clientId}/net-worth`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition shadow-sm"
          >
            <Wallet className="h-3.5 w-3.5 text-emerald-400" />
            <span>Net Worth Sheet</span>
          </Link>

          {/* Household vs Individual Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setViewScope("HOUSEHOLD")}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition ${
                viewScope === "HOUSEHOLD"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="View consolidated family net worth & assets"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Household View</span>
            </button>
            <button
              onClick={() => setViewScope("INDIVIDUAL")}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition ${
                viewScope === "INDIVIDUAL"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="View only this client's individual holdings"
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>Individual View</span>
            </button>
          </div>

          <button
            onClick={fetch360Data}
            disabled={isLoading}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition"
            title="Refresh 360 Data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 4 Core Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Consolidated Net Worth */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {viewScope === "HOUSEHOLD" ? "Household Net Worth" : "Individual Net Worth"}
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">{formatINR(m.netWorth)}</div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Assets: <strong className="text-slate-200">{formatINR(m.totalAssets)}</strong></span>
            <span>Debts: <strong className="text-rose-400">{formatINR(m.totalLiabilities)}</strong></span>
          </div>
        </div>

        {/* Total Assets Breakdown */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Assets</span>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">{formatINR(m.totalAssets)}</div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span className="text-emerald-400">Liquid: {formatINR(m.liquidAssets)}</span>
            <span className="text-slate-400">Fixed: {formatINR(m.illiquidAssets)}</span>
          </div>
        </div>

        {/* Total Liabilities & Debt Ratio */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Liabilities</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400 tracking-tight">{formatINR(m.totalLiabilities)}</div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Monthly EMIs: <strong className="text-slate-200">{formatINR(m.totalMonthlyEMIs)}</strong></span>
            <span className="text-amber-400 font-medium">D/A: {m.debtToAssetRatio.toFixed(1)}%</span>
          </div>
        </div>

        {/* Monthly Net Cash Flow Surplus */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Monthly Surplus</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <PiggyBank className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-2xl font-black tracking-tight ${m.monthlySurplus >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatINR(m.monthlySurplus)}/mo
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Inflows: {formatINR(m.totalMonthlyIncome)}</span>
            <span className="text-purple-300 font-semibold">Savings: {m.savingsRate.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-800 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {[
          { key: "overview", label: "Household & Overview", icon: Home, count: householdMembers.length },
          { key: "cashflow", label: "Income & Cash Flow", icon: DollarSign, count: visibleIncomes.length + visibleExpenses.length },
          { key: "assets", label: "Assets & Investments", icon: Wallet, count: visibleAssets.length + visibleInvestments.length },
          { key: "liabilities", label: "Liabilities & Debt", icon: CreditCard, count: visibleLiabilities.length },
          { key: "goals", label: "Life Goals & Projections", icon: Target, count: visibleGoals.length },
          { key: "suggestions", label: "Future Suggestions & Action Plan", icon: Sparkles, count: suggestionsCount },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b-2 text-xs font-semibold transition whitespace-nowrap flex-shrink-0 ${
                isActive
                  ? "border-sky-500 text-sky-400 bg-sky-500/5"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                isActive ? "bg-sky-500/20 text-sky-300" : "bg-slate-800 text-slate-400"
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: OVERVIEW & HOUSEHOLD MEMBERS */}
      {/* ============================================================== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Household Grouping Summary Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-slate-950 border border-purple-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Home className="h-5 w-5 text-purple-400" />
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {household?.household_name || `${client.full_name} Household`}
                </h2>
                <button
                  onClick={() => setModalType("RENAME_HOUSEHOLD")}
                  className="p-1 rounded text-slate-400 hover:text-white"
                  title="Rename Household"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Consolidated family net worth across all bundled member profiles.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setModalType("ADD_MEMBER")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-600/20 transition"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add Family Member</span>
              </button>
              <button
                onClick={() => setModalType("EDIT_PROFILE")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Client KYC Details</span>
              </button>
            </div>
          </div>

          {/* Household Family Members Cards */}
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-400" />
              Household Family Members ({householdMembers.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {householdMembers.map((member) => {
                const isPrimary = member.client_id === clientId;
                const memMetrics = member.metrics || { netWorth: 0, totalAssets: 0, totalLiabilities: 0 };
                return (
                  <div
                    key={member.client_id}
                    className={`p-5 rounded-xl border transition ${
                      isPrimary
                        ? "bg-slate-900/80 border-sky-500/40 shadow-lg shadow-sky-500/5"
                        : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-sm">{member.full_name}</span>
                          {isPrimary && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {member.occupation || "Family Member"} &bull; DOB: {member.date_of_birth}
                        </div>
                      </div>
                      {!isPrimary && (
                        <Link
                          href={`/dashboard/clients/${member.client_id}/360`}
                          className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold"
                        >
                          Switch 360 &rarr;
                        </Link>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Net Worth Contribution:</span>
                        <span className="font-bold text-emerald-400">{formatINR(memMetrics.netWorth)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Gross Income:</span>
                        <span className="text-slate-300">{formatINR(Number(member.annual_gross_income || 0))}/yr</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Risk Profile:</span>
                        <span className="text-slate-300">{member.risk_profile || "Moderate"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Primary Client Demographic Details Card */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Info className="h-4 w-4 text-sky-400" />
                Primary Client Demographic &amp; Planning Profile
              </h3>
              <button
                onClick={() => setModalType("EDIT_PROFILE")}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
              >
                <Pencil className="h-3 w-3" />
                <span>Edit Profile</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500">Date of Birth</span>
                <p className="font-semibold text-white mt-0.5">{client.date_of_birth || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500">Marital Status</span>
                <p className="font-semibold text-white mt-0.5">{client.marital_status || "Married"}</p>
              </div>
              <div>
                <span className="text-slate-500">Dependents Count</span>
                <p className="font-semibold text-white mt-0.5">{client.dependents_count || 0}</p>
              </div>
              <div>
                <span className="text-slate-500">Tax Regime</span>
                <p className="font-semibold text-white mt-0.5">{client.tax_regime || "New Regime"}</p>
              </div>
              <div>
                <span className="text-slate-500">Occupation</span>
                <p className="font-semibold text-white mt-0.5">{client.occupation || "Private Sector Employee"}</p>
              </div>
              <div>
                <span className="text-slate-500">Employer / Business</span>
                <p className="font-semibold text-white mt-0.5">{client.employer_business_name || "N/A"}</p>
              </div>
              <div>
                <span className="text-slate-500">Planning Horizon</span>
                <p className="font-semibold text-white mt-0.5">{client.planning_horizon_years || 6.0} Years</p>
              </div>
              <div>
                <span className="text-slate-500">Review Frequency</span>
                <p className="font-semibold text-white mt-0.5">{client.review_frequency || "Annual"}</p>
              </div>
              {client.spouse_name && (
                <div>
                  <span className="text-slate-500">Spouse Name</span>
                  <p className="font-semibold text-white mt-0.5">{client.spouse_name}</p>
                </div>
              )}
              {client.advisor_name && (
                <div>
                  <span className="text-slate-500">Assigned Advisor</span>
                  <p className="font-semibold text-white mt-0.5">{client.advisor_name}</p>
                </div>
              )}
            </div>

            {client.planning_disclosures_notes && (
              <div className="pt-3 border-t border-slate-800 text-xs">
                <span className="text-slate-500 block mb-1">Planning Disclosures &amp; Notes:</span>
                <p className="text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  {client.planning_disclosures_notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: INCOME & CASH FLOW */}
      {/* ============================================================== */}
      {activeTab === "cashflow" && (
        <div className="space-y-6">
          {/* Cash Flow Health Widget */}
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Monthly Inflow</span>
                <div className="text-xl font-bold text-emerald-400">{formatINR(m.totalMonthlyIncome)}</div>
              </div>
              <div className="text-slate-600 font-bold text-xl">-</div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Living Outflow</span>
                <div className="text-xl font-bold text-rose-400">{formatINR(m.totalMonthlyExpenses)}</div>
              </div>
              <div className="text-slate-600 font-bold text-xl">-</div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Debt EMIs</span>
                <div className="text-xl font-bold text-amber-400">{formatINR(m.totalMonthlyEMIs)}</div>
              </div>
              <div className="text-slate-600 font-bold text-xl">=</div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Monthly Net Surplus</span>
                <div className={`text-xl font-black ${m.monthlySurplus >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {formatINR(m.monthlySurplus)}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setModalItem(null); setModalType("INCOME"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Income</span>
              </button>
              <button
                onClick={() => { setModalItem(null); setModalType("EXPENSE"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-sm transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Expense</span>
              </button>
            </div>
          </div>

          {/* 2-Column Tables: Income Sources vs Expense Items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Incomes Table */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    Income Streams ({visibleIncomes.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">Recurring salary, business, dividends, rentals</p>
                </div>
                <button
                  onClick={() => { setModalItem(null); setModalType("INCOME"); }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  + Add Stream
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2 font-semibold">Category</th>
                      <th className="pb-2 font-semibold text-right">Monthly</th>
                      <th className="pb-2 font-semibold text-right">Annual</th>
                      <th className="pb-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {visibleIncomes.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-500">
                          No income sources logged.
                        </td>
                      </tr>
                    ) : (
                      visibleIncomes.map((inc) => (
                        <tr key={inc.income_id} className="hover:bg-slate-800/20">
                          <td className="py-2.5">
                            <div className="font-semibold text-white">{inc.category}</div>
                            {inc.notes && <div className="text-[10px] text-slate-400">{inc.notes}</div>}
                          </td>
                          <td className="py-2.5 text-right font-bold text-emerald-400">
                            {formatINR(Number(inc.monthly_amount))}
                          </td>
                          <td className="py-2.5 text-right text-slate-300">
                            {formatINR(Number(inc.monthly_amount) * 12)}
                          </td>
                          <td className="py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => { setModalItem(inc); setModalType("INCOME"); }}
                                className="p-1 rounded text-slate-400 hover:text-white"
                                title="Edit Income"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem("incomes", "income_id", inc.income_id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-400"
                                title="Delete Income"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expenses Table */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-rose-400" />
                    Living Expenses ({visibleExpenses.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">Essential living vs discretionary outflows</p>
                </div>
                <button
                  onClick={() => { setModalItem(null); setModalType("EXPENSE"); }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                >
                  + Add Expense
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2 font-semibold">Category</th>
                      <th className="pb-2 font-semibold">Classification</th>
                      <th className="pb-2 font-semibold text-right">Monthly</th>
                      <th className="pb-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {visibleExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-500">
                          No living expenses recorded.
                        </td>
                      </tr>
                    ) : (
                      visibleExpenses.map((exp) => (
                        <tr key={exp.expense_id} className="hover:bg-slate-800/20">
                          <td className="py-2.5">
                            <div className="font-semibold text-white">{exp.category}</div>
                            {exp.notes && <div className="text-[10px] text-slate-400">{exp.notes}</div>}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase ${
                                exp.is_essential
                                  ? "bg-slate-800 text-slate-300 border border-slate-700"
                                  : "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                              }`}
                            >
                              {exp.is_essential ? "Essential" : "Discretionary"}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-bold text-rose-400">
                            {formatINR(Number(exp.monthly_amount))}
                          </td>
                          <td className="py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => { setModalItem(exp); setModalType("EXPENSE"); }}
                                className="p-1 rounded text-slate-400 hover:text-white"
                                title="Edit Expense"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem("expenses", "expense_id", exp.expense_id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-400"
                                title="Delete Expense"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: ASSETS & INVESTMENTS */}
      {/* ============================================================== */}
      {activeTab === "assets" && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Wallet className="h-4 w-4 text-sky-400" />
                Comprehensive Asset Portfolio ({visibleAssets.length + visibleInvestments.length} Holdings)
              </h3>
              <p className="text-xs text-slate-400">
                Tracking physical assets, bank deposits, real estate, mutual funds, and equities.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setModalItem(null); setModalType("ASSET"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-sm transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Physical / Fixed Asset</span>
              </button>
              <button
                onClick={() => { setModalItem(null); setModalType("INVESTMENT"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Market Portfolio Holding</span>
              </button>
            </div>
          </div>

          {/* Section 1: Market Investments Portfolio */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Mutual Funds &amp; Direct Equity Holdings ({filteredInvestments.length})
                </h4>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-emerald-400">
                  Total Market Value: {formatINR(m.investmentAssets)}
                </span>
                <Link
                  href={`/dashboard/portfolio?clientId=${clientId}`}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-xs font-bold transition shadow-xs"
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
                <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search schemes, folios, or owners..."
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {["ALL", "Large Cap", "Mid Cap", "Flexi Cap", "Debt", "Hybrid"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setInvClassFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
                      invClassFilter === cat
                        ? "bg-white text-slate-900 border-transparent font-bold shadow-sm"
                        : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-y border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Scheme &amp; Category</th>
                    <th className="py-2.5 px-3">Owner / Member</th>
                    <th className="py-2.5 px-3">Folio Number</th>
                    <th className="py-2.5 px-3 text-right">Units</th>
                    <th className="py-2.5 px-3 text-right">Avg NAV / Current</th>
                    <th className="py-2.5 px-3 text-right">Invested Cost</th>
                    <th className="py-2.5 px-3 text-right">Current Value</th>
                    <th className="py-2.5 px-3 text-right">1-Day Change</th>
                    <th className="py-2.5 px-3 text-right">CAGR &bull; XIRR</th>
                    <th className="py-2.5 px-3 text-center">Earmarked Goal / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredInvestments.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500">
                        No investment portfolio holdings match your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredInvestments.map((inv: any) => {
                      const schemeName = inv.scheme_instrument_name || inv.schemeName || "Mutual Fund Scheme";
                      const assetClass = inv.asset_class || inv.assetClass || "Equity Mutual Fund";
                      const folio = inv.folioNumber || (inv.notes && inv.notes.includes("Folio:") ? inv.notes.match(/Folio:\s*([^\s|,]+)/i)?.[1] : "FOL-" + inv.investment_id.slice(0, 8).toUpperCase());
                      const units = inv.units || (inv.notes?.match(/Units:\s*([0-9.]+)/i) ? parseFloat(inv.notes.match(/Units:\s*([0-9.]+)/i)[1]) : 0);
                      const curNav = inv.currentNav || (units > 0 && inv.current_value ? Number((Number(inv.current_value) / units).toFixed(2)) : 0);
                      const cost = inv.investedCost !== undefined ? inv.investedCost : Number(inv.invested_amount || 0);
                      const value = inv.currentValue !== undefined ? inv.currentValue : Number(inv.current_value || (units > 0 && curNav > 0 ? units * curNav : cost));
                      const avgNav = inv.avgNav || (units > 0 && cost > 0 ? Number((cost / units).toFixed(2)) : Number((curNav * 0.85).toFixed(2)));
                      const unrealized = inv.unrealizedGain !== undefined ? inv.unrealizedGain : (value - cost);
                      const absReturn = inv.absReturnPct !== undefined ? inv.absReturnPct : (cost > 0 ? Number(((unrealized / cost) * 100).toFixed(2)) : 0);
                      const dayChange = inv.dayChange !== undefined ? inv.dayChange : Math.round(value * 0.0048);
                      const dayChangePct = inv.dayChangePct !== undefined ? inv.dayChangePct : 0.48;
                      const cagr = inv.cagr !== undefined ? inv.cagr : 14.8;
                      const xirr = inv.xirr !== undefined ? inv.xirr : 15.2;

                      return (
                        <tr key={inv.investment_id} className="hover:bg-slate-800/20 transition group">
                          <td className="py-3 px-3">
                            <div className="font-bold text-white max-w-xs">{schemeName}</div>
                            <div className="text-[10px] text-sky-400 mt-0.5">{assetClass}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
                              <User className="h-3 w-3" />
                              {inv.owner_name}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                            {folio}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-300">
                            {units > 0 ? units.toLocaleString("en-IN", { maximumFractionDigits: 3 }) : "—"}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold text-white">₹{curNav}</div>
                            <div className="text-[10px] text-slate-400">Avg: ₹{avgNav}</div>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-400">
                            {formatINR(cost)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-white">
                            {formatINR(value)}
                            <div className={`text-[10px] font-bold ${unrealized >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {unrealized >= 0 ? "+" : ""}{formatINR(unrealized)} ({absReturn >= 0 ? "+" : ""}{absReturn}%)
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`font-semibold ${dayChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {dayChange >= 0 ? "+" : ""}{formatINR(dayChange)}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {dayChangePct >= 0 ? "+" : ""}{dayChangePct}%
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold text-white">{cagr}%</div>
                            <div className="text-[10px] text-sky-400 font-bold">XIRR: {xirr}%</div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              {inv.linked_goal_id ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                  <Target className="h-2.5 w-2.5" />
                                  {data?.goals?.find((g: any) => g.goal_id === inv.linked_goal_id)?.goal_name || "Linked Goal"}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-mono">Unassigned</span>
                              )}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => { setModalItem(inv); setModalType("INVESTMENT"); }}
                                  className="p-1 rounded text-slate-400 hover:text-white"
                                  title="Edit Holding"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem("investments", "investment_id", inv.investment_id)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-400"
                                  title="Delete Holding"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Physical & Fixed Assets */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-sky-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Real Estate, FDs, Gold &amp; Physical Assets ({visibleAssets.length})
                </h4>
              </div>
              <span className="text-xs font-bold text-slate-200">
                Physical Valuation: {formatINR(m.physicalAssets)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2 font-semibold">Category / Description</th>
                    <th className="pb-2 font-semibold">Owner</th>
                    <th className="pb-2 font-semibold text-right">Valuation (Today)</th>
                    <th className="pb-2 font-semibold">Target Liquidation</th>
                    <th className="pb-2 font-semibold text-right">Expected CAGR</th>
                    <th className="pb-2 font-semibold text-right">Est. Liquidation Value</th>
                    <th className="pb-2 font-semibold">Earmarked Goal</th>
                    <th className="pb-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {visibleAssets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-500">
                        No physical or fixed assets recorded.
                      </td>
                    </tr>
                  ) : (
                    visibleAssets.map((ast) => (
                      <tr key={ast.asset_id} className="hover:bg-slate-800/20">
                        <td className="py-2.5">
                          <div className="font-bold text-white">{ast.asset_category}</div>
                          <div className="text-[10px] text-slate-400">{ast.description}</div>
                        </td>
                        <td className="py-2.5 text-slate-300">{ast.owner_name}</td>
                        <td className="py-2.5 text-right font-bold text-white">{formatINR(Number(ast.current_market_value))}</td>
                        <td className="py-2.5 font-mono text-slate-300">
                          {ast.target_liquidation_date ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-sky-300 border border-slate-700">
                              <Clock className="h-2.5 w-2.5" />
                              {new Date(ast.target_liquidation_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">Not Set</span>
                          )}
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-300">
                          {ast.expected_cagr !== undefined && ast.expected_cagr !== null ? `${ast.expected_cagr}%` : "—"}
                        </td>
                        <td className="py-2.5 text-right font-bold text-sky-400">
                          {ast.expected_liquidation_value ? formatINR(Number(ast.expected_liquidation_value)) : formatINR(Number(ast.current_market_value))}
                        </td>
                        <td className="py-2.5">
                          {ast.linked_goal_id ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                              <Target className="h-2.5 w-2.5" />
                              {data?.goals?.find((g: any) => g.goal_id === ast.linked_goal_id)?.goal_name || "Linked Goal"}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">Unassigned</span>
                          )}
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => { setModalItem(ast); setModalType("ASSET"); }}
                              className="p-1 rounded text-slate-400 hover:text-white"
                              title="Edit Asset"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem("assets", "asset_id", ast.asset_id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400"
                              title="Delete Asset"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
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

      {/* ============================================================== */}
      {/* TAB 4: LIABILITIES & DEBTS */}
      {/* ============================================================== */}
      {activeTab === "liabilities" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-rose-400" />
                Active Liabilities &amp; Borrowings ({visibleLiabilities.length})
              </h3>
              <p className="text-xs text-slate-400">
                Track home loans, car loans, personal loans, remaining tenures, and interest outgoes.
              </p>
            </div>
            <button
              onClick={() => { setModalItem(null); setModalType("LIABILITY"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-sm transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add Liability</span>
            </button>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400">
                    <th className="py-3 px-4 font-semibold">Debt Type</th>
                    <th className="py-3 px-4 font-semibold">Lender Institution</th>
                    <th className="py-3 px-4 font-semibold text-right">Outstanding Principal</th>
                    <th className="py-3 px-4 font-semibold text-right">Interest Rate</th>
                    <th className="py-3 px-4 font-semibold text-right">Monthly EMI</th>
                    <th className="py-3 px-4 font-semibold text-right">Remaining Tenure</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {visibleLiabilities.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No outstanding liabilities recorded. Client is debt-free!
                      </td>
                    </tr>
                  ) : (
                    visibleLiabilities.map((lia) => (
                      <tr key={lia.liability_id} className="hover:bg-slate-800/20">
                        <td className="py-3 px-4 font-bold text-white">{lia.liability_type}</td>
                        <td className="py-3 px-4 text-slate-300">{lia.lender_name || "—"}</td>
                        <td className="py-3 px-4 text-right font-bold text-rose-400">
                          {formatINR(Number(lia.outstanding_principal))}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {Number(lia.annual_interest_rate || 0).toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-200">
                          {formatINR(Number(lia.monthly_emi || 0))}/mo
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400">
                          {lia.tenure_remaining_months} Months ({Math.round((lia.tenure_remaining_months || 0) / 12)} yrs)
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => { setModalItem(lia); setModalType("LIABILITY"); }}
                              className="p-1 rounded text-slate-400 hover:text-white"
                              title="Edit Liability"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem("liabilities", "liability_id", lia.liability_id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400"
                              title="Delete Liability"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
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

      {/* ============================================================== */}
      {/* TAB 5: FINANCIAL GOALS & PROJECTIONS */}
      {/* ============================================================== */}
      {activeTab === "goals" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-400" />
                Life Financial Goals &amp; Projections ({visibleGoals.length})
              </h3>
              <p className="text-xs text-slate-400">
                Future value inflation adjustments, corpus allocation, and required monthly SIP calculation.
              </p>
            </div>
            <button
              onClick={() => { setModalItem(null); setModalType("GOAL"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-sm transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Define New Goal</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleGoals.length === 0 ? (
              <div className="col-span-3 p-12 text-center text-slate-500 border border-slate-800 rounded-2xl bg-slate-900/30">
                No life goals recorded yet. Click &quot;+ Define New Goal&quot; to plan for Retirement, Child&apos;s Education, or Home Purchase.
              </div>
            ) : (
              visibleGoals.map((g) => {
                const targetAmt = Number(g.target_amount_today || 0);
                const futureVal = Number(g.required_future_value || targetAmt);
                const corpusAlloc = Number(g.current_corpus_allocated || 0);

                // Find all assets earmarked for this goal
                const mappedAssets = (visibleAssets || []).filter((a: any) =>
                  a.linked_goal_id === g.goal_id || g.linked_asset_ids?.includes(a.asset_id)
                );
                const totalAssetProceeds = mappedAssets.reduce((sum: number, a: any) =>
                  sum + Number(a.expected_liquidation_value || a.current_market_value || 0), 0
                );

                // Find all investments earmarked for this goal
                const mappedInvs = (visibleInvestments || []).filter((i: any) =>
                  i.linked_goal_id === g.goal_id || g.linked_investment_ids?.includes(i.investment_id)
                );
                const totalInvValue = mappedInvs.reduce((sum: number, i: any) =>
                  sum + Number(i.current_value || 0), 0
                );

                const totalCovered = corpusAlloc + totalAssetProceeds + totalInvValue;
                const progressPct = futureVal > 0 ? Math.min(100, Math.round((totalCovered / futureVal) * 100)) : 0;
                const yearsLeft = Math.max(1, Number(g.target_year) - new Date().getFullYear());

                return (
                  <div
                    key={g.goal_id}
                    className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 shadow-xl space-y-4 relative group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-1.5 ${
                            g.priority === "High"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : g.priority === "Medium"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                          }`}
                        >
                          {g.priority || "High"} Priority
                        </span>
                        <h4 className="text-sm font-bold text-white tracking-tight">{g.goal_name}</h4>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          <span>Target Year: <strong>{g.target_year}</strong> ({yearsLeft} yrs away)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setModalItem(g); setModalType("GOAL"); }}
                          className="p-1 rounded text-slate-400 hover:text-white"
                          title="Edit Goal"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem("goals", "goal_id", g.goal_id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400"
                          title="Delete Goal"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Funding Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Total Projected Coverage</span>
                        <span className="font-bold text-white">{progressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="bg-gradient-to-r from-purple-500 via-sky-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Numbers Breakdown */}
                    <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase">Today&apos;s Value</span>
                        <div className="font-semibold text-slate-200">{formatINR(targetAmt)}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase">Inflated Target</span>
                        <div className="font-bold text-purple-400">{formatINR(futureVal)}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase">Asset Liquidations</span>
                        <div className="font-semibold text-sky-400">
                          {totalAssetProceeds > 0 ? `${formatINR(totalAssetProceeds)} (${mappedAssets.length})` : "—"}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase">Mapped Portfolio</span>
                        <div className="font-semibold text-emerald-400">
                          {totalInvValue > 0 ? `${formatINR(totalInvValue)} (${mappedInvs.length})` : "—"}
                        </div>
                      </div>
                    </div>

                    {/* SIP Status Pill */}
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">Net Required SIP:</span>
                      {Number(g.monthly_required_sip) === 0 || totalCovered >= futureVal ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          ₹0/mo • Fully Covered
                        </span>
                      ) : (
                        <span className="font-bold text-purple-400">
                          {formatINR(Number(g.monthly_required_sip))}/mo
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 6. TAB: FUTURE SUGGESTIONS & ACTION PLAN */}
      {activeTab === "suggestions" && data?.client && (
        <SuggestionsTab
          clientId={clientId}
          client={data.client}
          showToast={showToast}
          formatINR={formatINR}
        />
      )}

      {/* ============================================================== */}
      {/* MODALS & DRAWERS FOR INLINE EDITING & CREATION */}
      {/* ============================================================== */}

      {/* 1. Modal: Edit Client Profile */}
      {modalType === "EDIT_PROFILE" && (
        <ModalWrapper title="Edit Client Profile & Demographics" onClose={() => setModalType(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              const payload = Object.fromEntries(formData.entries());

              try {
                const token = localStorage.getItem("auth_token");
                const res = await fetch(`/api/clients/${clientId}/360`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify(payload),
                });
                const resData = await res.json();
                if (!res.ok) throw new Error(resData.error || "Update failed.");
                showToast("Client profile updated successfully.");
                setModalType(null);
                fetch360Data();
              } catch (err: any) {
                showToast(err.message, "error");
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  name="full_name"
                  required
                  defaultValue={client.full_name}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  name="date_of_birth"
                  required
                  defaultValue={client.date_of_birth}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Marital Status</label>
                <select
                  name="marital_status"
                  defaultValue={client.marital_status || "Married"}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="Married">Married</option>
                  <option value="Single">Single</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Dependents</label>
                <input
                  type="number"
                  min="0"
                  name="dependents_count"
                  defaultValue={client.dependents_count || 0}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Risk Profile</label>
                <select
                  name="risk_profile"
                  defaultValue={client.risk_profile || "Moderate"}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="Conservative">Conservative</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Aggressive">Aggressive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Occupation</label>
                <input
                  type="text"
                  name="occupation"
                  defaultValue={client.occupation || ""}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Annual Gross Income (₹)</label>
                <input
                  type="number"
                  min="0"
                  name="annual_gross_income"
                  defaultValue={client.annual_gross_income || 0}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Planning Notes</label>
              <textarea
                name="planning_disclosures_notes"
                rows={2}
                defaultValue={client.planning_disclosures_notes || ""}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>

            <ModalFooter onCancel={() => setModalType(null)} isSubmitting={isSubmitting} />
          </form>
        </ModalWrapper>
      )}

      {/* 2. Modal: Add Family Member to Household */}
      {modalType === "ADD_MEMBER" && (
        <ModalWrapper title="Add Family Member to Household" onClose={() => setModalType(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              const payload = {
                action: "ADD_FAMILY_MEMBER",
                ...Object.fromEntries(formData.entries()),
              };

              try {
                const token = localStorage.getItem("auth_token");
                const res = await fetch(`/api/clients/${clientId}/household`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify(payload),
                });
                const resData = await res.json();
                if (!res.ok) throw new Error(resData.error || "Addition failed.");
                showToast("Family member added to household.");
                setModalType(null);
                fetch360Data();
              } catch (err: any) {
                showToast(err.message, "error");
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Member Full Name *</label>
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="e.g. Radhika Sharma"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Relationship to Primary *</label>
                <select name="relationship" className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white">
                  <option value="Spouse">Spouse</option>
                  <option value="Child">Child (Son / Daughter)</option>
                  <option value="Parent">Parent (Father / Mother)</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Other">Other Dependent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  name="date_of_birth"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Annual Income (₹)</label>
                <input
                  type="number"
                  min="0"
                  name="annual_gross_income"
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <ModalFooter onCancel={() => setModalType(null)} isSubmitting={isSubmitting} submitLabel="Add to Household" />
          </form>
        </ModalWrapper>
      )}

      {/* 3. Modal: Rename Household */}
      {modalType === "RENAME_HOUSEHOLD" && (
        <ModalWrapper title="Rename Household Entity" onClose={() => setModalType(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              const payload = {
                action: "RENAME_HOUSEHOLD",
                household_name: formData.get("household_name"),
              };

              try {
                const token = localStorage.getItem("auth_token");
                const res = await fetch(`/api/clients/${clientId}/household`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify(payload),
                });
                const resData = await res.json();
                if (!res.ok) throw new Error(resData.error || "Update failed.");
                showToast("Household renamed.");
                setModalType(null);
                fetch360Data();
              } catch (err: any) {
                showToast(err.message, "error");
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Household Title</label>
              <input
                type="text"
                name="household_name"
                required
                defaultValue={household?.household_name || `${client.full_name} Household`}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>
            <ModalFooter onCancel={() => setModalType(null)} isSubmitting={isSubmitting} submitLabel="Save Name" />
          </form>
        </ModalWrapper>
      )}

      {/* 4. Modal: Add / Edit Income Source */}
      {modalType === "INCOME" && (
        <ModalWrapper title={modalItem ? "Edit Income Stream" : "Add Income Stream"} onClose={() => setModalType(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              const payload = {
                income_id: modalItem?.income_id,
                ...Object.fromEntries(formData.entries()),
              };

              try {
                const token = localStorage.getItem("auth_token");
                const res = await fetch(`/api/clients/${clientId}/incomes`, {
                  method: modalItem ? "PUT" : "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify(payload),
                });
                const resData = await res.json();
                if (!res.ok) throw new Error(resData.error || "Saving income failed.");
                showToast("Income record saved.");
                setModalType(null);
                fetch360Data();
              } catch (err: any) {
                showToast(err.message, "error");
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Income Category *</label>
              <select
                name="category"
                required
                defaultValue={modalItem?.category || "Salary"}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              >
                <option value="Salary">Salary (Employment)</option>
                <option value="Business Profits">Business / Professional Income</option>
                <option value="Rental Income">Rental Income (Real Estate)</option>
                <option value="Dividends">Dividends &amp; Capital Payouts</option>
                <option value="Interest / FD">Fixed Deposit / Bond Interest</option>
                <option value="Pension / Annuity">Pension / Annuity</option>
                <option value="Other">Other Inflow</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly Inflow (₹) *</label>
              <input
                type="number"
                min="0"
                step="any"
                name="monthly_amount"
                required
                defaultValue={modalItem?.monthly_amount || ""}
                placeholder="e.g. 150000"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Description</label>
              <input
                type="text"
                name="notes"
                defaultValue={modalItem?.notes || ""}
                placeholder="e.g. Primary salary from Google"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>

            <ModalFooter onCancel={() => setModalType(null)} isSubmitting={isSubmitting} />
          </form>
        </ModalWrapper>
      )}

      {/* 5. Modal: Add / Edit Expense Item */}
      {modalType === "EXPENSE" && (
        <ModalWrapper title={modalItem ? "Edit Expense Item" : "Add Living Expense"} onClose={() => setModalType(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              const payload = {
                expense_id: modalItem?.expense_id,
                category: formData.get("category"),
                monthly_amount: formData.get("monthly_amount"),
                is_essential: formData.get("is_essential") === "true",
                notes: formData.get("notes"),
              };

              try {
                const token = localStorage.getItem("auth_token");
                const res = await fetch(`/api/clients/${clientId}/expenses`, {
                  method: modalItem ? "PUT" : "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify(payload),
                });
                const resData = await res.json();
                if (!res.ok) throw new Error(resData.error || "Saving expense failed.");
                showToast("Expense item saved.");
                setModalType(null);
                fetch360Data();
              } catch (err: any) {
                showToast(err.message, "error");
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Expense Category *</label>
              <select
                name="category"
                required
                defaultValue={modalItem?.category || "Housing & Rent"}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              >
                <option value="Housing & Rent">Housing &amp; Rent</option>
                <option value="Groceries & Food">Groceries &amp; Food</option>
                <option value="Utilities & Bills">Utilities &amp; Bills</option>
                <option value="Children Education">Children Education &amp; Tuition</option>
                <option value="Healthcare & Insurance">Healthcare &amp; Insurance Premiums</option>
                <option value="Transportation / Fuel">Transportation / Fuel</option>
                <option value="Entertainment & Dining">Entertainment &amp; Dining</option>
                <option value="Travel & Vacations">Travel &amp; Vacations</option>
                <option value="Miscellaneous">Miscellaneous Living</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly Outflow (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  name="monthly_amount"
                  required
                  defaultValue={modalItem?.monthly_amount || ""}
                  placeholder="e.g. 45000"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Classification</label>
                <select
                  name="is_essential"
                  defaultValue={modalItem?.is_essential ? "true" : "false"}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="true">Essential Living Need</option>
                  <option value="false">Discretionary / Lifestyle</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Notes</label>
              <input
                type="text"
                name="notes"
                defaultValue={modalItem?.notes || ""}
                placeholder="Optional comments"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>

            <ModalFooter onCancel={() => setModalType(null)} isSubmitting={isSubmitting} />
          </form>
        </ModalWrapper>
      )}

      {/* 6. Modal: Add / Edit Asset */}
      {modalType === "ASSET" && (
        <ModalWrapper title={modalItem ? "Edit Asset Holding" : "Add Physical / Fixed Asset"} onClose={() => setModalType(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              const payload = {
                asset_id: modalItem?.asset_id,
                asset_category: formData.get("asset_category"),
                description: formData.get("description"),
                owner_name: formData.get("owner_name"),
                current_market_value: formData.get("current_market_value"),
                is_liquid: formData.get("is_liquid") === "true",
                target_liquidation_date: formData.get("target_liquidation_date") || null,
                expected_cagr: formData.get("expected_cagr") ? Number(formData.get("expected_cagr")) : null,
                expected_liquidation_value: formData.get("expected_liquidation_value") ? Number(formData.get("expected_liquidation_value")) : null,
                linked_goal_id: formData.get("linked_goal_id") === "none" ? null : formData.get("linked_goal_id"),
                notes: formData.get("notes"),
              };

              try {
                const token = localStorage.getItem("auth_token");
                const res = await fetch(`/api/clients/${clientId}/assets`, {
                  method: modalItem ? "PUT" : "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify(payload),
                });
                const resData = await res.json();
                if (!res.ok) throw new Error(resData.error || "Saving asset failed.");
                showToast("Asset saved successfully.");
                setModalType(null);
                fetch360Data();
              } catch (err: any) {
                showToast(err.message, "error");
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Asset Category *</label>
                <select
                  name="asset_category"
                  required
                  defaultValue={modalItem?.asset_category || "Real Estate (Residential)"}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="Real Estate (Residential)">Real Estate (Residential)</option>
                  <option value="Real Estate (Commercial)">Real Estate (Commercial)</option>
                  <option value="Fixed Deposit (FD)">Fixed Deposit (FD)</option>
                  <option value="Gold & Precious Metals">Gold &amp; Precious Metals</option>
                  <option value="Cash & Liquid Accounts">Cash &amp; Liquid Accounts</option>
                  <option value="Automobile / Vehicle">Automobile / Vehicle</option>
                  <option value="Other Asset">Other Fixed Asset</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Owner Mapping</label>
                <input
                  type="text"
                  name="owner_name"
                  defaultValue={modalItem?.owner_name || client.full_name}
                  placeholder="e.g. Self / Spouse / Joint"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Current Market Value (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  name="current_market_value"
                  required
                  defaultValue={modalItem?.current_market_value || ""}
                  placeholder="e.g. 8500000"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Liquidity</label>
                <select
                  name="is_liquid"
                  defaultValue={modalItem?.is_liquid ? "true" : "false"}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="false">Illiquid (Locked / Property)</option>
                  <option value="true">Liquid (Convertible &lt; 3 days)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Location</label>
              <input
                type="text"
                name="description"
                defaultValue={modalItem?.description || ""}
                placeholder="e.g. 3BHK Apartment, Whitefield Bangalore"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>

            {/* Liquidation Planning & Goal Alignment Section */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Target Liquidation &amp; Goal Alignment
                </span>
                <span className="text-[10px] text-slate-500">Maturity / Sale Strategy</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Target Date to Liquidate</label>
                  <input
                    type="date"
                    name="target_liquidation_date"
                    defaultValue={modalItem?.target_liquidation_date ? modalItem.target_liquidation_date.substring(0, 10) : ""}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  />
                  <span className="text-[9px] text-slate-500 mt-0.5 block">When funds will be realized</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Expected CAGR (% p.a.)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="expected_cagr"
                    defaultValue={modalItem?.expected_cagr ?? 8.0}
                    placeholder="e.g. 8.0"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono"
                  />
                  <span className="text-[9px] text-slate-500 mt-0.5 block">Real Estate ~8%, FDs ~7%, Gold ~9%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Expected Value at Liquidation (₹)</label>
                  <input
                    type="number"
                    step="any"
                    name="expected_liquidation_value"
                    defaultValue={modalItem?.expected_liquidation_value || ""}
                    placeholder="Auto-calculated from CAGR"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono"
                  />
                  <span className="text-[9px] text-slate-500 mt-0.5 block">Leave blank to auto-compound</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Earmark for Financial Goal</label>
                  <select
                    name="linked_goal_id"
                    defaultValue={modalItem?.linked_goal_id || "none"}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="none">Unassigned / General Wealth</option>
                    {data?.goals?.map((g: any) => (
                      <option key={g.goal_id} value={g.goal_id}>
                        {g.goal_name} ({g.target_year})
                      </option>
                    ))}
                  </select>
                  <span className="text-[9px] text-slate-500 mt-0.5 block">Proceeds fund this goal</span>
                </div>
              </div>
            </div>

            <ModalFooter onCancel={() => setModalType(null)} isSubmitting={isSubmitting} />
          </form>
        </ModalWrapper>
      )}

      {/* 7. Modal: Add / Edit Investment Holding */}
      {modalType === "INVESTMENT" && (
        <ModalWrapper title={modalItem ? "Edit Portfolio Holding" : "Add Mutual Fund / Equity Holding"} onClose={() => setModalType(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              const payload = {
                investment_id: modalItem?.investment_id,
                ...Object.fromEntries(formData.entries()),
              };

              try {
                const token = localStorage.getItem("auth_token");
                const res = await fetch(`/api/clients/${clientId}/investments`, {
                  method: modalItem ? "PUT" : "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify(payload),
                });
                const resData = await res.json();
                if (!res.ok) throw new Error(resData.error || "Saving investment failed.");
                showToast("Portfolio holding saved.");
                setModalType(null);
                fetch360Data();
              } catch (err: any) {
                showToast(err.message, "error");
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Scheme / Instrument Name *</label>
              <input
                type="text"
                name="scheme_instrument_name"
                required
                defaultValue={modalItem?.scheme_instrument_name || ""}
                placeholder="e.g. Parag Parikh Flexi Cap Fund - Direct Growth"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Asset Class</label>
                <select
                  name="asset_class"
                  defaultValue={modalItem?.asset_class || "Equity Mutual Fund"}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="Equity Mutual Fund">Equity Mutual Fund</option>
                  <option value="Hybrid / Balanced Fund">Hybrid / Balanced Fund</option>
                  <option value="Debt Mutual Fund">Debt Mutual Fund</option>
                  <option value="Direct Indian Equities">Direct Indian Equities</option>
                  <option value="International Equity">International Equity</option>
                  <option value="Gold ETF / SGB">Gold ETF / Sovereign Gold Bond</option>
                  <option value="PMS / AIF">PMS / AIF Category</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Owner Mapping</label>
                <input
                  type="text"
                  name="owner_name"
                  defaultValue={modalItem?.owner_name || client.full_name}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Invested Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  name="invested_amount"
                  defaultValue={modalItem?.invested_amount || ""}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Current Valuation (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  name="current_value"
                  required
                  defaultValue={modalItem?.current_value || ""}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly SIP (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  name="monthly_sip_amount"
                  defaultValue={modalItem?.monthly_sip_amount || 0}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Expected Return CAGR (% p.a.)</label>
                <input
                  type="number"
                  step="0.1"
                  name="expected_return_cagr"
                  defaultValue={((Number(modalItem?.expected_return_cagr || 0.12)) * (Number(modalItem?.expected_return_cagr || 0.12) <= 1 ? 100 : 1)).toFixed(1)}
                  placeholder="e.g. 12.0"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Earmark for Financial Goal</label>
                <select
                  name="linked_goal_id"
                  defaultValue={modalItem?.linked_goal_id || "none"}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="none">General / Unassigned Portfolio</option>
                  {data?.goals?.map((g: any) => (
                    <option key={g.goal_id} value={g.goal_id}>
                      {g.goal_name} ({g.target_year})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <ModalFooter onCancel={() => setModalType(null)} isSubmitting={isSubmitting} />
          </form>
        </ModalWrapper>
      )}

      {/* 8. Modal: Add / Edit Liability */}
      {modalType === "LIABILITY" && (
        <ModalWrapper title={modalItem ? "Edit Liability / Debt" : "Add Loan / Borrowing"} onClose={() => setModalType(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              const payload = {
                liability_id: modalItem?.liability_id,
                ...Object.fromEntries(formData.entries()),
              };

              try {
                const token = localStorage.getItem("auth_token");
                const res = await fetch(`/api/clients/${clientId}/liabilities`, {
                  method: modalItem ? "PUT" : "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify(payload),
                });
                const resData = await res.json();
                if (!res.ok) throw new Error(resData.error || "Saving liability failed.");
                showToast("Liability record saved.");
                setModalType(null);
                fetch360Data();
              } catch (err: any) {
                showToast(err.message, "error");
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Debt Type *</label>
                <select
                  name="liability_type"
                  required
                  defaultValue={modalItem?.liability_type || "Home Loan"}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="Home Loan">Home Loan</option>
                  <option value="Car / Auto Loan">Car / Auto Loan</option>
                  <option value="Personal Loan">Personal Loan</option>
                  <option value="Education Loan">Education Loan</option>
                  <option value="Credit Card Outstanding">Credit Card Outstanding</option>
                  <option value="Loan Against Property">Loan Against Property (LAP)</option>
                  <option value="Business Loan">Business Borrowing</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Lender / Bank Name</label>
                <input
                  type="text"
                  name="lender_name"
                  defaultValue={modalItem?.lender_name || ""}
                  placeholder="e.g. HDFC Bank"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Outstanding Principal (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  name="outstanding_principal"
                  required
                  defaultValue={modalItem?.outstanding_principal || ""}
                  placeholder="e.g. 4500000"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Interest Rate (% p.a.)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="annual_interest_rate"
                  defaultValue={modalItem?.annual_interest_rate || 8.5}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly EMI (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  name="monthly_emi"
                  defaultValue={modalItem?.monthly_emi || ""}
                  placeholder="e.g. 42000"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Remaining Tenure (Months)</label>
                <input
                  type="number"
                  min="0"
                  name="tenure_remaining_months"
                  defaultValue={modalItem?.tenure_remaining_months || 180}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>
            </div>

            <ModalFooter onCancel={() => setModalType(null)} isSubmitting={isSubmitting} />
          </form>
        </ModalWrapper>
      )}

      {/* 9. Modal: Add / Edit Financial Goal with Live Asset/Investment Alignment */}
      {modalType === "GOAL" && (
        <GoalModalForm
          modalItem={modalItem}
          clientId={clientId}
          visibleAssets={visibleAssets}
          visibleInvestments={visibleInvestments}
          onClose={() => setModalType(null)}
          onSuccess={() => fetch360Data()}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// Reusable Modal Shell Wrapper
function ModalWrapper({
  title,
  children,
  onClose,
  maxWidth = "max-w-lg",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-slate-900 border border-slate-800 rounded-2xl ${maxWidth} w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Comprehensive Goal Modal with Live Asset & Investment Alignment
function GoalModalForm({
  modalItem,
  clientId,
  visibleAssets,
  visibleInvestments,
  onClose,
  onSuccess,
  showToast,
}: {
  modalItem: any;
  clientId: string;
  visibleAssets: any[];
  visibleInvestments: any[];
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [goalName, setGoalName] = useState(modalItem?.goal_name || "");
  const [targetYear, setTargetYear] = useState<number>(Number(modalItem?.target_year) || new Date().getFullYear() + 10);
  const [priority, setPriority] = useState(modalItem?.priority || "High");
  const [targetAmountToday, setTargetAmountToday] = useState<string>(modalItem?.target_amount_today ? String(modalItem.target_amount_today) : "");
  const [currentCorpus, setCurrentCorpus] = useState<string>(modalItem?.current_corpus_allocated ? String(modalItem.current_corpus_allocated) : "0");
  const [inflationRate, setInflationRate] = useState<string>(() => {
    if (!modalItem?.expected_inflation_rate) return "6.0";
    const inf = Number(modalItem.expected_inflation_rate);
    return (inf < 1 ? inf * 100 : inf).toFixed(1);
  });
  const [notes, setNotes] = useState(modalItem?.clean_notes || modalItem?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formTab, setFormTab] = useState<"params" | "assets" | "investments">("params");

  // Initial linked asset IDs
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(() => {
    const list = new Set<string>();
    if (modalItem?.linked_asset_ids && Array.isArray(modalItem.linked_asset_ids)) {
      modalItem.linked_asset_ids.forEach((id: string) => list.add(id));
    }
    if (modalItem?.goal_id) {
      (visibleAssets || []).forEach((a) => {
        if (a.linked_goal_id === modalItem.goal_id) list.add(a.asset_id);
      });
    }
    return Array.from(list);
  });

  // Initial linked investment IDs
  const [selectedInvestmentIds, setSelectedInvestmentIds] = useState<string[]>(() => {
    const list = new Set<string>();
    if (modalItem?.linked_investment_ids && Array.isArray(modalItem.linked_investment_ids)) {
      modalItem.linked_investment_ids.forEach((id: string) => list.add(id));
    }
    if (modalItem?.goal_id) {
      (visibleInvestments || []).forEach((i) => {
        if (i.linked_goal_id === modalItem.goal_id) list.add(i.investment_id);
      });
    }
    return Array.from(list);
  });

  const toggleAsset = (assetId: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };

  const toggleInvestment = (invId: string) => {
    setSelectedInvestmentIds((prev) =>
      prev.includes(invId) ? prev.filter((id) => id !== invId) : [...prev, invId]
    );
  };

  // Calculations
  const currentYear = new Date().getFullYear();
  const validTargetYear = Math.max(currentYear + 1, Number(targetYear) || currentYear + 10);
  const yearsLeft = Math.max(1, validTargetYear - currentYear);
  const pv = Math.max(0, Number(targetAmountToday) || 0);
  const inf = Math.max(0, (Number(inflationRate) || 6) / 100);
  const inflatedTarget = Math.round(pv * Math.pow(1 + inf, yearsLeft));
  const existingCorpusFuture = Math.round((Math.max(0, Number(currentCorpus) || 0)) * Math.pow(1 + 0.10, yearsLeft));

  // Asset projections
  const assetCalculations = useMemo(() => {
    return (visibleAssets || []).map((ast) => {
      const proj = projectAssetProceedsForGoal(ast, validTargetYear);
      return {
        ...ast,
        projectedProceeds: proj.projectedProceeds,
        expectedCagr: proj.expectedCagr,
        isMaturedBeforeGoal: proj.isMaturedBeforeGoal,
      };
    });
  }, [visibleAssets, validTargetYear]);

  const totalAssetProceeds = useMemo(() => {
    return assetCalculations
      .filter((a) => selectedAssetIds.includes(a.asset_id))
      .reduce((sum, a) => sum + (a.projectedProceeds || 0), 0);
  }, [assetCalculations, selectedAssetIds]);

  // Investment projections
  const investmentCalculations = useMemo(() => {
    return (visibleInvestments || []).map((inv) => {
      const proj = projectInvestmentCorpusForGoal(inv, validTargetYear);
      return {
        ...inv,
        totalProjectedCorpus: proj.totalProjectedCorpus,
        projectedLumpSum: proj.projectedLumpSum,
        projectedSipValue: proj.projectedSipValue,
        expectedCagr: proj.expectedCagr,
      };
    });
  }, [visibleInvestments, validTargetYear]);

  const totalInvestmentProceeds = useMemo(() => {
    return investmentCalculations
      .filter((i) => selectedInvestmentIds.includes(i.investment_id))
      .reduce((sum, i) => sum + (i.totalProjectedCorpus || 0), 0);
  }, [investmentCalculations, selectedInvestmentIds]);

  const totalPreFunded = existingCorpusFuture + totalAssetProceeds + totalInvestmentProceeds;
  const netShortfall = Math.max(0, inflatedTarget - totalPreFunded);
  const requiredMonthlySip = netShortfall > 0 ? calculateRequiredMonthlySIP(netShortfall, 11, yearsLeft) : 0;
  const coveragePct = inflatedTarget > 0 ? Math.min(100, Math.round((totalPreFunded / inflatedTarget) * 100)) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim()) {
      showToast("Please enter a goal objective or name.", "error");
      return;
    }
    if (pv <= 0) {
      showToast("Please enter a positive target amount in today's value.", "error");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      goal_id: modalItem?.goal_id,
      goal_name: goalName.trim(),
      target_year: validTargetYear,
      target_amount_today: pv,
      current_corpus_allocated: Number(currentCorpus) || 0,
      expected_inflation_rate: inf,
      priority,
      notes: notes.trim() || null,
      linked_asset_ids: selectedAssetIds,
      linked_investment_ids: selectedInvestmentIds,
      earmarked_proceeds: totalAssetProceeds + totalInvestmentProceeds,
    };

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/clients/${clientId}/goals`, {
        method: modalItem ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to save financial goal.");
      showToast("Goal saved with aligned assets and recalculated feasibility.");
      onClose();
      onSuccess();
    } catch (err: any) {
      showToast(err.message || "Failed to save goal.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalWrapper
      title={modalItem ? `Edit Goal: ${modalItem.goal_name}` : "Define Life Financial Goal & Asset Backing"}
      onClose={onClose}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Live Goal Feasibility & Asset Backing Engine Banner */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Live Feasibility Engine (Horizon: {validTargetYear} • {yearsLeft} yrs)
              </span>
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                coveragePct >= 100
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
              }`}
            >
              {coveragePct}% Pre-funded
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Inflated Target (FV)</div>
              <div className="text-sm font-bold text-white mt-0.5">{formatINR(inflatedTarget)}</div>
              <div className="text-[10px] text-slate-500">at {inflationRate}% inflation</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
              <div className="text-[10px] text-sky-400 uppercase font-semibold">Asset Liquidations</div>
              <div className="text-sm font-bold text-sky-300 mt-0.5">{formatINR(totalAssetProceeds)}</div>
              <div className="text-[10px] text-slate-500">{selectedAssetIds.length} assets earmarked</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
              <div className="text-[10px] text-emerald-400 uppercase font-semibold">Portfolio Proceeds</div>
              <div className="text-sm font-bold text-emerald-300 mt-0.5">{formatINR(totalInvestmentProceeds)}</div>
              <div className="text-[10px] text-slate-500">{selectedInvestmentIds.length} holdings mapped</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
              <div className="text-[10px] text-purple-400 uppercase font-semibold">Net Required SIP</div>
              <div className="text-sm font-bold text-purple-300 mt-0.5">
                {requiredMonthlySip === 0 ? "₹0 / mo" : `${formatINR(requiredMonthlySip)} / mo`}
              </div>
              <div className="text-[10px] text-slate-500">
                {requiredMonthlySip === 0 ? "Fully Pre-Funded!" : `Shortfall: ${formatINR(netShortfall)}`}
              </div>
            </div>
          </div>

          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-purple-500 via-sky-400 to-emerald-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${coveragePct}%` }}
            />
          </div>
        </div>

        {/* Form Mode Sub-Tabs */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            type="button"
            onClick={() => setFormTab("params")}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition -mb-px flex items-center gap-1.5 ${
              formTab === "params"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            <span>1. Goal Parameters</span>
          </button>
          <button
            type="button"
            onClick={() => setFormTab("assets")}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition -mb-px flex items-center gap-1.5 ${
              formTab === "assets"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Home className="h-3.5 w-3.5" />
            <span>2. Earmark Physical Assets ({selectedAssetIds.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFormTab("investments")}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition -mb-px flex items-center gap-1.5 ${
              formTab === "investments"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>3. Earmark Market Portfolio ({selectedInvestmentIds.length})</span>
          </button>
        </div>

        {/* Tab 1: Goal Parameters */}
        {formTab === "params" && (
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Goal Objective / Name *</label>
              <input
                type="text"
                required
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="e.g. Retirement Corpus / Daughter's College Abroad / Buying Villa"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Horizon Year *</label>
                <input
                  type="number"
                  min={currentYear + 1}
                  required
                  value={targetYear}
                  onChange={(e) => setTargetYear(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="High">High (Mandatory)</option>
                  <option value="Medium">Medium (Important)</option>
                  <option value="Low">Low (Aspirational)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Amount in Today&apos;s Value (₹) *</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={targetAmountToday}
                  onChange={(e) => setTargetAmountToday(e.target.value)}
                  placeholder="e.g. 5000000"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Dedicated Existing Cash/Corpus (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={currentCorpus}
                  onChange={(e) => setCurrentCorpus(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Expected Inflation Rate (% p.a.)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={inflationRate}
                  onChange={(e) => setInflationRate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Advisory Notes / Strategy</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. To be funded partially from farm land liquidation"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Earmark Physical Assets */}
        {formTab === "assets" && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Select physical assets to earmark. Compounded at their expected CAGR up to liquidation/target year.
              </span>
              <span className="text-sky-400 font-bold">{formatINR(totalAssetProceeds)} earmarked</span>
            </div>

            {assetCalculations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border border-slate-800 rounded-xl bg-slate-950">
                No physical assets found for this household. Add Real Estate, FDs, or Gold under the Assets tab.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {assetCalculations.map((ast) => {
                  const isChecked = selectedAssetIds.includes(ast.asset_id);
                  const isLinkedOther = ast.linked_goal_id && ast.linked_goal_id !== modalItem?.goal_id;

                  return (
                    <div
                      key={ast.asset_id}
                      onClick={() => toggleAsset(ast.asset_id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-start gap-3 ${
                        isChecked
                          ? "bg-sky-950/30 border-sky-600/50"
                          : "bg-slate-950 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent onClick
                        className="mt-0.5 rounded border-slate-700 text-sky-600 focus:ring-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white truncate">
                            {ast.asset_category} {ast.description ? `— ${ast.description}` : ""}
                          </span>
                          <span className="font-mono font-bold text-sky-400">
                            {formatINR(ast.projectedProceeds)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                          <span>Current: {formatINR(ast.current_market_value)}</span>
                          <span>•</span>
                          <span>CAGR: {ast.expectedCagr}%</span>
                          <span>•</span>
                          <span>
                            Target Liq: {ast.target_liquidation_date ? new Date(ast.target_liquidation_date).toLocaleDateString() : "At Goal Horizon"}
                          </span>
                          {isLinkedOther && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Already linked to another goal
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Earmark Market Portfolio */}
        {formTab === "investments" && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Select investment holdings whose future compounded corpus + ongoing SIP will fund this goal.
              </span>
              <span className="text-emerald-400 font-bold">{formatINR(totalInvestmentProceeds)} earmarked</span>
            </div>

            {investmentCalculations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border border-slate-800 rounded-xl bg-slate-950">
                No market investments found for this household. Add Mutual Funds or Stocks under the Assets tab.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {investmentCalculations.map((inv) => {
                  const isChecked = selectedInvestmentIds.includes(inv.investment_id);
                  const isLinkedOther = inv.linked_goal_id && inv.linked_goal_id !== modalItem?.goal_id;

                  return (
                    <div
                      key={inv.investment_id}
                      onClick={() => toggleInvestment(inv.investment_id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-start gap-3 ${
                        isChecked
                          ? "bg-emerald-950/30 border-emerald-600/50"
                          : "bg-slate-950 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent onClick
                        className="mt-0.5 rounded border-slate-700 text-emerald-600 focus:ring-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white truncate">
                            {inv.scheme_instrument_name}
                          </span>
                          <span className="font-mono font-bold text-emerald-400">
                            {formatINR(inv.totalProjectedCorpus)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                            {inv.asset_class}
                          </span>
                          <span>Current: {formatINR(inv.current_value)}</span>
                          {inv.monthly_sip_amount > 0 && (
                            <span>• SIP: {formatINR(inv.monthly_sip_amount)}/mo</span>
                          )}
                          <span>• Projected CAGR: {inv.expectedCagr}%</span>
                          {isLinkedOther && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Already linked to another goal
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <ModalFooter
          onCancel={onClose}
          isSubmitting={isSubmitting}
          submitLabel={modalItem ? "Save Goal & Recalculate" : "Create Goal & Link Assets"}
        />
      </form>
    </ModalWrapper>
  );
}

// Reusable Modal Footer
function ModalFooter({
  onCancel,
  isSubmitting,
  submitLabel = "Save Changes",
}: {
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel?: string;
}) {
  return (
    <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 border border-slate-800 rounded-lg text-xs text-slate-400 hover:text-white transition"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-sky-600/20 transition disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <span>{submitLabel}</span>
        )}
      </button>
    </div>
  );
}
