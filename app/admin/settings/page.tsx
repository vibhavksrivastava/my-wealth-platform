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
  Sun,
  Moon,
  Key,
  Eye,
  EyeOff,
  MessageSquare,
  Mail,
  Server,
  ShieldCheck,
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
    themeMode: "light" as "light" | "dark",
    customDomain: "",
    disclaimerText: "",
    subdomain: "",
  });

  const [envVars, setEnvVars] = useState({
    WHATSAPP_API_TOKEN: "",
    WHATSAPP_PHONE_NUMBER_ID: "",
    SMTP_HOST: "",
    SMTP_PORT: "587",
    SMTP_USER: "",
    SMTP_PASSWORD: "",
    SMTP_FROM_EMAIL: "",
    TWILIO_ACCOUNT_SID: "",
    TWILIO_AUTH_TOKEN: "",
    TWILIO_PHONE_NUMBER: "",
  });

  const [maskedIntegrations, setMaskedIntegrations] = useState<
    Record<string, { isConfigured: boolean; maskedValue: string }>
  >({});
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});

  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [selectedTenantSlug, setSelectedTenantSlug] = useState<string>("");

  useEffect(() => {
    try {
      const profileStr = localStorage.getItem("user_profile");
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile.role === "SUPER_ADMIN") {
          setIsSuperAdmin(true);
        }
      }
    } catch {}

    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get("tenant") || urlParams.get("subdomain");
    if (tenantParam) {
      setSelectedTenantSlug(tenantParam.toLowerCase().trim());
    } else {
      // Default to platform if on localhost root or superadmin
      try {
        const profileStr = localStorage.getItem("user_profile");
        if (profileStr && JSON.parse(profileStr).role === "SUPER_ADMIN") {
          setSelectedTenantSlug("platform");
        }
      } catch {}
    }
  }, []);

  const fetchSettings = async (overrideTenant?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const targetSlug = overrideTenant !== undefined ? overrideTenant : selectedTenantSlug;
      const queryStr = targetSlug ? `?tenant=${encodeURIComponent(targetSlug)}` : "";

      const res = await fetch(`/api/admin/settings${queryStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        throw new Error(errorJson?.error || "Failed to load firm settings.");
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
          themeMode: (t.theme_mode === "dark" ? "dark" : "light") as "light" | "dark",
          customDomain: t.custom_domain || "",
          disclaimerText: t.disclaimer_text || "",
          subdomain: t.subdomain || "",
        });
      }

      // Fetch dedicated tenant integration credentials and masked env vars
      try {
        const configRes = await fetch(`/api/admin/tenant-config${queryStr}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (configRes.ok) {
          const configJson = await configRes.json();
          if (configJson.integrations) {
            setMaskedIntegrations(configJson.integrations);
          }
        }
      } catch {}
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
  }, [selectedTenantSlug]);

  const hasWhiteLabel = plan ? Boolean(plan.features?.white_label) : true;
  const hasCustomDomain = plan ? Boolean(plan.features?.custom_domain) : false;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem("auth_token");
      const queryStr = selectedTenantSlug ? `?tenant=${encodeURIComponent(selectedTenantSlug)}` : "";

      const res = await fetch(`/api/admin/settings${queryStr}`, {
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

      // Also update tenant config and encrypted env vars
      const hasAnyEnvInput = Object.values(envVars).some((v) => v.trim() !== "");
      if (hasAnyEnvInput || formData.customDomain) {
        await fetch(`/api/admin/tenant-config${queryStr}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            customDomain: formData.customDomain,
            branding: {
              firmBrandName: formData.firmBrandName,
              logoUrl: formData.logoUrl,
              primaryColor: formData.primaryColor,
              secondaryColor: formData.secondaryColor,
              themeMode: formData.themeMode,
              disclaimerText: formData.disclaimerText,
            },
            envVars,
          }),
        });
      }

      setSuccessMessage("Firm white-label branding and dedicated API integrations updated successfully.");
      if (data.plan) {
        setPlan(data.plan);
      }
      // Re-fetch to refresh masked integration statuses
      await fetchSettings();
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
            onClick={() => fetchSettings()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {/* SuperAdmin Multi-Tenant Practice Switcher */}
      {isSuperAdmin && (
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-400" />
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>SuperAdmin Practice Switcher</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300">
                  Global Access
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Switch between Platform HQ and any tenant advisory firm to manage their branding &amp; credentials.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { slug: "platform", name: "🟡 Platform HQ" },
              { slug: "zenith9186", name: "🔵 Zenith Wealth" },
              { slug: "aasinvestment", name: "🟢 AAS Investment" },
              { slug: "apex", name: "🟣 Apex Partners" },
            ].map((firm) => (
              <button
                key={firm.slug}
                type="button"
                onClick={() => {
                  setSelectedTenantSlug(firm.slug);
                  const url = new URL(window.location.href);
                  url.searchParams.set("tenant", firm.slug);
                  window.history.replaceState({}, "", url.toString());
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  (selectedTenantSlug || "platform") === firm.slug
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm"
                    : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-900"
                }`}
              >
                <span>{firm.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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

                  {/* Portal Theme Mode Selector */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Default Portal Theme Mode
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, themeMode: "light" })}
                        className={`p-3 rounded-xl border flex items-center gap-3 transition text-left ${
                          formData.themeMode === "light"
                            ? "bg-amber-500/15 border-amber-500 text-white font-bold shadow-md shadow-amber-500/10"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                          <Sun className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold">Light Mode Canvas</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Crisp, high-contrast white aesthetic</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, themeMode: "dark" })}
                        className={`p-3 rounded-xl border flex items-center gap-3 transition text-left ${
                          formData.themeMode === "dark"
                            ? "bg-amber-500/15 border-amber-500 text-white font-bold shadow-md shadow-amber-500/10"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                          <Moon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold">Dark Mode Canvas</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Deep slate institutional theme</div>
                        </div>
                      </button>
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

            {/* Tenant-Level Environment Variables & API Keys (Encrypted at Rest) */}
            <div className="border-t border-slate-800 pt-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Key className="h-4 w-4 text-emerald-400" />
                    Dedicated Tenant API Keys &amp; Integrations
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Configure your firm&apos;s dedicated WhatsApp Business account, Twilio SMS, or custom SMTP gateway. All secrets are encrypted at rest with AES-256-GCM.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 whitespace-nowrap">
                  <ShieldCheck className="h-3 w-3" />
                  AES-256 Encrypted
                </span>
              </div>

              {/* WhatsApp Business API */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Meta WhatsApp Cloud API</h4>
                      <p className="text-[10px] text-slate-400">Send automated CAS ingestion alerts, portfolio reviews, and meeting reminders from your firm&apos;s own WhatsApp number.</p>
                    </div>
                  </div>
                  {maskedIntegrations["WHATSAPP_API_TOKEN"]?.isConfigured ? (
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Active</span>
                  ) : (
                    <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Platform Default</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      WhatsApp Phone Number ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 109876543210987"
                      value={envVars.WHATSAPP_PHONE_NUMBER_ID}
                      onChange={(e) => setEnvVars({ ...envVars, WHATSAPP_PHONE_NUMBER_ID: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-300">
                        System User Access Token
                      </label>
                      <button
                        type="button"
                        onClick={() => setRevealedFields(p => ({ ...p, wa: !p.wa }))}
                        className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        {revealedFields.wa ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        <span>{revealedFields.wa ? "Hide" : "Show"}</span>
                      </button>
                    </div>
                    <input
                      type={revealedFields.wa ? "text" : "password"}
                      placeholder={maskedIntegrations["WHATSAPP_API_TOKEN"]?.isConfigured ? "•••••••• (Encrypted at rest)" : "EAAGm0PX..."}
                      value={envVars.WHATSAPP_API_TOKEN}
                      onChange={(e) => setEnvVars({ ...envVars, WHATSAPP_API_TOKEN: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Custom SMTP / Email Gateway */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      <Mail className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Custom Transactional SMTP / Email</h4>
                      <p className="text-[10px] text-slate-400">Dispatch client statements and fact-find links using your own advisory email domain (e.g. notifications@zenithwealth.com).</p>
                    </div>
                  </div>
                  {maskedIntegrations["SMTP_HOST"]?.isConfigured ? (
                    <span className="text-[10px] font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">Active</span>
                  ) : (
                    <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Platform Default</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      placeholder="smtp.sendgrid.net / smtp.office365.com"
                      value={envVars.SMTP_HOST}
                      onChange={(e) => setEnvVars({ ...envVars, SMTP_HOST: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      SMTP Port
                    </label>
                    <input
                      type="text"
                      placeholder="587"
                      value={envVars.SMTP_PORT}
                      onChange={(e) => setEnvVars({ ...envVars, SMTP_PORT: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      From Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="advisory@yourfirm.com"
                      value={envVars.SMTP_FROM_EMAIL}
                      onChange={(e) => setEnvVars({ ...envVars, SMTP_FROM_EMAIL: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      SMTP Username / API Key
                    </label>
                    <input
                      type="text"
                      placeholder="apikey / user@yourfirm.com"
                      value={envVars.SMTP_USER}
                      onChange={(e) => setEnvVars({ ...envVars, SMTP_USER: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-300">
                        SMTP Password / Secret
                      </label>
                      <button
                        type="button"
                        onClick={() => setRevealedFields(p => ({ ...p, smtp: !p.smtp }))}
                        className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        {revealedFields.smtp ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        <span>{revealedFields.smtp ? "Hide" : "Show"}</span>
                      </button>
                    </div>
                    <input
                      type={revealedFields.smtp ? "text" : "password"}
                      placeholder={maskedIntegrations["SMTP_PASSWORD"]?.isConfigured ? "•••••••• (Encrypted at rest)" : "Enter SMTP password..."}
                      value={envVars.SMTP_PASSWORD}
                      onChange={(e) => setEnvVars({ ...envVars, SMTP_PASSWORD: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Twilio SMS Gateway */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      <Server className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Twilio SMS Gateway</h4>
                      <p className="text-[10px] text-slate-400">Optional custom Twilio credentials for DLT SMS broadcasts.</p>
                    </div>
                  </div>
                  {maskedIntegrations["TWILIO_ACCOUNT_SID"]?.isConfigured ? (
                    <span className="text-[10px] font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">Active</span>
                  ) : (
                    <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Platform Default</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Twilio Account SID
                    </label>
                    <input
                      type="text"
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={envVars.TWILIO_ACCOUNT_SID}
                      onChange={(e) => setEnvVars({ ...envVars, TWILIO_ACCOUNT_SID: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-300">
                        Auth Token
                      </label>
                      <button
                        type="button"
                        onClick={() => setRevealedFields(p => ({ ...p, twilio: !p.twilio }))}
                        className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        {revealedFields.twilio ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        <span>{revealedFields.twilio ? "Hide" : "Show"}</span>
                      </button>
                    </div>
                    <input
                      type={revealedFields.twilio ? "text" : "password"}
                      placeholder={maskedIntegrations["TWILIO_AUTH_TOKEN"]?.isConfigured ? "•••••••• (Encrypted at rest)" : "Twilio Auth Token..."}
                      value={envVars.TWILIO_AUTH_TOKEN}
                      onChange={(e) => setEnvVars({ ...envVars, TWILIO_AUTH_TOKEN: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Sender Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="+1234567890"
                      value={envVars.TWILIO_PHONE_NUMBER}
                      onChange={(e) => setEnvVars({ ...envVars, TWILIO_PHONE_NUMBER: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
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
