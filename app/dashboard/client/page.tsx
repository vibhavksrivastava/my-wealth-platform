"use client";

import { useEffect, useState } from "react";
import { 
  PieChart, 
  TrendingUp, 
  Calendar, 
  ArrowUpRight, 
  ShieldAlert, 
  Wallet, 
  Clock,
  Video,
  ExternalLink,
  DollarSign,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Check,
  Loader2,
  MessageSquare,
  Pencil,
  Building2,
  CreditCard,
  ShieldCheck,
  X,
  UploadCloud,
  Target,
} from "lucide-react";
import Link from "next/link";
import AppointmentsManager from "@/components/AppointmentsManager";
import FileUploader from "@/components/FileUploader";
import CasUploadModal from "@/components/CasUploadModal";
import { useFirmBranding } from "@/lib/context/FirmBrandingContext";

function formatINR(val: number) {
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  } else if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)} L`;
  } else {
    return `₹${val.toLocaleString("en-IN")}`;
  }
}

export default function ClientDashboard() {
  const { terms } = useFirmBranding();
  const [userName, setUserName] = useState("Investor");
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewScope, setViewScope] = useState<"INDIVIDUAL" | "HOUSEHOLD">("INDIVIDUAL");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientActionInput, setClientActionInput] = useState<{ [id: string]: string }>({});
  const [isSavingAction, setIsSavingAction] = useState<{ [id: string]: boolean }>({});
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [showKycModal, setShowKycModal] = useState(false);
  const [showCasModal, setShowCasModal] = useState(false);
  const [panDocUrl, setPanDocUrl] = useState<string | null>(null);

  const fetchOverview = async (scope = viewScope, clientId = selectedClientId) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const url = new URL("/api/client/overview", window.location.origin);
      if (scope) url.searchParams.set("scope", scope);
      if (clientId) url.searchParams.set("clientId", clientId);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json?.clientRecord?.client_id && !clientId) {
          setSelectedClientId(json.clientRecord.client_id);
        }
        if (json?.tenant) {
          localStorage.setItem("tenant_branding", JSON.stringify(json.tenant));
          window.dispatchEvent(new Event("tenant_branding_updated"));
        }
      }
    } catch (err) {
      console.error("Overview error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedPan = localStorage.getItem("client_pan_doc_url");
    if (savedPan) {
      setPanDocUrl(savedPan);
    }

    const profile = localStorage.getItem("user_profile");
    if (profile) {
      try {
        const u = JSON.parse(profile);
        setUserName(u.firstName || "Investor");
      } catch {
        // fallback
      }
    }

    fetchOverview();
  }, []);

  const reloadData = async () => {
    await fetchOverview(viewScope, selectedClientId);
  };

  const handleLogClientAction = async (suggestionId: string, targetClientId: string) => {
    const text = clientActionInput[suggestionId];
    if (!text || !text.trim()) return;

    setIsSavingAction((prev) => ({ ...prev, [suggestionId]: true }));
    setActionFeedback(null);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/clients/${targetClientId}/suggestions`, {
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

      if (res.ok) {
        setActionFeedback("Action saved! Your advisor will see your execution update.");
        setTimeout(() => setActionFeedback(null), 4000);
        setClientActionInput((prev) => ({ ...prev, [suggestionId]: "" }));
        await reloadData();
      } else {
        const errJson = await res.json().catch(() => ({}));
        setActionFeedback(errJson.error || "Failed to log action.");
      }
    } catch (err: any) {
      setActionFeedback(err.message || "Failed to log action.");
    } finally {
      setIsSavingAction((prev) => ({ ...prev, [suggestionId]: false }));
    }
  };

  const handlePostClientComment = async (suggestionId: string, targetClientId: string) => {
    const text = clientActionInput[suggestionId];
    if (!text || !text.trim()) return;

    setIsSavingAction((prev) => ({ ...prev, [suggestionId]: true }));
    setActionFeedback(null);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/clients/${targetClientId}/suggestions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          suggestionId,
          commentText: text.trim(),
        }),
      });

      if (res.ok) {
        setActionFeedback("Comment posted! Your advisor can review and discuss it during your next call.");
        setTimeout(() => setActionFeedback(null), 4000);
        setClientActionInput((prev) => ({ ...prev, [suggestionId]: "" }));
        await reloadData();
      } else {
        const errJson = await res.json().catch(() => ({}));
        setActionFeedback(errJson.error || "Failed to post comment.");
      }
    } catch (err: any) {
      setActionFeedback(err.message || "Failed to post comment.");
    } finally {
      setIsSavingAction((prev) => ({ ...prev, [suggestionId]: false }));
    }
  };

  const totalAssets = Number(data?.summary?.totalAssets ?? data?.profile?.total_assets ?? 0);
  const totalLiabilities = Number(data?.summary?.totalLiabilities ?? data?.profile?.total_liabilities ?? 0);
  const netWorth = Number(data?.summary?.netWorth ?? data?.profile?.net_worth ?? 0);
  const physicalAssetsTotal = Number(data?.summary?.physicalAssetsTotal ?? 0);
  const investmentsTotal = Number(data?.summary?.investmentsTotal ?? 0);
  const clientRecord = data?.clientRecord;
  const assetsList = data?.assets || [];
  const investmentsList = data?.investments || [];
  const liabilitiesList = data?.liabilities || [];
  const goalsList = data?.goals || [];
  const scorecards = data?.scorecards || [];
  const appointments = data?.appointments || [];
  const suggestionsList = data?.suggestions || [];
  const advisor = data?.advisor;
  const tenant = data?.tenant;
  const householdMembers = data?.householdMembers || [];
  const isHousehold = data?.summary?.scope === "HOUSEHOLD";

  const brandColor = tenant?.primary_color || "#0284c7";
  const brandName = tenant?.firm_brand_name || "InvestWell Mint Client Portal";

  return (
    <div className="space-y-6">
      {/* Welcome Banner with Dynamic White-Label Firm Branding */}
      <div 
        className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md dark:shadow-xl transition"
        style={{ borderColor: `${brandColor}40`, boxShadow: `0 10px 30px -10px ${brandColor}20` }}
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {tenant?.logo_url ? (
            <img 
              src={tenant.logo_url} 
              alt={brandName} 
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-contain bg-white dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 shrink-0"
              style={{ borderColor: `${brandColor}50` }}
            />
          ) : (
            <div 
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center font-black text-lg sm:text-xl text-white shadow-md shrink-0"
              style={{ backgroundColor: brandColor }}
            >
              {brandName.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span 
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: brandColor }}
              >
                {brandName}
              </span>
              {tenant?.arn_number && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  ARN: {tenant.arn_number}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
              Welcome back, {clientRecord?.full_name || userName}
            </h1>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              {isHousehold ? "Consolidated family net worth & financial scorecard" : "Personal net worth & financial scorecard"}
              {advisor?.first_name ? ` • ${terms.advisorLabel}: ${advisor.first_name} ${advisor.last_name || ""}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-col xs:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setShowCasModal(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/80 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold transition shadow-xs"
          >
            <UploadCloud className="h-3.5 w-3.5 text-sky-500" />
            <span>Upload CAS Report</span>
          </button>
          <Link
            href="/dashboard/portfolio"
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition shadow-xs"
          >
            <TrendingUp className="h-3.5 w-3.5 text-sky-500" />
            <span>Mutual Fund Portfolio</span>
          </Link>
          <Link
            href="/dashboard/planning/tax"
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition shadow-xs"
          >
            <Wallet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Tax Planning</span>
          </Link>
          <Link
            href="/dashboard/planning/retirement"
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/80 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold transition shadow-xs"
          >
            <Target className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            <span>Smart Retirement Plan</span>
          </Link>
          {clientRecord?.client_id && (
            <Link
              href={`/dashboard/clients/${clientRecord.client_id}/360`}
              style={{ backgroundColor: brandColor }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-white text-xs font-bold transition shadow-md hover:brightness-110 active:scale-95"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Complete 360 Profile</span>
            </Link>
          )}
          <span 
            className="px-3 py-1 rounded-full text-xs font-semibold border"
            style={{ 
              color: brandColor, 
              borderColor: `${brandColor}40`, 
              backgroundColor: `${brandColor}15` 
            }}
          >
            Risk Profile: {data?.profile?.risk_profile_category || "Moderate"}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            PAN: {data?.profile?.pan_number || "ABCDE1234F"}
          </span>
          <button
            type="button"
            onClick={() => setShowKycModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
          >
            <CreditCard className="h-3.5 w-3.5" style={{ color: brandColor }} />
            <span>{panDocUrl ? "KYC Document: Uploaded" : "Upload KYC / PAN"}</span>
          </button>
        </div>
      </div>

      {/* Family / Individual Scope & Assessee Selector */}
      {householdMembers.length > 1 && (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">View Scope:</span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setViewScope("INDIVIDUAL");
                  fetchOverview("INDIVIDUAL", selectedClientId);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  viewScope === "INDIVIDUAL"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                👤 Individual View
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewScope("HOUSEHOLD");
                  fetchOverview("HOUSEHOLD", selectedClientId);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  viewScope === "HOUSEHOLD"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                👥 Family Consolidated
              </button>
            </div>
          </div>

          {viewScope === "INDIVIDUAL" && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Active Member:</span>
              <select
                value={selectedClientId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedClientId(newId);
                  fetchOverview("INDIVIDUAL", newId);
                }}
                className="bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold rounded-xl px-3 py-1.5 border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
              >
                {householdMembers.map((m: any) => (
                  <option key={m.clientId} value={m.clientId} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {m.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards with Dynamic Tenant Accents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isHousehold ? "Family Net Worth" : "Total Net Worth"}
            </span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandColor}15` }}>
              <Wallet className="h-4 w-4" style={{ color: brandColor }} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{formatINR(netWorth)}</div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium" style={{ color: brandColor }}>
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>{isHousehold ? "Consolidated household wealth" : "Assets minus Liabilities"}</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isHousehold ? "Family Gross Assets" : "Gross Assets"}
            </span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandColor}15` }}>
              <TrendingUp className="h-4 w-4" style={{ color: brandColor }} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{formatINR(totalAssets)}</div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {investmentsList.length > 0 ? `${investmentsList.length} mutual funds • ` : ""}
            {assetsList.length} tangible assets
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isHousehold ? "Family Liabilities" : "Total Liabilities"}
            </span>
            <div className="p-2 rounded-lg bg-rose-500/10">
              <PieChart className="h-4 w-4 text-rose-500" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">{formatINR(totalLiabilities)}</div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {liabilitiesList.length === 0 ? "Zero outstanding debt" : `${liabilitiesList.length} active loan ${liabilitiesList.length === 1 ? "facility" : "facilities"}`}
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{terms.assignedAdvisorLabel}</span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandColor}15` }}>
              <Calendar className="h-4 w-4" style={{ color: brandColor }} />
            </div>
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white truncate">
            {advisor
              ? `${advisor.first_name || ""} ${advisor.last_name || ""}`.trim()
              : (clientRecord?.advisor_name || "Pallavi Srivastava")}
          </div>
          <div className="mt-2 text-xs font-medium truncate" style={{ color: brandColor }}>
            {advisor?.email || "pallavi@unifiedwealth.com"}
          </div>
        </div>
      </div>

      {/* Diagnostic Scorecard Alert */}
      {scorecards.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-900/40 bg-amber-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                CFP Diagnostic Alerts ({scorecards.length} Action Items)
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                {scorecards.map((sc: any) => `${sc.assessment_area}: ${sc.status}`).join(" • ")}
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-amber-400 hover:underline cursor-pointer">
            View Recommendations &rarr;
          </span>
        </div>
      )}

      {/* Assets & Investments Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tangible Assets Breakdown */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" style={{ color: brandColor }} />
              Tangible Assets Breakdown
            </span>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Total: {formatINR(physicalAssetsTotal)}</span>
          </h2>
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {assetsList.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 text-center">
                No tangible physical assets recorded.
              </div>
            ) : (
              assetsList.map((asset: any) => (
                <div
                  key={asset.asset_id}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{asset.description || asset.asset_category}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{asset.asset_category}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatINR(Number(asset.current_market_value))}
                    </div>
                    {asset.is_liquid && (
                      <span 
                        className="text-[10px] font-medium"
                        style={{ color: brandColor }}
                      >
                        Liquid
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Mutual Fund Investments Portfolio */}
        {investmentsList.length > 0 ? (
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-sky-500" />
                Mutual Fund Holdings ({investmentsList.length})
              </span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Total: {formatINR(investmentsTotal)}</span>
            </h2>
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {investmentsList.map((inv: any) => (
                <div
                  key={inv.investment_id}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {inv.scheme_instrument_name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {inv.asset_class || "Mutual Fund"} &bull; Cost: {formatINR(Number(inv.invested_amount || 0))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-sky-600 dark:text-sky-400 font-mono">
                      {formatINR(Number(inv.current_value))}
                    </div>
                    {Number(inv.current_value) - Number(inv.invested_amount || 0) >= 0 ? (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                        +{formatINR(Number(inv.current_value) - Number(inv.invested_amount || 0))}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-rose-500 font-mono">
                        {formatINR(Number(inv.current_value) - Number(inv.invested_amount || 0))}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Liabilities Breakdown (when no investments) */
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-500" />
                Liabilities &amp; EMIs
              </span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Total: {formatINR(totalLiabilities)}</span>
            </h2>
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {liabilitiesList.length === 0 ? (
                <div className="p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-700 dark:text-emerald-300 text-center font-medium">
                  Zero Outstanding Debt. You have no active loan liabilities!
                </div>
              ) : (
                liabilitiesList.map((liab: any) => (
                  <div
                    key={liab.liability_id}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{liab.liability_type}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Lender: {liab.lender_name || "Bank"} &bull; {liab.tenure_remaining_months} mos remaining
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
                        {formatINR(Number(liab.outstanding_principal))}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        EMI: ₹{Number(liab.monthly_emi).toLocaleString("en-IN")}/mo
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Liabilities Breakdown (when investments are also present) */}
      {investmentsList.length > 0 && (
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              Liabilities &amp; EMIs
            </span>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Total: {formatINR(totalLiabilities)}</span>
          </h2>
          <div>
            {liabilitiesList.length === 0 ? (
              <div className="p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-700 dark:text-emerald-300 text-center font-medium">
                Zero Outstanding Debt. You have no active loan liabilities!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {liabilitiesList.map((liab: any) => (
                  <div
                    key={liab.liability_id}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{liab.liability_type}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Lender: {liab.lender_name || "Bank"} &bull; {liab.tenure_remaining_months} mos remaining
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
                        {formatINR(Number(liab.outstanding_principal))}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        EMI: ₹{Number(liab.monthly_emi).toLocaleString("en-IN")}/mo
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advisor Action Plan & Recommendations */}
      {suggestionsList.length > 0 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div 
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${brandColor}15`, color: brandColor }}
              >
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  {terms.actionPlanLabel}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Custom {terms.advisoryLabel.toLowerCase()} guidance and agreed portfolio execution steps.
                </p>
              </div>
            </div>

            {actionFeedback && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                {actionFeedback}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {suggestionsList.map((plan: any) => {
              const recs = plan.recommended_investments || [];
              const targetClientId = plan.client_id || data?.clientRecord?.client_id;
              return (
                <div key={plan.id} className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span 
                        className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase border"
                        style={{ backgroundColor: `${brandColor}15`, color: brandColor, borderColor: `${brandColor}30` }}
                      >
                        {plan.status}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Submitted: {new Date(plan.suggestion_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </span>
                    </div>
                  </div>

                  {plan.advisor_notes && (
                    <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 italic leading-relaxed">
                      &ldquo;{plan.advisor_notes}&rdquo;
                    </div>
                  )}

                  {recs.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Recommended Steps:</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {recs.map((r: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 dark:text-white">{r.title}</span>
                              <span 
                                className="text-[10px] font-semibold"
                                style={{ color: brandColor }}
                              >
                                {r.priority}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400">{r.suggestedAction}</p>
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Outcome: {r.expectedImpact}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comments & Execution Discussion Log for Client */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" style={{ color: brandColor }} />
                        Comments &amp; Execution Log (Visible to Your {terms.advisorLabel})
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        Add questions to discuss in meetings or record what you did
                      </span>
                    </div>

                    {plan.client_action_notes ? (
                      <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                        {plan.client_action_notes}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 text-[11px] text-slate-500 italic">
                        No comments or actions recorded yet. You can add questions or notes below for your advisor to review.
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        value={clientActionInput[plan.id] || ""}
                        onChange={(e) => setClientActionInput((prev) => ({ ...prev, [plan.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handlePostClientComment(plan.id, targetClientId);
                          }
                        }}
                        placeholder="Add a comment/question for your advisor, or log an action you completed..."
                        className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handlePostClientComment(plan.id, targetClientId)}
                          disabled={isSavingAction[plan.id]}
                          style={{ backgroundColor: brandColor }}
                          className="px-3.5 py-2 rounded-lg text-white text-xs font-bold transition flex items-center justify-center gap-1 whitespace-nowrap shadow-sm hover:brightness-110"
                          title="Post a question or comment to discuss during meetings"
                        >
                          {isSavingAction[plan.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                          <span>Post Comment</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLogClientAction(plan.id, targetClientId)}
                          disabled={isSavingAction[plan.id]}
                          className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1 whitespace-nowrap shadow-sm"
                          title="Record an implementation action completed"
                        >
                          {isSavingAction[plan.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          <span>Record Action</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Target Financial Goals & Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Goals */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" style={{ color: brandColor }} />
            Financial Goals Roadmap
          </h2>
          <div className="space-y-3">
            {goalsList.map((goal: any) => (
              <div
                key={goal.goal_id}
                className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">{goal.goal_name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Target Year: {goal.target_year} &bull; Priority: {goal.priority || "High"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {formatINR(Number(goal.target_amount_today))}
                  </div>
                  <span 
                    className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold border"
                    style={{ backgroundColor: `${brandColor}15`, color: brandColor, borderColor: `${brandColor}30` }}
                  >
                    Active Target
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Appointments & Strategy Review Meetings (Next 7 Days) */}
      <AppointmentsManager
        clientId={data?.clientRecord?.client_id}
        userRole="CLIENT"
        title={`Upcoming ${terms.advisorLabel} Calls (Next 7 Days)`}
        subtitle={`Scheduled reviews with your ${terms.advisorLabel.toLowerCase()} in the next 7 days, ordered chronologically.`}
        brandColor={brandColor}
        nextSevenDaysOnly={true}
      />

      {/* Secure KYC & PAN Document Upload Modal */}
      {showKycModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowKycModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div 
                className="p-2.5 rounded-xl border"
                style={{ backgroundColor: `${brandColor}15`, borderColor: `${brandColor}30`, color: brandColor }}
              >
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Client KYC &amp; PAN Document Vault</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Files are stored in the private, 256-bit encrypted &apos;client-documents&apos; vault
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <FileUploader
                purpose="pan_card"
                currentUrl={panDocUrl}
                folder={`kyc/${data?.clientRecord?.client_id || data?.profile?.user_id || "client"}`}
                label="PAN Card / KYC Identification"
                description="Upload a legible scan of your PAN card or Form 60 (PDF, PNG, JPG up to 15MB). Your advisor will verify this during onboarding."
                onUploadComplete={({ url }) => {
                  setPanDocUrl(url);
                  localStorage.setItem("client_pan_doc_url", url);
                }}
                onRemove={() => {
                  setPanDocUrl(null);
                  localStorage.removeItem("client_pan_doc_url");
                }}
              />

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" style={{ color: brandColor }} />
                <span>
                  Regulatory Compliance: As per SEBI/AMFI mandate, PAN verification is required for mutual fund folio creation and AUA reporting. Only authorized advisors in your tenant firm can inspect this document via secure signed URLs.
                </span>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowKycModal(false)}
                  style={{ backgroundColor: brandColor }}
                  className="px-4 py-2 rounded-lg text-white text-xs font-bold transition shadow-sm hover:brightness-110"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* CAMS / KFintech CAS Upload Modal */}
      <CasUploadModal
        isOpen={showCasModal}
        onClose={() => setShowCasModal(false)}
        onSuccess={reloadData}
        userRole="CLIENT"
        currentClientId={clientRecord?.client_id || data?.clientRecord?.client_id}
        currentClientName={clientRecord?.full_name || userName}
        brandColor={brandColor}
      />
    </div>
  );
}
