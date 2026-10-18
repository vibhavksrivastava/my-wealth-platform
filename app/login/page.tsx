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
  Loader2 
} from "lucide-react";

type RoleTab = "CLIENT" | "ADVISOR" | "ADMIN";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<RoleTab>("CLIENT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const roleMeta = {
    CLIENT: {
      title: "Client & Investor Portal",
      subtitle: "View your consolidated net worth, portfolio performance, and book advisor appointments.",
      badge: "Investor Access",
      defaultPath: "/dashboard/client",
    },
    ADVISOR: {
      title: "Advisor & MFD Console",
      subtitle: "Manage client portfolios, review meetings, log notes, and oversee trade execution.",
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed. Please verify credentials.");
      }

      // Store JWT token locally or via secure cookie handler
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
      <header className="border-b border-slate-900 bg-slate-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-white shadow-md shadow-sky-500/20">
            W
          </div>
          <span className="font-bold text-lg text-white">WealthOS</span>
        </Link>
        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-white transition font-medium"
        >
          &larr; Back to Platform Overview
        </Link>
      </header>

      {/* Main Form Centerpiece */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          
          {/* Role Selection Tabs */}
          <div className="flex bg-slate-900/90 border border-slate-800 p-1 rounded-xl mb-6 shadow-inner">
            <button
              type="button"
              onClick={() => { setActiveTab("CLIENT"); setErrorMessage(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "CLIENT"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Client
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("ADVISOR"); setErrorMessage(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "ADVISOR"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              Advisor / MFD
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("ADMIN"); setErrorMessage(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "ADMIN"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin
            </button>
          </div>

          {/* Quick Demo Credentials Autofill */}
          <div className="mb-4 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
            <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider pl-1">
              Demo Access:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("ADMIN");
                  setEmail("superadmin@unifiedwealth.com");
                  setPassword("Password123!");
                  setErrorMessage(null);
                }}
                className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition font-medium text-[10px]"
              >
                Super Admin
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
                Firm Admin
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
                Advisor
              </button>
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
                Client
              </button>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
            <div className="mb-6">
              <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-2">
                {roleMeta[activeTab].badge}
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {roleMeta[activeTab].title}
              </h1>
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
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying...</span>
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
                    Contact your relationship manager for onboarding credentials.
                  </span>
                </p>
              ) : (
                <p>
                  Need agency account provisioning?{" "}
                  <Link href="/#demo" className="text-sky-400 hover:underline">
                    Contact platform support
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Basic Footer */}
      <footer className="border-t border-slate-900 py-4 px-6 text-center text-xs text-slate-600">
        &copy; 2026 WealthOS Technologies. Secure multi-tenant session encryption enabled.
      </footer>
    </div>
  );
}