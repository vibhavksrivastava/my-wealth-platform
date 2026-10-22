"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  AlertCircle,
  Briefcase,
  ChevronDown,
  ArrowLeft,
  ChevronUp,
  SlidersHorizontal,
  Home,
  Calculator
} from "lucide-react";
import { useFirmBranding } from "@/lib/context/FirmBrandingContext";
import { useFeatureAccess } from "@/lib/useFeatureAccess";
import FinancialCalculators from "@/components/calculators/FinancialCalculators";

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
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="h-8 w-8 text-sky-500 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading mutual fund workspace...</p>
        </div>
      }
    >
      <MutualFundPortfolioContent />
    </Suspense>
  );
}

function MutualFundPortfolioContent() {
  const { terms, isRia } = useFirmBranding();
  const featureAccess = useFeatureAccess("mutual_funds");
  const searchParams = useSearchParams();
  const router = useRouter();

  // User profile
  const [userRole, setUserRole] = useState<string>("CLIENT");
  useEffect(() => {
    try {
      const p = localStorage.getItem("user_profile");
      if (p) {
        const parsed = JSON.parse(p);
        setUserRole(parsed.role || "CLIENT");
      }
    } catch {}
  }, []);

  const isAdvisor = ["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN"].includes(userRole);

  // URL query params
  const paramClientId = searchParams.get("clientId");
  const paramScope = searchParams.get("scope") as "HOUSEHOLD" | "INDIVIDUAL" | null;
  const paramView = searchParams.get("view");

  // Selection states
  const [selectedClientId, setSelectedClientId] = useState<string>(
    paramClientId || (isAdvisor ? "ALL" : "")
  );
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const paramTab = searchParams.get("tab");
  const [scope, setScope] = useState<"HOUSEHOLD" | "INDIVIDUAL">(paramScope || "HOUSEHOLD");
  const [journeyPeriod, setJourneyPeriod] = useState<"1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL">("ALL");

  // Advisor Book Tabs
  const [bookSubTab, setBookSubTab] = useState<"clients" | "households" | "calculators">(
    paramTab === "calculators" ? "calculators" : "clients"
  );

  // Client Detail Tabs
  const [activeTab, setActiveTab] = useState<"holdings" | "transactions" | "sips" | "rebalancing" | "calculators">(
    paramTab === "calculators" ? "calculators" : "holdings"
  );

  useEffect(() => {
    if (paramTab === "calculators") {
      setBookSubTab("calculators");
      setActiveTab("calculators");
    }
  }, [paramTab]);

  // Client Switcher Dropdown in Top Bar
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherSearch, setSwitcherSearch] = useState("");

  // Data fetching state
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Holding Detail Drawer Modal
  const [selectedHolding, setSelectedHolding] = useState<any | null>(null);

  // Search/Filters in Book Overview
  const [bookSearch, setBookSearch] = useState("");

  // Filters for Transactions Tab
  const [txnSearch, setTxnSearch] = useState("");
  const [txnTypeFilter, setTxnTypeFilter] = useState("ALL");
  const [txnMemberFilter, setTxnMemberFilter] = useState("ALL");

  // Filters for Holdings Tab
  const [holdingSearch, setHoldingSearch] = useState("");
  const [holdingClassFilter, setHoldingClassFilter] = useState("ALL");

  // Update selectedClientId if URL query param changes
  useEffect(() => {
    if (paramClientId) {
      setSelectedClientId(paramClientId);
    }
  }, [paramClientId]);

  // Fetch portfolio data from API
  const fetchPortfolio = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      let url = `/api/portfolio/mutual-funds?period=${journeyPeriod}&scope=${scope}`;
      if (selectedClientId === "ALL") {
        url += `&view=BOOK`;
      } else if (selectedClientId) {
        url += `&clientId=${selectedClientId}`;
        if (selectedMemberId) {
          url += `&memberId=${selectedMemberId}`;
        }
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

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
  }, [selectedClientId, selectedMemberId, scope, journeyPeriod]);

  // Handle selecting a specific client
  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedMemberId(null);
    setScope("HOUSEHOLD");
    setSwitcherOpen(false);
  };

  // Handle selecting entire book
  const handleSelectAllBook = () => {
    setSelectedClientId("ALL");
    setSelectedMemberId(null);
    setSwitcherOpen(false);
  };

  // Filtered Clients in Book View
  const filteredBookClients = useMemo(() => {
    if (!portfolioData?.clients) return [];
    return portfolioData.clients.filter((c: any) => {
      const q = bookSearch.toLowerCase();
      return (
        c.clientName.toLowerCase().includes(q) ||
        c.clientCode.toLowerCase().includes(q) ||
        c.householdName.toLowerCase().includes(q) ||
        c.riskProfile.toLowerCase().includes(q)
      );
    });
  }, [portfolioData?.clients, bookSearch]);

  // Filtered Households in Book View
  const filteredBookHouseholds = useMemo(() => {
    if (!portfolioData?.households) return [];
    return portfolioData.households.filter((h: any) => {
      const q = bookSearch.toLowerCase();
      return (
        h.householdName.toLowerCase().includes(q) ||
        h.primaryClientName.toLowerCase().includes(q) ||
        h.members.some((m: any) => m.clientName.toLowerCase().includes(q))
      );
    });
  }, [portfolioData?.households, bookSearch]);

  // Filtered Switcher List
  const filteredSwitcherClients = useMemo(() => {
    const list = portfolioData?.clientsList || portfolioData?.clients || [];
    if (!switcherSearch.trim()) return list;
    const q = switcherSearch.toLowerCase();
    return list.filter(
      (c: any) =>
        c.clientName.toLowerCase().includes(q) ||
        c.householdName.toLowerCase().includes(q)
    );
  }, [portfolioData, switcherSearch]);

  // Filtered Holdings in Client Detail View
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

  // Filtered Transactions in Client Detail View
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

  // Drawer modal transactions for a selected holding
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
            href={isAdvisor ? "/dashboard/advisor" : "/dashboard/client"}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold inline-block transition"
          >
            &larr; Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Determine current active view
  const isBookView = isAdvisor && (selectedClientId === "ALL" || portfolioData?.viewMode === "BOOK");

  // Metrics resolution
  const bookMetrics = portfolioData?.bookMetrics || {
    totalAum: 0,
    purchaseCost: 0,
    unrealizedGain: 0,
    absReturnPct: 0,
    dayChange: 0,
    dayChangePct: 0,
    totalMonthlySip: 0,
    totalActiveSips: 0,
    totalClientsCount: 0,
    totalHouseholdsCount: 0,
    totalHoldingsCount: 0,
    weightedXirr: 0,
  };

  const clientMetrics = portfolioData?.metrics || {
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

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP BAR: ADVISOR CLIENT & HOUSEHOLD SWITCHER RIBBON
      ───────────────────────────────────────────────────────────── */}
      {isAdvisor && (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
              <Briefcase className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Advisor Oversight &bull; Mutual Fund Console
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                {isBookView ? (
                  <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                    <Layers className="h-3.5 w-3.5" /> All Clients Book AUM
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span className="text-slate-500 dark:text-slate-400">Client:</span>
                    <span className="text-sky-600 dark:text-sky-400 font-bold">{portfolioData?.clientName}</span>
                    <span className="text-slate-300 dark:text-slate-600">&bull;</span>
                    <span className="text-slate-500 dark:text-slate-400">Household:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">{portfolioData?.householdName}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Client Selector Dropdown & Actions */}
          <div className="flex items-center gap-2 relative">
            {!isBookView && (
              <button
                onClick={handleSelectAllBook}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
                title="Return to Firm Book Overview"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>All Clients Overview</span>
              </button>
            )}

            {/* Custom Interactive Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setSwitcherOpen(!switcherOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold shadow-sm hover:bg-sky-100 dark:hover:bg-sky-900 transition"
              >
                <Users className="h-3.5 w-3.5 text-sky-500" />
                <span className="max-w-[170px] truncate">
                  {isBookView ? "Switch Client / Household" : portfolioData?.clientName || "Switch Client"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-sky-400" />
              </button>

              {switcherOpen && (
                <div className="absolute right-0 top-10 z-50 w-80 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95">
                  <div className="relative mb-2">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search client or household..."
                      value={switcherSearch}
                      onChange={(e) => setSwitcherSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-1 text-xs">
                    {/* Option: All Clients Overview */}
                    <button
                      onClick={handleSelectAllBook}
                      className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition ${
                        isBookView
                          ? "bg-sky-500 text-white font-bold"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="h-3.5 w-3.5" />
                        <span>All Clients Overview (Book AUM)</span>
                      </div>
                      <span className="text-[10px] opacity-80">Full Book</span>
                    </button>

                    <div className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Individual Clients &amp; Households
                    </div>

                    {filteredSwitcherClients.length === 0 ? (
                      <div className="p-3 text-center text-slate-400 text-[11px]">No matching clients found</div>
                    ) : (
                      filteredSwitcherClients.map((c: any) => (
                        <button
                          key={c.clientId}
                          onClick={() => handleSelectClient(c.clientId)}
                          className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition ${
                            selectedClientId === c.clientId
                              ? "bg-sky-500 text-white font-bold"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          <div>
                            <div className="font-semibold">{c.clientName}</div>
                            <div className="text-[10px] opacity-75">{c.householdName}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-[11px]">{formatINR(c.currentValue)}</div>
                            <div className="text-[9px] opacity-75">{c.holdingsCount} folios</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={fetchPortfolio}
              disabled={isLoading}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition"
              title="Refresh Portfolio"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. VIEW A: ALL CLIENTS BOOK OVERVIEW (When in Book View)
      ───────────────────────────────────────────────────────────── */}
      {isBookView ? (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-sky-900/30 via-indigo-900/20 to-slate-900/40 border border-sky-500/20 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30 uppercase tracking-wider">
                  Firm Mutual Fund Book
                </span>
                <span className="text-xs text-slate-400">
                  {bookMetrics.totalClientsCount} Active Clients &bull; {bookMetrics.totalHouseholdsCount} Households
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
                Consolidated Mutual Fund Portfolio &amp; AUM
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Complete overview of your advisory practice&rsquo;s mutual fund assets under management, daily net movement, ongoing SIP mandates, and family household portfolios.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (portfolioData?.clients?.[0]?.clientId) {
                    handleSelectClient(portfolioData.clients[0].clientId);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/20 transition"
              >
                <span>Drill Down into Client Portfolio</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Top 5 KPI Metrics Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Total MF AUM */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total MF Book AUM
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                {formatINR(bookMetrics.totalAum)}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span>+{formatINR(bookMetrics.unrealizedGain)} (+{bookMetrics.absReturnPct}%)</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Invested: {formatINR(bookMetrics.purchaseCost)}</div>
            </div>

            {/* 2. Monthly SIP Book */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Monthly Active SIP Book
              </div>
              <div className="text-2xl font-black text-indigo-500 dark:text-indigo-400 mt-1 tracking-tight">
                {formatINR(bookMetrics.totalMonthlySip)}/mo
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Repeat className="h-3.5 w-3.5 text-indigo-400" />
                <span>{bookMetrics.totalActiveSips} Active Mandates</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Across all clients</div>
            </div>

            {/* 3. 1-Day Book Change */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                1-Day Net Movement
              </div>
              <div className={`text-2xl font-black mt-1 tracking-tight ${bookMetrics.dayChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {bookMetrics.dayChange >= 0 ? "+" : ""}{formatINR(bookMetrics.dayChange)}
              </div>
              <div className={`mt-1 text-xs font-bold flex items-center gap-1 ${bookMetrics.dayChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {bookMetrics.dayChange >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                <span>+{bookMetrics.dayChangePct}% today</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Daily mark-to-market</div>
            </div>

            {/* 4. Weighted XIRR */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Book Weighted XIRR
              </div>
              <div className="text-2xl font-black text-sky-500 dark:text-sky-400 mt-1 tracking-tight">
                {bookMetrics.weightedXirr}%
              </div>
              <div className="mt-1 text-xs font-semibold text-emerald-500 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Compounded Annualized</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Time-weighted returns</div>
            </div>

            {/* 5. Clients & Households Count */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Client Base
              </div>
              <div className="text-2xl font-black text-amber-500 dark:text-amber-400 mt-1 tracking-tight">
                {bookMetrics.totalClientsCount} <span className="text-sm font-semibold text-slate-400">Clients</span>
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Home className="h-3.5 w-3.5 text-amber-400" />
                <span>{bookMetrics.totalHouseholdsCount} Family Households</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">{bookMetrics.totalHoldingsCount} Total Folios Managed</div>
            </div>
          </div>

          {/* Book AUM Trajectory Journey Chart */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-sky-500" />
                  <span>Firm Mutual Fund Book Growth Trajectory</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Aggregate invested capital vs current market valuation across all managed client folios
                </p>
              </div>

              {/* Time Period Selector */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
                {(["1M", "3M", "6M", "1Y", "3Y", "5Y", "ALL"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setJourneyPeriod(p)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                      journeyPeriod === p
                        ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {p === "ALL" ? "Since Inception" : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Trajectory Timeline Bar Chart */}
            <div className="pt-2">
              <div className="h-48 flex items-end gap-2 sm:gap-3 px-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                {(portfolioData?.trajectory || []).map((pt: any, i: number) => {
                  const maxVal = Math.max(...(portfolioData?.trajectory || []).map((t: any) => t.marketValue), 1);
                  const valHeight = Math.max(12, Math.round((pt.marketValue / maxVal) * 100));
                  const costHeight = Math.max(10, Math.round((pt.investedCost / maxVal) * 100));
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group relative h-full justify-end">
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition absolute -top-16 z-20 pointer-events-none bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-xl border border-slate-700 whitespace-nowrap">
                        <div className="font-bold text-sky-400">{pt.date}</div>
                        <div>AUM: {formatINR(pt.marketValue)}</div>
                        <div className="text-slate-400">Cost: {formatINR(pt.investedCost)}</div>
                      </div>

                      <div className="w-full flex items-end justify-center gap-1 h-full">
                        <div
                          className="w-full max-w-[14px] bg-sky-500 dark:bg-sky-400 rounded-t-sm transition-all duration-300"
                          style={{ height: `${valHeight}%` }}
                        />
                        <div
                          className="w-full max-w-[14px] bg-slate-300 dark:bg-slate-700 rounded-t-sm transition-all duration-300 opacity-60"
                          style={{ height: `${costHeight}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 tracking-tighter truncate w-full text-center">
                        {pt.date}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-sky-500" />
                  <span>Market Valuation (AUM)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-slate-400 opacity-60" />
                  <span>Invested Purchase Cost</span>
                </div>
              </div>
            </div>
          </div>

          {/* Book Sub-Navigation: By Clients vs By Households */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 w-full sm:w-auto">
                <button
                  onClick={() => setBookSubTab("clients")}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                    bookSubTab === "clients"
                      ? "border-sky-500 text-sky-600 dark:text-sky-400"
                      : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Client MF Ledger ({portfolioData?.clients?.length || 0})</span>
                </button>
                <button
                  onClick={() => setBookSubTab("households")}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                    bookSubTab === "households"
                      ? "border-sky-500 text-sky-600 dark:text-sky-400"
                      : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>Family Households ({portfolioData?.households?.length || 0})</span>
                </button>
                <button
                  onClick={() => setBookSubTab("calculators")}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                    bookSubTab === "calculators"
                      ? "border-amber-500 text-amber-600 dark:text-amber-400 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Calculator className="h-3.5 w-3.5 text-amber-500" />
                  <span>Financial Calculators (9)</span>
                </button>
              </div>

              {/* Search Filter */}
              <div className="relative w-full sm:w-72">
                <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by client or household..."
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* TAB 1: ALL CLIENTS TABLE */}
            {bookSubTab === "clients" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3">Client &amp; Code</th>
                      <th className="py-3 px-3">Household</th>
                      <th className="py-3 px-3 text-center">Folios</th>
                      <th className="py-3 px-3 text-right">Invested Cost</th>
                      <th className="py-3 px-3 text-right">Current Value (AUM)</th>
                      <th className="py-3 px-3 text-right">1-Day Change</th>
                      <th className="py-3 px-3 text-right">Returns &bull; XIRR</th>
                      <th className="py-3 px-3 text-right">Monthly SIP</th>
                      <th className="py-3 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredBookClients.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          No matching clients found in your advisory book.
                        </td>
                      </tr>
                    ) : (
                      filteredBookClients.map((client: any) => (
                        <tr
                          key={client.clientId}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group cursor-pointer"
                          onClick={() => handleSelectClient(client.clientId)}
                        >
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{client.clientName}</span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {client.relationship}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {client.clientCode} &bull; {client.riskProfile}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              <Home className="h-3 w-3" />
                              {client.householdName}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                            {client.holdingsCount}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-600 dark:text-slate-400">
                            {formatINR(client.purchaseCost)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                            {formatINR(client.currentValue)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`font-semibold ${client.dayChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                              {client.dayChange >= 0 ? "+" : ""}{formatINR(client.dayChange)}
                            </span>
                            <div className="text-[10px] text-slate-400">+{client.dayChangePct}%</div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold text-emerald-500">
                              +{formatINR(client.unrealizedGain)}
                            </div>
                            <div className="text-[10px] font-bold text-sky-500">
                              XIRR: {client.xirr}%
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold text-indigo-500">
                              {formatINR(client.monthlySipAmount)}/mo
                            </div>
                            <div className="text-[10px] text-slate-400">{client.activeSipsCount} SIPs</div>
                          </td>
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleSelectClient(client.clientId)}
                              className="px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/80 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 text-xs font-bold transition flex items-center gap-1 mx-auto"
                            >
                              <span>View Portfolio</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: HOUSEHOLDS TABLE */}
            {bookSubTab === "households" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3">Household Name</th>
                      <th className="py-3 px-3">Family Members</th>
                      <th className="py-3 px-3 text-center">Total Folios</th>
                      <th className="py-3 px-3 text-right">Consolidated Cost</th>
                      <th className="py-3 px-3 text-right">Total Household AUM</th>
                      <th className="py-3 px-3 text-right">1-Day Change</th>
                      <th className="py-3 px-3 text-right">Household XIRR</th>
                      <th className="py-3 px-3 text-right">Monthly SIP Book</th>
                      <th className="py-3 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredBookHouseholds.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          No matching family households found.
                        </td>
                      </tr>
                    ) : (
                      filteredBookHouseholds.map((hh: any) => (
                        <tr
                          key={hh.householdId}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group cursor-pointer"
                          onClick={() => {
                            const firstMember = hh.members[0];
                            if (firstMember) handleSelectClient(firstMember.clientId);
                          }}
                        >
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Home className="h-3.5 w-3.5 text-amber-500" />
                              <span>{hh.householdName}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Primary: {hh.primaryClientName}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1">
                              {hh.members.map((m: any) => (
                                <span
                                  key={m.clientId}
                                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                >
                                  {m.clientName} ({m.relationship || "Member"})
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                            {hh.totalHoldingsCount}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-600 dark:text-slate-400">
                            {formatINR(hh.purchaseCost)}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">
                            {formatINR(hh.currentValue)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-semibold text-emerald-500">
                              +{formatINR(hh.dayChange)}
                            </span>
                            <div className="text-[10px] text-slate-400">+{hh.dayChangePct}%</div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold text-sky-500">{hh.xirr}%</div>
                            <div className="text-[10px] text-emerald-500">+{formatINR(hh.unrealizedGain)}</div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold text-indigo-500">
                              {formatINR(hh.monthlySipAmount)}/mo
                            </div>
                            <div className="text-[10px] text-slate-400">{hh.activeSipsCount} SIPs</div>
                          </td>
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                const firstMember = hh.members[0];
                                if (firstMember) handleSelectClient(firstMember.clientId);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/80 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 text-xs font-bold transition flex items-center gap-1 mx-auto"
                            >
                              <span>View Household</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: FINANCIAL CALCULATORS */}
            {bookSubTab === "calculators" && (
              <div className="pt-2">
                <FinancialCalculators />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            3. VIEW B: DETAILED CLIENT & HOUSEHOLD MUTUAL FUND PORTFOLIO
        ───────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Header Card with Client & Household Information */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 uppercase tracking-wider">
                    {terms.serviceLabel} Mutual Fund Portfolio
                  </span>
                  {portfolioData?.householdName && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Home className="h-3 w-3" />
                      {portfolioData.householdName}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 tracking-tight flex items-center gap-2">
                  <span>{portfolioData?.clientName || "Client Portfolio"}</span>
                  <span className="text-xs font-normal text-slate-400">
                    &bull; {scope === "HOUSEHOLD" ? "Consolidated Household View" : "Individual Member View"}
                  </span>
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Active scheme holdings, daily net gain/loss, SIP mandates, and portfolio rebalancing.
                </p>
              </div>

              {/* Household Scope Pills Bar */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setScope("HOUSEHOLD");
                    setSelectedMemberId(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm border ${
                    scope === "HOUSEHOLD" && !selectedMemberId
                      ? "bg-sky-500 text-white border-sky-600"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>Entire Household ({portfolioData?.householdMembers?.length || 1})</span>
                </button>

                {(portfolioData?.householdMembers || []).map((m: any) => (
                  <button
                    key={m.client_id}
                    onClick={() => {
                      setScope("INDIVIDUAL");
                      setSelectedMemberId(m.client_id);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                      scope === "INDIVIDUAL" && selectedMemberId === m.client_id
                        ? "bg-sky-500 text-white border-sky-600 font-bold shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>{m.full_name} ({m.relationship_to_primary || "Self"})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Top 5 KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
              {/* Purchase Cost */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Consolidated Purchase Cost
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatINR(clientMetrics.purchaseCost)}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Total invested capital</div>
              </div>

              {/* Current Value */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Current Market Value
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {formatINR(clientMetrics.currentValue)}
                </div>
                <div className="text-[10px] text-emerald-500 font-bold mt-1">
                  +{formatINR(clientMetrics.unrealizedGain)} (+{clientMetrics.absReturnPct}%)
                </div>
              </div>

              {/* 1-Day Change */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  1-Day Gain / Loss
                </div>
                <div className={`text-lg font-bold mt-0.5 ${clientMetrics.dayChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {clientMetrics.dayChange >= 0 ? "+" : ""}{formatINR(clientMetrics.dayChange)}
                </div>
                <div className={`text-[10px] font-bold mt-1 flex items-center gap-0.5 ${clientMetrics.dayChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {clientMetrics.dayChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  <span>+{clientMetrics.dayChangePct}% today</span>
                </div>
              </div>

              {/* Annualized XIRR */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Portfolio XIRR
                </div>
                <div className="text-lg font-bold text-sky-500 dark:text-sky-400 mt-0.5">
                  {clientMetrics.xirr}%
                </div>
                <div className="text-[10px] text-emerald-500 font-semibold mt-1">
                  SIP compounded returns
                </div>
              </div>

              {/* Active SIP Commitment */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Monthly SIP Commitment
                </div>
                <div className="text-lg font-bold text-indigo-500 dark:text-indigo-400 mt-0.5">
                  {formatINR(clientMetrics.totalSipBook)}/mo
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {portfolioData?.sips?.length || 0} active mandates
                </div>
              </div>
            </div>
          </div>

          {/* Portfolio Journey Chart */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-sky-500" />
                  <span>Portfolio Journey &amp; Growth Trajectory</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tracking cumulative invested cost versus market valuation compounding over time
                </p>
              </div>

              {/* Time Period Selector */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
                {(["1M", "3M", "6M", "1Y", "3Y", "5Y", "ALL"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setJourneyPeriod(p)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                      journeyPeriod === p
                        ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {p === "ALL" ? "Since Inception" : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Trajectory Bar Chart */}
            <div className="pt-2">
              <div className="h-44 flex items-end gap-2 sm:gap-3 px-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                {(portfolioData?.trajectory || []).map((pt: any, i: number) => {
                  const maxVal = Math.max(...(portfolioData?.trajectory || []).map((t: any) => t.marketValue), 1);
                  const valHeight = Math.max(12, Math.round((pt.marketValue / maxVal) * 100));
                  const costHeight = Math.max(10, Math.round((pt.investedCost / maxVal) * 100));
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group relative h-full justify-end">
                      <div className="opacity-0 group-hover:opacity-100 transition absolute -top-16 z-20 pointer-events-none bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-xl border border-slate-700 whitespace-nowrap">
                        <div className="font-bold text-sky-400">{pt.date}</div>
                        <div>Value: {formatINR(pt.marketValue)}</div>
                        <div className="text-slate-400">Cost: {formatINR(pt.investedCost)}</div>
                      </div>

                      <div className="w-full flex items-end justify-center gap-1 h-full">
                        <div
                          className="w-full max-w-[14px] bg-sky-500 dark:bg-sky-400 rounded-t-sm transition-all duration-300"
                          style={{ height: `${valHeight}%` }}
                        />
                        <div
                          className="w-full max-w-[14px] bg-slate-300 dark:bg-slate-700 rounded-t-sm transition-all duration-300 opacity-60"
                          style={{ height: `${costHeight}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 tracking-tighter truncate w-full text-center">
                        {pt.date}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-sky-500" />
                  <span>Market Valuation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-slate-400 opacity-60" />
                  <span>Invested Cost</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Detailed Tabs: Holdings | Transactions | All my SIPs | Rebalancing */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-5">
            {/* Tab Headers */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
              <button
                onClick={() => setActiveTab("holdings")}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition shrink-0 ${
                  activeTab === "holdings"
                    ? "border-sky-500 text-sky-600 dark:text-sky-400"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Holdings ({portfolioData?.holdings?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab("transactions")}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition shrink-0 ${
                  activeTab === "transactions"
                    ? "border-sky-500 text-sky-600 dark:text-sky-400"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Transactions Ledger ({portfolioData?.transactions?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab("sips")}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition shrink-0 ${
                  activeTab === "sips"
                    ? "border-sky-500 text-sky-600 dark:text-sky-400"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Repeat className="h-3.5 w-3.5" />
                <span>All my SIPs ({portfolioData?.sips?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab("rebalancing")}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition shrink-0 ${
                  activeTab === "rebalancing"
                    ? "border-sky-500 text-sky-600 dark:text-sky-400"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Scale className="h-3.5 w-3.5" />
                <span>Portfolio Rebalancing</span>
              </button>

              <button
                onClick={() => setActiveTab("calculators")}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition shrink-0 ${
                  activeTab === "calculators"
                    ? "border-amber-500 text-amber-600 dark:text-amber-400 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Calculator className="h-3.5 w-3.5 text-amber-500" />
                <span>Financial &amp; MF Calculators (9)</span>
              </button>
            </div>

            {/* TAB 1: HOLDINGS TABLE */}
            {activeTab === "holdings" && (
              <div className="space-y-4">
                {/* Search & Category Filter Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search schemes, folios, or members..."
                      value={holdingSearch}
                      onChange={(e) => setHoldingSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto">
                    {["ALL", "Large Cap", "Mid Cap", "Flexi Cap", "Debt", "Hybrid"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setHoldingClassFilter(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
                          holdingClassFilter === cat
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent font-bold"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table */}
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
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {filteredHoldings.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-slate-400">
                            No holdings match your search criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredHoldings.map((h: any) => (
                          <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group">
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900 dark:text-white max-w-xs">{h.schemeName}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">{h.assetClass}</div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                <User className="h-3 w-3" />
                                {h.clientName}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {h.folioNumber}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                              {h.units.toLocaleString("en-IN", { maximumFractionDigits: 3 })}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="font-bold text-slate-900 dark:text-white">₹{h.currentNav}</div>
                              <div className="text-[10px] text-slate-400">Avg: ₹{h.avgNav}</div>
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-slate-600 dark:text-slate-400">
                              {formatINR(h.investedCost)}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                              {formatINR(h.currentValue)}
                              <div className="text-[10px] font-bold text-emerald-500">
                                +{formatINR(h.unrealizedGain)} (+{h.absReturnPct}%)
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className={`font-semibold ${h.dayChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                {h.dayChange >= 0 ? "+" : ""}{formatINR(h.dayChange)}
                              </span>
                              <div className="text-[10px] text-slate-400">+{h.dayChangePct}%</div>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="font-bold text-slate-900 dark:text-white">{h.cagr}%</div>
                              <div className="text-[10px] text-sky-500 font-bold">XIRR: {h.xirr}%</div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => setSelectedHolding(h)}
                                className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900 transition flex items-center gap-1 mx-auto shadow-sm"
                              >
                                <span>Txns</span>
                                <ChevronRight className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: TRANSACTIONS TAB */}
            {activeTab === "transactions" && (
              <div className="space-y-4">
                {/* Search & Filter Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search transactions or folios..."
                      value={txnSearch}
                      onChange={(e) => setTxnSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">Type:</span>
                    <select
                      value={txnTypeFilter}
                      onChange={(e) => setTxnTypeFilter(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="ALL">All Types (SIP, Purchase, Switch)</option>
                      <option value="SIP">SIP Only</option>
                      <option value="PURCHASE">Lumpsum Purchase</option>
                      <option value="REDEMPTION">Redemption</option>
                      <option value="SWITCH">Switch / Transfer</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">Member:</span>
                    <select
                      value={txnMemberFilter}
                      onChange={(e) => setTxnMemberFilter(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="ALL">All Family Members</option>
                      {(portfolioData?.householdMembers || []).map((m: any) => (
                        <option key={m.client_id} value={m.full_name}>
                          {m.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Scheme Name</th>
                        <th className="py-3 px-3">Folio</th>
                        <th className="py-3 px-3">Investor</th>
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3 text-right">Units</th>
                        <th className="py-3 px-3 text-right">NAV</th>
                        <th className="py-3 px-3 text-right">Amount</th>
                        <th className="py-3 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            No transactions match your search filter.
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((t: any) => (
                          <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                            <td className="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400 font-mono">
                              {t.date}
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                              {t.schemeName}
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{t.folioNumber}</td>
                            <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{t.clientName}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  t.type === "SIP"
                                    ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                                    : t.type === "PURCHASE"
                                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                }`}
                              >
                                {t.type}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-medium">
                              {t.units.toLocaleString("en-IN", { maximumFractionDigits: 3 })}
                            </td>
                            <td className="py-3 px-3 text-right font-mono">₹{t.nav}</td>
                            <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                              {formatINR(t.amount)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
                                <CheckCircle2 className="h-3 w-3" />
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
            )}

            {/* TAB 3: ALL MY SIPS TAB */}
            {activeTab === "sips" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center">
                      <Repeat className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Active SIP Mandates Overview</h4>
                      <p className="text-[11px] text-slate-500">
                        Monthly recurring investments automatically debited via NACH e-mandate.
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-indigo-500">
                      {formatINR(clientMetrics.totalSipBook)}/mo
                    </div>
                    <div className="text-[10px] text-slate-400">Total Commitment</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(portfolioData?.sips || []).map((sip: any) => (
                    <div
                      key={sip.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider">
                            {sip.status}
                          </span>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white mt-1.5 leading-snug">
                            {sip.schemeName}
                          </h4>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">Folio: {sip.folioNumber}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-black text-slate-900 dark:text-white">
                            {formatINR(sip.monthlyAmount)}
                          </div>
                          <div className="text-[10px] text-slate-400">{sip.frequency}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                        <div>
                          <span className="text-slate-400">SIP Day:</span>
                          <div className="font-semibold text-slate-700 dark:text-slate-300">
                            {sip.sipDay}th of every month
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400">Next Execution:</span>
                          <div className="font-semibold text-sky-500">{sip.nextDueDate}</div>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400">Mandate Bank:</span>
                          <div className="font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mt-0.5">
                            <Building className="h-3 w-3 text-slate-400" />
                            <span>{sip.mandateBank}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: REBALANCING TAB */}
            {activeTab === "rebalancing" && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Scale className="h-4 w-4 text-sky-500" />
                      <span>Model Allocation vs. Actual Portfolio Distribution</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Compares current mutual fund asset class exposure with the client&rsquo;s strategic asset allocation target.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/10 text-sky-500 border border-sky-500/20">
                      Standard Aggressive Model
                    </span>
                  </div>
                </div>

                {/* Allocation Matrix Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Equity */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">Equity Funds</span>
                      <span className="font-mono text-slate-500">Target: {portfolioData?.rebalancing?.target?.equity}%</span>
                    </div>
                    <div className="text-2xl font-black text-sky-500">
                      {portfolioData?.rebalancing?.current?.equity}%
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full"
                        style={{ width: `${Math.min(100, portfolioData?.rebalancing?.current?.equity || 0)}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Value: {formatINR(portfolioData?.rebalancing?.current?.equityValue || 0)}</span>
                      <span className="font-bold text-amber-500">
                        Deviation: {portfolioData?.rebalancing?.deviations?.equity > 0 ? "+" : ""}
                        {portfolioData?.rebalancing?.deviations?.equity}%
                      </span>
                    </div>
                  </div>

                  {/* Debt */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">Debt / Fixed Income</span>
                      <span className="font-mono text-slate-500">Target: {portfolioData?.rebalancing?.target?.debt}%</span>
                    </div>
                    <div className="text-2xl font-black text-indigo-500">
                      {portfolioData?.rebalancing?.current?.debt}%
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min(100, portfolioData?.rebalancing?.current?.debt || 0)}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Value: {formatINR(portfolioData?.rebalancing?.current?.debtValue || 0)}</span>
                      <span className="font-bold text-indigo-400">
                        Deviation: {portfolioData?.rebalancing?.deviations?.debt > 0 ? "+" : ""}
                        {portfolioData?.rebalancing?.deviations?.debt}%
                      </span>
                    </div>
                  </div>

                  {/* Hybrid */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">Hybrid / Balanced</span>
                      <span className="font-mono text-slate-500">Target: {portfolioData?.rebalancing?.target?.hybrid}%</span>
                    </div>
                    <div className="text-2xl font-black text-emerald-500">
                      {portfolioData?.rebalancing?.current?.hybrid}%
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min(100, portfolioData?.rebalancing?.current?.hybrid || 0)}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Value: {formatINR(portfolioData?.rebalancing?.current?.hybridValue || 0)}</span>
                      <span className="font-bold text-emerald-500">
                        Deviation: {portfolioData?.rebalancing?.deviations?.hybrid > 0 ? "+" : ""}
                        {portfolioData?.rebalancing?.deviations?.hybrid}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recommended Shifts Action Plan */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Recommended Investment Shifts &amp; Rebalancing Plan
                  </h4>

                  {(portfolioData?.rebalancing?.shiftsNeeded || []).length === 0 ? (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        Portfolio is aligned within acceptable risk tolerance (&plusmn;3% threshold). No rebalancing required at this moment.
                      </span>
                    </div>
                  ) : (
                    portfolioData.rebalancing.shiftsNeeded.map((shift: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 shadow-sm space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider">
                            {shift.action}
                          </span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            Shift {formatINR(shift.recommendedAmount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <span className="text-slate-500">From:</span>
                          <span className="text-rose-500">{shift.sourceAssetClass}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-slate-500">Into:</span>
                          <span className="text-emerald-500">{shift.targetAssetClass}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{shift.rational}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: FINANCIAL CALCULATORS */}
            {activeTab === "calculators" && (
              <div className="pt-2">
                <FinancialCalculators />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. HOLDING DETAIL TRANSACTIONS SLIDE-OVER DRAWER MODAL
      ───────────────────────────────────────────────────────────── */}
      {selectedHolding && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-500 border border-sky-500/20 uppercase tracking-wider">
                    Holding Details &bull; Folio Ledger
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5 leading-snug">
                    {selectedHolding.schemeName}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    Folio: {selectedHolding.folioNumber} &bull; Owner: {selectedHolding.clientName}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedHolding(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Holding Key Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase">Market Value</span>
                  <div className="font-bold text-slate-900 dark:text-white">{formatINR(selectedHolding.currentValue)}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase">Invested Cost</span>
                  <div className="font-semibold text-slate-600 dark:text-slate-300">{formatINR(selectedHolding.investedCost)}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase">Current NAV</span>
                  <div className="font-bold text-sky-500">₹{selectedHolding.currentNav}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase">XIRR</span>
                  <div className="font-bold text-emerald-500">{selectedHolding.xirr}%</div>
                </div>
              </div>

              {/* Transactions for this holding */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Transaction History ({holdingTransactions.length})</span>
                  <span className="text-[10px] text-slate-400">All Purchases, SIPs &amp; Dividends</span>
                </h4>

                {holdingTransactions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    No specific transaction records found for this folio.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {holdingTransactions.map((tx: any) => (
                      <div
                        key={tx.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                tx.type === "SIP"
                                  ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                                  : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              }`}
                            >
                              {tx.type}
                            </span>
                            <span className="font-mono text-slate-400">{tx.date}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {tx.units} Units @ NAV ₹{tx.nav}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900 dark:text-white">{formatINR(tx.amount)}</div>
                          <span className="text-[10px] text-emerald-500 font-semibold">{tx.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedHolding(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
