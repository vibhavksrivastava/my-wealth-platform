"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  TrendingUp,
  DollarSign,
  ShieldAlert,
  Wallet,
  Target,
  Send,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  ArrowRight,
  PiggyBank,
  Check,
  History,
} from "lucide-react";

interface SuggestionsTabProps {
  clientId: string;
  client: any;
  showToast: (msg: string, type?: "success" | "error") => void;
  formatINR: (val: number) => string;
}

export default function SuggestionsTab({
  clientId,
  client,
  showToast,
  formatINR,
}: SuggestionsTabProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [currentDiagnostic, setCurrentDiagnostic] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingDiagnostic, setIsRefreshingDiagnostic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active editor state for current plan
  const [advisorNotes, setAdvisorNotes] = useState("");
  const [expandedSuggestionId, setExpandedSuggestionId] = useState<string | null>(null);

  // Execution tracking inputs per suggestion
  const [actionLogInputs, setActionLogInputs] = useState<{ [id: string]: string }>({});
  const [isLoggingAction, setIsLoggingAction] = useState<{ [id: string]: boolean }>({});

  const fetchSuggestions = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/clients/${clientId}/suggestions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load suggestions.");
      }

      const json = await res.json();
      setSuggestions(json.suggestions || []);
      setCurrentDiagnostic(json.currentDiagnostic || null);

      // Pre-fill advisor notes if there is a recent suggestion draft and notes are empty
      if (json.suggestions && json.suggestions.length > 0 && !advisorNotes) {
        setAdvisorNotes(json.suggestions[0].advisor_notes || "");
      }
    } catch (err: any) {
      console.error("fetchSuggestions error:", err);
      showToast(err.message || "Failed to load suggestions.", "error");
    } finally {
      if (showLoadingSpinner) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [clientId]);

  // Handle re-running the diagnostic engine
  const handleRecalculateDiagnostic = async () => {
    setIsRefreshingDiagnostic(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/clients/${clientId}/suggestions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to recalculate financial findings.");
      const json = await res.json();
      setCurrentDiagnostic(json.currentDiagnostic);
      showToast("Financial diagnostic engine updated with latest profile data!");
    } catch (err: any) {
      showToast(err.message || "Recalculation failed.", "error");
    } finally {
      setIsRefreshingDiagnostic(false);
    }
  };

  // Handle saving as draft or submitting to client
  const handleSavePlan = async (status: "DRAFT" | "SUBMITTED_TO_CLIENT") => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/clients/${clientId}/suggestions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          systemFindings: currentDiagnostic?.systemFindings,
          recommendedInvestments: currentDiagnostic?.recommendedInvestments,
          advisorNotes: advisorNotes.trim(),
          status,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save action plan.");

      showToast(
        status === "SUBMITTED_TO_CLIENT"
          ? "Action plan officially submitted to client!"
          : "Action plan draft saved successfully."
      );
      await fetchSuggestions(false);
    } catch (err: any) {
      showToast(err.message || "Failed to save action plan.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle logging an action taken on a suggestion ("What was done")
  const handleRecordActionLog = async (suggestionId: string) => {
    const text = actionLogInputs[suggestionId];
    if (!text || !text.trim()) {
      showToast("Please enter an action description to record.", "error");
      return;
    }

    setIsLoggingAction((prev) => ({ ...prev, [suggestionId]: true }));
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/clients/${clientId}/suggestions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          suggestionId,
          actionLogText: text.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to record execution log.");

      showToast("Execution action permanently recorded in client tracking log!");
      setActionLogInputs((prev) => ({ ...prev, [suggestionId]: "" }));
      await fetchSuggestions(false);
    } catch (err: any) {
      showToast(err.message || "Failed to record action log.", "error");
    } finally {
      setIsLoggingAction((prev) => ({ ...prev, [suggestionId]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
        <p className="text-sm font-medium">Running diagnostic analysis engine...</p>
      </div>
    );
  }

  const findings = currentDiagnostic?.systemFindings;
  const recommendations = currentDiagnostic?.recommendedInvestments || [];
  const latestSuggestion = suggestions[0];

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header & Actions Bar */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-sky-950/40 border border-purple-900/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Future Suggestions & Action Plan
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-400 max-w-2xl">
            Automated diagnostic findings and tailored advisory action plans bridging advisor recommendations with client execution tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRecalculateDiagnostic}
            disabled={isRefreshingDiagnostic}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            title="Recalculate metrics against latest incomes, expenses, assets, liabilities, and goals"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingDiagnostic ? "animate-spin text-sky-400" : ""}`} />
            <span>{isRefreshingDiagnostic ? "Analyzing..." : "Re-Run Diagnostic"}</span>
          </button>

          <button
            onClick={() => handleSavePlan("DRAFT")}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>Save Draft</span>
          </button>

          <button
            onClick={() => handleSavePlan("SUBMITTED_TO_CLIENT")}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>Submit to Client</span>
          </button>
        </div>
      </div>

      {/* 2. Automated Diagnostic Findings Snapshot */}
      {findings && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers className="h-4 w-4 text-sky-400" />
              Automated Diagnostic Findings
            </h3>
            <span className="text-xs text-slate-400">
              Analysis generated: {new Date(findings.calculatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>

          {/* Health Score & Key Highlights Banner */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="md:border-r md:border-slate-800 pr-4">
              <span className="text-[11px] font-semibold uppercase text-slate-400">Financial Health Score</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className={`text-3xl font-black ${
                  findings.overallHealthScore >= 80 ? "text-emerald-400" : findings.overallHealthScore >= 60 ? "text-amber-400" : "text-rose-400"
                }`}>
                  {findings.overallHealthScore}
                </span>
                <span className="text-xs text-slate-500 font-bold">/ 100</span>
              </div>
              <div className="mt-2 w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    findings.overallHealthScore >= 80 ? "bg-emerald-500" : findings.overallHealthScore >= 60 ? "bg-amber-500" : "bg-rose-500"
                  }`}
                  style={{ width: `${findings.overallHealthScore}%` }}
                />
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                Risk Profile: <span className="font-semibold text-white">{findings.riskProfile}</span>
              </div>
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">Diagnostic Highlights</span>
              <div className="space-y-1">
                {findings.summaryHighlights && findings.summaryHighlights.length > 0 ? (
                  findings.summaryHighlights.map((hl: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <div className="h-1.5 w-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                      <span>{hl}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">Comprehensive diagnostics generated from client profile metrics.</p>
                )}
              </div>
            </div>
          </div>

          {/* 3 Detailed Cards: Cash Flow, Net Worth & Solvency, Goals Feasibility */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Card A: Cash Flow Health */}
            <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Cash Flow Health</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                    findings.cashFlow.status === "HEALTHY"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : findings.cashFlow.status === "MODERATE"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}>
                    {findings.cashFlow.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 uppercase">Monthly Surplus</span>
                    <div className={`font-bold text-sm ${findings.cashFlow.netMonthlySurplus >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {formatINR(findings.cashFlow.netMonthlySurplus)}/mo
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 uppercase">Savings Rate</span>
                    <div className="font-bold text-sm text-white">
                      {findings.cashFlow.savingsRate.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {findings.cashFlow.findings.map((f: string, i: number) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                      <span className="text-emerald-400 font-bold">&bull;</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>EMI-to-Income: <span className="font-semibold text-slate-200">{findings.cashFlow.emiToIncomeRatio.toFixed(1)}%</span></span>
                <span>Outflows: <span className="font-semibold text-slate-200">{formatINR(findings.cashFlow.totalOutflows)}</span></span>
              </div>
            </div>

            {/* Card B: Net Worth & Solvency Breakdown */}
            <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-sky-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Net Worth & Solvency</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                    findings.netWorth.emergencyFundStatus === "SUFFICIENT"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : findings.netWorth.emergencyFundStatus === "PARTIAL"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}>
                    {findings.netWorth.emergencyFundStatus === "SUFFICIENT" ? "Liquid Buffer Safe" : "Buffer Needs Attention"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 uppercase">Net Worth</span>
                    <div className="font-bold text-sm text-sky-400">
                      {formatINR(findings.netWorth.netWorth)}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 uppercase">Emergency Coverage</span>
                    <div className="font-bold text-sm text-white">
                      {findings.netWorth.emergencyFundAdequacyMonths} mos
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {findings.netWorth.findings.map((f: string, i: number) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                      <span className="text-sky-400 font-bold">&bull;</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Debt-to-Asset: <span className="font-semibold text-slate-200">{findings.netWorth.debtToAssetRatio.toFixed(1)}%</span></span>
                <span>Liquidity Ratio: <span className="font-semibold text-slate-200">{findings.netWorth.liquidityRatio.toFixed(1)}%</span></span>
              </div>
            </div>

            {/* Card C: Goal Feasibility & Gap Analysis */}
            <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Goal Feasibility</span>
                  </div>
                  <span className="text-[11px] font-semibold text-purple-300">
                    {findings.goals.onTrackCount} on-track / {findings.goals.totalGoalsCount} total
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 uppercase">Goal Health Score</span>
                    <div className="font-bold text-sm text-purple-400">
                      {findings.goals.overallScore}%
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 uppercase">Total Shortfall</span>
                    <div className={`font-bold text-sm ${findings.goals.totalShortfall > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                      {findings.goals.totalShortfall > 0 ? formatINR(findings.goals.totalShortfall) : "Zero Gap"}
                    </div>
                  </div>
                </div>

                {/* Mini Goal Feasibility List */}
                <div className="space-y-2">
                  {findings.goals.goals.map((g: any) => (
                    <div key={g.goalId} className="p-2 rounded bg-slate-950/40 border border-slate-800/40 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white truncate max-w-[140px]">{g.goalName}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          g.feasibilityStatus === "ON_TRACK"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : g.feasibilityStatus === "MODERATE_GAP"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {g.fundedPercentage}% Funded
                        </span>
                      </div>
                      {g.shortfall > 0 ? (
                        <div className="mt-1 text-[10px] text-rose-300">
                          Gap: {formatINR(g.shortfall)} &bull; Req. SIP: +{formatINR(g.additionalMonthlySipRequired)}/mo
                        </div>
                      ) : (
                        <div className="mt-1 text-[10px] text-emerald-400">
                          Fully funded to target year {g.targetYear}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                {findings.goals.findings[0] || "All life goals evaluated with inflation adjustments."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Recommended Actions & Investment Shifts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              Recommended Investment Shifts & Action Items
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Specific, rule-matched recommendations tailored to client risk profile ({client?.risk_profile || "Moderate"})
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            {recommendations.length} Action Items
          </span>
        </div>

        {recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec: any) => {
              const priorityColor =
                rec.priority === "HIGH"
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  : rec.priority === "MEDIUM"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-sky-500/10 text-sky-400 border-sky-500/20";

              const categoryBadge =
                rec.category === "SIP_STEP_UP"
                  ? "SIP Step-Up"
                  : rec.category === "DEBT_RESTRUCTURING"
                  ? "Debt Prepayment"
                  : rec.category === "EMERGENCY_RESERVE"
                  ? "Emergency Buffer"
                  : rec.category === "ASSET_REBALANCING"
                  ? "Asset Rebalance"
                  : "Tax Optimization";

              return (
                <div
                  key={rec.id}
                  className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                        {categoryBadge}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${priorityColor} uppercase`}>
                        {rec.priority} Priority
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">{rec.title}</h4>
                      <p className="mt-1 text-xs text-slate-400 leading-relaxed">{rec.rationale}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-xs">
                      <div className="font-semibold text-sky-400 flex items-center gap-1.5">
                        <ArrowRight className="h-3 w-3" />
                        <span>Action: {rec.suggestedAction}</span>
                      </div>
                      {rec.actionDetails?.targetInstrument && (
                        <div className="text-slate-400 text-[11px]">
                          Target: <span className="text-slate-200">{rec.actionDetails.targetInstrument}</span>
                        </div>
                      )}
                      {rec.actionDetails?.potentialBenefit && (
                        <div className="text-slate-400 text-[11px]">
                          Benefit: <span className="text-emerald-400">{rec.actionDetails.potentialBenefit}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Expected Outcome:</span>
                    <span className="font-semibold text-emerald-400 text-right">{rec.expectedImpact}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-slate-900/30 border border-slate-800 text-center text-xs text-slate-400">
            No active gaps identified. Client portfolio is in balance with stated life goals.
          </div>
        )}
      </div>

      {/* 4. Advisor Notes & Execution Plan Editor */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-sky-400" />
              Advisor Custom Remarks & Review Notes
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Refine your personalized observations, agreed timelines, and asset allocation advice before submitting to client.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Current Plan Status:</span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
              latestSuggestion?.status === "SUBMITTED_TO_CLIENT"
                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                : latestSuggestion?.status === "IN_PROGRESS"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-slate-800 text-slate-300 border-slate-700"
            }`}>
              {latestSuggestion?.status || "NEW DRAFT"}
            </span>
          </div>
        </div>

        <textarea
          rows={4}
          value={advisorNotes}
          onChange={(e) => setAdvisorNotes(e.target.value)}
          placeholder="e.g. During our Q4 portfolio review with Vibhav, we agreed to prioritize increasing the retirement SIP by ₹12,500/month once the annual bonus is credited. We also recommend prepaying ₹1.5 Lakhs towards the car loan using idle savings balance..."
          className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-sky-500 transition placeholder:text-slate-600 resize-y"
        />

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            onClick={() => handleSavePlan("DRAFT")}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSavePlan("SUBMITTED_TO_CLIENT")}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>Submit Plan to Client</span>
          </button>
        </div>
      </div>

      {/* 5. Suggestion History Feed & Interactive Execution Tracking Log */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <History className="h-4 w-4 text-purple-400" />
            Suggestion History & Execution Tracking Feed
          </h3>
          <span className="text-xs text-slate-400">
            {suggestions.length} Versioned Plan(s) Recorded
          </span>
        </div>

        {suggestions.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-900/30 border border-slate-800 text-center text-xs text-slate-400">
            No suggestion history recorded yet. Click &quot;Submit to Client&quot; above to create the initial action plan.
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((s, index) => {
              const isExpanded = expandedSuggestionId === s.id;
              const dateFormatted = new Date(s.suggestion_date || s.created_at).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              });

              return (
                <div
                  key={s.id}
                  className="rounded-xl bg-slate-900/50 border border-slate-800 overflow-hidden transition"
                >
                  {/* Suggestion Card Header */}
                  <div className="p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase border bg-purple-500/10 text-purple-400 border-purple-500/20">
                          {s.status}
                        </span>
                        <span className="text-xs font-semibold text-white">
                          Plan Version #{suggestions.length - index}
                        </span>
                        <span className="text-xs text-slate-400">&bull; {dateFormatted}</span>
                      </div>
                      {s.advisor_notes && (
                        <p className="text-xs text-slate-300 mt-1 italic max-w-3xl">
                          &ldquo;{s.advisor_notes}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setExpandedSuggestionId(isExpanded ? null : s.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
                      >
                        <span>{isExpanded ? "Hide Details" : "View Recommendations"}</span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Recommendations Snapshot */}
                  {isExpanded && s.recommended_investments && s.recommended_investments.length > 0 && (
                    <div className="p-5 bg-slate-950/60 border-b border-slate-800/80 space-y-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Prescribed Action Items in this Plan:
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {s.recommended_investments.map((rec: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">{rec.title}</span>
                              <span className="text-[10px] text-purple-400 font-semibold">{rec.priority}</span>
                            </div>
                            <p className="text-[11px] text-slate-400">{rec.suggestedAction}</p>
                            <p className="text-[11px] text-emerald-400 font-medium">Impact: {rec.expectedImpact}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interactive Execution Tracking Log ("What was done") */}
                  <div className="p-5 bg-slate-950/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        Execution Action Log (&ldquo;What Was Done&rdquo;)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Permanent audit log of client & advisor implementation
                      </span>
                    </div>

                    {/* Previous Execution Logs Display */}
                    {s.client_action_notes ? (
                      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed space-y-2">
                        {s.client_action_notes}
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-slate-900/30 border border-slate-800/50 text-[11px] text-slate-500 italic">
                        No actions logged yet for this recommendation plan. Use the input below to record implementation updates.
                      </div>
                    )}

                    {/* Action Input Field */}
                    <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        value={actionLogInputs[s.id] || ""}
                        onChange={(e) =>
                          setActionLogInputs((prev) => ({
                            ...prev,
                            [s.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleRecordActionLog(s.id);
                          }
                        }}
                        placeholder="e.g. Increased monthly SIP by ₹10,000 in Large Cap Fund on 18 Oct 2026..."
                        className="flex-1 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
                      />
                      <button
                        onClick={() => handleRecordActionLog(s.id)}
                        disabled={isLoggingAction[s.id]}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm shadow-emerald-500/20"
                      >
                        {isLoggingAction[s.id] ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        <span>Record Action</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

