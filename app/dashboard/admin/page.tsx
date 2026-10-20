"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  Building2, 
  Users, 
  Receipt, 
  Lock, 
  CheckCircle2, 
  Layers,
  Clock 
} from "lucide-react";
import { useFirmBranding } from "@/lib/context/FirmBrandingContext";

export default function AdminDashboard() {
  const { terms } = useFirmBranding();
  const [userName, setUserName] = useState("Administrator");
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const profile = localStorage.getItem("user_profile");
    if (profile) {
      try {
        const u = JSON.parse(profile);
        setUserName(u.firstName || "Administrator");
      } catch {
        // fallback
      }
    }

    const token = localStorage.getItem("auth_token");
    if (token) {
      fetch("/api/admin/overview", {
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

  const tenant = data?.tenant;
  const usersList = data?.users || [];
  const invoices = data?.invoices || [];

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Firm Administration &bull; {userName}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Tenant configuration, staff privileges, SEBI compliance rules, and billing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20 transition flex items-center gap-1.5"
          >
            <span>Firm Control Center</span>
            &rarr;
          </Link>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Super Tenant Rights
          </span>
        </div>
      </div>

      {/* Admin KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Tenant Brand</span>
            <Building2 className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {tenant?.firm_brand_name || "Apex Wealth"}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Subdomain: {tenant?.subdomain || "apex"}.wealthos.internal
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Registered Accounts</span>
            <Users className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{usersList.length} Accounts</div>
          <div className="mt-2 text-xs text-slate-400">
            Clients, Advisors & Admins
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Practice Type</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">
            {terms.shortTitle} License
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {terms.complianceTerm} Active
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Branding Palette</span>
            <Layers className="h-4 w-4 text-purple-400" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div 
              className="h-4 w-4 rounded-full border border-slate-700" 
              style={{ backgroundColor: tenant?.primary_color || "#0284c7" }} 
            />
            <span className="text-sm font-bold text-white">
              {tenant?.primary_color || "#0284c7"}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Dynamic theme injection
          </div>
        </div>
      </div>

      {/* Users Management & Firm Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Accounts List */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40">
          <h2 className="text-base font-bold text-white mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-sky-400" />
              Tenant User Accounts
            </span>
            <span className="text-xs text-slate-400">{usersList.length} Active</span>
          </h2>
          <div className="space-y-3">
            {usersList.map((u: any) => (
              <div
                key={u.id}
                className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-white">
                    {u.first_name} {u.last_name}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{u.email}</div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-200 border border-slate-700">
                    {u.role}
                  </span>
                  {u.last_login_at && (
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 justify-end">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{new Date(u.last_login_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Firm Configuration Details */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-400" />
            Entity & Compliance Settings
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2.5 border-b border-slate-800">
              <span className="text-slate-400">Firm Legal Name</span>
              <span className="font-semibold text-white">{tenant?.firm_legal_name || "Apex Wealth Advisors Private Limited"}</span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-slate-800">
              <span className="text-slate-400">Regulatory Classification</span>
              <span className="text-sky-400 font-semibold">{terms.shortTitle} ({terms.entityTitle})</span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-slate-800">
              <span className="text-slate-400">Row-Level Security (RLS)</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Active Isolation
              </span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-slate-800">
              <span className="text-slate-400">Market Data Pipeline</span>
              <span className="text-slate-300">AMFI Daily NAV Sync via Cron</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-slate-400">Platform Session Lifetime</span>
              <span className="text-slate-300">12 Hours (HS256 JWT)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
