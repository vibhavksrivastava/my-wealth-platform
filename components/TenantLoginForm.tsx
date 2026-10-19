"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  User, 
  Briefcase, 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle,
  Loader2,
  Building2,
  Eye,
  EyeOff,
  CheckCircle2,
  ExternalLink
} from "lucide-react";

export interface TenantBranding {
  id?: string;
  subdomain?: string;
  firm_brand_name?: string | null;
  firm_legal_name?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  disclaimer_text?: string | null;
  arn_number?: string | null;
  ria_number?: string | null;
  is_active?: boolean;
}

interface TenantLoginFormProps {
  tenant: TenantBranding | null;
  subdomain?: string | null;
}

type RoleTab = "CLIENT" | "ADVISOR" | "ADMIN";

export default function TenantLoginForm({ tenant, subdomain }: TenantLoginFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<RoleTab>("CLIENT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);

  // Dynamic brand styling
  const brandName = tenant?.firm_brand_name || "WealthOS Platform";
  const brandColor = tenant?.primary_color || "#0284c7"; // Default sky-600
  const isCustomTenant = Boolean(tenant && tenant.subdomain && tenant.subdomain !== "platform");

  const roleMeta = {
    CLIENT: {
      title: isCustomTenant ? `${brandName} • Client Portal` : "Client & Investor Portal",
      subtitle: isCustomTenant 
        ? `Access your consolidated portfolio, net-worth tracking, and advisory reports managed by ${brandName}.`
        : "View your consolidated net worth, portfolio performance, and book advisor appointments.",
      badge: isCustomTenant ? `${brandName} Investor Access` : "Investor Access",
      defaultPath: "/dashboard/client",
    },
    ADVISOR: {
      title: isCustomTenant ? `${brandName} • Advisor Console` : "Advisor & MFD Console",
      subtitle: "Manage client portfolios, review meetings, log notes, and oversee execution.",
      badge: "MFD / RIA Access",
      defaultPath: "/dashboard/advisor",
    },
    ADMIN: {
      title: "Firm & Platform Administration",
      subtitle: "Manage firm branding, staff privileges, compliance logs, and white-label settings.",
      badge: "Administrative Access",
      defaultPath: "/dashboard/admin",
    },
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          portalType: activeTab,
          tenantSubdomain: tenant?.subdomain,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed. Please verify credentials.");
      }

      // Store JWT token locally
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("user_profile", JSON.stringify(data.user));

      // Dynamic redirect based on returned user role
      if (data.user.role === "SUPER_ADMIN") {
        router.push("/super-admin");
      } else if (data.user.role === "TENANT_ADMIN") {
        router.push("/admin");
      } else if (data.user.role === "ADVISOR" || data.user.role === "STAFF") {
        router.push("/dashboard/advisor");
      } else {
        router.push("/dashboard/client");
      }
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-sky-500 selection:text-white font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          {tenant?.logo_url && !logoFailed ? (
            <div className="h-9 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
              <img
                src={tenant.logo_url}
                alt={brandName}
                onError={() => setLogoFailed(true)}
                className="h-7 max-w-[140px] object-contain"
              />
            </div>
          ) : (
            <div 
              style={{ backgroundColor: brandColor }}
              className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md transition group-hover:scale-105"
            >
              {brandName.charAt(0)}
            </div>
          )}
          <div>
            <span className="font-bold text-base text-white tracking-tight block">
              {brandName}
            </span>
            {tenant?.subdomain && (
              <span className="text-[10px] font-mono text-slate-400 block -mt-0.5">
                {tenant.subdomain}.unifiedwealth.com
              </span>
            )}
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {tenant?.arn_number && (
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800">
              ARN-{tenant.arn_number}
            </span>
          )}
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-white transition font-medium"
          >
            &larr; Platform Overview
          </Link>
        </div>
      </header>

      {/* Main Form Centerpiece */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          
          {/* Tenant Branding Card Header */}
          <div className="text-center mb-6">
            {tenant?.logo_url && !logoFailed ? (
              <div className="inline-flex p-3 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl mb-3">
                <img
                  src={tenant.logo_url}
                  alt={brandName}
                  onError={() => setLogoFailed(true)}
                  className="h-12 max-w-[180px] object-contain"
                />
              </div>
            ) : (
              <div 
                style={{ backgroundColor: brandColor }}
                className="inline-flex h-14 w-14 rounded-2xl items-center justify-center font-black text-2xl text-white shadow-xl shadow-sky-500/10 mb-3"
              >
                {brandName.charAt(0)}
              </div>
            )}
            
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {isCustomTenant ? `${brandName}` : "Sign In to WealthOS"}
            </h1>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
              {isCustomTenant 
                ? `Authorized Client & Advisor Access Portal`
                : "Multi-tenant unified wealth management console"}
            </p>
          </div>

          {/* Role Selection Tabs */}
          <div className="flex bg-slate-900/90 border border-slate-800 p-1 rounded-xl mb-4 shadow-inner">
            <button
              type="button"
              onClick={() => { setActiveTab("CLIENT"); setErrorMessage(null); }}
              style={activeTab === "CLIENT" ? { backgroundColor: brandColor } : {}}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "CLIENT"
                  ? "text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Client
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("ADVISOR"); setErrorMessage(null); }}
              style={activeTab === "ADVISOR" ? { backgroundColor: brandColor } : {}}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "ADVISOR"
                  ? "text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              Advisor / MFD
            </button>
            {!isCustomTenant && (
              <button
                type="button"
                onClick={() => { setActiveTab("ADMIN"); setErrorMessage(null); }}
                style={activeTab === "ADMIN" ? { backgroundColor: brandColor } : {}}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "ADMIN"
                    ? "text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin
              </button>
            )}
          </div>

          {/* Quick Demo Autofill Helpers */}
          <div className="mb-4 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
            <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider pl-1">
              Test Logins:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("CLIENT");
                  setEmail("vibhav@example.com");
                  setPassword("Password123!");
                  setErrorMessage(null);
                }}
                className="px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 transition font-medium text-[10px]"
              >
                Client Demo
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("ADVISOR");
                  setEmail("pallavi@example.com");
                  setPassword("Password123!");
                  setErrorMessage(null);
                }}
                className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition font-medium text-[10px]"
              >
                Advisor Demo
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("ADMIN");
                  setEmail("admin@example.com");
                  setPassword("Password123!");
                  setErrorMessage(null);
                }}
                className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition font-medium text-[10px]"
              >
                Admin Demo
              </button>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
            <div className="mb-6">
              <span 
                style={{ color: brandColor, borderColor: `${brandColor}40`, backgroundColor: `${brandColor}15` }}
                className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border mb-2"
              >
                {roleMeta[activeTab].badge}
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {roleMeta[activeTab].title}
              </h2>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                {roleMeta[activeTab].subtitle}
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      activeTab === "CLIENT"
                        ? "investor@example.com"
                        : "advisor@firm.com"
                    }
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Password
                  </label>
                  <a
                    href="#forgot"
                    className="text-[11px] text-sky-400 hover:text-sky-300 transition"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button styled with tenant's primary_color */}
              <button
                type="submit"
                disabled={isLoading}
                style={{ backgroundColor: brandColor }}
                className="w-full mt-2 py-3 px-4 rounded-lg text-white font-semibold text-sm transition shadow-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to {activeTab === "CLIENT" ? "Portfolio" : "Console"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Helper Links */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
              {activeTab === "CLIENT" ? (
                <p>
                  First time accessing your portfolio?{" "}
                  <span className="text-slate-300 font-medium">
                    Contact {brandName} for onboarding credentials.
                  </span>
                </p>
              ) : (
                <p>
                  Need advisor or agency onboarding?{" "}
                  <Link href="/#demo" className="text-sky-400 hover:underline">
                    Contact platform administrator
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Regulatory Disclaimer & Firm Footer */}
      <footer className="border-t border-slate-900 py-6 px-6 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-4xl mx-auto text-center space-y-2">
          {tenant?.disclaimer_text ? (
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-2xl mx-auto">
              {tenant.disclaimer_text}
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-2xl mx-auto">
              Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully before investing. Past performance is not an indicator of future returns.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500 pt-2">
            <span>&copy; {new Date().getFullYear()} {brandName}. All rights reserved.</span>
            {tenant?.arn_number && (
              <span>&bull; AMFI Registration: ARN-{tenant.arn_number}</span>
            )}
            {tenant?.ria_number && (
              <span>&bull; SEBI RIA: {tenant.ria_number}</span>
            )}
            <span>&bull; 256-bit SSL Session Encryption</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
