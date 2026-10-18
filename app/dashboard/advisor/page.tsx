"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Users, 
  Briefcase, 
  Calendar, 
  TrendingUp, 
  FileText, 
  ArrowUpRight, 
  CheckCircle2,
  Video,
  ExternalLink 
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

export default function AdvisorDashboard() {
  const [userName, setUserName] = useState("Advisor");
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const profile = localStorage.getItem("user_profile");
    if (profile) {
      try {
        const u = JSON.parse(profile);
        setUserName(u.firstName || "Advisor");
      } catch {
        // fallback
      }
    }

    const token = localStorage.getItem("auth_token");
    if (token) {
      fetch("/api/advisor/overview", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((json) => setData(json))
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const metrics = data?.metrics || {
    totalAUM: 42500000,
    totalNetWorth: 31524886,
    activeHouseholds: 1,
    appointmentsCount: 1,
  };
  const clients = data?.clients || [];
  const appointments = data?.appointments || [];

  return (
    <div className="space-y-6">
      {/* Advisor Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Advisor & MFD Console &bull; {userName}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Client portfolio oversight, household net-worth snapshots, and scheduled advisory reviews.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/clients/new"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition"
          >
            + New Client Fact-Find
          </Link>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            MFD Practice Active
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Practice AUM</span>
            <Briefcase className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{formatINR(metrics.totalAUM)}</div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Aggregate assets tracked</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Client Net Worth</span>
            <TrendingUp className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{formatINR(metrics.totalNetWorth)}</div>
          <div className="mt-2 text-xs text-slate-400">
            Net equity under advisory
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Households</span>
            <Users className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics.activeHouseholds}</div>
          <div className="mt-2 text-xs text-slate-400">
            Comprehensive planning intake done
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Upcoming Reviews</span>
            <Calendar className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{appointments.length}</div>
          <div className="mt-2 text-xs text-purple-400">
            Scheduled client appointments
          </div>
        </div>
      </div>

      {/* Assigned Clients & Meeting Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Records Table */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40">
          <h2 className="text-base font-bold text-white mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              Client Planning Records
            </span>
            <span className="text-xs text-slate-400">{clients.length} Total</span>
          </h2>
          <div className="space-y-3">
            {clients.map((c: any) => (
              <div
                key={c.client_id}
                className="p-3.5 rounded-lg bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition group"
              >
                <div>
                  <Link
                    href={`/dashboard/clients/${c.client_id}/360`}
                    className="text-xs font-semibold text-white hover:text-sky-400 transition flex items-center gap-1.5"
                  >
                    <span>{c.full_name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      360 &deg;
                    </span>
                  </Link>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Code: {c.uwp_client_code} &bull; Horizon: {c.planning_horizon_years} yrs &bull; Risk: {c.risk_profile}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <div className="text-right hidden md:block">
                    <div className="text-xs font-bold text-emerald-400">
                      {formatINR(Number(c.annual_gross_income))}/yr
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/clients/${c.client_id}/360`}
                    className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition"
                  >
                    Client 360 &deg;
                  </Link>
                  <Link
                    href={`/dashboard/clients/${c.client_id}/net-worth`}
                    className="px-2 py-1 rounded-md text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  >
                    Net Worth
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scheduled Appointments */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40">
          <h2 className="text-base font-bold text-white mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-400" />
              Calendar & Meetings Pipeline
            </span>
            <span className="text-xs text-slate-400">{appointments.length} Scheduled</span>
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
                No meetings scheduled for this week.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
