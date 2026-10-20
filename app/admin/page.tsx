"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Users,
  Briefcase,
  DollarSign,
  ArrowUpRight,
  UserPlus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Calendar,
  AlertCircle,
  ChevronRight,
  Layers,
  Clock,
} from "lucide-react";
import { useFirmBranding } from "@/lib/context/FirmBrandingContext";

interface FirmData {
  tenant: {
    id: string;
    firm_brand_name: string;
    firm_legal_name: string;
    subdomain: string;
    arn_number: string | null;
    ria_number: string | null;
    primary_color: string;
    subscription_expires_at?: string | null;
    commission_sharing_active?: boolean;
  };
  kpis: {
    totalAUM: number;
    totalNetWorth: number;
    activeClients: number;
    activeAdvisors: number;
    monthlySIPBook: number;
  };
  advisors: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    clientCount: number;
    aum: number;
  }>;
  recentClients: Array<{
    client_id: string;
    full_name: string;
    risk_profile: string;
    created_at: string;
  }>;
}

export default function TenantAdminDashboardPage() {
  const { terms } = useFirmBranding();
  const [data, setData] = useState<FirmData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/admin/metrics", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to load firm control center metrics.");
      }

      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const formatINR = (amount: number) => {
    if (!amount) return "₹0";
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const kpis = data?.kpis || {
    totalAUM: 0,
    totalNetWorth: 0,
    activeClients: 0,
    activeAdvisors: 0,
    monthlySIPBook: 0,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">{terms.portalTitle}</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {terms.shortTitle} Admin
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time AUM oversight, advisor allocation, and monthly SIP book metrics for{" "}
            <span className="text-white font-medium">{data?.tenant?.firm_brand_name || "your firm"}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchMetrics}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/admin/users"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-md shadow-amber-600/20 transition"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Add Team Member</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 15-Day Subscription Expiry Warning Banner */}
      {(() => {
        if (!data?.tenant?.subscription_expires_at || data?.tenant?.commission_sharing_active) return null;
        const expiresAt = new Date(data.tenant.subscription_expires_at);
        const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 15 || daysLeft <= 0) return null;

        return (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                  Upcoming Renewal: {daysLeft} Days Remaining
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  Your firm's subscription expires on{" "}
                  <strong className="text-white">
                    {expiresAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </strong>
                  . Renew now to avoid any interruption in advisor portal access or white-label styling.
                </div>
              </div>
            </div>
            <Link
              href="/admin/billing"
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow whitespace-nowrap"
            >
              <span>Renew Subscription</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        );
      })()}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Firm AUM */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{terms.aumLabel}</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {isLoading ? "..." : formatINR(kpis.totalAUM)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-400 font-medium">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Consolidated client assets</span>
          </div>
        </div>

        {/* Active Clients */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{terms.clientHeading}</span>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {isLoading ? "..." : kpis.activeClients}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
            <span>Onboarded investor profiles</span>
          </div>
        </div>

        {/* Active Advisors & Staff */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Advisors &amp; Staff</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {isLoading ? "..." : kpis.activeAdvisors}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
            <span>Licensed relationship managers</span>
          </div>
        </div>

        {/* Monthly SIP Book */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Monthly SIP Book</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {isLoading ? "..." : formatINR(kpis.monthlySIPBook)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-purple-400 font-medium">
            <span>Recurring monthly inflows</span>
          </div>
        </div>
      </div>

      {/* 2-Column: Advisory Team Performance + Quick Management Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Advisory Team Performance Summary */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Advisory Team Performance Summary
              </h2>
              <p className="text-[11px] text-slate-400">Relationship managers and client book allocations</p>
            </div>
            <Link
              href="/admin/users"
              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
            >
              <span>Manage Team</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2.5 font-semibold">Advisor Name</th>
                  <th className="pb-2.5 font-semibold">Role</th>
                  <th className="pb-2.5 font-semibold">Assigned Clients</th>
                  <th className="pb-2.5 font-semibold">Managed AUM</th>
                  <th className="pb-2.5 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      Loading advisors...
                    </td>
                  </tr>
                ) : data?.advisors?.length ? (
                  data.advisors.map((adv) => (
                    <tr key={adv.id} className="hover:bg-slate-800/20">
                      <td className="py-3 font-semibold text-white">
                        <div>{adv.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{adv.email}</div>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {adv.role}
                        </span>
                      </td>
                      <td className="py-3 text-slate-200 font-semibold">{adv.clientCount}</td>
                      <td className="py-3 text-emerald-400 font-bold">{formatINR(adv.aum)}</td>
                      <td className="py-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            adv.isActive
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {adv.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No advisors registered in your firm yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Management Shortcuts */}
        <div className="space-y-4">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white tracking-tight">Administrative Modules</h3>
            <p className="text-[11px] text-slate-400">Quick links to firm management operations</p>

            <div className="space-y-2 pt-2">
              <Link
                href="/admin/users"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-900/60 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-amber-300 transition">
                      Team &amp; User Provisioning
                    </div>
                    <div className="text-[10px] text-slate-400">Add staff, reset passwords, set roles</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-amber-400 transition" />
              </Link>

              <Link
                href="/admin/clients"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-900/60 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-sky-300 transition">
                      Client &amp; Advisor Oversight
                    </div>
                    <div className="text-[10px] text-slate-400">Reassign accounts, review net worths</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-sky-400 transition" />
              </Link>

              <Link
                href="/admin/settings"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-900/60 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Settings className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-rose-300 transition">
                      Firm Branding &amp; Settings
                    </div>
                    <div className="text-[10px] text-slate-400">White-label colors, logos, disclaimers</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-rose-400 transition" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

