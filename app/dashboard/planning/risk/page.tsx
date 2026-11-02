"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  HeartPulse,
  Users,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  Sparkles,
  Info,
  DollarSign,
  ArrowRight,
  RefreshCw,
  Sliders,
  FileCheck,
  Save,
  MessageSquare,
  Building,
  HelpCircle,
} from "lucide-react";
import { useFirmBranding } from "@/lib/context/FirmBrandingContext";
import { useFeatureAccess } from "@/lib/useFeatureAccess";

export default function RiskPlanningPage() {
  const router = useRouter();
  const { terms } = useFirmBranding();
  const { allowed: hasRiskPlanningAccess } = useFeatureAccess("risk_planning");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Data from API
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"TERM" | "HEALTH" | "SCORECARD">("TERM");

  // Scope & Member Selection
  const [planningScope, setPlanningScope] = useState<"HOUSEHOLD" | "INDIVIDUAL">("HOUSEHOLD");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  // Interactive Form State (Live Recalculation)
  const [currentAge, setCurrentAge] = useState<number>(38);
  const [retirementAge, setRetirementAge] = useState<number>(60);
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(85000);
  const [outstandingLiabilities, setOutstandingLiabilities] = useState<number>(4500000);
  const [futureMilestones, setFutureMilestones] = useState<number>(3000000);
  const [existingTermCover, setExistingTermCover] = useState<number>(10000000);
  const [existingHealthCover, setExistingHealthCover] = useState<number>(1000000);
  const [isSmoker, setIsSmoker] = useState<boolean>(false);
  const [cityTier, setCityTier] = useState<"TIER_1" | "TIER_2_3">("TIER_1");
  const [existingLiquidAssets, setExistingLiquidAssets] = useState<number>(0);

  const fetchRiskPlan = async (scope = planningScope, memberId = selectedMemberId) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const url = new URL("/api/planning/risk", window.location.origin);
      if (scope) url.searchParams.set("scope", scope);
      if (memberId) url.searchParams.set("memberId", memberId);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load risk plan.");

      setData(json);
      if (json.inputs) {
        setCurrentAge(json.inputs.currentAge || 38);
        setRetirementAge(json.inputs.retirementAge || 60);
        setMonthlyExpenses(json.inputs.monthlyLivingExpenses || 85000);
        setOutstandingLiabilities(json.inputs.outstandingLiabilities || 0);
        setFutureMilestones(json.inputs.futureKeyMilestones || 3000000);
        setExistingTermCover(json.inputs.existingTermCover || 0);
        setExistingHealthCover(json.inputs.existingHealthCover || 0);
        setIsSmoker(Boolean(json.inputs.isSmoker));
        setCityTier(json.inputs.cityTier || "TIER_1");
        setExistingLiquidAssets(json.inputs.existingLiquidAssets || 0);
      }
      if (json.planningScope) setPlanningScope(json.planningScope);
      if (json.activeClient && !selectedMemberId) {
        setSelectedMemberId(json.activeClient.clientId);
      }
    } catch (err: any) {
      setError(err.message || "Failed to initialize risk planner.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskPlan();
  }, []);

  const handleScopeChange = (newScope: "HOUSEHOLD" | "INDIVIDUAL", newMemberId?: string) => {
    setPlanningScope(newScope);
    if (newMemberId) setSelectedMemberId(newMemberId);
    fetchRiskPlan(newScope, newMemberId || selectedMemberId);
  };

  // Client-side instant recalculations based on interactive inputs
  const yearsToProtect = Math.max(1, retirementAge - currentAge);
  const annualLivingExpenses = monthlyExpenses * 12;
  const realRate = 0.015;
  const pvFactor = (1 - Math.pow(1 + realRate, -yearsToProtect)) / realRate;
  const expenseReplacementCorpus = Math.round(annualLivingExpenses * pvFactor);
  const grossProtectionNeeded = expenseReplacementCorpus + outstandingLiabilities + futureMilestones;
  const totalCushion = existingLiquidAssets + existingTermCover;
  const netTermGap = Math.max(0, grossProtectionNeeded - totalCushion);

  let liveRecommendedTermCover = 0;
  if (netTermGap > 0) {
    if (netTermGap <= 5000000) {
      liveRecommendedTermCover = Math.ceil(netTermGap / 2500000) * 2500000;
    } else {
      liveRecommendedTermCover = Math.ceil(netTermGap / 5000000) * 5000000;
    }
  }

  // Live Term Premium
  let baseRatePerCrore = 11000;
  if (currentAge <= 30) baseRatePerCrore = 9000;
  else if (currentAge <= 35) baseRatePerCrore = 12000;
  else if (currentAge <= 40) baseRatePerCrore = 17500;
  else if (currentAge <= 45) baseRatePerCrore = 25000;
  else if (currentAge <= 50) baseRatePerCrore = 38000;
  else baseRatePerCrore = 60000;

  if (isSmoker) baseRatePerCrore *= 1.6;
  const crores = liveRecommendedTermCover / 10000000;
  const liveEstimatedTermAnnual = Math.round(crores * baseRatePerCrore * 1.18);
  const liveEstimatedTermMonthly = Math.round(liveEstimatedTermAnnual / 12);

  // Live Health Calculations
  const recommendedTotalHealth = cityTier === "TIER_1" ? 10000000 : 5000000;
  const healthGap = Math.max(0, recommendedTotalHealth - existingHealthCover);
  const recommendedBaseHealth = 1000000;
  const recommendedSuperTopUp = Math.max(0, recommendedTotalHealth - recommendedBaseHealth);
  const deductible = recommendedBaseHealth;

  let baseHealthPremium = 14000;
  if (currentAge <= 30) baseHealthPremium = 11000;
  else if (currentAge <= 40) baseHealthPremium = 15000;
  else if (currentAge <= 50) baseHealthPremium = 24000;
  else baseHealthPremium = 36000;

  const superTopUpPremium = Math.round((currentAge <= 40 ? 4200 : 6500) * 1.18);
  const combinedHealthPremium = Math.round(baseHealthPremium * 1.18) + superTopUpPremium;
  const standaloneHealthPremium = Math.round(combinedHealthPremium * 2.65);
  const healthArbitrageSavings = standaloneHealthPremium - combinedHealthPremium;

  const handleSavePlan = async () => {
    setIsSaving(true);
    setSaveSuccess(null);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/planning/risk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientId: selectedMemberId || data?.activeClient?.clientId,
          monthlyLivingExpenses: monthlyExpenses,
          outstandingLiabilities,
          futureKeyMilestones: futureMilestones,
          existingTermCover,
          existingHealthCover,
          isSmoker,
          cityTier,
          currentAge,
          retirementAge,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save plan.");
      setSaveSuccess("Risk and Insurance Action Plan successfully committed!");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to save plan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLaunchRiskAgentChat = () => {
    router.push(`/dashboard/ai-copilot?agent=RISK_PLANNING&clientId=${selectedMemberId || ""}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <RefreshCw className="h-8 w-8 text-sky-500 animate-spin" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Loading actuarial risk models and policy matrices...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Risk &amp; Insurance Planning
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Actuarial AI
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Human Life Value (HLV) term life sizing, health floater + super top-up dual architecture, and premium arbitrage.
              </p>
            </div>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleLaunchRiskAgentChat}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Chat with Risk AI Agent</span>
          </button>

          <button
            onClick={handleSavePlan}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>{isSaving ? "Saving..." : "Save Plan"}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:underline">✕</button>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
          <button onClick={() => setSaveSuccess(null)} className="text-emerald-500 hover:underline">✕</button>
        </div>
      )}

      {/* Household & Member Scope Switcher */}
      {data?.householdMembers && data.householdMembers.length > 1 && (
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Planning Scope:
            </span>
            <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-950">
              <button
                type="button"
                onClick={() => handleScopeChange("HOUSEHOLD")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  planningScope === "HOUSEHOLD"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Combined Family Household ({data.householdMembers.length} Members)
              </button>
              <button
                type="button"
                onClick={() => handleScopeChange("INDIVIDUAL")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  planningScope === "INDIVIDUAL"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Individual Member
              </button>
            </div>
          </div>

          {planningScope === "INDIVIDUAL" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Selecting member:</span>
              <select
                value={selectedMemberId}
                onChange={(e) => handleScopeChange("INDIVIDUAL", e.target.value)}
                className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                {data.householdMembers.map((m: any) => (
                  <option key={m.clientId} value={m.clientId}>
                    {m.fullName} (Age {m.currentAge}, {m.relationship})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("TERM")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === "TERM"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>Term Life Insurance (HLV Method)</span>
        </button>

        <button
          onClick={() => setActiveTab("HEALTH")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === "HEALTH"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <HeartPulse className="h-4 w-4" />
          <span>Health Floater &amp; Super Top-up</span>
        </button>

        <button
          onClick={() => setActiveTab("SCORECARD")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === "SCORECARD"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <FileCheck className="h-4 w-4" />
          <span>Consolidated Risk Scorecard</span>
        </button>
      </div>

      {/* TAB 1: TERM LIFE INSURANCE (HLV) */}
      {activeTab === "TERM" && (
        <div className="space-y-6">
          {/* Top KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-1">
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                Recommended Term Cover
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                ₹{(liveRecommendedTermCover / 100000).toFixed(0)} Lakhs
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pure Vanilla Term up to Age {retirementAge} ({yearsToProtect} yrs tenure)
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Existing Cover &amp; Liquid Assets
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ₹{(totalCushion / 100000).toFixed(1)} Lakhs
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ₹{(existingTermCover / 100000).toFixed(0)}L Insurance + ₹{(existingLiquidAssets / 100000).toFixed(1)}L Liquid
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-1">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Net Protection Gap
              </span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {netTermGap > 0 ? `₹${(netTermGap / 100000).toFixed(1)} Lakhs` : "Zero (Well Protected)"}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Gross Need ₹{(grossProtectionNeeded / 100000).toFixed(0)}L minus available cushion
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-1">
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                Estimated Premium
              </span>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                ₹{liveEstimatedTermMonthly.toLocaleString("en-IN")}<span className="text-xs text-slate-400 font-normal"> / mo</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ~₹{liveEstimatedTermAnnual.toLocaleString("en-IN")} / year (18% GST included)
              </p>
            </div>
          </div>

          {/* Interactive Calculator Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Controls */}
            <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Actuarial Human Life Value (HLV) Inputs
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">Adjust sliders for instant recalibration</span>
              </div>

              {/* Ages */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Current Age</span>
                    <strong className="text-slate-900 dark:text-white">{currentAge} Years</strong>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="65"
                    value={currentAge}
                    onChange={(e) => setCurrentAge(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Retirement / Freedom Age</span>
                    <strong className="text-slate-900 dark:text-white">{retirementAge} Years</strong>
                  </div>
                  <input
                    type="range"
                    min="45"
                    max="75"
                    value={retirementAge}
                    onChange={(e) => setRetirementAge(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Monthly Living Expenses */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Monthly Family Living Expenses</span>
                  <strong className="text-slate-900 dark:text-white">
                    ₹{monthlyExpenses.toLocaleString("en-IN")} / mo
                  </strong>
                </div>
                <input
                  type="range"
                  min="20000"
                  max="500000"
                  step="5000"
                  value={monthlyExpenses}
                  onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400">
                  Annual expenses: ₹{(annualLivingExpenses / 100000).toFixed(1)} Lakhs | PV of replacement: ₹{(expenseReplacementCorpus / 100000).toFixed(1)} Lakhs
                </span>
              </div>

              {/* Outstanding Liabilities / Loans */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-400">
                    Outstanding Debts &amp; Home Loans (Auto-pulled)
                  </span>
                  <strong className="text-slate-900 dark:text-white">
                    ₹{(outstandingLiabilities / 100000).toFixed(1)} Lakhs
                  </strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30000000"
                  step="100000"
                  value={outstandingLiabilities}
                  onChange={(e) => setOutstandingLiabilities(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                {data?.liabilitiesSummary?.items?.length > 0 && (
                  <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Active Folio Liabilities: </span>
                    {data.liabilitiesSummary.items.map((i: any, idx: number) => (
                      <span key={i.liabilityId} className="mr-2">
                        {i.type} ({i.lender || "Bank"}): ₹{(i.principal / 100000).toFixed(1)}L{idx < data.liabilitiesSummary.items.length - 1 ? "," : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Future Family Milestones */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Children&apos;s Higher Education &amp; Milestones</span>
                  <strong className="text-slate-900 dark:text-white">
                    ₹{(futureMilestones / 100000).toFixed(1)} Lakhs
                  </strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15000000"
                  step="250000"
                  value={futureMilestones}
                  onChange={(e) => setFutureMilestones(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Existing Term Insurance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Existing Pure Term Cover (₹)
                  </label>
                  <input
                    type="number"
                    value={existingTermCover}
                    onChange={(e) => setExistingTermCover(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white rounded-lg p-2 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="e.g. 10000000"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4 sm:pt-6">
                  <input
                    type="checkbox"
                    id="smoker_toggle"
                    checked={isSmoker}
                    onChange={(e) => setIsSmoker(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="smoker_toggle" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <strong>Tobacco / Smoker:</strong> Check if consumed within past 3 years (+60% premium loading).
                  </label>
                </div>
              </div>
            </div>

            {/* Actuarial Breakdown & AI Insights */}
            <div className="lg:col-span-5 space-y-4">
              {/* Mathematics Breakdown Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-xs">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  HLV Actuarial Waterfall
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-500 dark:text-slate-400">Expense Replacement ({yearsToProtect} yrs)</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      +₹{(expenseReplacementCorpus / 100000).toFixed(1)}L
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-500 dark:text-slate-400">Liability Clear-off (Loans)</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      +₹{(outstandingLiabilities / 100000).toFixed(1)}L
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-500 dark:text-slate-400">Kids Higher Ed &amp; Milestones</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      +₹{(futureMilestones / 100000).toFixed(1)}L
                    </span>
                  </div>

                  <div className="flex justify-between py-1 text-slate-900 dark:text-white font-bold bg-slate-50 dark:bg-slate-950 p-2 rounded-lg">
                    <span>Gross Protection Required</span>
                    <span>₹{(grossProtectionNeeded / 100000).toFixed(1)} Lakhs</span>
                  </div>

                  <div className="flex justify-between py-1 text-emerald-600 dark:text-emerald-400">
                    <span>Less: Liquid Assets Cushion</span>
                    <span>-₹{(existingLiquidAssets / 100000).toFixed(1)}L</span>
                  </div>

                  <div className="flex justify-between py-1 text-emerald-600 dark:text-emerald-400">
                    <span>Less: Existing Term Life Insurance</span>
                    <span>-₹{(existingTermCover / 100000).toFixed(0)}L</span>
                  </div>

                  <div className="flex justify-between py-2 text-sm font-black border-t-2 border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400">
                    <span>Net Coverage Gap</span>
                    <span>₹{(netTermGap / 100000).toFixed(1)} Lakhs</span>
                  </div>
                </div>
              </div>

              {/* Married Women's Property (MWP) Act Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-blue-500/10 to-slate-900/10 border border-indigo-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                    Mandatory: Married Women&apos;s Property (MWP) Act Endorsement
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Always execute term policies under Section 6 of the MWP Act 1874. This creates a statutory trust where death benefits are payable solely to the spouse and children, legally protected from court attachments, creditors, and business liabilities.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HEALTH FLOATER & SUPER TOP-UP */}
      {activeTab === "HEALTH" && (
        <div className="space-y-6">
          {/* Health Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-1">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Recommended Total Health Cover
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                ₹{(recommendedTotalHealth / 10000000).toFixed(0)} Crore
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tier-1 Metro benchmark (14% annual medical inflation)
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-1">
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                Smart 2-Tier Architecture
              </span>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                ₹{(recommendedBaseHealth / 100000).toFixed(0)}L Base + ₹{(recommendedSuperTopUp / 100000).toFixed(0)}L Top-Up
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Deductible ₹{(deductible / 100000).toFixed(0)}L matches base cover seamlessly
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 space-y-1">
              <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                Annual Cost Arbitrage
              </span>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                Save ₹{healthArbitrageSavings.toLocaleString("en-IN")}<span className="text-xs text-slate-400 font-normal"> / yr</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ~62% discount vs buying single ₹1 Cr base policy
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Combined Annual Premium
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                ₹{combinedHealthPremium.toLocaleString("en-IN")}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ₹{Math.round(baseHealthPremium * 1.18).toLocaleString("en-IN")} Base + ₹{superTopUpPremium.toLocaleString("en-IN")} Top-Up
              </p>
            </div>
          </div>

          {/* Health Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                Health Profile Configuration
              </h3>

              {/* City Tier */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hospitalization Location / City Tier
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCityTier("TIER_1")}
                    className={`p-3 rounded-xl border text-left transition ${
                      cityTier === "TIER_1"
                        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-400"
                    }`}
                  >
                    <div className="text-xs font-bold">Tier 1 Metro (₹1 Crore Sizing)</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Mumbai, Bengaluru, Delhi NCR, Hyderabad, Chennai, Pune
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCityTier("TIER_2_3")}
                    className={`p-3 rounded-xl border text-left transition ${
                      cityTier === "TIER_2_3"
                        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-400"
                    }`}
                  >
                    <div className="text-xs font-bold">Tier 2/3 City (₹50 Lakhs Sizing)</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Ahmedabad, Jaipur, Lucknow, Chandigarh, Surat, Kochi, etc.
                    </div>
                  </button>
                </div>
              </div>

              {/* Existing Health Cover */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Existing Retail Health Insurance Cover (₹)
                </label>
                <input
                  type="number"
                  value={existingHealthCover}
                  onChange={(e) => setExistingHealthCover(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="e.g. 1000000"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Excludes corporate group insurance (which lapses upon job separation).
                </span>
              </div>

              {/* 4 Crucial Policy Checklist */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                  Non-Negotiable Policy Clauses
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Zero Room Rent Capping</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>100% Restoration Benefit</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Zero Co-payment Clause</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Pre &amp; Post Hospitalization (60/180 d)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Architecture Explainer Card */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Why Base + Super Top-Up Slashes Costs
                </h4>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs">
                    <strong className="text-blue-700 dark:text-blue-300">Tier 1: Base Floater (₹10 Lakhs)</strong>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1">
                      Covers 95% of common medical events (dengue, minor surgeries, fractures, maternity). Zero deductible, full claim payout.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs">
                    <strong className="text-indigo-700 dark:text-indigo-300">Tier 2: Super Top-Up (₹90 Lakhs)</strong>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1">
                      Triggers once total cumulative hospital bills in a year exceed the ₹10 Lakhs deductible. Shields the family from catastrophic cardiac, oncology, or ICU hospitalizations.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-xs">
                    <strong className="text-amber-800 dark:text-amber-300">Senior Parents Strategy</strong>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1">
                      Never combine senior citizen parents into your young family floater. Take a standalone senior policy; otherwise, the entire floater&apos;s premium is loaded according to the eldest member&apos;s age bracket.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONSOLIDATED RISK SCORECARD */}
      {activeTab === "SCORECARD" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Executive Protection Scorecard
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Comprehensive audit of family safety net and solvency protection.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Protection Status:</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    netTermGap > 5000000
                      ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                      : netTermGap > 0
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  {netTermGap > 5000000 ? "Critical Gap" : netTermGap > 0 ? "Moderate Gap" : "Adequately Covered"}
                </span>
              </div>
            </div>

            {/* Scorecard Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Risk Domain</th>
                    <th className="p-3">Ideal Benchmark</th>
                    <th className="p-3">Current Cover</th>
                    <th className="p-3">Protection Gap</th>
                    <th className="p-3">Action Prescription</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      Term Life (HLV)
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      ₹{(grossProtectionNeeded / 100000).toFixed(0)} Lakhs
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      ₹{(existingTermCover / 100000).toFixed(0)} Lakhs
                    </td>
                    <td className="p-3 font-semibold text-amber-600 dark:text-amber-400">
                      {netTermGap > 0 ? `₹${(netTermGap / 100000).toFixed(1)}L Gap` : "0 (Fulfilled)"}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      {netTermGap > 0
                        ? `Purchase ₹${(liveRecommendedTermCover / 100000).toFixed(0)}L Pure Term up to Age ${retirementAge} under MWP Act.`
                        : "Coverage is optimal. Keep recurring premiums on auto-debit."}
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <HeartPulse className="h-4 w-4 text-emerald-500" />
                      Health Insurance
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      ₹{(recommendedTotalHealth / 10000000).toFixed(0)} Crore
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      ₹{(existingHealthCover / 100000).toFixed(0)} Lakhs
                    </td>
                    <td className="p-3 font-semibold text-amber-600 dark:text-amber-400">
                      {healthGap > 0 ? `₹${(healthGap / 100000).toFixed(0)}L Gap` : "0 (Fulfilled)"}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      Setup ₹10L Base Floater + ₹90L Super Top-Up with ₹10L deductible.
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Building className="h-4 w-4 text-purple-500" />
                      Debt Protection
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      100% of Loans (₹{(outstandingLiabilities / 100000).toFixed(1)}L)
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {existingTermCover >= outstandingLiabilities ? "Protected by Term" : "Exposed"}
                    </td>
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                      {existingTermCover < outstandingLiabilities
                        ? `₹${((outstandingLiabilities - existingTermCover) / 100000).toFixed(1)}L Exposed`
                        : "Fully Covered"}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      Ring-fence home and real estate so debts do not transfer to dependents.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total Budget Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Total Protection Investment Budget
                </span>
                <span className="text-[11px] text-slate-500">
                  Includes pure term life (~₹{liveEstimatedTermAnnual.toLocaleString("en-IN")}) + dual health floater (~₹{combinedHealthPremium.toLocaleString("en-IN")})
                </span>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                  ₹{(liveEstimatedTermAnnual + combinedHealthPremium).toLocaleString("en-IN")}<span className="text-xs text-slate-400 font-normal"> / year</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Only ~{((liveEstimatedTermAnnual + combinedHealthPremium) / (annualLivingExpenses || 1) * 100).toFixed(1)}% of annual expenses
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
