"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PieChart,
  User,
  Users,
  Wallet,
  PiggyBank,
  CreditCard,
  RefreshCw,
  Save,
  Check,
  Info,
  Calendar,
  Sparkles,
  ArrowRight,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import {
  RiskQuestion,
  RiskProfileComputationResult,
  computeCompleteRiskProfile,
  ClientDemographicData,
  ClientFinancialData,
  RiskCategory,
} from "@/lib/risk/riskProfileEngine";

interface ClientRiskProfileTabProps {
  clientId: string;
  client: any;
  showToast: (msg: string, type?: "success" | "error") => void;
  formatINR: (val: number) => string;
}

const CATEGORY_STYLES: Record<
  RiskCategory,
  { bg: string; text: string; border: string; barColor: string; description: string }
> = {
  Conservative: {
    bg: "bg-blue-500/10 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-500/30",
    barColor: "bg-blue-500",
    description: "Capital preservation priority with minimal drawdown tolerance. Focused on fixed income & high liquidity.",
  },
  "Moderately Conservative": {
    bg: "bg-sky-500/10 dark:bg-sky-950/30",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-500/30",
    barColor: "bg-sky-500",
    description: "Income with modest capital appreciation. Cautious equity exposure with substantial debt cushions.",
  },
  Moderate: {
    bg: "bg-emerald-500/10 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/30",
    barColor: "bg-emerald-500",
    description: "Balanced growth seeking capital appreciation while maintaining moderate risk buffers against market corrections.",
  },
  "Moderately Aggressive": {
    bg: "bg-purple-500/10 dark:bg-purple-950/30",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-500/30",
    barColor: "bg-purple-500",
    description: "Long-term wealth creation. High equity orientation comfortable enduring standard market cyclical drawdowns.",
  },
  Aggressive: {
    bg: "bg-rose-500/10 dark:bg-rose-950/30",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-500/30",
    barColor: "bg-rose-500",
    description: "Maximum capital compounding. High tolerance for volatility and extended market drawdowns for outsized long-term gains.",
  },
};

export default function ClientRiskProfileTab({
  clientId,
  client,
  showToast,
  formatINR,
}: ClientRiskProfileTabProps) {
  const [questions, setQuestions] = useState<RiskQuestion[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [demographics, setDemographics] = useState<ClientDemographicData>({});
  const [financials, setFinancials] = useState<ClientFinancialData>({});
  const [assessmentHistory, setAssessmentHistory] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Load data from API
  const fetchRiskProfile = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/clients/${clientId}/risk-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to load risk profile data.");
      }

      const data = await res.json();
      setQuestions(data.questions || []);
      setResponses(data.responses || {});
      setDemographics(data.demographics || {});
      setFinancials(data.financials || {});
      setAssessmentHistory(data.history || []);
      setIsDirty(false);
    } catch (err: any) {
      showToast(err.message || "Failed to load risk profile.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskProfile();
  }, [clientId]);

  // Live real-time computation whenever responses, demographics, or financials change
  const computedResult: RiskProfileComputationResult = useMemo(() => {
    return computeCompleteRiskProfile({
      responses,
      demographics,
      financials,
    });
  }, [responses, demographics, financials]);

  const handleSelectOption = (questionId: string, optionValue: string) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: optionValue,
    }));
    setIsDirty(true);
  };

  const handleSaveAssessment = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/clients/${clientId}/risk-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          responses,
          assessorName: "Licensed Financial Advisor",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save risk assessment.");
      }

      showToast(data.message || "Risk assessment saved and synced to client profile!", "success");
      setIsDirty(false);
      fetchRiskProfile();
    } catch (err: any) {
      showToast(err.message || "Failed to save risk assessment.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  const categoryStyle = CATEGORY_STYLES[computedResult.riskCategory] || CATEGORY_STYLES.Moderate;
  const capacityBreakdown = computedResult.capacityBreakdown;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Live Score Dashboard */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-teal-900/10 via-slate-900/5 to-purple-900/10 dark:from-teal-950/30 dark:via-slate-900 dark:to-purple-950/30 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Overall Risk Score & Category Badge */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 font-mono">
                SEBI Reg. 16 & 17 &bull; Multi-Factor Suitability Assessment
              </span>
              {isDirty && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse">
                  Unsaved Changes (Live Computed)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {computedResult.riskCategory} Risk Profile
              </h2>
              <span
                className={`px-3 py-1 rounded-xl text-xs font-extrabold uppercase border ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}
              >
                Score: {computedResult.riskScore} / 100
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              {categoryStyle.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-teal-500" />
                <span>Annual Review Due: <strong className="text-slate-800 dark:text-slate-200">{computedResult.nextReviewDue}</strong></span>
              </span>
              <span>&bull;</span>
              <span>Client: <strong className="text-slate-800 dark:text-slate-200">{client.full_name}</strong></span>
              <span>&bull;</span>
              <span>Age: <strong className="text-slate-800 dark:text-slate-200">{capacityBreakdown.age}</strong></span>
              <span>&bull;</span>
              <span>Dependents: <strong className="text-slate-800 dark:text-slate-200">{capacityBreakdown.dependentsCount}</strong></span>
            </div>
          </div>

          {/* Right: Save & Sync CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={fetchRiskProfile}
              className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center justify-center gap-1.5 shadow-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 text-teal-500" />
              <span>Reset to Baseline</span>
            </button>
            <button
              onClick={handleSaveAssessment}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isSaving ? "Saving..." : "Save & Sync to Client Profile"}</span>
            </button>
          </div>
        </div>

        {/* Tolerance vs Capacity Dual Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Card 1: Risk Tolerance */}
          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Psychological Risk Tolerance
              </span>
              <span className="text-sm font-black text-purple-600 dark:text-purple-400 font-mono">
                {computedResult.toleranceScore} / 100
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-purple-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${computedResult.toleranceScore}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Evaluated from {questions.length} behavioral questions covering investment horizon, market volatility reaction, and return expectations.
            </p>
          </div>

          {/* Card 2: Risk Capacity (from Live Client Data) */}
          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-emerald-500" />
                Financial Risk Capacity (Live Client Data)
              </span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {computedResult.capacityScore} / 100
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${computedResult.capacityScore}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Automatically derived from Age ({capacityBreakdown.age}), Dependents ({capacityBreakdown.dependentsCount}), Savings Rate ({capacityBreakdown.savingsRate}%), and Emergency Buffer ({capacityBreakdown.emergencyMonths} mos).
            </p>
          </div>
        </div>
      </div>

      {/* 2. Recommended Asset Allocation Breakdown */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-teal-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              SEBI Recommended Strategic Asset Allocation for {computedResult.riskCategory}
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Fiduciary benchmark allocation to optimize Sharpe ratio for this risk category
          </span>
        </div>

        {/* Visual Allocation Bar */}
        <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${computedResult.recommendedAllocation.equityPct}%` }}
            title={`Equity: ${computedResult.recommendedAllocation.equityPct}%`}
          />
          <div
            className="bg-sky-500 h-full transition-all duration-500"
            style={{ width: `${computedResult.recommendedAllocation.debtPct}%` }}
            title={`Debt: ${computedResult.recommendedAllocation.debtPct}%`}
          />
          <div
            className="bg-amber-400 h-full transition-all duration-500"
            style={{ width: `${computedResult.recommendedAllocation.goldPct}%` }}
            title={`Gold: ${computedResult.recommendedAllocation.goldPct}%`}
          />
          {computedResult.recommendedAllocation.cashPct > 0 && (
            <div
              className="bg-slate-400 h-full transition-all duration-500"
              style={{ width: `${computedResult.recommendedAllocation.cashPct}%` }}
              title={`Cash: ${computedResult.recommendedAllocation.cashPct}%`}
            />
          )}
        </div>

        {/* Allocation Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Equity & Growth</span>
              <span className="font-extrabold text-sm">{computedResult.recommendedAllocation.equityPct}%</span>
            </div>
            <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
              Large/Mid/Flexi Cap Mutual Funds
            </p>
          </div>

          <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-800 dark:text-sky-300">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Fixed Income / Debt</span>
              <span className="font-extrabold text-sm">{computedResult.recommendedAllocation.debtPct}%</span>
            </div>
            <p className="text-[10px] text-sky-700/80 dark:text-sky-300/80 mt-0.5">
              Target Maturity, Corporate Bond & Arbitrage
            </p>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Precious Metals / Gold</span>
              <span className="font-extrabold text-sm">{computedResult.recommendedAllocation.goldPct}%</span>
            </div>
            <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">
              Sovereign Gold Bonds & Gold ETFs
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-800 dark:text-slate-300">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Liquid Cash Cushion</span>
              <span className="font-extrabold text-sm">{computedResult.recommendedAllocation.cashPct}%</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Liquid Funds & Savings Sweep
            </p>
          </div>
        </div>
      </div>

      {/* 3. Dynamic Client Data Drivers (Risk Capacity Breakdown) */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Live Client Data Contributing to Risk Capacity
            </h3>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold">
            Auto-Updated from Client 360
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Age & Runway</span>
            <div className="text-base font-bold text-slate-900 dark:text-white">
              {capacityBreakdown.age} yrs
            </div>
            <p className="text-[10px] text-slate-500">Score: {capacityBreakdown.ageScore}/100</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Dependents</span>
            <div className="text-base font-bold text-slate-900 dark:text-white">
              {capacityBreakdown.dependentsCount} {capacityBreakdown.dependentsCount === 1 ? "person" : "people"}
            </div>
            <p className="text-[10px] text-slate-500">Score: {capacityBreakdown.dependentsScore}/100</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Savings Rate</span>
            <div className="text-base font-bold text-slate-900 dark:text-white">
              {capacityBreakdown.savingsRate}%
            </div>
            <p className="text-[10px] text-slate-500">Score: {capacityBreakdown.savingsScore}/100</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Emergency Buffer</span>
            <div className="text-base font-bold text-slate-900 dark:text-white">
              {capacityBreakdown.emergencyMonths} mos
            </div>
            <p className="text-[10px] text-slate-500">Score: {capacityBreakdown.emergencyScore}/100</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Debt-to-Asset</span>
            <div className="text-base font-bold text-slate-900 dark:text-white">
              {capacityBreakdown.debtToAssetRatio}%
            </div>
            <p className="text-[10px] text-slate-500">Score: {capacityBreakdown.debtScore}/100</p>
          </div>
        </div>

        {/* Capacity Notes */}
        <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Fiduciary Capacity Breakdown Notes:
          </span>
          <div className="space-y-1">
            {capacityBreakdown.factorNotes.map((note, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                <span className="text-teal-500 font-bold">&bull;</span>
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Interactive Questionnaire Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Psychological Risk Tolerance Questionnaire ({questions.length} Questions)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Click options to adjust answers and watch real-time recalculation
          </span>
        </div>

        <div className="space-y-4">
          {questions.map((q, qIdx) => {
            const currentAnswer = responses[q.id];
            return (
              <div
                key={q.id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 font-mono">
                      {q.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Weight: 16.7%
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {q.question}
                  </h4>
                  {q.helpText && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {q.helpText}
                    </p>
                  )}
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {q.options.map((opt) => {
                    const isSelected = currentAnswer === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelectOption(q.id, opt.value)}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? "border-teal-500 bg-teal-500/10 text-teal-900 dark:text-teal-100 shadow-xs ring-1 ring-teal-500/30"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold flex items-center gap-1.5">
                            {isSelected && <Check className="h-3.5 w-3.5 text-teal-500 shrink-0" />}
                            <span>{opt.label}</span>
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {opt.points} pts
                          </span>
                        </div>
                        {opt.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                            {opt.description}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Statutory Suitability Statement & Action Footer */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-teal-500" />
          <span>SEBI IA Regulation 16 & 17 Fiduciary Suitability Statement</span>
        </h4>
        <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed">
          &ldquo;{computedResult.suitabilityStatement}&rdquo;
        </p>

        {computedResult.fiduciaryWarnings.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            {computedResult.fiduciaryWarnings.map((warn, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>{warn}</span>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500">
            Suitability profile must be refreshed every 365 days to remain compliant under SEBI regulations.
          </span>
          <button
            onClick={handleSaveAssessment}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl text-xs font-extrabold bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white transition flex items-center justify-center gap-2 shadow-md shadow-teal-600/20"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? "Saving..." : "Save Assessment & Sync Client Profile"}</span>
          </button>
        </div>
      </div>

      {/* 6. Assessment Audit History Feed */}
      {assessmentHistory.length > 0 && (
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-slate-400" />
            <span>Historical Assessment Audit Trail ({assessmentHistory.length} Recorded Reviews)</span>
          </h4>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {assessmentHistory.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">{item.risk_category}</span>
                  <span className="text-slate-400 text-[11px] ml-2">Score: {item.risk_score}/100</span>
                  <span className="text-slate-400 text-[11px] ml-2">by {item.assessor_name || "Advisor"}</span>
                </div>
                <span className="text-slate-400 text-[11px]">
                  {new Date(item.assessed_at).toLocaleDateString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

