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
  theme_mode?: "light" | "dark" | string | null;
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
  const currentKey = (subdomain || tenant?.subdomain || "").toLowerCase().trim();

  const demoUsers = {
    zenith9186: {
      name: "Zenith Wealth",
      color: "#0284c7",
      client: "kabir@zenith9186.com",
      advisor: "ssharma@zenith9186.com",
      admin: "admin@zenith9186.com",
    },
    aasinvestment: {
      name: "AAS Investment",
      color: "#059669",
      client: "vikram@aasinvestment.com",
      advisor: "mpandey@aasinvestment.com",
      admin: "abachhan@aasinvestment.com",
    },
    apex: {
      name: "Apex Wealth Partners",
      color: "#7c3aed",
      client: "vibhav@example.com",
      advisor: "pallavi@example.com",
      admin: "admin@example.com",
    },
    platform: {
      name: "Platform HQ",
      color: "#f59e0b",
      client: "vibhav@example.com",
      advisor: "pallavi@example.com",
      admin: "superadmin@unifiedwealth.com",
    },
  };

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

  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [renewalUrl, setRenewalUrl] = useState<string>("/renew-account");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSubscriptionExpired(false);

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
        if (data.subscriptionExpired) {
          setSubscriptionExpired(true);
          if (data.renewalUrl) setRenewalUrl(data.renewalUrl);
        }
        throw new Error(data.error || "Authentication failed. Please verify credentials.");
      }

      // Store JWT token and tenant branding locally
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("user_profile", JSON.stringify(data.user));
      if (data.tenant) {
        localStorage.setItem("tenant_branding", JSON.stringify(data.tenant));
      }

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

  const isDark = tenant?.theme_mode === "dark";

  return (
    <div className={`${isDark ? "dark" : ""} min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-sky-500 selection:text-white font-sans transition-colors duration-200`}>
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-900 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group min-w-0">
          {tenant?.logo_url && !logoFailed ? (
            <div className="h-8 sm:h-9 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0">
              <img
                src={tenant.logo_url}
                alt={brandName}
                onError={() => setLogoFailed(true)}
                className="h-6 sm:h-7 max-w-[120px] sm:max-w-[140px] object-contain"
              />
            </div>
          ) : (
            <div 
              style={{ backgroundColor: brandColor }}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md transition group-hover:scale-105 shrink-0"
            >
              {brandName.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight block truncate max-w-[130px] xs:max-w-[190px] sm:max-w-none">
              {brandName}
            </span>
            {tenant?.subdomain && (
              <span className="text-[9px] sm:text-[10px] font-mono text-slate-400 block -mt-0.5 truncate max-w-[130px] xs:max-w-[190px] sm:max-w-none">
                {tenant.subdomain}.unifiedwealth.com
              </span>
            )}
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {tenant?.arn_number && (
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
              ARN-{tenant.arn_number}
            </span>
          )}
          <Link
            href="/"
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition font-medium whitespace-nowrap"
          >
            &larr; <span className="hidden xs:inline">Platform</span> Overview
          </Link>
        </div>
      </header>

      {/* Main Form Centerpiece */}
      <main className="flex-1 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-12">
        <div className="w-full max-w-md">
          
          {/* Tenant Branding Card Header */}
          <div className="text-center mb-6">
            {tenant?.logo_url && !logoFailed ? (
              <div className="inline-flex p-3 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-md mb-3">
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
            
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isCustomTenant ? `${brandName}` : "Sign In to WealthOS"}
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {isCustomTenant 
                ? `Authorized Client & Advisor Access Portal`
                : "Multi-tenant unified wealth management console"}
            </p>
          </div>

          {/* Role Selection Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-1 rounded-xl mb-4 shadow-inner">
            <button
              type="button"
              onClick={() => { setActiveTab("CLIENT"); setErrorMessage(null); }}
              style={activeTab === "CLIENT" ? { backgroundColor: brandColor } : {}}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-xs font-semibold transition ${
                activeTab === "CLIENT"
                  ? "text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <User className="h-3.5 w-3.5 shrink-0" />
              <span>Client</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("ADVISOR"); setErrorMessage(null); }}
              style={activeTab === "ADVISOR" ? { backgroundColor: brandColor } : {}}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-xs font-semibold transition ${
                activeTab === "ADVISOR"
                  ? "text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5 shrink-0" />
              <span>Advisor<span className="hidden xs:inline"> / MFD</span></span>
            </button>
            {!isCustomTenant && (
              <button
                type="button"
                onClick={() => { setActiveTab("ADMIN"); setErrorMessage(null); }}
                style={activeTab === "ADMIN" ? { backgroundColor: brandColor } : {}}
                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-xs font-semibold transition ${
                  activeTab === "ADMIN"
                    ? "text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span>Admin</span>
              </button>
            )}
          </div>

          {/* Quick Demo Autofill Helpers */}
          <div className="mb-4 p-3 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2 text-[11px]">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <span className="text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                1-Click Test Logins:
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Pass: Password123!</span>
            </div>

            {/* If on a specific tenant subdomain, show credentials for that tenant */}
            {currentKey && ["zenith9186", "aasinvestment", "apex"].includes(currentKey) ? (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const t = demoUsers[currentKey as keyof typeof demoUsers];
                    setActiveTab("CLIENT");
                    setEmail(t.client);
                    setPassword("Password123!");
                    setErrorMessage(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/30 transition font-medium text-[10px] flex-1 xs:flex-none text-center"
                >
                  Client Demo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const t = demoUsers[currentKey as keyof typeof demoUsers];
                    setActiveTab("ADVISOR");
                    setEmail(t.advisor);
                    setPassword("Password123!");
                    setErrorMessage(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 transition font-medium text-[10px] flex-1 xs:flex-none text-center"
                >
                  Advisor Demo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const t = demoUsers[currentKey as keyof typeof demoUsers];
                    setActiveTab("ADMIN");
                    setEmail(t.admin);
                    setPassword("Password123!");
                    setErrorMessage(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 transition font-medium text-[10px] flex-1 xs:flex-none text-center"
                >
                  Admin Demo
                </button>
              </div>
            ) : (
              /* Root Platform Login: Allow choosing which tenant practice to test */
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("ADVISOR");
                    setEmail("ssharma@zenith9186.com");
                    setPassword("Password123!");
                    setErrorMessage(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30 transition text-left text-[10px] flex items-center justify-between"
                >
                  <span>🔵 Zenith (Advisor)</span>
                  <span className="font-mono text-[9px] opacity-70">Blue</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("ADVISOR");
                    setEmail("mpandey@aasinvestment.com");
                    setPassword("Password123!");
                    setErrorMessage(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition text-left text-[10px] flex items-center justify-between"
                >
                  <span>🟢 AAS Inv (Advisor)</span>
                  <span className="font-mono text-[9px] opacity-70">Green</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("ADVISOR");
                    setEmail("pallavi@example.com");
                    setPassword("Password123!");
                    setErrorMessage(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 transition text-left text-[10px] flex items-center justify-between"
                >
                  <span>🟣 Apex (Advisor)</span>
                  <span className="font-mono text-[9px] opacity-70">Purple</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("ADMIN");
                    setEmail("superadmin@unifiedwealth.com");
                    setPassword("Password123!");
                    setErrorMessage(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition text-left text-[10px] flex items-center justify-between"
                >
                  <span>🟡 SuperAdmin</span>
                  <span className="font-mono text-[9px] opacity-70">Gold</span>
                </button>
              </div>
            )}
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-8 shadow-xl dark:shadow-2xl backdrop-blur-sm">
            <div className="mb-5 sm:mb-6">
              <span 
                style={{ color: brandColor, borderColor: `${brandColor}40`, backgroundColor: `${brandColor}15` }}
                className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border mb-2"
              >
                {roleMeta[activeTab].badge}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {roleMeta[activeTab].title}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {roleMeta[activeTab].subtitle}
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2 text-xs text-red-400">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
                {subscriptionExpired && (
                  <div className="pt-2 border-t border-red-500/20 flex justify-end">
                    <Link
                      href={renewalUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition shadow"
                    >
                      <span>Renew Subscription Now</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
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
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline transition"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition"
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
                className="w-full mt-2 py-3 px-4 rounded-xl text-white font-semibold text-sm transition shadow-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
              {activeTab === "CLIENT" ? (
                <p>
                  First time accessing your portfolio?{" "}
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Contact {brandName} for onboarding credentials.
                  </span>
                </p>
              ) : (
                <p>
                  Need advisor or agency onboarding?{" "}
                  <Link href="/#demo" className="text-sky-600 dark:text-sky-400 hover:underline">
                    Contact platform administrator
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Regulatory Disclaimer & Firm Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 py-4 sm:py-6 px-4 sm:px-6 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-4xl mx-auto text-center space-y-2">
          {tenant?.disclaimer_text ? (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
              {tenant.disclaimer_text}
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 dark:text-slate-500 leading-relaxed max-w-2xl mx-auto">
              Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully before investing. Past performance is not an indicator of future returns.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-2">
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

