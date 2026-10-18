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
} from "lucide-react";

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

  useEffect(() => {
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

  const totalAssets = Number(data?.profile?.total_assets || 42500000);
  const totalLiabilities = Number(data?.profile?.total_liabilities || 10975114);
  const netWorth = Number(data?.profile?.net_worth || 31524886);
  const assetsList = data?.assets || [];
  const liabilitiesList = data?.liabilities || [];
  const goalsList = data?.goals || [];
  const scorecards = data?.scorecards || [];
  const appointments = data?.appointments || [];
  const suggestionsList = data?.suggestions || [];
  const advisor = data?.advisor;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-sky-950/60 to-slate-900 border border-sky-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {userName}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Consolidated family net worth & financial planning scorecard.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Risk Profile: {data?.profile?.risk_profile_category || "Moderate"}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            PAN: {data?.profile?.pan_number || "ABCDE1234F"}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Net Worth</span>
            <Wallet className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{formatINR(netWorth)}</div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Assets minus Liabilities</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Gross Assets</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{formatINR(totalAssets)}</div>
          <div className="mt-2 text-xs text-slate-400">
            {assetsList.length} registered asset categories
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Liabilities</span>
            <PieChart className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{formatINR(totalLiabilities)}</div>
          <div className="mt-2 text-xs text-slate-400">
            {liabilitiesList.length} outstanding loan facilities
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Assigned Advisor</span>
            <Calendar className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-base font-bold text-white">
            {advisor ? `${advisor.first_name} ${advisor.last_name}` : "Pooja Verma"}
          </div>
          <div className="mt-2 text-xs text-purple-300">
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
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40">
          <h2 className="text-base font-bold text-white mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Assets Breakdown
            </span>
            <span className="text-xs font-normal text-slate-400">Total: {formatINR(totalAssets)}</span>
          </h2>
          <div className="space-y-3">
            {assetsList.map((asset: any) => (
              <div
                key={asset.asset_id}
                className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-white">{asset.description || asset.asset_category}</div>
                  <div className="text-[11px] text-slate-400">{asset.asset_category}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-400">
                    {formatINR(Number(asset.current_market_value))}
                  </div>
                  {asset.is_liquid && (
                    <span className="text-[10px] text-sky-400 font-medium">Liquid</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Liabilities Breakdown */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40">
          <h2 className="text-base font-bold text-white mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              Liabilities & EMIs
            </span>
            <span className="text-xs font-normal text-slate-400">Total: {formatINR(totalLiabilities)}</span>
          </h2>
          <div className="space-y-3">
            {liabilitiesList.map((liab: any) => (
              <div
                key={liab.liability_id}
                className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-white">{liab.liability_type}</div>
                  <div className="text-[11px] text-slate-400">
                    Lender: {liab.lender_name || "Bank"} &bull; {liab.tenure_remaining_months} mos remaining
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-rose-400">
                    {formatINR(Number(liab.outstanding_principal))}
                  </div>
                  <div className="text-[11px] text-slate-400">
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
        <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/30 via-slate-900 to-sky-950/30 border border-purple-900/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Advisor Action Plan & Recommendations
                </h2>
                <p className="text-xs text-slate-400">
                  Custom advisory guidance and agreed portfolio execution steps.
                </p>
              </div>
            </div>

            {actionFeedback && (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                {actionFeedback}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {suggestionsList.map((plan: any) => {
              const recs = plan.recommended_investments || [];
              const targetClientId = plan.client_id || data?.clientRecord?.client_id;
              return (
                <div key={plan.id} className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {plan.status}
                      </span>
                      <span className="text-xs text-slate-400">
                        Submitted: {new Date(plan.suggestion_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </span>
                    </div>
                  </div>

                  {plan.advisor_notes && (
                    <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-200 italic leading-relaxed">
                      &ldquo;{plan.advisor_notes}&rdquo;
                    </div>
                  )}

                  {recs.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase text-slate-400">Recommended Steps:</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {recs.map((r: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">{r.title}</span>
                              <span className="text-[10px] text-purple-400 font-semibold">{r.priority}</span>
                            </div>
                            <p className="text-[11px] text-slate-400">{r.suggestedAction}</p>
                            <p className="text-[11px] text-emerald-400 font-medium">Outcome: {r.expectedImpact}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interactive Execution Log for Client */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      Execution Updates (What you have completed)
                    </span>

                    {plan.client_action_notes && (
                      <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap">
                        {plan.client_action_notes}
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
                            handleLogClientAction(plan.id, targetClientId);
                          }
                        }}
                        placeholder="Record what you did (e.g. Started ₹10,000/mo SIP in Large Cap Fund on 18 Oct)..."
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => handleLogClientAction(plan.id, targetClientId)}
                        disabled={isSavingAction[plan.id]}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1 whitespace-nowrap shadow-sm"
                      >
                        {isSavingAction[plan.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        <span>Save My Update</span>
                      </button>
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
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-400" />
            Financial Goals Roadmap
          </h2>
          <div className="space-y-3">
            {goalsList.map((goal: any) => (
              <div
                key={goal.goal_id}
                className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-white">{goal.goal_name}</div>
                  <div className="text-[11px] text-slate-400">
                    Target Year: {goal.target_year} &bull; Priority: {goal.priority || "High"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-white">
                    {formatINR(Number(goal.target_amount_today))}
                  </div>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Active Target
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scheduled Appointments */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-400" />
            Scheduled Reviews & Meetings
          </h2>
          <div className="space-y-3">
            {appointments.length > 0 ? (
              appointments.map((appt: any) => (
                <div
                  key={appt.id}
                  className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-white">{appt.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(appt.start_time).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {appt.meeting_link && (
                      <a
                        href={appt.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 text-xs font-semibold transition"
                      >
                        <Video className="h-3 w-3" />
                        Join Call
                      </a>
                    )}
                    <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                      {appt.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                No upcoming appointments. Request an appointment with your advisor.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
