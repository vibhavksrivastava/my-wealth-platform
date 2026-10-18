"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Globe,
  Palette,
  UserCheck,
  CheckCircle2,
  Copy,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export default function OnboardTenantPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Organization
    firmLegalName: "",
    firmBrandName: "",
    tenantType: "RIA",
    arnNumber: "",
    riaNumber: "",

    // Step 2: Branding & Domains
    subdomain: "",
    customDomain: "",
    primaryColor: "#0284c7",
    secondaryColor: "#0f172a",
    logoUrl: "",
    disclaimerText: "Mutual fund investments are subject to market risks. Read all scheme related documents carefully before investing.",

    // Step 3: Initial Tenant Admin
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
    adminPhone: "",
    initialPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Success Result
  const [provisionResult, setProvisionResult] = useState<{
    tenant: {
      id: string;
      firm_brand_name: string;
      subdomain: string;
      primary_color: string;
    };
    admin: {
      email: string;
      fullName: string;
      tempPassword: string;
    };
  } | null>(null);

  const handleSubdomainAutoFill = (brandName: string) => {
    const slug = brandName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20);
    setFormData((prev) => ({
      ...prev,
      firmBrandName: brandName,
      subdomain: prev.subdomain ? prev.subdomain : slug,
    }));
  };

  const handleGeneratePassword = () => {
    const randomPass = `Wealth@${Math.random().toString(36).slice(-6)}!`;
    setFormData((prev) => ({ ...prev, initialPassword: randomPass }));
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (step === 1) {
      if (!formData.firmLegalName.trim() || !formData.firmBrandName.trim()) {
        setErrorMessage("Please provide both Firm Legal Name and Brand Name.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.subdomain.trim()) {
        setErrorMessage("A valid subdomain prefix is required.");
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    if (!formData.adminFirstName || !formData.adminLastName || !formData.adminEmail) {
      setErrorMessage("Please complete all required Tenant Administrator fields.");
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/super-admin/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to provision tenant firm.");
      }

      setProvisionResult(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!provisionResult) return;
    const text = `WealthOS Advisory Firm Provisioning:
Firm: ${provisionResult.tenant.firm_brand_name}
Subdomain: https://${provisionResult.tenant.subdomain}.wealthos.com
Admin User: ${provisionResult.admin.email}
Temporary Password: ${provisionResult.admin.tempPassword}
Login URL: /login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // If provisioned successfully, show the credential card
  if (provisionResult) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Organization Provisioned Successfully!
              </h2>
              <p className="text-xs text-slate-400">
                {provisionResult.tenant.firm_brand_name} is now live with dedicated tenant isolation.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Firm Details
              </span>
              <span className="text-xs font-mono text-rose-400">
                {provisionResult.tenant.subdomain}.wealthos.com
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400">Primary Administrator</span>
                <p className="font-semibold text-white mt-0.5">{provisionResult.admin.fullName}</p>
              </div>
              <div>
                <span className="text-slate-400">Admin Email</span>
                <p className="font-mono text-slate-200 mt-0.5">{provisionResult.admin.email}</p>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-slate-400 text-xs block mb-1">Temporary Initial Password:</span>
              <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="font-mono text-emerald-400 font-bold text-sm tracking-wider">
                  {provisionResult.admin.tempPassword}
                </span>
                <button
                  onClick={copyCredentials}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-md transition"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link
              href="/super-admin/tenants"
              className="text-xs text-slate-400 hover:text-white transition"
            >
              &larr; Return to Tenants Directory
            </Link>
            <div className="flex gap-2">
              <button
                onClick={copyCredentials}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
              >
                {copied ? "Credentials Copied" : "Copy All Credentials"}
              </button>
              <Link
                href="/super-admin/tenants"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-rose-600/20"
              >
                Done
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wizard Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/super-admin/tenants"
              className="text-xs text-slate-400 hover:text-white transition"
            >
              &larr; Back to Directory
            </Link>
            <span className="text-slate-600">&bull;</span>
            <span className="text-xs text-rose-400 font-semibold uppercase tracking-wider">
              Tenant Onboarding
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            Onboard New B2B Advisory Firm
          </h1>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                step === s
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                  : step > s
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-900 text-slate-500 border border-slate-800"
              }`}
            >
              {step > s ? "✓" : s}
            </div>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2-Column: Form + Live Preview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Step Form */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
          {/* STEP 1: Organization Legal & Registration */}
          {step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-4">
              <div className="border-b border-slate-800 pb-3 mb-4">
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-rose-400" />
                  Step 1: Organization &amp; Licensing Details
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Legal entity name, commercial brand name, and SEBI/AMFI registration codes.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Firm Brand / Commercial Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Wealth Partners"
                  value={formData.firmBrandName}
                  onChange={(e) => handleSubdomainAutoFill(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Firm Legal / Registered Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Financial Solutions Private Limited"
                  value={formData.firmLegalName}
                  onChange={(e) => setFormData({ ...formData, firmLegalName: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Tenant Type
                  </label>
                  <select
                    value={formData.tenantType}
                    onChange={(e) => setFormData({ ...formData, tenantType: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-rose-500 transition"
                  >
                    <option value="RIA">SEBI RIA (Advisor)</option>
                    <option value="MFD">AMFI MFD (Distributor)</option>
                    <option value="FAMILY_OFFICE">Multi-Family Office</option>
                    <option value="BROKER">Stock Broker / Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    AMFI ARN Number
                  </label>
                  <input
                    type="text"
                    placeholder="ARN-123456"
                    value={formData.arnNumber}
                    onChange={(e) => setFormData({ ...formData, arnNumber: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    SEBI RIA Number
                  </label>
                  <input
                    type="text"
                    placeholder="INA000012345"
                    value={formData.riaNumber}
                    onChange={(e) => setFormData({ ...formData, riaNumber: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-600/20 transition"
                >
                  <span>Proceed to Branding &amp; Domains</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Branding & Domains */}
          {step === 2 && (
            <form onSubmit={handleNextStep} className="space-y-4">
              <div className="border-b border-slate-800 pb-3 mb-4">
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Palette className="h-4 w-4 text-rose-400" />
                  Step 2: White-Label Branding &amp; Hostnames
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure the firm&apos;s custom subdomain, brand accent color, and regulatory disclaimer.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Subdomain Prefix *
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="e.g. apexwealth"
                    value={formData.subdomain}
                    onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    className="flex-1 px-3 py-2.5 bg-slate-950 border border-r-0 border-slate-800 rounded-l-lg text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-rose-500 transition"
                  />
                  <span className="px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-r-lg text-xs text-slate-400 font-mono">
                    .wealthos.com
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Custom Domain (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. portal.apexwealth.com"
                  value={formData.customDomain}
                  onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="h-9 w-9 rounded-lg border border-slate-800 bg-slate-950 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Firm Logo URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Mandatory Compliance Disclaimer
                </label>
                <textarea
                  rows={2}
                  value={formData.disclaimerText}
                  onChange={(e) => setFormData({ ...formData, disclaimerText: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-white transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-600/20 transition"
                >
                  <span>Proceed to Admin Account</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Initial Tenant Admin Provisioning */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="border-b border-slate-800 pb-3 mb-4">
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-rose-400" />
                  Step 3: Provision First Tenant Administrator
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create the root administrator account for this advisory firm (Role: TENANT_ADMIN).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Admin First Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh"
                    value={formData.adminFirstName}
                    onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Admin Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Verma"
                    value={formData.adminLastName}
                    onChange={(e) => setFormData({ ...formData, adminLastName: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Admin Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@firm.com"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.adminPhone}
                    onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Initial Password
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Leave empty to auto-generate"
                    value={formData.initialPassword}
                    onChange={(e) => setFormData({ ...formData, initialPassword: e.target.value })}
                    className="w-full pr-10 pl-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-rose-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-white transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Provisioning Organization...</span>
                    </>
                  ) : (
                    <>
                      <span>Deploy Tenant &amp; Provision Admin</span>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Live White-Label Preview Card */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-rose-400" />
              Live White-Label Preview
            </h3>
            <p className="text-[11px] text-slate-400">How the firm will appear to advisors &amp; clients</p>
          </div>

          {/* Firm Card Preview */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center font-black text-white text-base shadow-md"
                style={{ backgroundColor: formData.primaryColor || "#0284c7" }}
              >
                {formData.firmBrandName ? formData.firmBrandName.charAt(0) : "W"}
              </div>
              <div>
                <div className="font-bold text-white text-sm">
                  {formData.firmBrandName || "Firm Brand Name"}
                </div>
                <div className="text-[10px] text-slate-400">
                  {formData.firmLegalName || "Legal Entity Registered Name"}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-900 text-[11px] space-y-1 font-mono">
              <div className="text-slate-400 flex items-center justify-between">
                <span>Subdomain:</span>
                <span className="text-white">
                  {formData.subdomain ? `${formData.subdomain}.wealthos.com` : "subdomain.wealthos.com"}
                </span>
              </div>
              <div className="text-slate-400 flex items-center justify-between">
                <span>Type:</span>
                <span className="text-sky-400 font-semibold">{formData.tenantType}</span>
              </div>
              {(formData.arnNumber || formData.riaNumber) && (
                <div className="text-slate-400 flex items-center justify-between">
                  <span>License:</span>
                  <span className="text-slate-200">
                    {formData.arnNumber ? `ARN: ${formData.arnNumber}` : `RIA: ${formData.riaNumber}`}
                  </span>
                </div>
              )}
            </div>

            {/* Mock Client Portal Header */}
            <div className="mt-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
              <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">
                Portal Theme Header
              </div>
              <div
                className="h-2 rounded-full w-full"
                style={{ backgroundColor: formData.primaryColor || "#0284c7" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

