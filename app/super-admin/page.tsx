"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  TrendingUp,
  Users,
  Briefcase,
  ShieldCheck,
  ArrowUpRight,
  UserPlus,
  RefreshCw,
  Server,
  Activity,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface AnalyticsData {
  metrics: {
    totalTenants: number;
    activeTenants: number;
    totalClients: number;
    totalAdvisors: number;
    totalFirmAdmins: number;
    globalAUM: number;
    globalNetWorth: number;
  };
  recentTenants: Array<{
    id: string;
    firm_brand_name: string;
    is_active: boolean;
    created_at: string;
  }>;
}

export default function SuperAdminOverviewPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/super-admin/analytics", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load platform analytics data.");
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
    fetchAnalytics();
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

  const metrics = data?.metrics || {
    totalTenants: 0,
    activeTenants: 0,
    totalClients: 0,
    totalAdvisors: 0,
    totalFirmAdmins: 0,
    globalAUM: 0,
    globalNetWorth: 0,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Platform Global Analytics</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Live Network
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Global aggregate metrics, firm health scores, and platform-wide AUM oversight.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAnalytics}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/super-admin/tenants/new"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-md shadow-rose-600/20 transition"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Onboard New Firm</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total AUM */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Global Platform AUM</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {isLoading ? "..." : formatINR(metrics.globalAUM)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-400 font-medium">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Assets across all tenant firms</span>
          </div>
        </div>

        {/* Total Tenants */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Onboarded B2B Firms</span>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {isLoading ? "..." : metrics.totalTenants}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
            <span className="text-emerald-400 font-semibold">{metrics.activeTenants} Active</span>
            <span>&bull;</span>
            <span>{metrics.totalTenants - metrics.activeTenants} Suspended</span>
          </div>
        </div>

        {/* Total Advisors */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Licensed Advisors</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {isLoading ? "..." : metrics.totalAdvisors}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
            <span>RIAs &amp; MFD distributors platform-wide</span>
          </div>
        </div>

        {/* Total End Clients */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total End Investors</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {isLoading ? "..." : metrics.totalClients}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
            <span>Client portfolios tracked</span>
          </div>
        </div>
      </div>

      {/* 2-Column Section: Recent Tenants & Platform Infrastructure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tenants Directory Preview */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Recent Onboarded Advisory Firms</h2>
              <p className="text-[11px] text-slate-400">Recently provisioned multi-tenant organizations</p>
            </div>
            <Link
              href="/super-admin/tenants"
              className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2.5 font-semibold">Firm Brand Name</th>
                  <th className="pb-2.5 font-semibold">Status</th>
                  <th className="pb-2.5 font-semibold">Onboarded Date</th>
                  <th className="pb-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      Loading recent tenants...
                    </td>
                  </tr>
                ) : data?.recentTenants?.length ? (
                  data.recentTenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-slate-800/20">
                      <td className="py-3 font-semibold text-white flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-rose-400" />
                        {tenant.firm_brand_name}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tenant.is_active
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              tenant.is_active ? "bg-emerald-400" : "bg-amber-400"
                            }`}
                          />
                          {tenant.is_active ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">
                        {new Date(tenant.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href="/super-admin/tenants"
                          className="text-xs text-slate-400 hover:text-white font-medium"
                        >
                          Manage &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      No tenants onboarded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Platform System Health Card */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Server className="h-4 w-4 text-emerald-400" />
              Platform Infrastructure Health
            </h2>
            <p className="text-[11px] text-slate-400">Core service availability &amp; compliance</p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-semibold text-white">Database &amp; Storage</div>
                  <div className="text-[10px] text-slate-400">Supabase Managed Postgres (Direct HTTPS)</div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Operational
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-semibold text-white">Multi-Tenant Isolation</div>
                  <div className="text-[10px] text-slate-400">Strict Tenant ID Data Scoping &amp; Guards</div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Enforced
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-semibold text-white">Authentication &amp; JWT</div>
                  <div className="text-[10px] text-slate-400">Bcrypt v6 + Signed RS256 Bearer Tokens</div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Healthy
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <Link
              href="/super-admin/tenants/new"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-rose-600/20 transition"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Launch Onboarding Wizard</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

