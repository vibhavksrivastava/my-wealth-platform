"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import FileUploader from "@/components/FileUploader";

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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings.");
      }

      setSuccessMessage("Firm white-label branding and compliance settings updated successfully.");
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Firm Branding &amp; White-Label</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
              White-Label Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Customize your firm brand colors, legal entity disclosures, logos, and custom hostnames.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Reload</span>
        </button>
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
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleSave} className="space-y-5">
            {/* Firm Identity */}
            <div className="border-b border-slate-800 pb-4 space-y-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Building2 className="h-4 w-4 text-amber-400" />
                Firm Identity &amp; Registrations
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            {/* Brand Colors & Assets */}
            <div className="border-b border-slate-800 pb-4 space-y-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Palette className="h-4 w-4 text-amber-400" />
                Brand Styling &amp; Colors
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div className="sm:col-span-2">
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
            </div>

            {/* Custom Domain & Regulatory Text */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Globe className="h-4 w-4 text-amber-400" />
                Domains &amp; Compliance Disclaimers
              </h2>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Custom Domain Hostname
                </label>
                <input
                  type="text"
                  placeholder="e.g. portal.myfirm.com"
                  value={formData.customDomain}
                  onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-amber-500"
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

            <div className="pt-3 flex justify-end">
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
                    <span>Save White-Label Settings</span>
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
            <p className="text-[11px] text-slate-400">Preview with your custom brand color</p>
          </div>

          {/* Mock Header */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-900">
              <div className="flex items-center gap-2">
                <div
                  className="h-7 w-7 rounded-md flex items-center justify-center font-bold text-white text-xs shadow-sm"
                  style={{ backgroundColor: formData.primaryColor }}
                >
                  {formData.firmBrandName ? formData.firmBrandName.charAt(0) : "W"}
                </div>
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
                style={{ backgroundColor: formData.primaryColor }}
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
                style={{ backgroundColor: formData.primaryColor }}
              />
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

