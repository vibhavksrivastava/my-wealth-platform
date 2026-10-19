"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Settings,
  Palette,
  Globe,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Building2,
  RefreshCw,
  Lock,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import FileUploader from "@/components/FileUploader";

interface PlanInfo {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  max_seats: number;
  features: {
    white_label: boolean;
    custom_domain: boolean;
    advanced_reports: boolean;
    bse_star_mf: boolean;
    cas_import: boolean;
    client_portal: boolean;
    suggestions_engine: boolean;
    commission_sharing?: boolean;
    zero_subscription_fee?: boolean;
    priority_support?: boolean;
  };
}

export default function TenantAdminSettingsPage() {
  const [formData, setFormData] = useState({
    firmBrandName: "",
    firmLegalName: "",
    arnNumber: "",
    riaNumber: "",
    logoUrl: "",
    primaryColor: "#0284c7",
    secondaryColor: "#0f172a",
    customDomain: "",
    disclaimerText: "",
    subdomain: "",
  });

  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to load firm settings.");
      }

      const json = await res.json();
      const t = json.tenant;
      if (json.plan) {
        setPlan(json.plan);
      }
      if (t) {
        setFormData({
          firmBrandName: t.firm_brand_name || "",
          firmLegalName: t.firm_legal_name || "",
          arnNumber: t.arn_number || "",
          riaNumber: t.ria_number || "",
          logoUrl: t.logo_url || "",
          primaryColor: t.primary_color || "#0284c7",
          secondaryColor: t.secondary_color || "#0f172a",
          customDomain: t.custom_domain || "",
          disclaimerText: t.disclaimer_text || "",
          subdomain: t.subdomain || "",
        });
      }
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
    fetchSettings();
  }, []);

  const hasWhiteLabel = plan ? Boolean(plan.features?.white_label) : true;
  const hasCustomDomain = plan ? Boolean(plan.features?.custom_domain) : false;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await responseJsonSafe(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings.");
      }

      setSuccessMessage("Firm white-label branding and compliance settings updated successfully.");
      if (data.plan) {
        setPlan(data.plan);
      }
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to save settings.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const responseJsonSafe = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return {};
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Firm Branding &amp; White-Label</h1>
            {plan && (
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                plan.slug === "basic"
                  ? "bg-slate-800 text-slate-300 border-slate-700"
                  : plan.slug === "arn_partnership"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              }`}>
                {plan.name}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Customize your firm brand colors, legal entity disclosures, logos, and custom hostnames.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/billing"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-300 transition"
          >
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Manage Plan &amp; Billing</span>
          </Link>

          <button
            onClick={fetchSettings}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 2-Column: Form + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Firm Identity */}
            <div className="border-b border-slate-800 pb-5 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Building2 className="h-4 w-4 text-amber-400" />
                Firm Identity &amp; Registrations
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Firm Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firmBrandName}
                    onChange={(e) => setFormData({ ...formData, firmBrandName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Firm Legal Entity Name
                  </label>
                  <input
                    type="text"
                    value={formData.firmLegalName}
                    onChange={(e) => setFormData({ ...formData, firmLegalName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    AMFI ARN Number
                  </label>
                  <input
                    type="text"
                    placeholder="ARN-XXXXXX"
                    value={formData.arnNumber}
                    onChange={(e) => setFormData({ ...formData, arnNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Used for automated BSE StAR MF routing &amp; distributor reports.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    SEBI RIA Number
                  </label>
                  <input
                    type="text"
                    placeholder="INAXXXXXXXXX"
                    value={formData.riaNumber}
                    onChange={(e) => setFormData({ ...formData, riaNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Plan-Gated White Label Section */}
            <div className="border-b border-slate-800 pb-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Palette className="h-4 w-4 text-amber-400" />
                  Brand Styling &amp; Colors
                </h2>
                {!hasWhiteLabel && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    <Lock className="h-3 w-3" />
                    Locked on Starter Plan
                  </span>
                )}
              </div>

              {/* Upgrade Banner if Plan does not include White-Label */}
              {!hasWhiteLabel ? (
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-slate-900 border border-amber-500/30 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Upgrade to Growth to unlock White-Labeling
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        Custom brand logos, tailored portal color schemes, and client report branding are exclusive to the <strong className="text-white">Growth Practice Plan</strong> or <strong className="text-white">Zero-Fee ARN Partnership</strong>.
                      </p>
                    </div>
                  </div>
                  <div className="pt-1 flex items-center justify-between border-t border-amber-500/20">
                    <span className="text-[11px] text-amber-400/90 font-medium">BSE StAR MF &amp; CAS imports remain 100% active on Starter.</span>
                    <Link
                      href="/admin/billing"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                    >
                      <span>Upgrade to Growth</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                        Primary Brand Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.primaryColor}
                          onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                          className="h-8 w-8 rounded-lg border border-slate-800 bg-slate-950 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={formData.primaryColor}
                          onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                          className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                        Secondary / Surface Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.secondaryColor}
                          onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                          className="h-8 w-8 rounded-lg border border-slate-800 bg-slate-950 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={formData.secondaryColor}
                          onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                          className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <FileUploader
                      purpose="firm_logo"
                      currentUrl={formData.logoUrl}
                      label="Advisory Firm Brand Logo"
                      description="Upload your high-resolution advisory firm logo (PNG, JPG, SVG, WebP up to 5MB). Rendered on client dashboards & reports."
                      onUploadComplete={({ url }) => setFormData((prev) => ({ ...prev, logoUrl: url }))}
                      onRemove={() => setFormData((prev) => ({ ...prev, logoUrl: "" }))}
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">Or paste external image URL:</span>
                      <input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={formData.logoUrl}
                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                        className="flex-1 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Domain & Regulatory Text */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Globe className="h-4 w-4 text-amber-400" />
                  Domains &amp; Compliance Disclaimers
                </h2>
                {!hasCustomDomain && (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Enterprise feature
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Custom Domain Hostname
                </label>
                <input
                  type="text"
                  disabled={!hasCustomDomain}
                  placeholder={hasCustomDomain ? "e.g. portal.myfirm.com" : "Upgrade to Enterprise to link custom domain (e.g. portal.myfirm.com)"}
                  value={formData.customDomain}
                  onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Mandatory Investor Compliance Disclaimer
                </label>
                <textarea
                  rows={3}
                  value={formData.disclaimerText}
                  onChange={(e) => setFormData({ ...formData, disclaimerText: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md shadow-amber-600/20 transition disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live White-Label Preview */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Live Portal Preview
            </h3>
            <p className="text-[11px] text-slate-400">
              {hasWhiteLabel ? "Preview with your custom brand color & logo" : "Showing default platform preview (Upgrade for custom)"}
            </p>
          </div>

          {/* Mock Header */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-900">
              <div className="flex items-center gap-2">
                {formData.logoUrl && hasWhiteLabel ? (
                  <img
                    src={formData.logoUrl}
                    alt={formData.firmBrandName}
                    className="h-6 max-w-[90px] object-contain rounded"
                  />
                ) : (
                  <div
                    className="h-7 w-7 rounded-md flex items-center justify-center font-bold text-white text-xs shadow-sm"
                    style={{ backgroundColor: hasWhiteLabel ? formData.primaryColor : "#0284c7" }}
                  >
                    {formData.firmBrandName ? formData.firmBrandName.charAt(0) : "W"}
                  </div>
                )}
                <span className="font-bold text-xs text-white">
                  {formData.firmBrandName || "Firm Brand Name"}
                </span>
              </div>
              <span className="text-[9px] text-slate-500 font-mono">
                {formData.subdomain}.wealthos.com
              </span>
            </div>

            {/* Mock Navigation Pill */}
            <div className="flex gap-2">
              <span
                className="px-2.5 py-1 rounded text-[10px] font-semibold text-white shadow-sm"
                style={{ backgroundColor: hasWhiteLabel ? formData.primaryColor : "#0284c7" }}
              >
                Dashboard
              </span>
              <span className="px-2.5 py-1 rounded text-[10px] font-semibold text-slate-400 bg-slate-900">
                Portfolios
              </span>
              <span className="px-2.5 py-1 rounded text-[10px] font-semibold text-slate-400 bg-slate-900">
                Reports
              </span>
            </div>

            {/* Mock Card */}
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1.5">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Net Worth</div>
              <div className="text-base font-black text-white">₹3,15,24,886</div>
              <div
                className="h-1 rounded-full w-2/3"
                style={{ backgroundColor: hasWhiteLabel ? formData.primaryColor : "#0284c7" }}
              />
            </div>

            {/* Universal BSE StAR MF Notice */}
            <div className="p-2 rounded bg-slate-900/80 border border-slate-800 text-[10px] text-emerald-400 flex items-center justify-between">
              <span>BSE StAR MF Order Routing:</span>
              <span className="font-mono font-bold uppercase">Active &amp; Ready</span>
            </div>

            {/* Mock Disclaimer */}
            <div className="text-[9px] text-slate-500 leading-tight pt-1 border-t border-slate-900">
              {formData.disclaimerText || "Compliance disclaimer will appear here in investor reports."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
