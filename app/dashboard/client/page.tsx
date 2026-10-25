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
} from "lucide-react";
import Link from "next/link";
import AppointmentsManager from "@/components/AppointmentsManager";
import FileUploader from "@/components/FileUploader";

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
  const [userName, setUserName] = useState("Investor");
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [clientActionInput, setClientActionInput] = useState<{ [id: string]: string }>({});
  const [isSavingAction, setIsSavingAction] = useState<{ [id: string]: boolean }>({});
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [showKycModal, setShowKycModal] = useState(false);
  const [panDocUrl, setPanDocUrl] = useState<string | null>(null);

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

    const token = localStorage.getItem("auth_token");
    if (token) {
      fetch("/api/client/overview", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((json) => {
          setData(json);
          if (json?.tenant) {
            localStorage.setItem("tenant_branding", JSON.stringify(json.tenant));
            window.dispatchEvent(new Event("tenant_branding_updated"));
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const reloadData = async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    try {
      const res = await fetch("/api/client/overview", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    }
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

  const totalAssets = Number(data?.profile?.total_assets || 42500000);
  const totalLiabilities = Number(data?.profile?.total_liabilities || 10975114);
  const netWorth = Number(data?.profile?.net_worth || 31524886);
  const clientRecord = data?.clientRecord;
  const assetsList = data?.assets || [];
  const liabilitiesList = data?.liabilities || [];
  const goalsList = data?.goals || [];
  const scorecards = data?.scorecards || [];
  const appointments = data?.appointments || [];
  const suggestionsList = data?.suggestions || [];
  const advisor = data?.advisor;
  const tenant = data?.tenant;

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
              Welcome back, {userName}
            </h1>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              Consolidated family net worth &amp; financial planning scorecard
              {advisor?.full_name ? ` • Advisor: ${advisor.full_name}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-col xs:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard/portfolio"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 text-xs font-bold transition shadow-sm hover:bg-sky-100 dark:hover:bg-sky-900"
          >
            <TrendingUp className="h-3.5 w-3.5 text-sky-500" />
            <span>Mutual Fund Portfolio</span>
          </Link>
          {clientRecord?.client_id && (
            <Link
              href={`/dashboard/clients/${clientRecord.client_id}/360`}
              style={{ backgroundColor: brandColor }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-white text-xs font-bold transition shadow-md hover:brightness-110 active:scale-95"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>View &amp; Edit Complete 360 Profile</span>
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

      {/* KPI Cards with Dynamic Tenant Accents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Net Worth</span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandColor}15` }}>
              <Wallet className="h-4 w-4" style={{ color: brandColor }} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatINR(netWorth)}</div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium" style={{ color: brandColor }}>
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Assets minus Liabilities</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Assets</span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandColor}15` }}>
              <TrendingUp className="h-4 w-4" style={{ color: brandColor }} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatINR(totalAssets)}</div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {assetsList.length} registered asset categories
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Liabilities</span>
            <div className="p-2 rounded-lg bg-rose-500/10">
              <PieChart className="h-4 w-4 text-rose-500" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{formatINR(totalLiabilities)}</div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {liabilitiesList.length} outstanding loan facilities
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Assigned Advisor</span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandColor}15` }}>
              <Calendar className="h-4 w-4" style={{ color: brandColor }} />
            </div>
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white">
            {advisor ? `${advisor.first_name} ${advisor.last_name}` : "Pooja Verma"}
          </div>
          <div className="mt-2 text-xs font-medium" style={{ color: brandColor }}>
            {advisor?.email || "advisor@example.com"}
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

      {/* Assets & Liabilities Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets Breakdown */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" style={{ color: brandColor }} />
              Assets Breakdown
            </span>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Total: {formatINR(totalAssets)}</span>
          </h2>
          <div className="space-y-3">
            {assetsList.map((asset: any) => (
              <div
                key={asset.asset_id}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{asset.description || asset.asset_category}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{asset.asset_category}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
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
            ))}
          </div>
        </div>

        {/* Liabilities Breakdown */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              Liabilities &amp; EMIs
            </span>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Total: {formatINR(totalLiabilities)}</span>
          </h2>
          <div className="space-y-3">
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
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    {formatINR(Number(liab.outstanding_principal))}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    EMI: ₹{Number(liab.monthly_emi).toLocaleString("en-IN")}/mo
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
                  Advisor Action Plan &amp; Recommendations
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Custom advisory guidance and agreed portfolio execution steps.
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
                        Comments &amp; Execution Log (Visible to Your Advisor)
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
        title="Upcoming Advisor Calls (Next 7 Days)"
        subtitle="Scheduled reviews with your advisor in the next 7 days, ordered chronologically."
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
    </div>
  );
}
