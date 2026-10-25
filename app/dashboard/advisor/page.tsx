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
  ExternalLink,
  UploadCloud,
  Building2,
  X,
  AlertCircle,
  Loader2,
  Sparkles
} from "lucide-react";
import AppointmentsManager from "@/components/AppointmentsManager";
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

export default function AdvisorDashboard() {
  const { terms, isRia, setFirmType } = useFirmBranding();
  const [userName, setUserName] = useState("Advisor");
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantError, setTenantError] = useState<{
    error: string;
    mismatchedTenant?: boolean;
    expectedFirmName?: string;
    expectedSubdomain?: string;
  } | null>(null);

  // CAS Import modal states
  const [showCasModal, setShowCasModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [casInput, setCasInput] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [casStatus, setCasStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadData = () => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      fetch("/api/advisor/overview", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok) {
            if (json.mismatchedTenant) {
              setTenantError(json);
            }
            return;
          }
          setData(json);
          setTenantError(null);
          if (json?.clients?.length > 0 && !selectedClientId) {
            setSelectedClientId(json.clients[0].client_id);
          }
          if (json?.tenant) {
            const ft = json.tenant.firm_type || json.tenant.tenant_type;
            if (ft && ["MFD", "RIA", "BOTH"].includes(String(ft).toUpperCase())) {
              setFirmType(String(ft).toUpperCase() as any);
            }
            localStorage.setItem("tenant_branding", JSON.stringify(json.tenant));
            window.dispatchEvent(new Event("tenant_branding_updated"));
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  };

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
    loadData();
  }, []);

  const metrics = data?.metrics || {
    totalAUM: 0,
    totalNetWorth: 0,
    activeHouseholds: 0,
    appointmentsCount: 0,
  };
  const clients = data?.clients || [];
  const appointments = data?.appointments || [];
  const now = new Date();
  const next7DaysEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const next7DaysAppointments = appointments.filter((a: any) => {
    const d = new Date(a.start_time);
    return d >= now && d <= next7DaysEnd && a.status !== "CANCELLED";
  });
  const tenant = data?.tenant;

  const handleImportCas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      setCasStatus({ type: "error", message: "Please select a client record." });
      return;
    }
    if (!casInput.trim()) {
      setCasStatus({ type: "error", message: "Please paste CAMS/KFintech CAS JSON or text data." });
      return;
    }

    setIsImporting(true);
    setCasStatus(null);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/clients/${selectedClientId}/import-cas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ casData: casInput }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || "Failed to import CAS statement.");
      }

      setCasStatus({
        type: "success",
        message: `Successfully ingested ${resJson.importedCount} mutual fund folios totaling ${formatINR(resJson.totalImportedValuation)}! Updated client net worth to ${formatINR(resJson.newNetWorth)}.`,
      });
      loadData();
    } catch (err: any) {
      setCasStatus({ type: "error", message: err.message || "An error occurred while importing." });
    } finally {
      setIsImporting(false);
    }
  };

  const populateSampleCas = () => {
    const sample = [
      { scheme: "HDFC Top 100 Fund - Growth Direct", folio: "10492819/22", valuation: 750000, cost: 550000 },
      { scheme: "Mirae Asset Large Cap Fund - Direct Growth", folio: "84729104", valuation: 520000, cost: 400000 },
      { scheme: "Parag Parikh Flexi Cap Fund - Direct Plan Growth", folio: "93821049", valuation: 980000, cost: 680000 },
      { scheme: "Nippon India Small Cap Fund - Growth", folio: "72619028", valuation: 430000, cost: 250000 }
    ];
    setCasInput(JSON.stringify(sample, null, 2));
  };

  const brandColor = tenant?.primary_color || "#0284c7";
  const brandName = tenant?.firm_brand_name || "InvestWell Mint • Wealth Console";

  return (
    <div className="space-y-6">
      {/* Advisor Header with Dynamic White-Label Firm Branding */}
      <div 
        className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md dark:shadow-xl transition"
        style={{ borderColor: `${brandColor}40`, boxShadow: `0 10px 30px -10px ${brandColor}20` }}
      >
        <div className="flex items-center gap-3 sm:gap-4">
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
              {tenant?.ria_number && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                  RIA: {tenant.ria_number}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
              {terms.dashboardHeader} &bull; {userName}
            </h1>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              {terms.entityTitle} Practice &bull; Client portfolio oversight &amp; {terms.serviceLabel}
            </p>
          </div>
        </div>
        <div className="flex flex-col xs:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard/portfolio"
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 text-xs font-bold shadow-sm transition hover:bg-sky-100 dark:hover:bg-sky-900"
          >
            <TrendingUp className="h-4 w-4 text-sky-500" />
            Mutual Fund Portfolio
          </Link>
          <button
            onClick={() => {
              setShowCasModal(true);
              setCasStatus(null);
            }}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm transition"
          >
            <UploadCloud className="h-4 w-4" style={{ color: brandColor }} />
            Import CAMS / KFin CAS
          </button>
          <Link
            href="/dashboard/clients/new"
            style={{ backgroundColor: brandColor }}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white shadow-md transition hover:brightness-110 active:scale-95"
          >
            + New Client Fact-Find
          </Link>
          <span 
            className="px-3 py-1 rounded-full text-xs font-semibold border text-center"
            style={{ 
              color: brandColor, 
              borderColor: `${brandColor}40`, 
              backgroundColor: `${brandColor}15` 
            }}
          >
            {terms.roleBadge}
          </span>
        </div>
      </div>

      {/* Cross-Tenant Session Mismatch Alert */}
      {tenantError && (
        <div className="p-5 rounded-2xl bg-amber-950/70 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-white text-sm">Cross-Tenant Account Mismatch</h3>
              <p className="text-xs text-amber-300/90 mt-0.5 leading-relaxed">
                {tenantError.error}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("auth_token");
              localStorage.removeItem("user_profile");
              window.location.href = "/login";
            }}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 transition shadow-md shadow-amber-500/20"
          >
            Sign in to {tenantError.expectedFirmName || "this practice"}
          </button>
        </div>
      )}

      {/* Metrics with Dynamic Tenant Primary Accents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{terms.aumLabel}</span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandColor}15` }}>
              <Briefcase className="h-4 w-4" style={{ color: brandColor }} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatINR(metrics.totalAUM)}</div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium" style={{ color: brandColor }}>
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Aggregate assets tracked</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Client Net Worth</span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandColor}15` }}>
              <TrendingUp className="h-4 w-4" style={{ color: brandColor }} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatINR(metrics.totalNetWorth)}</div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Net equity under {isRia ? "fiduciary advisory" : "distribution care"}
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Households</span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandColor}15` }}>
              <Users className="h-4 w-4" style={{ color: brandColor }} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.activeHouseholds}</div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Comprehensive planning intake done
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Upcoming Reviews</span>
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${brandColor}15` }}>
              <Calendar className="h-4 w-4" style={{ color: brandColor }} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {next7DaysAppointments.length}
          </div>
          <div className="mt-2 text-xs font-medium" style={{ color: brandColor }}>
            Reviews in next 7 days ({appointments.length} all-time)
          </div>
        </div>
      </div>

      {/* Assigned Clients & Meeting Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Records Table */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" style={{ color: brandColor }} />
              {terms.clientHeading}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{clients.length} Total</span>
          </h2>
          <div className="space-y-3">
            {clients.length === 0 ? (
              <div className="py-12 px-4 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs">
                <Users className="h-8 w-8 mx-auto mb-2 text-slate-400 dark:text-slate-600" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  No {terms.clientHeading.toLowerCase()} for {brandName} yet.
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Click &ldquo;+ New Client Fact-Find&rdquo; above to onboard your first household profile.
                </p>
              </div>
            ) : (
              clients.map((c: any) => (
                <div
                  key={c.client_id}
                  className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition group"
                >
                  <div>
                    <Link
                      href={`/dashboard/clients/${c.client_id}/360`}
                      className="text-xs font-bold text-slate-900 dark:text-white hover:underline transition flex items-center gap-1.5"
                    >
                      <span>{c.full_name}</span>
                      <span 
                        className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border"
                        style={{ color: brandColor, borderColor: `${brandColor}40`, backgroundColor: `${brandColor}15` }}
                      >
                        360 &deg;
                      </span>
                    </Link>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Code: {c.uwp_client_code} &bull; Horizon: {c.planning_horizon_years} yrs &bull; Risk: {c.risk_profile}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <div className="text-right hidden md:block">
                      <div className="text-xs font-bold" style={{ color: brandColor }}>
                        {formatINR(Number(c.annual_gross_income))}/yr
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/clients/${c.client_id}/360`}
                      style={{ backgroundColor: brandColor }}
                      className="px-2.5 py-1 rounded-md text-[10px] font-bold text-white shadow-sm hover:brightness-110 transition"
                    >
                      Client 360 &deg;
                    </Link>
                    <Link
                      href={`/dashboard/portfolio?clientId=${c.client_id}`}
                      className="px-2 py-1 rounded-md text-[10px] font-semibold bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/80 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition shadow-sm"
                    >
                      MF Portfolio
                    </Link>
                    <Link
                      href={`/dashboard/clients/${c.client_id}/net-worth`}
                      className="px-2 py-1 rounded-md text-[10px] font-semibold bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
                    >
                      Net Worth
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Calendar & Review Meetings Pipeline (Next 7 Days) */}
        <AppointmentsManager
          userRole="ADVISOR"
          clients={clients}
          title="Upcoming Client Reviews (Next 7 Days)"
          subtitle="Client reviews scheduled in the next 7 days, ordered chronologically."
          brandColor={brandColor}
          nextSevenDaysOnly={true}
        />
      </div>

      {/* CAMS / KFintech CAS Ingestion Modal */}
      <CasUploadModal
        isOpen={showCasModal}
        onClose={() => setShowCasModal(false)}
        onSuccess={loadData}
        userRole="ADVISOR"
        clients={clients}
        initialClientId={selectedClientId}
        brandColor={brandColor}
      />
    </div>
  );
}
