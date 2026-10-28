"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import {
  Calculator,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Receipt,
  Calendar,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ShieldCheck,
  Scale,
  FileText,
  Download,
  Printer,
  RefreshCw,
  Copy,
  Check,
  Info,
  Sliders,
  User,
  Wallet,
  ArrowUpRight,
  SlidersHorizontal,
  ChevronDown,
  BadgePercent,
  CheckCheck,
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
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Client and fiscal year controls
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [fiscalYear, setFiscalYear] = useState<string>("2026-2027");
  const [activeTab, setActiveTab] = useState<"harvesting" | "simulator" | "schedule-cg" | "ai-advisory">("harvesting");

  // Simulator controls
  const [simGrossIncome, setSimGrossIncome] = useState<number>(4600000);
  const [sim80C, setSim80C] = useState<number>(150000);
  const [sim80D, setSim80D] = useState<number>(25000);
  const [sim80CCD, setSim80CCD] = useState<number>(50000);
  const [sim24b, setSim24b] = useState<number>(200000);
  const [simHRA, setSimHRA] = useState<number>(120000);
  const [simOther, setSimOther] = useState<number>(0);
  const [simComparison, setSimComparison] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // AI Advisory controls
  const [customAiPrompt, setCustomAiPrompt] = useState("");
  const [aiAdvisory, setAiAdvisory] = useState<any>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSavingSuggestion, setIsSavingSuggestion] = useState(false);
  const [savedSuggestionId, setSavedSuggestionId] = useState<string | null>(null);
  const [copiedTradeIndex, setCopiedTradeIndex] = useState<number | null>(null);

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
        setSimGrossIncome(resData.selectedClient.annualGrossIncome || 4600000);
      }
      if (resData.baselineDeductions) {
        setSim80C(resData.baselineDeductions.section80C || 150000);
        setSim80D(resData.baselineDeductions.section80D || 25000);
        setSim80CCD(resData.baselineDeductions.section80CCD1B || 50000);
        setSim24b(resData.baselineDeductions.section24b || 200000);
        setSimHRA(resData.baselineDeductions.hraExemption || 120000);
      }
      if (resData.regimeComparison) {
        setSimComparison(resData.regimeComparison);
      }
    } catch (err: any) {
      console.error("Tax planning load error:", err);
      setError(err.message || "Failed to load tax planning data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
    gross = simGrossIncome,
    c80 = sim80C,
    d80 = sim80D,
    ccd = sim80CCD,
    s24 = sim24b,
    hra = simHRA,
    other = simOther
  ) => {
    setIsSimulating(true);
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
        setSimComparison(resJson.comparison);
      }
    } catch (err) {
      console.error("Simulator recalculation error:", err);
    } finally {
      setIsSimulating(false);
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
          grossIncome: simGrossIncome,
          regimeComparison: simComparison || data?.regimeComparison,
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

  const copyTrade = (trade: any, index: number) => {
    const text = `Trade Recommendation: Redeem ${trade.unitsToRedeem} units (${formatINR(
      trade.redeemAmount
    )}) of ${trade.schemeName} to harvest ${formatINR(
      trade.gainBookedTaxFree
    )} tax-free LTCG under Section 112A. Reinvest into ${trade.reinvestmentScheme} to step up NAV base.`;
    navigator.clipboard.writeText(text);
    setCopiedTradeIndex(index);
    setTimeout(() => setCopiedTradeIndex(null), 2500);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Scanning client holdings &amp; capital gains tax exposure...</p>
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

  const client = data?.selectedClient;
  const ltcg = data?.ltcgHarvesting;
  const tlh = data?.taxLossHarvesting;
  const comp = simComparison || data?.regimeComparison;
  const scheduleCG = data?.scheduleCG;

  // LTCG Headroom percentage
  const ltcgHeadroomPct = ltcg
    ? Math.min(100, Math.round(((ltcg.annualExemptionLimit - ltcg.remainingExemptionHeadroom) / ltcg.annualExemptionLimit) * 100))
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4 px-2 sm:px-4">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/dashboard/advisor" className="hover:text-white transition">Dashboard</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/dashboard/planning" className="hover:text-white transition">Planning</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-emerald-400 font-medium">Capital Gains &amp; Tax Alpha</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Calculator className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Capital Gains Optimization &amp; Tax-Loss Harvesting
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Engine
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Algorithmic Section 112A LTCG step-up, Section 111A loss-harvesting scanner &amp; Section 115BAC liability simulator
              </p>
            </div>
          </div>
        </div>

        {/* Client & Fiscal Year Selector */}
        <div className="flex items-center gap-3">
          {/* Client Switcher */}
          {data?.clientList && data.clientList.length > 0 && (
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

      {/* Top Level KPI Alpha Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Post-Tax Alpha */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 border border-emerald-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Total Post-Tax Alpha</span>
            <Sparkles className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300">
            {formatINR(data?.totalTaxSavedAlpha || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            LTCG step-up gains + loss offset savings
          </p>
        </div>

        {/* Metric 2: Section 112A LTCG Headroom */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 relative">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Section 112A Headroom</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ₹1.25L Window
            </span>
          </div>
          <div className="text-2xl font-black text-white">
            {formatINR(ltcg?.remainingExemptionHeadroom || 125000)}
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, ltcgHeadroomPct)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1 flex justify-between">
            <span>Utilized: {formatINR(ltcg?.utilizedExemptionThisFY || 0)}</span>
            <span>Annual Cap: ₹1,25,000</span>
          </p>
        </div>

        {/* Metric 3: Tax Loss Harvesting Alpha */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Loss Harvest Scanner</span>
            <TrendingDown className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300">
            {formatINR(tlh?.totalTaxAlphaPotential || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {tlh?.opportunities?.length || 0} schemes &bull; {formatINR(tlh?.totalUnrealizedLosses || 0)} gross loss
          </p>
        </div>

        {/* Metric 4: Optimal Regime Recommendation */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Optimal Tax Regime</span>
            <Scale className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xl font-black text-white">
              {comp?.recommendedRegime === "NEW" ? "New Regime (115BAC)" : "Old Tax Regime"}
            </span>
          </div>
          <p className="text-[11px] text-emerald-400 font-medium mt-1">
            Saves {formatINR(comp?.taxSavingsWithRecommended || 0)} vs alternate
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab("harvesting")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            activeTab === "harvesting"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Tax-Loss &amp; LTCG Harvesting Scanner
        </button>

        <button
          onClick={() => setActiveTab("simulator")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            activeTab === "simulator"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Scale className="h-4 w-4" />
          Old vs New Regime Simulator
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
          Gemini AI Wealth Tax Advisory
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TAX-LOSS & LTCG HARVESTING SCANNER */}
      {/* ========================================================================= */}
      {activeTab === "harvesting" && (
        <div className="space-y-6">
          {/* Section A: Year-End LTCG Harvesting (₹1,25,000 Tax-Free Window) */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Section 112A
                  </span>
                  <h2 className="text-lg font-bold text-white">
                    Year-End LTCG Harvesting (₹1,25,000 Annual Tax-Free Window)
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Redeem appreciated equity holdings to lock in up to ₹1,25,000 tax-free gains every financial year, then immediately re-buy to step up the NAV cost base.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800 text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Harvestable Headroom</div>
                  <div className="text-sm font-bold text-emerald-400">
                    {formatINR(ltcg?.harvestableGain || 0)}
                  </div>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div>
                  <div className="text-[10px] text-slate-400">Permanent Tax Saved</div>
                  <div className="text-sm font-bold text-white">
                    {formatINR(Math.round((ltcg?.harvestableGain || 0) * 0.125))}
                  </div>
                </div>
              </div>
            </div>

            {/* Trades Table */}
            {ltcg?.recommendedTrades && ltcg.recommendedTrades.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Scheme / Holding</th>
                      <th className="py-3 px-4 text-right">Units to Redeem</th>
                      <th className="py-3 px-4 text-right">Target Redeem Value</th>
                      <th className="py-3 px-4 text-right">Tax-Free Gain Booked</th>
                      <th className="py-3 px-4 text-right">Permanent Tax Saved (12.5%)</th>
                      <th className="py-3 px-4">Reinvestment Action</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {ltcg.recommendedTrades.map((trade: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-900/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{trade.schemeName}</div>
                          {trade.folioNumber && (
                            <div className="text-[10px] text-slate-500">Folio: {trade.folioNumber}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-slate-200">
                          {trade.unitsToRedeem}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {formatINR(trade.redeemAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                          +{formatINR(trade.gainBookedTaxFree)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-300">
                          {formatINR(trade.taxSavedPermanently)}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-400 max-w-xs">
                          {trade.rationale}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => copyTrade(trade, idx)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold transition inline-flex items-center gap-1"
                          >
                            {copiedTradeIndex === idx ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-400" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> Copy Trade
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-400">
                No eligible long-term equity holdings with unrealized gains found for LTCG step-up at this time.
              </div>
            )}
          </div>

          {/* Section B: Real-Time STCG/LTCG Tax-Loss Harvesting Scanner */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Sections 111A, 112A &amp; 70
                  </span>
                  <h2 className="text-lg font-bold text-white">
                    Real-Time Tax-Loss Harvesting Scanner
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Harvest loss-making positions to offset realized Short-Term Capital Gains (20%) and Long-Term Capital Gains (12.5%). Immediately reallocate into peer funds to maintain portfolio exposure.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800 text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Total Unrealized Losses</div>
                  <div className="text-sm font-bold text-amber-400">
                    {formatINR(tlh?.totalUnrealizedLosses || 0)}
                  </div>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div>
                  <div className="text-[10px] text-slate-400">Realizable Tax Offset Alpha</div>
                  <div className="text-sm font-bold text-emerald-400">
                    {formatINR(tlh?.totalTaxAlphaPotential || 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Opportunities Table */}
            {tlh?.opportunities && tlh.opportunities.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Scheme / Holding</th>
                      <th className="py-3 px-4">Gain Type</th>
                      <th className="py-3 px-4 text-right">Cost vs Current Value</th>
                      <th className="py-3 px-4 text-right">Unrealized Loss</th>
                      <th className="py-3 px-4 text-right">Tax Offset Rate</th>
                      <th className="py-3 px-4 text-right">Tax Alpha Saved</th>
                      <th className="py-3 px-4">Wash-Sale Safe Reinvestment Peer</th>
                      <th className="py-3 px-4 text-center">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {tlh.opportunities.map((opp: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-900/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{opp.schemeName}</div>
                          {opp.folioNumber && (
                            <div className="text-[10px] text-slate-500">Folio: {opp.folioNumber}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              opp.gainType === "STCL"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            }`}
                          >
                            {opp.gainType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          <div className="text-slate-400">{formatINR(opp.investedCost)}</div>
                          <div className="text-white font-bold">{formatINR(opp.currentValue)}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-red-400">
                          -{formatINR(opp.unrealizedLoss)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {opp.taxRateOffsetPct}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                          {formatINR(opp.potentialTaxSaved)}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-300 max-w-xs">
                          <div className="font-medium text-emerald-300">{opp.replacementScheme}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{opp.rationale}</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              opp.recommendedAction === "HARVEST_NOW"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {opp.recommendedAction === "HARVEST_NOW" ? "Harvest Now" : "Monitor"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-400">
                No loss-making positions detected in the current portfolio. All holdings are currently in unrealized profit.
              </div>
            )}
          </div>

          {/* Statutory Explainer Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-1.5">
              <div className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Section 112A LTCG Step-Up
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Equity LTCG is taxed at 12.5% on gains exceeding ₹1.25 lakh per financial year. Redeeming and repurchasing units before March 31 utilizes the annual tax-free window without altering portfolio asset allocation.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-1.5">
              <div className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-amber-400" /> Section 70 Set-Off Rules
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Short-Term Capital Loss (STCL) can be set off against both STCG and LTCG. Long-Term Capital Loss (LTCL) can only be set off against LTCG. Unabsorbed losses can be carried forward for 8 consecutive Assessment Years.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-1.5">
              <div className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-purple-400" /> Wash-Sale Safe Peer Switches
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                While Indian tax law has no strict 30-day wash-sale rule for mutual funds, reinvesting into an equivalent peer scheme (e.g. Nippon Small Cap to SBI Small Cap) avoids any challenge while eliminating uncompensated fund risk.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: OLD VS NEW REGIME TAX LIABILITY SIMULATOR */}
      {/* ========================================================================= */}
      {activeTab === "simulator" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Scale className="h-5 w-5 text-emerald-400" />
                  Old vs New Tax Regime Liability Simulator
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Finance Act 2024 revised slabs: ₹75,000 standard deduction under New Regime vs Section 80C, 80D, 80CCD(1B), and Section 24(b) under Old Regime.
                </p>
              </div>

              {comp && (
                <div className="px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-right">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                    Recommended Regime
                  </div>
                  <div className="text-base font-black text-white">
                    {comp.recommendedRegime === "NEW" ? "New Tax Regime (Sec 115BAC)" : "Old Tax Regime"}
                  </div>
                  <div className="text-[10px] text-emerald-300">
                    Saves {formatINR(comp.taxSavingsWithRecommended)} in tax liability
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              {/* Gross Annual Income */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 flex justify-between">
                  <span>Gross Annual Income (₹)</span>
                  <span className="text-emerald-400 font-mono">{formatINR(simGrossIncome)}</span>
                </label>
                <input
                  type="number"
                  step="50000"
                  value={simGrossIncome}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSimGrossIncome(val);
                    runSimulatorRecalc(val, sim80C, sim80D, sim80CCD, sim24b, simHRA, simOther);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Section 80C */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 flex justify-between">
                  <span>Section 80C (EPF, PPF, ELSS) [Max ₹1.5L]</span>
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
                    runSimulatorRecalc(simGrossIncome, val, sim80D, sim80CCD, sim24b, simHRA, simOther);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Section 80D */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 flex justify-between">
                  <span>Section 80D (Health Insurance) [Max ₹1L]</span>
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
                    runSimulatorRecalc(simGrossIncome, sim80C, val, sim80CCD, sim24b, simHRA, simOther);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Section 80CCD(1B) NPS */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 flex justify-between">
                  <span>Section 80CCD(1B) (NPS) [Max ₹50k]</span>
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
                    runSimulatorRecalc(simGrossIncome, sim80C, sim80D, val, sim24b, simHRA, simOther);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Section 24(b) Home Loan Interest */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 flex justify-between">
                  <span>Section 24(b) (Home Loan Interest) [Max ₹2L]</span>
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
                    runSimulatorRecalc(simGrossIncome, sim80C, sim80D, sim80CCD, val, simHRA, simOther);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Section 10(13A) HRA Exemption */}
              <div className="space-y-1.5">
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
                    runSimulatorRecalc(simGrossIncome, sim80C, sim80D, sim80CCD, sim24b, val, simOther);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Breakeven Deduction Banner */}
            {comp && (
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex items-center gap-3 text-xs">
                <Info className="h-5 w-5 text-indigo-400 shrink-0" />
                <div className="text-slate-300">
                  <span className="font-bold text-white">Breakeven Analysis: </span>
                  For a gross income of {formatINR(simGrossIncome)}, the Old Regime requires at least{" "}
                  <span className="font-bold text-indigo-300">
                    {formatINR(comp.breakevenDeductionsNeededForOldRegime)}
                  </span>{" "}
                  in total deductions to break even with the New Regime. Current deductions total{" "}
                  <span className="font-bold text-white">
                    {formatINR(comp.oldRegime.totalDeductions)}
                  </span>
                  .
                </div>
              </div>
            )}

            {/* Side by Side Comparison Cards */}
            {comp && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card 1: New Tax Regime (Section 115BAC) */}
                <div
                  className={`p-6 rounded-3xl border transition relative ${
                    comp.recommendedRegime === "NEW"
                      ? "bg-slate-900/90 border-emerald-500/50 shadow-xl shadow-emerald-950/30 ring-1 ring-emerald-500/30"
                      : "bg-slate-900/40 border-slate-800"
                  }`}
                >
                  {comp.recommendedRegime === "NEW" && (
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Recommended
                      </span>
                    </div>
                  )}

                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                    Section 115BAC
                  </div>
                  <h3 className="text-xl font-black text-white">New Tax Regime</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Includes flat ₹75,000 standard deduction and progressive slabs.
                  </p>

                  <div className="mt-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
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
                    <div className="border-t border-slate-800 my-1 pt-1 flex justify-between text-slate-400">
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
                    <div className="border-t border-slate-700/80 pt-2 flex justify-between text-sm font-black">
                      <span className="text-white">Total Tax Payable:</span>
                      <span className="text-emerald-300 font-mono text-base">
                        {formatINR(comp.newRegime.totalTax)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Effective Tax Rate:</span>
                      <span className="font-bold text-slate-200">{comp.newRegime.effectiveTaxRatePct}%</span>
                    </div>
                  </div>

                  {/* Slab Breakdown */}
                  <div className="mt-4 space-y-1.5 text-[11px]">
                    <div className="font-semibold text-slate-300 mb-1">New Regime Slabs:</div>
                    {comp.newRegime.slabBreakdown.map((s: any, idx: number) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-slate-800/40 text-slate-400">
                        <span>{s.slab} ({s.rate})</span>
                        <span className="font-mono text-slate-200">{formatINR(s.tax)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card 2: Old Tax Regime */}
                <div
                  className={`p-6 rounded-3xl border transition relative ${
                    comp.recommendedRegime === "OLD"
                      ? "bg-slate-900/90 border-emerald-500/50 shadow-xl shadow-emerald-950/30 ring-1 ring-emerald-500/30"
                      : "bg-slate-900/40 border-slate-800"
                  }`}
                >
                  {comp.recommendedRegime === "OLD" && (
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Recommended
                      </span>
                    </div>
                  )}

                  <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
                    Conventional Regime
                  </div>
                  <h3 className="text-xl font-black text-white">Old Tax Regime</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Utilizes 80C, 80D, 80CCD, Section 24(b) home loan and HRA deductions.
                  </p>

                  <div className="mt-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
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
                    <div className="border-t border-slate-800 my-1 pt-1 flex justify-between text-slate-400">
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
                    <div className="border-t border-slate-700/80 pt-2 flex justify-between text-sm font-black">
                      <span className="text-white">Total Tax Payable:</span>
                      <span className="text-indigo-300 font-mono text-base">
                        {formatINR(comp.oldRegime.totalTax)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Effective Tax Rate:</span>
                      <span className="font-bold text-slate-200">{comp.oldRegime.effectiveTaxRatePct}%</span>
                    </div>
                  </div>

                  {/* Slab Breakdown */}
                  <div className="mt-4 space-y-1.5 text-[11px]">
                    <div className="font-semibold text-slate-300 mb-1">Old Regime Slabs:</div>
                    {comp.oldRegime.slabBreakdown.map((s: any, idx: number) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-slate-800/40 text-slate-400">
                        <span>{s.slab} ({s.rate})</span>
                        <span className="font-mono text-slate-200">{formatINR(s.tax)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CAPITAL GAINS STATEMENT FOR ITR FILING (SCHEDULE CG) */}
      {/* ========================================================================= */}
      {activeTab === "schedule-cg" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-400" />
                  Capital Gains Statement &bull; Schedule CG (ITR-2 / ITR-3)
                </h2>
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
                <div className="text-[10px] text-slate-400 mt-1">Across all instruments</div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950/30 border border-emerald-500/30">
                <div className="text-[11px] text-slate-300 font-medium">Total Capital Gains Tax Due</div>
                <div className="text-2xl font-black text-emerald-300 mt-0.5">
                  {formatINR(scheduleCG?.totalCapitalGainsTax || 0)}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Payable in advance tax installments</div>
              </div>
            </div>

            {/* Indian Advance Tax Schedule Calendar */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-400" />
                  Statutory Advance Tax Calendar &bull; Section 208/211
                </h3>
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
      {/* TAB 4: GEMINI AI WEALTH TAX ADVISORY */}
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
                  <h2 className="text-lg font-bold text-white">
                    Institutional Tax Planning &amp; Harvesting Strategy Memo
                  </h2>
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
              </div>
            </div>

            {/* Custom Advisor Instructions Input */}
            <div className="space-y-1.5 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-purple-400" />
                Special Advisor Instructions for Gemini AI (Optional):
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
                {/* AI Model Header */}
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">Engine:</span>
                    <span className="text-purple-300 font-mono">{aiAdvisory.aiModelUsed}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Generated: {new Date(aiAdvisory.analysisTimestamp).toLocaleString("en-IN")}
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-purple-950/20 border border-purple-500/30 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-purple-400">
                    Executive Strategy &bull; Post-Tax Alpha Optimization
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    {aiAdvisory.executiveSummary}
                  </p>
                </div>

                {/* Regime Strategy */}
                {aiAdvisory.regimeStrategy && (
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Regime Selection Strategy: {aiAdvisory.regimeStrategy.recommendedRegime === "NEW" ? "New Tax Regime (Section 115BAC)" : "Old Tax Regime"}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {aiAdvisory.regimeStrategy.rationale}
                    </p>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 text-xs text-slate-400">
                      <span className="font-semibold text-white">Deduction Guidance: </span>
                      {aiAdvisory.regimeStrategy.actionableDeductionGuidance}
                    </div>
                  </div>
                )}

                {/* Step-by-Step Strategic Harvesting Roadmap */}
                {aiAdvisory.harvestingRoadmap && aiAdvisory.harvestingRoadmap.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Step-by-Step Execution Roadmap
                    </h3>

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

                {/* ITR Filing & Disclaimers */}
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
                <h3 className="text-sm font-bold text-white">Generate Gemini AI Strategy Memo</h3>
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
