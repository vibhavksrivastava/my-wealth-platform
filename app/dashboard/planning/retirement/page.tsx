"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFirmBranding } from "@/lib/context/FirmBrandingContext";
import {
  Target,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Clock,
  Layers,
  ArrowRight,
  ArrowDownToLine,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Coins,
  Wallet,
  Calculator,
  User,
  SlidersHorizontal,
  Info,
  Lock,
  Printer,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
  Calendar,
  Zap,
  ArrowUpRight,
  Percent,
  Download,
  Key,
  FileText,
  X,
  Eye,
  EyeOff,
  Users,
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

export default function RetirementPlanningPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <RefreshCw className="h-8 w-8 text-purple-600 dark:text-purple-400 animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading Smart Retirement Engine...</p>
        </div>
      }
    >
      <RetirementPlanningContent />
    </Suspense>
  );
}

function RetirementPlanningContent() {
  const { terms } = useFirmBranding();
  const searchParams = useSearchParams();
  const queryClientId = searchParams?.get("clientId") || "";

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Platform state
  const [isAdvisor, setIsAdvisor] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(queryClientId);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  // Household & Multi-Member Planning State
  const [householdMembers, setHouseholdMembers] = useState<any[]>([]);
  const [memberBreakdown, setMemberBreakdown] = useState<any[]>([]);
  const [hasMultipleMembers, setHasMultipleMembers] = useState(false);
  const [planningScope, setPlanningScope] = useState<"HOUSEHOLD" | "INDIVIDUAL">("HOUSEHOLD");
  const [activeMemberId, setActiveMemberId] = useState<string>("");
  const [totalHouseholdSip, setTotalHouseholdSip] = useState<number>(0);

  // Interactive Engine Inputs
  const [currentAge, setCurrentAge] = useState<number>(38);
  const [retirementAge, setRetirementAge] = useState<number>(60);
  const [lifeExpectancy, setLifeExpectancy] = useState<number>(85);
  const [currentMonthlyExpense, setCurrentMonthlyExpense] = useState<number>(60000);
  const [preRetirementInflation, setPreRetirementInflation] = useState<number>(6.0);
  const [postRetirementInflation, setPostRetirementInflation] = useState<number>(5.5);
  const [preRetirementReturn, setPreRetirementReturn] = useState<number>(11.5);
  const [postRetirementReturn, setPostRetirementReturn] = useState<number>(7.5);

  // Auto-imported savings state
  const [epfCorpus, setEpfCorpus] = useState<number>(0);
  const [epfMonthlyDeposit, setEpfMonthlyDeposit] = useState<number>(0);
  const [npsCorpus, setNpsCorpus] = useState<number>(0);
  const [npsMonthlyDeposit, setNpsMonthlyDeposit] = useState<number>(0);
  const [ppfCorpus, setPpfCorpus] = useState<number>(0);
  const [ppfMonthlyDeposit, setPpfMonthlyDeposit] = useState<number>(0);
  const [mutualFundCorpus, setMutualFundCorpus] = useState<number>(0);
  const [ongoingMonthlySip, setOngoingMonthlySip] = useState<number>(0);
  const [otherLiquidCorpus, setOtherLiquidCorpus] = useState<number>(0);
  const [holdings, setHoldings] = useState<any[]>([]);

  // Results & Solutions
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"diagnostic" | "three-bucket" | "swp-stp" | "ai-memo">("diagnostic");
  const [clientSearchTerm, setClientSearchTerm] = useState("");

  // AI Advisory state
  const [aiAdvisory, setAiAdvisory] = useState<any>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [customAiPrompt, setCustomAiPrompt] = useState("");
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isSavingSuggestion, setIsSavingSuggestion] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // PDF Export Modal State
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfEnablePassword, setPdfEnablePassword] = useState(true);
  const [pdfPasswordType, setPdfPasswordType] = useState<"PAN" | "NAME_DOB" | "CUSTOM">("PAN");
  const [customPdfPassword, setCustomPdfPassword] = useState("");
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfIncludeAi, setPdfIncludeAi] = useState(true);
  const [pdfIncludeHoldings, setPdfIncludeHoldings] = useState(true);
  const [pdfIncludeCashFlow, setPdfIncludeCashFlow] = useState(true);

  // Compute unlock password based on client attributes and selected type
  const resolvedPdfPassword = useMemo(() => {
    if (!pdfEnablePassword) return "";
    if (pdfPasswordType === "PAN") {
      const rawPan = (selectedClient?.panNumber || selectedClient?.pan || "").toUpperCase().trim();
      return rawPan || "ABCDE1234F"; // standard PAN format
    }
    if (pdfPasswordType === "NAME_DOB") {
      const namePart = (selectedClient?.fullName || "USER")
        .replace(/[^a-zA-Z]/g, "")
        .slice(0, 4)
        .toUpperCase()
        .padEnd(4, "X");
      let year = "1985";
      if (selectedClient?.dateOfBirth) {
        const parsedYear = new Date(selectedClient.dateOfBirth).getFullYear();
        if (!isNaN(parsedYear)) year = parsedYear.toString();
      } else if (currentAge) {
        year = (new Date().getFullYear() - currentAge).toString();
      }
      return `${namePart}${year}`;
    }
    if (pdfPasswordType === "CUSTOM") {
      return customPdfPassword.trim();
    }
    return "";
  }, [pdfEnablePassword, pdfPasswordType, selectedClient, currentAge, customPdfPassword]);

  const handleCopyPassword = () => {
    if (!resolvedPdfPassword) return;
    navigator.clipboard.writeText(resolvedPdfPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2500);
  };

  const handleDownloadPdf = async () => {
    if (!diagnosticResult) {
      showToast("Diagnostic result not ready yet.", "error");
      return;
    }
    if (pdfEnablePassword && pdfPasswordType === "CUSTOM" && !customPdfPassword.trim()) {
      showToast("Please enter a custom password or switch password type.", "error");
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") || localStorage.getItem("token") : null;
      const finalPassword = pdfEnablePassword ? resolvedPdfPassword : null;

      const payload = {
        clientId: selectedClientId,
        password: finalPassword,
        diagnosticResult,
        aiAdvisory,
        scope: planningScope,
        activeMemberId,
        options: {
          includeAiMemo: pdfIncludeAi && !!aiAdvisory,
          includeHoldingsTable: pdfIncludeHoldings,
          includeCashFlowTable: pdfIncludeCashFlow,
        },
      };

      const res = await fetch("/api/planning/retirement/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Download failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const clientName = (selectedClient?.fullName || "Client").replace(/[^a-zA-Z0-9_-]/g, "_");
      const scopeSuffix = planningScope === "HOUSEHOLD" ? "_Household" : `_${clientName}`;
      a.download = `Retirement_Plan${scopeSuffix}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast("Retirement Plan PDF exported successfully!", "success");
      setShowPdfModal(false);
    } catch (err: any) {
      console.error("PDF generation error:", err);
      showToast(err.message || "Failed to generate PDF.", "error");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Fetch initial data
  const fetchData = async (clientId?: string, scope?: "HOUSEHOLD" | "INDIVIDUAL", memberId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") || localStorage.getItem("token") : null;
      const url = new URL("/api/planning/retirement", window.location.origin);
      if (clientId) url.searchParams.set("clientId", clientId);
      if (scope) url.searchParams.set("scope", scope);
      if (memberId) url.searchParams.set("memberId", memberId);

      const res = await fetch(url.toString(), {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed with status ${res.status}`);
      }

      const resData = await res.json();
      setIsAdvisor(resData.isAdvisor || false);
      setClients(resData.clients || []);
      setSelectedClient(resData.selectedClient);
      if (resData.selectedClient?.clientId) {
        setSelectedClientId(resData.selectedClient.clientId);
      }
      setHouseholdMembers(resData.householdMembers || []);
      setMemberBreakdown(resData.memberBreakdown || []);
      setHasMultipleMembers(resData.hasMultipleMembers || false);
      setPlanningScope(resData.planningScope || "HOUSEHOLD");
      setActiveMemberId(resData.activeMemberId || resData.selectedClient?.clientId || "");
      setTotalHouseholdSip(resData.totalHouseholdSip || 0);

      const input = resData.engineInput;
      if (input) {
        setCurrentAge(input.currentAge || 38);
        setRetirementAge(input.retirementAge || 60);
        setLifeExpectancy(input.lifeExpectancy || 85);
        setCurrentMonthlyExpense(input.currentMonthlyExpense || 60000);
        setPreRetirementInflation(input.preRetirementInflation || 6.0);
        setPostRetirementInflation(input.postRetirementInflation || 5.5);
        setPreRetirementReturn(input.preRetirementReturn || 11.5);
        setPostRetirementReturn(input.postRetirementReturn || 7.5);

        setEpfCorpus(input.epfCorpus || 0);
        setEpfMonthlyDeposit(input.epfMonthlyDeposit || 0);
        setNpsCorpus(input.npsCorpus || 0);
        setNpsMonthlyDeposit(input.npsMonthlyDeposit || 0);
        setPpfCorpus(input.ppfCorpus || 0);
        setPpfMonthlyDeposit(input.ppfMonthlyDeposit || 0);
        setMutualFundCorpus(input.mutualFundCorpus || 0);
        setOngoingMonthlySip(input.ongoingMonthlySip || 0);
        setOtherLiquidCorpus(input.otherLiquidCorpus || 0);
        setHoldings(input.holdings || []);
      }

      setDiagnosticResult(resData.diagnosticResult);
    } catch (err: any) {
      setError(err.message || "Failed to load retirement planning.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchScope = (newScope: "HOUSEHOLD" | "INDIVIDUAL", memberId?: string) => {
    fetchData(selectedClientId, newScope, memberId);
  };

  useEffect(() => {
    fetchData(queryClientId);
  }, [queryClientId]);

  // Recalculate live when user adjusts sliders/inputs
  const handleRecalculate = async (overrides?: Partial<any>) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      const payloadInput = {
        currentAge,
        retirementAge,
        lifeExpectancy,
        currentMonthlyExpense,
        preRetirementInflation,
        postRetirementInflation,
        preRetirementReturn,
        postRetirementReturn,
        epfCorpus,
        epfMonthlyDeposit,
        epfRoi: 8.25,
        npsCorpus,
        npsMonthlyDeposit,
        npsRoi: 10.0,
        ppfCorpus,
        ppfMonthlyDeposit,
        ppfRoi: 7.1,
        mutualFundCorpus,
        ongoingMonthlySip,
        otherLiquidCorpus,
        holdings,
        ...overrides,
      };

      const res = await fetch("/api/planning/retirement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ action: "recalculate", input: payloadInput }),
      });

      if (!res.ok) throw new Error("Recalculation failed.");
      const resData = await res.json();
      setDiagnosticResult(resData.diagnosticResult);
    } catch (err: any) {
      console.warn("Live recalculate notice:", err);
    }
  };

  // Trigger recalculation on input changes
  useEffect(() => {
    if (!isLoading && diagnosticResult) {
      const timer = setTimeout(() => {
        handleRecalculate();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [
    currentAge,
    retirementAge,
    lifeExpectancy,
    currentMonthlyExpense,
    preRetirementInflation,
    postRetirementInflation,
    preRetirementReturn,
    postRetirementReturn,
  ]);

  // Generate Gemini AI Diagnostic
  const handleGenerateAi = async () => {
    if (!diagnosticResult || !selectedClient) return;
    setIsGeneratingAi(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      const context = {
        clientId: selectedClient.clientId,
        clientName: selectedClient.fullName,
        currentAge,
        retirementAge,
        lifeExpectancy,
        isAlreadyRetired: diagnosticResult.isAlreadyRetired,
        currentMonthlyExpense,
        inflatedMonthlyExpenseAtRetirement: diagnosticResult.inflatedMonthlyExpenseAtRetirement,
        corpusNeededAtRetirement: diagnosticResult.corpusNeededAtRetirement,
        totalProjectedCorpus: diagnosticResult.projectedWealth?.totalProjectedCorpus || 0,
        currentTotalRetirementCorpus: diagnosticResult.currentTotalRetirementCorpus,
        shortfallOrSurplus: diagnosticResult.shortfallOrSurplus,
        isFullyFunded: diagnosticResult.isFullyFunded,
        readinessScorePct: diagnosticResult.readinessScorePct,
        requiredAdditionalMonthlySip: diagnosticResult.requiredAdditionalMonthlySip,
        sustainableMonthlySpend: diagnosticResult.sustainableMonthlySpend,
        threeBucketPlan: diagnosticResult.threeBucketPlan,
        swpStpStrategy: diagnosticResult.swpStpStrategy,
        customInstructions: customAiPrompt.trim() || undefined,
      };

      const res = await fetch("/api/planning/retirement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ action: "generate_ai_diagnostic", context }),
      });

      if (!res.ok) throw new Error("AI generation failed.");
      const resData = await res.json();
      setAiAdvisory(resData.advisory);
      setActiveTab("ai-memo");
      showToast("Smart Retirement AI Diagnostic & Action Plan generated!");
    } catch (err: any) {
      showToast(err.message || "Failed to generate AI advisory.", "error");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Save Retirement Plan into Financial Goals
  const handleSavePlan = async () => {
    if (!selectedClient || !diagnosticResult) return;
    setIsSavingPlan(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      const payload = {
        action: "save_plan",
        clientId: selectedClient.clientId,
        currentAge,
        retirementAge,
        targetCorpusNeeded: diagnosticResult.corpusNeededAtRetirement,
        currentAllocatedCorpus: diagnosticResult.currentTotalRetirementCorpus,
        inflationRate: preRetirementInflation,
        notes: `Smart Retirement Plan: Monthly Expense ₹${currentMonthlyExpense.toLocaleString("en-IN")}, 3-Bucket Solution (B1: ${formatINR(diagnosticResult.threeBucketPlan.bucket1.targetAmount)}, B2: ${formatINR(diagnosticResult.threeBucketPlan.bucket2.targetAmount)}, B3: ${formatINR(diagnosticResult.threeBucketPlan.bucket3.targetAmount)}).`,
      };

      const res = await fetch("/api/planning/retirement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Saving plan failed.");
      showToast("Retirement plan & goal saved successfully!");
    } catch (err: any) {
      showToast(err.message || "Failed to save plan.", "error");
    } finally {
      setIsSavingPlan(false);
    }
  };

  // Save AI Advisory to Client Suggestions
  const handleSaveSuggestion = async () => {
    if (!selectedClient || !aiAdvisory) return;
    setIsSavingSuggestion(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      const res = await fetch("/api/planning/retirement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          action: "save_ai_suggestion",
          clientId: selectedClient.clientId,
          advisory: aiAdvisory,
          context: {
            customInstructions: customAiPrompt,
            swpStpStrategy: diagnosticResult?.swpStpStrategy,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to publish suggestion.");
      showToast("Retirement Advisory published to Client Action Feed!");
    } catch (err: any) {
      showToast(err.message || "Failed to publish suggestion.", "error");
    } finally {
      setIsSavingSuggestion(false);
    }
  };

  // Filter clients for searchable dropdown
  const filteredClients = useMemo(() => {
    if (!clientSearchTerm) return clients;
    return clients.filter((c) =>
      c.full_name?.toLowerCase().includes(clientSearchTerm.toLowerCase())
    );
  }, [clients, clientSearchTerm]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="h-8 w-8 text-purple-600 dark:text-purple-400 animate-spin" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Loading Smart Retirement Diagnostic &amp; Portfolio Engine...
        </p>
      </div>
    );
  }

  if (error || !selectedClient || !diagnosticResult) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Retirement Planning Unavailable</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          {error || "No client profile records were found. Please verify client data or select another client."}
        </p>
        <button
          onClick={() => fetchData()}
          className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-500 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  const isRetired = diagnosticResult.isAlreadyRetired;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-4 sm:px-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 text-xs flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link href={isAdvisor ? "/dashboard/advisor" : "/dashboard/client"} className="hover:text-slate-900 dark:hover:text-white transition">
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/dashboard/planning" className="hover:text-slate-900 dark:hover:text-white transition">
            Planning
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-900 dark:text-white font-semibold">Smart Retirement Suite</span>
        </div>

        {/* Advisor Client Selector */}
        {isAdvisor && clients.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Planning for:</span>
            <div className="relative">
              <select
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  fetchData(e.target.value);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-xs"
              >
                {clients.map((c) => (
                  <option key={c.client_id} value={c.client_id}>
                    {c.full_name} ({c.risk_profile || "Moderate"})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Household Multi-Member / Clubbed Plan Selector */}
      {hasMultipleMembers && householdMembers.length > 1 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white dark:from-purple-950/40 dark:via-slate-900 dark:to-slate-900 border border-purple-200 dark:border-purple-800/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Household Planning Scope
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  {householdMembers.length} Family Members
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Joint SIP: {formatINR(totalHouseholdSip)}/mo
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Toggle between a unified Common Household Plan (clubbing all family wealth) or individual member retirement blueprints.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs">
            {/* Clubbed Household Option */}
            <button
              onClick={() => handleSwitchScope("HOUSEHOLD")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                planningScope === "HOUSEHOLD"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Common Household Plan (Clubbed)</span>
            </button>

            {/* Individual Member Options */}
            {householdMembers.map((m) => {
              const breakdown = memberBreakdown.find((b) => b.clientId === m.clientId);
              const isSelected = planningScope === "INDIVIDUAL" && activeMemberId === m.clientId;
              return (
                <button
                  key={m.clientId}
                  onClick={() => handleSwitchScope("INDIVIDUAL", m.clientId)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    isSelected
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  <span>
                    {m.fullName} ({m.currentAge} yrs{breakdown?.monthlySip ? ` • ${formatINR(breakdown.monthlySip)}/mo` : ""})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hero Banner: Smart Retirement Diagnostic & Action Plan */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-purple-900/10 via-white to-slate-50 dark:from-purple-950/40 dark:via-slate-900 dark:to-slate-950 border border-purple-200 dark:border-purple-800/60 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                {planningScope === "HOUSEHOLD" ? "Clubbed Household Retirement Diagnostic" : "Individual Member Diagnostic"}
              </span>

              {planningScope === "HOUSEHOLD" ? (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Combined Family Portfolio ({householdMembers.length} Members)
                </span>
              ) : isRetired ? (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5" />
                  Active Decumulation Phase (Age {currentAge})
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-700 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Accumulation Horizon (Age {currentAge} &rarr; {retirementAge} • {diagnosticResult?.yearsToRetirement} yrs left)
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {planningScope === "HOUSEHOLD"
                ? `${selectedClient?.fullName}'s Household Combined Retirement Plan`
                : `${selectedClient?.fullName}'s Individual Retirement Plan`}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {planningScope === "HOUSEHOLD"
                ? `Joint family retirement architecture combining ${householdMembers.map((m) => m.fullName).join(" & ")}. Aggregates mutual fund SIPs (${formatINR(totalHouseholdSip)}/mo), EPF/NPS accounts, and household living expenses (${formatINR(currentMonthlyExpense)}/mo) to compute joint readiness and sustainable decumulation.`
                : isRetired
                ? `Currently retired at age ${currentAge}. Your Three-Bucket decumulation architecture protects your portfolio, generating a safe monthly SWP of ${formatINR(diagnosticResult?.sustainableMonthlySpend)} to shield your wealth from market crashes.`
                : `Plan your individual retirement to age ${retirementAge} and life expectancy to age ${lifeExpectancy}. Automatically imports your EPF, NPS, personal mutual funds (${formatINR(ongoingMonthlySip)}/mo SIP), and living expenses to calculate your exact corpus gap and decumulation runway.`}
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-col gap-2.5 shrink-0">
            <button
              onClick={handleGenerateAi}
              disabled={isGeneratingAi}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/25 transition disabled:opacity-50"
            >
              {isGeneratingAi ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Analyzing with Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Run Gemini AI Diagnostic</span>
                </>
              )}
            </button>

            <button
              onClick={handleSavePlan}
              disabled={isSavingPlan}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition"
            >
              {isSavingPlan ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving Plan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Save Plan Parameters</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowPdfModal(true)}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Professional Plan (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isRetired ? (
          <>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Total Retirement Corpus Available
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {formatINR(diagnosticResult.currentTotalRetirementCorpus)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Sum of EPF, NPS, Mutual Funds &amp; FDs
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Sustainable Monthly Spend (SWP)
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatINR(diagnosticResult.sustainableMonthlySpend)}
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400"> / mo</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Annual safe payout: {formatINR(diagnosticResult.sustainableAnnualSpend)}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                Corpus Longevity Runway
              </span>
              <div className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">
                {diagnosticResult.runwayYearsWithCurrentExpense >= 50
                  ? "50+ Years"
                  : `${diagnosticResult.runwayYearsWithCurrentExpense} Years`}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                At current monthly expense of {formatINR(currentMonthlyExpense)}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                4% Rule Annual Spend Benchmark
              </span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {formatINR(diagnosticResult.fourPercentRuleAnnual)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Safe monthly benchmark: {formatINR(diagnosticResult.fourPercentRuleMonthly)}/mo
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Target Corpus Needed at Age {retirementAge}
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {formatINR(diagnosticResult.corpusNeededAtRetirement)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Inflated expense: {formatINR(diagnosticResult.inflatedMonthlyExpenseAtRetirement)}/mo
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                Projected Wealth by Horizon
              </span>
              <div className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">
                {formatINR(diagnosticResult.projectedWealth?.totalProjectedCorpus || 0)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                EPF + NPS + MFs + ongoing SIPs
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  diagnosticResult.isFullyFunded
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {diagnosticResult.isFullyFunded ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                )}
                {diagnosticResult.isFullyFunded ? "Surplus / Fully Funded" : "Shortfall Gap"}
              </span>
              <div
                className={`text-2xl font-black font-mono ${
                  diagnosticResult.isFullyFunded
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {diagnosticResult.isFullyFunded ? (
                  `+${formatINR(Math.abs(diagnosticResult.shortfallOrSurplus))}`
                ) : (
                  formatINR(diagnosticResult.shortfallOrSurplus)
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Readiness Score: {diagnosticResult.readinessScorePct}% Funded
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Required Action
              </span>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
                {diagnosticResult.isFullyFunded ? (
                  "Target Secured"
                ) : (
                  <>
                    +{formatINR(diagnosticResult.requiredAdditionalMonthlySip)}
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400"> / mo</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {diagnosticResult.isFullyFunded
                  ? "Surplus covers longevity margin"
                  : `Or one-time lump sum of ${formatINR(diagnosticResult.requiredAdditionalLumpsum)}`}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Main Grid: Left Controls Dock & Right Detailed Tabbed Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Smart Retirement Parameter Controls Dock */}
        <div className="lg:col-span-4 space-y-5">
          {/* Uneditable Auto-Imported Profile Strip */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                Imported Profile Demographics
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Auto-Synced</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300">Current Age (Calculated)</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    DOB: {selectedClient.dateOfBirth ? new Date(selectedClient.dateOfBirth).toLocaleDateString("en-IN") : "Unspecified"}
                  </div>
                </div>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400 font-mono">
                  {currentAge} Years
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300">EPF &amp; VPF Savings</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {epfMonthlyDeposit > 0 ? `Deposit: ${formatINR(epfMonthlyDeposit)}/mo` : "Lump sum balance"}
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                  {formatINR(epfCorpus)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300">National Pension (NPS)</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {npsMonthlyDeposit > 0 ? `Deposit: ${formatINR(npsMonthlyDeposit)}/mo` : "Tier-1 Balance"}
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                  {formatINR(npsCorpus)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300">Mutual Fund Portfolio</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {ongoingMonthlySip > 0 ? `SIP: ${formatINR(ongoingMonthlySip)}/mo` : "Consolidated folio"}
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatINR(mutualFundCorpus)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300">Liquid Savings &amp; FDs</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Emergency &amp; cash reserves</div>
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                  {formatINR(otherLiquidCorpus)}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Parameters Adjustment Dock */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                Adjustable Planning Controls
              </span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">Live Calculator</span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Editable Monthly Expense */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Current Monthly Expense (₹)</label>
                  <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">{formatINR(currentMonthlyExpense)}</span>
                </div>
                <input
                  type="number"
                  step="1000"
                  min="5000"
                  value={currentMonthlyExpense}
                  onChange={(e) => setCurrentMonthlyExpense(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Auto-imported from living expenses. Editable as per your target lifestyle.
                </span>
              </div>

              {/* Retirement Age Slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Target Retirement Age</label>
                  <span className="font-bold text-sky-600 dark:text-sky-400 font-mono">{retirementAge} Years</span>
                </div>
                <input
                  type="range"
                  min={Math.max(40, currentAge)}
                  max="75"
                  value={retirementAge}
                  onChange={(e) => setRetirementAge(Number(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>Age {Math.max(40, currentAge)}</span>
                  <span>Age 60</span>
                  <span>Age 75</span>
                </div>
              </div>

              {/* Life Expectancy Slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Planning Horizon (Life Expectancy)</label>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{lifeExpectancy} Years</span>
                </div>
                <input
                  type="range"
                  min={Math.max(70, retirementAge + 5)}
                  max="100"
                  value={lifeExpectancy}
                  onChange={(e) => setLifeExpectancy(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>Age {Math.max(70, retirementAge + 5)}</span>
                  <span>Age 85</span>
                  <span>Age 100</span>
                </div>
              </div>

              {/* Pre & Post Inflation Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Pre-Ret. Inflation</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="3"
                      max="12"
                      value={preRetirementInflation}
                      onChange={(e) => setPreRetirementInflation(Number(e.target.value) || 6)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono text-xs"
                    />
                    <span className="absolute right-2 top-1.5 text-slate-400 text-[11px]">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Post-Ret. Inflation</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="3"
                      max="12"
                      value={postRetirementInflation}
                      onChange={(e) => setPostRetirementInflation(Number(e.target.value) || 5.5)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono text-xs"
                    />
                    <span className="absolute right-2 top-1.5 text-slate-400 text-[11px]">%</span>
                  </div>
                </div>
              </div>

              {/* Pre & Post Return Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Pre-Ret. Return (CAGR)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="6"
                      max="16"
                      value={preRetirementReturn}
                      onChange={(e) => setPreRetirementReturn(Number(e.target.value) || 11.5)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono text-xs"
                    />
                    <span className="absolute right-2 top-1.5 text-slate-400 text-[11px]">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Post-Ret. Portfolio</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="5"
                      max="12"
                      value={postRetirementReturn}
                      onChange={(e) => setPostRetirementReturn(Number(e.target.value) || 7.5)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono text-xs"
                    />
                    <span className="absolute right-2 top-1.5 text-slate-400 text-[11px]">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Tabbed Solutions & Projections */}
        <div className="lg:col-span-8 space-y-5">
          {/* Tabs Navigation */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("diagnostic")}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition -mb-px flex items-center gap-2 shrink-0 ${
                activeTab === "diagnostic"
                  ? "border-purple-600 dark:border-purple-500 text-purple-600 dark:text-purple-400 font-bold"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Target className="h-4 w-4" />
              <span>Diagnostic &amp; Wealth Projection</span>
            </button>

            <button
              onClick={() => setActiveTab("three-bucket")}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition -mb-px flex items-center gap-2 shrink-0 ${
                activeTab === "three-bucket"
                  ? "border-purple-600 dark:border-purple-500 text-purple-600 dark:text-purple-400 font-bold"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Three-Bucket Decumulation Solution</span>
            </button>

            <button
              onClick={() => setActiveTab("swp-stp")}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition -mb-px flex items-center gap-2 shrink-0 ${
                activeTab === "swp-stp"
                  ? "border-purple-600 dark:border-purple-500 text-purple-600 dark:text-purple-400 font-bold"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ArrowDownToLine className="h-4 w-4" />
              <span>SWP &amp; STP Blueprint (Fund Picks)</span>
            </button>

            <button
              onClick={() => setActiveTab("ai-memo")}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition -mb-px flex items-center gap-2 shrink-0 ${
                activeTab === "ai-memo"
                  ? "border-purple-600 dark:border-purple-500 text-purple-600 dark:text-purple-400 font-bold"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span>Gemini AI Action Plan</span>
            </button>
          </div>

          {/* TAB 1: Diagnostic & Wealth Projections */}
          {activeTab === "diagnostic" && (
            <div className="space-y-5">
              {/* Retirement Readiness Progress Bar */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Retirement Feasibility &amp; Pre-Funding Ratio</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          diagnosticResult.readinessScorePct >= 100
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                        }`}
                      >
                        {diagnosticResult.readinessScorePct}% Funded
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Target: {formatINR(diagnosticResult.corpusNeededAtRetirement)} • Projected: {formatINR(diagnosticResult.projectedWealth?.totalProjectedCorpus || 0)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-medium">Horizon</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                      {isRetired ? "Retired Today" : `${diagnosticResult.yearsToRetirement} Years`}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      diagnosticResult.readinessScorePct >= 100
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                        : "bg-gradient-to-r from-purple-500 via-sky-400 to-emerald-400"
                    }`}
                    style={{ width: `${Math.min(100, diagnosticResult.readinessScorePct)}%` }}
                  />
                </div>
              </div>

              {/* Wealth Contribution Breakdown */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Wealth Growth &amp; Asset Contribution at Retirement Horizon
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">EPF &amp; VPF Compounded</span>
                    <div className="text-base font-bold text-slate-900 dark:text-white font-mono">
                      {formatINR(diagnosticResult.projectedWealth?.epfFutureValue || 0)}
                    </div>
                    <span className="text-[10px] text-slate-400">At statutory 8.25% CAGR</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">National Pension (NPS)</span>
                    <div className="text-base font-bold text-slate-900 dark:text-white font-mono">
                      {formatINR(diagnosticResult.projectedWealth?.npsFutureValue || 0)}
                    </div>
                    <span className="text-[10px] text-slate-400">At 10.0% benchmark CAGR</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Mutual Funds &amp; SIPs</span>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatINR(diagnosticResult.projectedWealth?.mutualFundsFutureValue || 0)}
                    </div>
                    <span className="text-[10px] text-slate-400">At {preRetirementReturn}% equity CAGR</span>
                  </div>
                </div>
              </div>

              {/* Annual Cashflow Forecast Waterfall Table */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Lifetime Accumulation &amp; Decumulation Waterfall
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Actuarial Timeline</span>
                </div>

                <div className="overflow-x-auto max-h-80 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                        <th className="py-2.5 px-3">Age</th>
                        <th className="py-2.5 px-3">Phase</th>
                        <th className="py-2.5 px-3">Beginning Corpus</th>
                        <th className="py-2.5 px-3">Annual Inflow</th>
                        <th className="py-2.5 px-3">Annual Living Cost</th>
                        <th className="py-2.5 px-3">Growth / Returns</th>
                        <th className="py-2.5 px-3">Ending Corpus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                      {diagnosticResult.annualCashFlowProjection?.map((row: any) => (
                        <tr
                          key={row.yearNumber}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-950/40 transition ${
                            row.clientAge === retirementAge ? "bg-purple-50/50 dark:bg-purple-950/20 font-bold" : ""
                          }`}
                        >
                          <td className="py-2 px-3 text-slate-900 dark:text-white">{row.clientAge} yrs</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                row.phase === "ACCUMULATION"
                                  ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {row.phase}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{formatINR(row.beginningCorpus)}</td>
                          <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400">
                            {row.annualContributions > 0 ? `+${formatINR(row.annualContributions)}` : "-"}
                          </td>
                          <td className="py-2 px-3 text-rose-600 dark:text-rose-400">
                            {row.annualLivingExpense > 0 ? `-${formatINR(row.annualLivingExpense)}` : "-"}
                          </td>
                          <td className="py-2 px-3 text-sky-600 dark:text-sky-400">+{formatINR(row.annualReturns)}</td>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{formatINR(row.endingCorpus)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Three-Bucket Decumulation Solution */}
          {activeTab === "three-bucket" && (
            <div className="space-y-5">
              {/* Explanatory Banner */}
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 text-xs space-y-1">
                <div className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Institutional Three-Bucket Architecture for Decumulation
                </div>
                <p className="text-purple-800 dark:text-purple-300/80 leading-relaxed">
                  Solves the dangerous sequence-of-returns risk. By allocating 3 years of living costs into Bucket 1 and 5 years into Bucket 2, you never sell equity during a market crash. Bucket 3 stays invested for 9+ years to beat healthcare and lifestyle inflation.
                </p>
              </div>

              {/* 3 Bucket Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Bucket 1 */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-500/30 dark:border-emerald-500/20 shadow-sm space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Bucket 1: Immediate Cash Flow
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">Years 1 - 3</span>
                  </div>

                  <div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                      {formatINR(diagnosticResult.threeBucketPlan.bucket1.targetAmount)}
                    </div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                      {diagnosticResult.threeBucketPlan.bucket1.allocationPct}% Allocation • Target 6.8% Return
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {diagnosticResult.threeBucketPlan.bucket1.purpose}
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block">
                      Recommended Instruments:
                    </span>
                    {diagnosticResult.threeBucketPlan.bucket1.recommendedInstruments?.map((inst: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{inst}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                    Monthly SWP Outflow: {formatINR(diagnosticResult.threeBucketPlan.bucket1.monthlySwpOutflow)}/mo
                  </div>
                </div>

                {/* Bucket 2 */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-sky-500/30 dark:border-sky-500/20 shadow-sm space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                      Bucket 2: Stability &amp; Income
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">Years 4 - 8</span>
                  </div>

                  <div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                      {formatINR(diagnosticResult.threeBucketPlan.bucket2.targetAmount)}
                    </div>
                    <div className="text-xs text-sky-600 dark:text-sky-400 font-semibold mt-0.5">
                      {diagnosticResult.threeBucketPlan.bucket2.allocationPct}% Allocation • Target 8.0% Return
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {diagnosticResult.threeBucketPlan.bucket2.purpose}
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block">
                      Recommended Instruments:
                    </span>
                    {diagnosticResult.threeBucketPlan.bucket2.recommendedInstruments?.map((inst: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="h-3.5 w-3.5 text-sky-500 shrink-0 mt-0.5" />
                        <span>{inst}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-400 text-[11px] font-semibold">
                    Replenishment Cycle: Refuels Bucket 1 every 24-36 months
                  </div>
                </div>

                {/* Bucket 3 */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-purple-500/30 dark:border-purple-500/20 shadow-sm space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      Bucket 3: Long-Term Growth
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">Years 9+</span>
                  </div>

                  <div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                      {formatINR(diagnosticResult.threeBucketPlan.bucket3.targetAmount)}
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
                      {diagnosticResult.threeBucketPlan.bucket3.allocationPct}% Allocation • Target 12.2% Return
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {diagnosticResult.threeBucketPlan.bucket3.purpose}
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block">
                      Recommended Instruments:
                    </span>
                    {diagnosticResult.threeBucketPlan.bucket3.recommendedInstruments?.map((inst: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="h-3.5 w-3.5 text-purple-500 shrink-0 mt-0.5" />
                        <span>{inst}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-400 text-[11px] font-semibold">
                    STP Engine: Shifting 2-3% annual profits into Bucket 2
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SWP & STP Blueprint & Fund Selection */}
          {activeTab === "swp-stp" && (
            <div className="space-y-5">
              {/* SWP Tax Alpha Box */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowDownToLine className="h-4 w-4 text-emerald-500" />
                    Systematic Withdrawal Plan (SWP) Tax Alpha Strategy
                  </h3>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatINR(diagnosticResult.swpStpStrategy?.recommendedMonthlySwp || 0)} / month
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {diagnosticResult.swpStpStrategy?.taxEfficiencyBenefit}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase block">SWP Withdrawal Rate</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                      {diagnosticResult.swpStpStrategy?.swpWithdrawalRatePct}% p.a.
                    </span>
                    <span className="text-[10px] text-slate-400">Within the 4.0-5.5% safe withdrawal ceiling</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase block">Quarterly STP Refueling</span>
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400 font-mono mt-0.5 block">
                      {formatINR(diagnosticResult.swpStpStrategy?.recommendedStpMonthly || 0)} / month
                    </span>
                    <span className="text-[10px] text-slate-400">Systematically shifted from Bucket 3 to Bucket 2</span>
                  </div>
                </div>
              </div>

              {/* Fund Selection Matrix: Pick Up vs Avoid */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Portfolio Holdings Diagnostic: Which Funds to Pick Up vs Avoid for SWP
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Evaluates client holdings against volatility, sequencing risks, and decumulation tax efficiency.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    {diagnosticResult.swpStpStrategy?.fundRecommendations?.length || 0} Schemes Analyzed
                  </span>
                </div>

                <div className="space-y-3">
                  {diagnosticResult.swpStpStrategy?.fundRecommendations?.map((fund: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {fund.schemeName}
                          </span>
                          <span className="font-mono text-slate-500 dark:text-slate-400">
                            ({formatINR(fund.currentValue)})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          {fund.rationale}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {fund.status === "PICK_UP_FOR_SWP" && (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            PICK UP FOR SWP (Bucket 1 &amp; 2)
                          </span>
                        )}

                        {fund.status === "CORE_GROWTH_STP" && (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-purple-500" />
                            HOLD FOR GROWTH (Bucket 3)
                          </span>
                        )}

                        {fund.status === "AVOID_SWP_REBALANCE" && (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-rose-500" />
                            AVOID SWP (High Volatility Risk)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Gemini AI Retirement Action Plan */}
          {activeTab === "ai-memo" && (
            <div className="space-y-5">
              {!aiAdvisory ? (
                <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <Sparkles className="h-8 w-8 text-purple-500 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Run Smart Retirement AI Analysis</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Activate the institutional Google Gemini Actuarial Model to generate a personalized executive retirement memo, sequence-of-returns protection strategy, and fund roadmap.
                  </p>
                  <button
                    onClick={handleGenerateAi}
                    disabled={isGeneratingAi}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 mx-auto shadow-md shadow-purple-600/20"
                  >
                    {isGeneratingAi ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    <span>Generate AI Diagnostic</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Executive Summary Card */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Chief Actuarial Officer Executive Summary
                        </h3>
                      </div>
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono font-bold">
                        {aiAdvisory.aiModelUsed}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                      {aiAdvisory.executiveSummary}
                    </p>
                  </div>

                  {/* Longevity & Sequence of Returns Diagnostic */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                      <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 uppercase text-[10px]">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Longevity &amp; Inflation Risk
                      </span>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        {aiAdvisory.longevityRiskDiagnostic?.inflationErosionWarning}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase text-[10px]">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Sequence-of-Returns Protection
                      </span>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        {aiAdvisory.longevityRiskDiagnostic?.sequenceOfReturnsRiskMitigation}
                      </p>
                    </div>
                  </div>

                  {/* Action Roadmap */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Strategic Execution Roadmap
                    </h3>

                    <div className="space-y-2.5">
                      {aiAdvisory.actionRoadmap?.map((step: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <span>Step {idx + 1}: {step.step}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                  step.priority === "HIGH"
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                }`}
                              >
                                {step.priority}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{step.description}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono font-semibold shrink-0">
                            {step.timeline}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Advisor Specific Guidance & Publish to Client */}
                  {isAdvisor && (
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Advisor Custom Notes / Instructions
                        </span>
                        <span className="text-[10px] text-slate-400">Optional</span>
                      </div>
                      <textarea
                        rows={2}
                        value={customAiPrompt}
                        onChange={(e) => setCustomAiPrompt(e.target.value)}
                        placeholder="Add bespoke advisory notes or client instructions for this retirement plan..."
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={handleSaveSuggestion}
                          disabled={isSavingSuggestion}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm"
                        >
                          {isSavingSuggestion ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          <span>Publish to Client Action Feed</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Export Professional Plan (PDF) Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-6 text-slate-900 dark:text-white">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Export Comprehensive Retirement Plan
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      Institutional PDF
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Generate an official, branded retirement diagnostic report for{" "}
                    <strong className="text-slate-700 dark:text-slate-200">
                      {selectedClient?.fullName || "Valued Client"}
                    </strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPdfModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Plan Summary Badge */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-3 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Current Age</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{currentAge} Years</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Retirement Age</span>
                <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{retirementAge} Years</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {diagnosticResult?.isAlreadyRetired ? "Current Corpus" : "Target Corpus"}
                </span>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {formatINR(diagnosticResult?.isAlreadyRetired ? diagnosticResult.currentTotalRetirementCorpus : diagnosticResult?.corpusNeededAtRetirement)}
                </p>
              </div>
            </div>

            {/* Password Protection Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pdfEnablePassword}
                    onChange={(e) => setPdfEnablePassword(e.target.checked)}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    Password Protect this PDF Document
                  </span>
                </label>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  128-bit Encrypted
                </span>
              </div>

              {pdfEnablePassword ? (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPdfPasswordType("PAN")}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                        pdfPasswordType === "PAN"
                          ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/30 text-purple-950 dark:text-purple-200"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <Key className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                          Client PAN
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Standard AMC format (uppercase)
                        </div>
                      </div>
                      <div className="mt-2 text-[11px] font-mono font-bold text-purple-700 dark:text-purple-300">
                        {selectedClient?.panNumber || "ABCDE1234F"}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPdfPasswordType("NAME_DOB")}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                        pdfPasswordType === "NAME_DOB"
                          ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/30 text-purple-950 dark:text-purple-200"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                          Name + Birth Year
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          EPFO format (e.g. RAME1985)
                        </div>
                      </div>
                      <div className="mt-2 text-[11px] font-mono font-bold text-purple-700 dark:text-purple-300">
                        {(selectedClient?.fullName || "USER").replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase()}
                        {selectedClient?.dateOfBirth ? new Date(selectedClient.dateOfBirth).getFullYear() : (new Date().getFullYear() - currentAge)}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPdfPasswordType("CUSTOM")}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                        pdfPasswordType === "CUSTOM"
                          ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/30 text-purple-950 dark:text-purple-200"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <Lock className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                          Custom Password
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Specify secret PIN / text
                        </div>
                      </div>
                      <div className="mt-2 text-[11px] font-mono font-bold text-purple-700 dark:text-purple-300">
                        {customPdfPassword ? "••••••••" : "Custom..."}
                      </div>
                    </button>
                  </div>

                  {pdfPasswordType === "CUSTOM" && (
                    <div className="relative mt-2">
                      <input
                        type={showPasswordText ? "text" : "password"}
                        value={customPdfPassword}
                        onChange={(e) => setCustomPdfPassword(e.target.value)}
                        placeholder="Enter custom PDF password..."
                        className="w-full px-3.5 py-2.5 pr-10 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordText(!showPasswordText)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showPasswordText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  )}

                  {/* Shareable Password Preview Box */}
                  <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                        Recipient Unlock Password
                      </span>
                      <div className="text-sm font-mono font-black tracking-widest text-purple-700 dark:text-purple-300">
                        {resolvedPdfPassword || "(Please enter custom password)"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      disabled={!resolvedPdfPassword}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-300 flex items-center gap-1.5 shadow-2xs transition"
                    >
                      {copiedPassword ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy Password</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>Unprotected Mode: Document can be opened immediately by anyone without entering a password.</span>
                </div>
              )}
            </div>

            {/* Content Inclusions */}
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Include in Report</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pdfIncludeAi}
                    onChange={(e) => setPdfIncludeAi(e.target.checked)}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300 text-[11px]">
                    AI Actuarial &amp; Action Memo
                  </span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pdfIncludeHoldings}
                    onChange={(e) => setPdfIncludeHoldings(e.target.checked)}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300 text-[11px]">
                    Savings Audit &amp; Scheme Matrix
                  </span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 cursor-pointer sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={pdfIncludeCashFlow}
                    onChange={(e) => setPdfIncludeCashFlow(e.target.checked)}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300 text-[11px]">
                    Three-Bucket Architecture &amp; SWP Decumulation Schedule
                  </span>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf || (pdfEnablePassword && pdfPasswordType === "CUSTOM" && !customPdfPassword.trim())}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50"
              >
                {isGeneratingPdf ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Generating Encrypted PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Download Professional PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
