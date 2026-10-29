"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Calculator,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Receipt,
  Calendar,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Scale,
  FileText,
  Printer,
  RefreshCw,
  Copy,
  Check,
  Info,
  Sliders,
  User,
  ArrowRight,
  CheckCheck,
  Percent,
  SlidersHorizontal,
  Wallet,
  ShieldCheck,
  AlertCircle,
  Coins,
  Layers,
  ArrowDownToLine,
  Clock,
} from "lucide-react";

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

export default function TaxPlanningPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Loading Tax Planning Engine...</p>
        </div>
      }
    >
      <TaxPlanningContent />
    </Suspense>
  );
}

function TaxPlanningContent() {
  const searchParams = useSearchParams();
  const queryClientId = searchParams?.get("clientId") || "";

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Client and fiscal year controls
  const [selectedClientId, setSelectedClientId] = useState<string>(queryClientId);
  const [fiscalYear, setFiscalYear] = useState<string>("2026-2027");
  const [activeTab, setActiveTab] = useState<"withdrawals" | "regime" | "schedule-cg" | "ai-advisory">("withdrawals");
  const [withdrawalFilter, setWithdrawalFilter] = useState<"ALL" | "LTCG" | "STCG" | "DEBT">("ALL");

  // Interactive Regime Simulator controls
  const [grossIncome, setGrossIncome] = useState<number>(4600000);
  const [showDeductionTuning, setShowDeductionTuning] = useState(false);
  const [sim80C, setSim80C] = useState<number>(150000);
  const [sim80D, setSim80D] = useState<number>(25000);
  const [sim80CCD, setSim80CCD] = useState<number>(50000);
  const [sim24b, setSim24b] = useState<number>(200000);
  const [simHRA, setSimHRA] = useState<number>(120000);
  const [simOther, setSimOther] = useState<number>(0);
  const [regimeComparison, setRegimeComparison] = useState<any>(null);

  // AI Advisory controls
  const [customAiPrompt, setCustomAiPrompt] = useState("");
  const [aiAdvisory, setAiAdvisory] = useState<any>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSavingSuggestion, setIsSavingSuggestion] = useState(false);
  const [savedSuggestionId, setSavedSuggestionId] = useState<string | null>(null);
  const [copiedItemIndex, setCopiedItemIndex] = useState<number | null>(null);

  // Fetch initial tax planning data
  const fetchData = async (clientId?: string, fy?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") || localStorage.getItem("token") : null;
      const url = new URL("/api/planning/tax", window.location.origin);
      if (clientId) url.searchParams.set("clientId", clientId);
      if (fy) url.searchParams.set("fiscalYear", fy);

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed with status ${res.status}`);
      }

      const resData = await res.json();
      setData(resData);
      if (resData.selectedClient) {
        setSelectedClientId(resData.selectedClient.clientId);
        setGrossIncome(resData.selectedClient.annualGrossIncome || 4600000);
      }
      if (resData.baselineDeductions) {
        setSim80C(resData.baselineDeductions.section80C || 150000);
        setSim80D(resData.baselineDeductions.section80D || 25000);
        setSim80CCD(resData.baselineDeductions.section80CCD1B || 50000);
        setSim24b(resData.baselineDeductions.section24b || 200000);
        setSimHRA(resData.baselineDeductions.hraExemption || 120000);
      }
      if (resData.regimeComparison) {
        setRegimeComparison(resData.regimeComparison);
      }
    } catch (err: any) {
      console.error("Tax planning load error:", err);
      setError(err.message || "Failed to load tax planning data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const cid = queryClientId || undefined;
    if (cid) {
      setSelectedClientId(cid);
    }
    fetchData(cid, fiscalYear);
  }, [queryClientId]);

  const handleClientChange = (newId: string) => {
    setSelectedClientId(newId);
    fetchData(newId, fiscalYear);
  };

  const handleFiscalYearChange = (newFy: string) => {
    setFiscalYear(newFy);
    fetchData(selectedClientId, newFy);
  };

  // Recalculate regime simulator dynamically
  const runSimulatorRecalc = async (
    gross = grossIncome,
    c80 = sim80C,
    d80 = sim80D,
    ccd = sim80CCD,
    s24 = sim24b,
    hra = simHRA,
    other = simOther
  ) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") || localStorage.getItem("token") : null;
      const res = await fetch("/api/planning/tax", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          action: "recalculate_regimes",
          grossIncome: gross,
          section80C: c80,
          section80D: d80,
          section80CCD1B: ccd,
          section24b: s24,
          hraExemption: hra,
          otherDeductions: other,
        }),
      });
      const resJson = await res.json();
      if (resJson.success && resJson.comparison) {
        setRegimeComparison(resJson.comparison);
      }
    } catch (err) {
      console.error("Simulator recalculation error:", err);
    }
  };

  // Trigger Gemini AI Advisory generation
  const handleGenerateAiTaxAdvisory = async (saveToSuggestions = false) => {
    if (saveToSuggestions) {
      setIsSavingSuggestion(true);
    } else {
      setIsGeneratingAi(true);
    }

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") || localStorage.getItem("token") : null;
      const res = await fetch("/api/planning/tax", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          action: "generate_ai_tax_advisory",
          clientId: selectedClientId || data?.selectedClient?.clientId,
          clientName: data?.selectedClient?.fullName,
          grossIncome,
          regimeComparison: regimeComparison || data?.regimeComparison,
          ltcgHarvesting: data?.ltcgHarvesting,
          taxLossHarvesting: data?.taxLossHarvesting,
          scheduleCGSummary: {
            totalRealizedSTCG: data?.scheduleCG?.totalRealizedSTCG || 0,
            totalRealizedLTCG: data?.scheduleCG?.totalRealizedLTCG || 0,
            totalCapitalGainsTax: data?.scheduleCG?.totalCapitalGainsTax || 0,
          },
          customInstructions: customAiPrompt,
          saveToSuggestions,
        }),
      });

      const resJson = await res.json();
      if (resJson.success && resJson.advisory) {
        setAiAdvisory(resJson.advisory);
        if (resJson.savedSuggestionId) {
          setSavedSuggestionId(resJson.savedSuggestionId);
        }
      }
    } catch (err) {
      console.error("Gemini AI Tax Advisory error:", err);
    } finally {
      setIsGeneratingAi(false);
      setIsSavingSuggestion(false);
    }
  };

  const copyItemText = (item: any, idx: number) => {
    const text = `Withdrawal Suggestion: ${item.schemeName} (${item.category.replace(/_/g, " ")}). ${item.actionInstructions}`;
    navigator.clipboard.writeText(text);
    setCopiedItemIndex(idx);
    setTimeout(() => setCopiedItemIndex(null), 2500);
  };

  const isAdvisor = data?.isAdvisor !== false;
  const client = data?.selectedClient;
  const comp = regimeComparison || data?.regimeComparison;
  const withdrawal = data?.withdrawalStrategy;
  const scheduleCG = data?.scheduleCG;

  const isNewOptimal = comp?.recommendedRegime === "NEW";

  // Filtered withdrawal suggestions (must be before any early conditional returns to maintain hook order)
  const filteredWithdrawals = useMemo(() => {
    if (!withdrawal) return [];
    if (withdrawalFilter === "LTCG") return withdrawal.equityLtcgFunds || [];
    if (withdrawalFilter === "STCG") return withdrawal.equityStcgFunds || [];
    if (withdrawalFilter === "DEBT") return withdrawal.debtFunds || [];
    return withdrawal.allSuggestions || [];
  }, [withdrawal, withdrawalFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Scanning client holdings, tax regime &amp; withdrawal quotas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-3xl bg-red-950/20 border border-red-500/30 text-center space-y-4 max-w-2xl mx-auto my-12">
        <AlertTriangle className="h-10 w-10 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Tax Planning Data Unavailable</h2>
        <p className="text-xs text-slate-300">{error}</p>
        <button
          onClick={() => fetchData(selectedClientId, fiscalYear)}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4 px-2 sm:px-4">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href={isAdvisor ? "/dashboard/advisor" : "/dashboard/client"} className="hover:text-white transition">
              {isAdvisor ? "Advisor Dashboard" : "My Dashboard"}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/dashboard/planning" className="hover:text-white transition">Planning</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-emerald-400 font-medium">Tax Planning &amp; Withdrawals</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Calculator className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                {isAdvisor ? (
                  <>
                    Tax Planning &amp; Mutual Fund Withdrawal Strategy
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Advisor View
                    </span>
                  </>
                ) : (
                  <>
                    Welcome, {client?.fullName || "Investor"} &bull; Tax Liability &amp; Withdrawal Strategy
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Client View
                    </span>
                  </>
                )}
              </h1>
              <p className="text-xs text-slate-400">
                {isAdvisor
                  ? "Select a client to evaluate regime suitability, total applicable tax, tax-free mutual fund withdrawals, and suggested fund redemptions."
                  : "View your personalized income tax liability, optimal regime recommendation, and tax-free mutual fund withdrawal quota."}
              </p>
            </div>
          </div>
        </div>

        {/* Client & Fiscal Year Selector */}
        <div className="flex items-center gap-3">
          {/* ADVISOR-ONLY: Client Switcher Dropdown (Hidden for Client Login) */}
          {isAdvisor && data?.clientList && data.clientList.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 shadow-sm">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedClientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
              >
                {data.clientList.map((c: any) => (
                  <option key={c.clientId} value={c.clientId} className="bg-slate-900 text-white">
                    {c.fullName} ({formatINR(c.annualIncome)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Fiscal Year Switcher */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 shadow-sm">
            <Calendar className="h-3.5 w-3.5 text-emerald-400" />
            <select
              value={fiscalYear}
              onChange={(e) => handleFiscalYearChange(e.target.value)}
              className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="2026-2027" className="bg-slate-900 text-white">FY 2026-27 (AY 2027-28)</option>
              <option value="2025-2026" className="bg-slate-900 text-white">FY 2025-26 (AY 2026-27)</option>
            </select>
          </div>

          <button
            onClick={() => fetchData(selectedClientId, fiscalYear)}
            title="Refresh Holdings & Tax Exposure"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. FRONT-AND-CENTER TAX LIABILITY & REGIME RECOMMENDATION HERO */}
      {/* ========================================================================= */}
      {comp && (
        <div
          className={`p-6 rounded-3xl border transition shadow-xl relative overflow-hidden ${
            isNewOptimal
              ? "bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/40"
              : "bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border-indigo-500/40"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className={`h-5 w-5 ${isNewOptimal ? "text-emerald-400" : "text-indigo-400"}`} />
                <span
                  className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    isNewOptimal
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                  }`}
                >
                  RECOMMENDED: {isNewOptimal ? "NEW TAX REGIME (SECTION 115BAC)" : "OLD TAX REGIME"}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white">
                Choosing the {isNewOptimal ? "New Tax Regime" : "Old Tax Regime"} saves {isAdvisor ? `${client?.fullName}` : "you"}{" "}
                <span className={isNewOptimal ? "text-emerald-400" : "text-indigo-400"}>
                  {formatINR(comp.taxSavingsWithRecommended)}
                </span>{" "}
                in net annual tax liability.
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                {isNewOptimal
                  ? `For an annual gross income of ${formatINR(
                      grossIncome
                    )}, the New Regime provides a lower total tax liability of ${formatINR(
                      comp.newRegime.totalTax
                    )} (effective rate ${comp.newRegime.effectiveTaxRatePct}%) with ₹75,000 standard deduction and progressive slabs. Eligible Chapter VI-A deductions must exceed ${formatINR(
                      comp.breakevenDeductionsNeededForOldRegime
                    )} to justify opting for the Old Regime.`
                  : `Eligible Chapter VI-A deductions under Section 80C, 80D, 80CCD(1B), and Section 24(b) total ${formatINR(
                      comp.oldRegime.totalDeductions
                    )}, which surpasses the breakeven threshold of ${formatINR(
                      comp.breakevenDeductionsNeededForOldRegime
                    )}. Opting into the Old Regime lowers total tax payable to ${formatINR(
                      comp.oldRegime.totalTax
                    )}.`}
              </p>
            </div>

            {/* Total Applicable Tax Pill */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 shrink-0 text-right space-y-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Total Applicable Tax
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                {formatINR(isNewOptimal ? comp.newRegime.totalTax : comp.oldRegime.totalTax)}
              </div>
              <div className="text-xs text-emerald-400 font-semibold">
                Effective Rate: {isNewOptimal ? comp.newRegime.effectiveTaxRatePct : comp.oldRegime.effectiveTaxRatePct}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MUTUAL FUND TAX-FREE WITHDRAWAL QUOTA CARD */}
      {/* ========================================================================= */}
      {withdrawal && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950/20 to-slate-900 border border-sky-500/30 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                  <ArrowDownToLine className="h-3 w-3" /> Section 112A Tax-Free Quota
                </span>
                <h3 className="text-lg font-bold text-white">
                  Mutual Fund Tax-Free Withdrawal Quota
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                How much {isAdvisor ? `${client?.fullName}` : "you"} can withdraw from mutual funds today with ZERO rupees of tax liability.
              </p>
            </div>

            {/* Total Tax-Free Capacity Big Badge */}
            <div className="bg-slate-950/80 px-5 py-3 rounded-2xl border border-sky-500/40 text-right">
              <div className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">
                Total Tax-Free Cash Withdrawal Capacity
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono">
                {formatINR(withdrawal.totalTaxFreeGrossWithdrawalCapacity)}
              </div>
              <div className="text-[11px] text-slate-300 flex items-center justify-end gap-1 mt-0.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Applicable Tax on this Withdrawal: </span>
                <span className="font-bold text-emerald-400">₹0 (Zero Tax)</span>
              </div>
            </div>
          </div>

          {/* Breakdown Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <div className="text-[11px] text-slate-400">Tax-Free LTCG Quota (Section 112A)</div>
              <div className="text-lg font-bold text-white font-mono">
                {formatINR(withdrawal.totalTaxFreeGainExtracted)} / ₹1,25,000
              </div>
              <div className="text-[10px] text-emerald-400">0% Tax Rate on this gain portion</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <div className="text-[11px] text-slate-400">Principal Cost Basis Returned</div>
              <div className="text-lg font-bold text-white font-mono">
                {formatINR(Math.max(0, withdrawal.totalTaxFreeGrossWithdrawalCapacity - withdrawal.totalTaxFreeGainExtracted))}
              </div>
              <div className="text-[10px] text-slate-400">Untaxed capital return</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <div className="text-[11px] text-slate-400">Permanent Tax Saved via Step-Up</div>
              <div className="text-lg font-bold text-sky-300 font-mono">
                {formatINR(withdrawal.permanentTaxSaved)}
              </div>
              <div className="text-[10px] text-sky-400">12.5% tax permanently saved on future exit</div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab("withdrawals")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            activeTab === "withdrawals"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <ArrowDownToLine className="h-4 w-4" />
          Suggested Fund Withdrawals (LTCG, STCG, Debt &amp; Equity)
        </button>

        <button
          onClick={() => setActiveTab("regime")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            activeTab === "regime"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Scale className="h-4 w-4" />
          Old vs New Regime Slabs &amp; Deductions
        </button>

        <button
          onClick={() => setActiveTab("schedule-cg")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            activeTab === "schedule-cg"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <FileText className="h-4 w-4" />
          Capital Gains Statement (ITR Schedule CG)
        </button>

        <button
          onClick={() => {
            setActiveTab("ai-advisory");
            if (!aiAdvisory) handleGenerateAiTaxAdvisory(false);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            activeTab === "ai-advisory"
              ? "bg-gradient-to-r from-emerald-500/20 to-purple-500/20 text-purple-300 border border-purple-500/40"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Sparkles className="h-4 w-4 text-purple-400" />
          Gemini AI Wealth Tax Advisory Memo
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. TAB 1: SUGGESTED FUND WITHDRAWALS (LTCG, STCG, DEBT & EQUITY) */}
      {/* ========================================================================= */}
      {activeTab === "withdrawals" && (
        <div className="space-y-6">
          {/* Optimal 4-Step Withdrawal Hierarchy */}
          {withdrawal?.hierarchyGuidance && (
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-400" />
                Optimal Mutual Fund Withdrawal Priority Hierarchy
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {withdrawal.hierarchyGuidance.map((step: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-white">{step.title}</div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{step.description}</p>
                    </div>
                    <div className="text-[10px] font-mono font-semibold text-emerald-400 pt-2 border-t border-slate-800/60">
                      {step.taxImplication}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Filter Pills */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold">Filter Asset Category:</span>
              <button
                onClick={() => setWithdrawalFilter("ALL")}
                className={`px-3 py-1 rounded-xl transition ${
                  withdrawalFilter === "ALL"
                    ? "bg-slate-800 text-white font-bold border border-slate-700"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All Schemes ({withdrawal?.allSuggestions?.length || 0})
              </button>
              <button
                onClick={() => setWithdrawalFilter("LTCG")}
                className={`px-3 py-1 rounded-xl transition ${
                  withdrawalFilter === "LTCG"
                    ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Equity LTCG ({withdrawal?.equityLtcgFunds?.length || 0})
              </button>
              <button
                onClick={() => setWithdrawalFilter("STCG")}
                className={`px-3 py-1 rounded-xl transition ${
                  withdrawalFilter === "STCG"
                    ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Equity STCG ({withdrawal?.equityStcgFunds?.length || 0})
              </button>
              <button
                onClick={() => setWithdrawalFilter("DEBT")}
                className={`px-3 py-1 rounded-xl transition ${
                  withdrawalFilter === "DEBT"
                    ? "bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Debt / Section 50AA ({withdrawal?.debtFunds?.length || 0})
              </button>
            </div>

            <div className="text-xs text-slate-400">
              Showing {filteredWithdrawals.length} holdings
            </div>
          </div>

          {/* Categorized Funds Table */}
          {filteredWithdrawals.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Scheme / Folio</th>
                    <th className="py-3 px-4">Asset Class &amp; Category</th>
                    <th className="py-3 px-4 text-right">Holding Value</th>
                    <th className="py-3 px-4 text-right">Gain / (Loss)</th>
                    <th className="py-3 px-4 text-right">Suggested Tax-Free Withdrawal</th>
                    <th className="py-3 px-4 text-right">Tax Rate If Withdrawn</th>
                    <th className="py-3 px-4">Withdrawal Advice &amp; Strategy</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredWithdrawals.map((item: any, idx: number) => {
                    const isLtcg = item.category === "EQUITY_LTCG";
                    const isStcg = item.category === "EQUITY_STCG";
                    const isDebt = item.category === "DEBT_SECTION_50AA";

                    return (
                      <tr key={idx} className="hover:bg-slate-900/40 transition">
                        {/* Scheme */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{item.schemeName}</div>
                          {item.folioNumber && (
                            <div className="text-[10px] text-slate-500">Folio: {item.folioNumber}</div>
                          )}
                        </td>

                        {/* Category Badge */}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isLtcg
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : isStcg
                                ? item.unrealizedGain < 0
                                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                            }`}
                          >
                            {isLtcg ? "Equity LTCG (>1Y)" : isStcg ? "Equity STCG (<1Y)" : "Debt / Sec 50AA"}
                          </span>
                        </td>

                        {/* Holding Value */}
                        <td className="py-3 px-4 text-right font-mono">
                          <div className="text-white font-bold">{formatINR(item.currentValue)}</div>
                          <div className="text-[10px] text-slate-400">Cost: {formatINR(item.investedCost)}</div>
                        </td>

                        {/* Gain */}
                        <td className="py-3 px-4 text-right font-mono">
                          <div
                            className={`font-bold ${
                              item.unrealizedGain >= 0 ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {item.unrealizedGain >= 0 ? "+" : ""}
                            {formatINR(item.unrealizedGain)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {item.holdingPeriodDays} days
                          </div>
                        </td>

                        {/* Suggested Tax-Free Withdrawal */}
                        <td className="py-3 px-4 text-right font-mono">
                          {item.maxTaxFreeWithdrawalAmount > 0 ? (
                            <>
                              <div className="text-white font-bold">{formatINR(item.maxTaxFreeWithdrawalAmount)}</div>
                              <div className="text-[10px] text-emerald-400">
                                Gain: +{formatINR(item.taxFreeGainBooked)} (0% Tax)
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-500 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Tax Rate */}
                        <td className="py-3 px-4 text-right font-mono">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                              item.taxRateIfWithdrawnPct === 0
                                ? "bg-emerald-500/20 text-emerald-300"
                                : item.taxRateIfWithdrawnPct === 20
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-slate-800 text-slate-300"
                            }`}
                          >
                            {item.taxRateIfWithdrawnPct}%
                          </span>
                          {item.estimatedTaxPayable > 0 && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Tax: {formatINR(item.estimatedTaxPayable)}
                            </div>
                          )}
                        </td>

                        {/* Action Instructions */}
                        <td className="py-3 px-4 text-[11px] max-w-sm">
                          <div className="text-slate-300 leading-relaxed">{item.actionInstructions}</div>
                        </td>

                        {/* Copy button */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => copyItemText(item, idx)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition inline-flex items-center gap-1 border border-slate-700"
                          >
                            {copiedItemIndex === idx ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-400" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> Copy
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-400">
              No holdings found matching the selected asset class filter.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB 2: OLD VS NEW REGIME SLABS & DEDUCTIONS */}
      {/* ========================================================================= */}
      {activeTab === "regime" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Scale className="h-5 w-5 text-emerald-400" />
                  Old vs New Regime Liability Simulator
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detailed comparison between Section 115BAC and Old Regime with full Chapter VI-A deductions.
                </p>
              </div>

              <button
                onClick={() => setShowDeductionTuning(!showDeductionTuning)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700 self-start sm:self-auto"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {showDeductionTuning ? "Hide Deduction Controls" : "Tune Old Regime Deductions"}
              </button>
            </div>

            {/* Gross Income Input */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex justify-between mb-2">
                <span>Annual Gross Salary / Business Income</span>
                <span className="text-emerald-400 font-mono text-sm">{formatINR(grossIncome)}</span>
              </label>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-emerald-400 font-mono">₹</span>
                <input
                  type="number"
                  step="50000"
                  value={grossIncome}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setGrossIncome(val);
                    runSimulatorRecalc(val, sim80C, sim80D, sim80CCD, sim24b, simHRA, simOther);
                  }}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* Collapsible Deduction Controls */}
            {showDeductionTuning && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 flex justify-between">
                    <span>Section 80C (EPF/PPF/ELSS, max 1.5L)</span>
                    <span className="text-slate-400 font-mono">{formatINR(sim80C)}</span>
                  </label>
                  <input
                    type="number"
                    max="150000"
                    step="10000"
                    value={sim80C}
                    onChange={(e) => {
                      const val = Math.min(150000, Number(e.target.value));
                      setSim80C(val);
                      runSimulatorRecalc(grossIncome, val, sim80D, sim80CCD, sim24b, simHRA, simOther);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 flex justify-between">
                    <span>Section 80D (Health Insurance, max 1L)</span>
                    <span className="text-slate-400 font-mono">{formatINR(sim80D)}</span>
                  </label>
                  <input
                    type="number"
                    max="100000"
                    step="5000"
                    value={sim80D}
                    onChange={(e) => {
                      const val = Math.min(100000, Number(e.target.value));
                      setSim80D(val);
                      runSimulatorRecalc(grossIncome, sim80C, val, sim80CCD, sim24b, simHRA, simOther);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 flex justify-between">
                    <span>Section 80CCD(1B) (NPS, max 50k)</span>
                    <span className="text-slate-400 font-mono">{formatINR(sim80CCD)}</span>
                  </label>
                  <input
                    type="number"
                    max="50000"
                    step="5000"
                    value={sim80CCD}
                    onChange={(e) => {
                      const val = Math.min(50000, Number(e.target.value));
                      setSim80CCD(val);
                      runSimulatorRecalc(grossIncome, sim80C, sim80D, val, sim24b, simHRA, simOther);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 flex justify-between">
                    <span>Section 24b (Home Loan Interest, max 2L)</span>
                    <span className="text-slate-400 font-mono">{formatINR(sim24b)}</span>
                  </label>
                  <input
                    type="number"
                    max="200000"
                    step="10000"
                    value={sim24b}
                    onChange={(e) => {
                      const val = Math.min(200000, Number(e.target.value));
                      setSim24b(val);
                      runSimulatorRecalc(grossIncome, sim80C, sim80D, sim80CCD, val, simHRA, simOther);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 flex justify-between">
                    <span>Section 10(13A) (HRA Exemption)</span>
                    <span className="text-slate-400 font-mono">{formatINR(simHRA)}</span>
                  </label>
                  <input
                    type="number"
                    step="10000"
                    value={simHRA}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSimHRA(val);
                      runSimulatorRecalc(grossIncome, sim80C, sim80D, sim80CCD, sim24b, val, simOther);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Side by side cards */}
            {comp && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* New Regime Card */}
                <div
                  className={`p-6 rounded-3xl border transition relative ${
                    isNewOptimal
                      ? "bg-slate-900/90 border-emerald-500/60 shadow-xl shadow-emerald-950/30 ring-1 ring-emerald-500/30"
                      : "bg-slate-900/40 border-slate-800"
                  }`}
                >
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-0.5">
                    Section 115BAC
                  </div>
                  <h4 className="text-xl font-black text-white">New Tax Regime</h4>
                  <p className="text-xs text-slate-400">
                    Flat ₹75,000 standard deduction with streamlined slabs
                  </p>

                  <div className="my-4 py-3 border-y border-slate-800 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      Total Applicable Tax Due
                    </div>
                    <div className="text-3xl font-black text-white font-mono">
                      {formatINR(comp.newRegime.totalTax)}
                    </div>
                    <div className="text-xs text-emerald-400 font-semibold">
                      Effective Rate: {comp.newRegime.effectiveTaxRatePct}%
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Gross Income:</span>
                      <span className="text-white font-mono">{formatINR(comp.newRegime.grossIncome)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Standard Deduction:</span>
                      <span className="text-emerald-400 font-mono">-{formatINR(comp.newRegime.standardDeduction)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Taxable Income:</span>
                      <span className="text-white font-mono font-bold">{formatINR(comp.newRegime.taxableIncome)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Slab Tax:</span>
                      <span className="text-white font-mono">{formatINR(comp.newRegime.slabTax)}</span>
                    </div>
                    {comp.newRegime.surcharge > 0 && (
                      <div className="flex justify-between text-slate-400">
                        <span>Surcharge:</span>
                        <span className="text-white font-mono">{formatINR(comp.newRegime.surcharge)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-400">
                      <span>Health &amp; Education Cess (4%):</span>
                      <span className="text-white font-mono">{formatINR(comp.newRegime.cess)}</span>
                    </div>
                  </div>
                </div>

                {/* Old Regime Card */}
                <div
                  className={`p-6 rounded-3xl border transition relative ${
                    !isNewOptimal
                      ? "bg-slate-900/90 border-indigo-500/60 shadow-xl shadow-indigo-950/30 ring-1 ring-indigo-500/30"
                      : "bg-slate-900/40 border-slate-800"
                  }`}
                >
                  <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-0.5">
                    Conventional Slabs
                  </div>
                  <h4 className="text-xl font-black text-white">Old Tax Regime</h4>
                  <p className="text-xs text-slate-400">
                    Utilizes 80C, 80D, 80CCD, Section 24(b) &amp; HRA deductions
                  </p>

                  <div className="my-4 py-3 border-y border-slate-800 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      Total Applicable Tax Due
                    </div>
                    <div className="text-3xl font-black text-white font-mono">
                      {formatINR(comp.oldRegime.totalTax)}
                    </div>
                    <div className="text-xs text-indigo-400 font-semibold">
                      Effective Rate: {comp.oldRegime.effectiveTaxRatePct}%
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Gross Income:</span>
                      <span className="text-white font-mono">{formatINR(comp.oldRegime.grossIncome)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Standard Deduction:</span>
                      <span className="text-emerald-400 font-mono">-{formatINR(comp.oldRegime.standardDeduction)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Total Chapter VI-A Deductions:</span>
                      <span className="text-emerald-400 font-mono">-{formatINR(comp.oldRegime.totalDeductions)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Taxable Income:</span>
                      <span className="text-white font-mono font-bold">{formatINR(comp.oldRegime.taxableIncome)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Slab Tax:</span>
                      <span className="text-white font-mono">{formatINR(comp.oldRegime.slabTax)}</span>
                    </div>
                    {comp.oldRegime.surcharge > 0 && (
                      <div className="flex justify-between text-slate-400">
                        <span>Surcharge:</span>
                        <span className="text-white font-mono">{formatINR(comp.oldRegime.surcharge)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-400">
                      <span>Health &amp; Education Cess (4%):</span>
                      <span className="text-white font-mono">{formatINR(comp.oldRegime.cess)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB 3: CAPITAL GAINS STATEMENT FOR ITR (SCHEDULE CG) */}
      {/* ========================================================================= */}
      {activeTab === "schedule-cg" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-400" />
                  Capital Gains Statement &bull; Schedule CG (ITR-2 / ITR-3)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tax assessment for {client?.fullName || "Client"} (PAN: {client?.pan || "ABCDE1234F"}) for {fiscalYear}.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition flex items-center gap-1.5 border border-slate-700"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Statement
                </button>
              </div>
            </div>

            {/* Schedule CG Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="text-[11px] text-slate-400">Total Realized STCG</div>
                <div className="text-xl font-bold text-white mt-0.5">
                  {formatINR(scheduleCG?.totalRealizedSTCG || 0)}
                </div>
                <div className="text-[10px] text-amber-400 mt-1">Tax: {formatINR(scheduleCG?.taxOnSTCG || 0)} (@ 20%)</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="text-[11px] text-slate-400">Total Realized LTCG</div>
                <div className="text-xl font-bold text-white mt-0.5">
                  {formatINR(scheduleCG?.totalRealizedLTCG || 0)}
                </div>
                <div className="text-[10px] text-emerald-400 mt-1">Tax: {formatINR(scheduleCG?.taxOnLTCG || 0)} (@ 12.5%)</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="text-[11px] text-slate-400">Total Realized Gains</div>
                <div className="text-xl font-bold text-white mt-0.5">
                  {formatINR(scheduleCG?.totalRealizedGains || 0)}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Across all holdings</div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950/30 border border-emerald-500/30">
                <div className="text-[11px] text-slate-300 font-medium">Total Capital Gains Tax Due</div>
                <div className="text-2xl font-black text-emerald-300 mt-0.5">
                  {formatINR(scheduleCG?.totalCapitalGainsTax || 0)}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Payable in advance tax installments</div>
              </div>
            </div>

            {/* Advance Tax Schedule Calendar */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-400" />
                  Statutory Advance Tax Calendar &bull; Section 208/211
                </h4>
                <span className="text-[10px] text-slate-400">
                  Total Tax: {formatINR(scheduleCG?.totalCapitalGainsTax || 0)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {scheduleCG?.advanceTaxSchedule?.map((adv: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-[11px] font-bold text-white">{adv.installment}</div>
                    <div className="text-[10px] text-emerald-400">Due: {adv.dueDate}</div>
                    <div className="text-base font-black text-white font-mono mt-1">
                      {formatINR(adv.amountDue)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Holdings Schedule CG Detailed Table */}
            {scheduleCG?.items && scheduleCG.items.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Scheme / Asset</th>
                      <th className="py-3 px-4">Asset Type</th>
                      <th className="py-3 px-4">Section</th>
                      <th className="py-3 px-4 text-right">Sale / Market Value</th>
                      <th className="py-3 px-4 text-right">Cost of Acquisition</th>
                      <th className="py-3 px-4 text-right">Capital Gain / (Loss)</th>
                      <th className="py-3 px-4 text-right">Tax Rate</th>
                      <th className="py-3 px-4 text-right">Estimated Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {scheduleCG.items.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-900/40 transition">
                        <td className="py-3 px-4 font-semibold text-white">{item.schemeName}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {item.assetType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-emerald-400">
                          Sec {item.section}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-white">
                          {formatINR(item.saleValue)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          {formatINR(item.costValue)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-300">
                          +{formatINR(item.gainOrLoss)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {item.applicableTaxRate}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {formatINR(item.estimatedTax)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB 4: GEMINI AI WEALTH TAX ADVISORY MEMO */}
      {/* ========================================================================= */}
      {activeTab === "ai-advisory" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-purple-500/20 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Google Gemini AI
                  </span>
                  <h3 className="text-lg font-bold text-white">
                    Institutional Tax Planning &amp; Harvesting Strategy Memo
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated CA-grade advisory analyzing post-tax alpha, sequence of redemptions, and Section 112A/111A execution steps.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleGenerateAiTaxAdvisory(false)}
                  disabled={isGeneratingAi}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-lg shadow-purple-600/30 flex items-center gap-2"
                >
                  {isGeneratingAi ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Synthesizing Strategy...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" /> Re-run Gemini AI Analysis
                    </>
                  )}
                </button>

                {isAdvisor && (
                  <button
                    onClick={() => handleGenerateAiTaxAdvisory(true)}
                    disabled={isSavingSuggestion}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/30 flex items-center gap-2"
                  >
                    {isSavingSuggestion ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving...
                      </>
                    ) : savedSuggestionId ? (
                      <>
                        <CheckCheck className="h-3.5 w-3.5" /> Saved to Suggestions
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Save to Client Suggestions
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Custom Advisor Instructions Input */}
            <div className="space-y-1.5 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-purple-400" />
                Special Instructions for Gemini AI (Optional):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Focus on maximizing year-end Section 112A LTCG step-up while keeping exit loads strictly at zero..."
                  value={customAiPrompt}
                  onChange={(e) => setCustomAiPrompt(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={() => handleGenerateAiTaxAdvisory(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* AI Generated Memo Output */}
            {aiAdvisory ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">Engine:</span>
                    <span className="text-purple-300 font-mono">{aiAdvisory.aiModelUsed}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Generated: {new Date(aiAdvisory.analysisTimestamp).toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-purple-950/20 border border-purple-500/30 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-purple-400">
                    Executive Strategy &bull; Post-Tax Alpha Optimization
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    {aiAdvisory.executiveSummary}
                  </p>
                </div>

                {aiAdvisory.regimeStrategy && (
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Regime Selection Strategy: {aiAdvisory.regimeStrategy.recommendedRegime === "NEW" ? "New Tax Regime (Section 115BAC)" : "Old Tax Regime"}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {aiAdvisory.regimeStrategy.rationale}
                    </p>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 text-xs text-slate-400">
                      <span className="font-semibold text-white">Deduction Guidance: </span>
                      {aiAdvisory.regimeStrategy.actionableDeductionGuidance}
                    </div>
                  </div>
                )}

                {aiAdvisory.harvestingRoadmap && aiAdvisory.harvestingRoadmap.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Step-by-Step Execution Roadmap
                    </h4>

                    <div className="space-y-3">
                      {aiAdvisory.harvestingRoadmap.map((step: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row md:items-start justify-between gap-4"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="h-5 w-5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center text-[10px] font-bold">
                                {step.stepNumber || idx + 1}
                              </span>
                              <span className="font-bold text-white text-xs">{step.schemeOrAsset}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {step.statutorySection}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {step.instructions}
                            </p>
                            <div className="text-[11px] text-emerald-400 font-medium">
                              Impact: {step.taxImpact}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[10px] text-slate-500">Target Amount</div>
                            <div className="text-sm font-black text-white font-mono">
                              {formatINR(step.amount)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiAdvisory.itrFilingGuidance && (
                  <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 text-xs space-y-2">
                    <div className="font-bold text-white flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-400" />
                      ITR Compliance: Recommended Form {aiAdvisory.itrFilingGuidance.recommendedItrForm}
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {aiAdvisory.itrFilingGuidance.scheduleCGNotes}
                    </p>
                    <p className="text-slate-400 text-[11px]">
                      {aiAdvisory.itrFilingGuidance.advanceTaxReminder}
                    </p>
                  </div>
                )}

                <div className="text-[10px] text-slate-500 border-t border-slate-800/60 pt-3">
                  {aiAdvisory.advisorDisclaimers}
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-center space-y-3">
                <Sparkles className="h-8 w-8 text-purple-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Generate Gemini AI Strategy Memo</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Click the button above to have Google Gemini synthesize a CA-grade tax optimization advisory based on {client?.fullName}&apos;s holdings and tax regime.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
