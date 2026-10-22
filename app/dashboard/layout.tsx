"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LogOut, 
  User, 
  Briefcase, 
  ShieldCheck,
  TrendingUp,
  LayoutDashboard,
  Target,
  ChevronDown,
  Sparkles,
  ShieldAlert,
  FileCheck,
  Calculator,
  Compass
} from "lucide-react";
import { TenantConfigProvider } from "@/lib/tenant-config";
import { FirmBrandingProvider, useFirmBranding } from "@/lib/context/FirmBrandingContext";
import { useFeatureAccess } from "@/lib/useFeatureAccess";

interface UserProfile {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

const roleLabels: Record<string, { label: string; icon: typeof User; color: string }> = {
  CLIENT: { label: "Client / Investor", icon: User, color: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  ADVISOR: { label: "Advisor / MFD", icon: Briefcase, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  STAFF: { label: "Staff", icon: Briefcase, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  TENANT_ADMIN: { label: "Firm Administrator", icon: ShieldCheck, color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  SUPER_ADMIN: { label: "Super Admin", icon: ShieldCheck, color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

function DynamicUserRoleBadge({ role }: { role: string }) {
  const { terms, isRia, isMfd } = useFirmBranding();
  if (role === "ADVISOR" || role === "STAFF") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
        <Briefcase className="h-3.5 w-3.5" />
        {isRia ? "SEBI RIA Advisor" : isMfd ? "MFD Distributor" : "Wealth Advisor"}
      </span>
    );
  }
  const currentRole = roleLabels[role] || roleLabels.CLIENT;
  const RoleIcon = currentRole.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${currentRole.color}`}>
      <RoleIcon className="h-3.5 w-3.5" />
      {currentRole.label}
    </span>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tenant, setTenant] = useState<{
    firm_brand_name?: string;
    subdomain?: string;
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
    theme_mode?: string;
  } | null>(null);

  const syncTenantBranding = () => {
    try {
      const tenantStr = localStorage.getItem("tenant_branding");
      if (tenantStr) {
        const parsed = JSON.parse(tenantStr);
        setTenant(parsed);
        if (parsed.theme_mode === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    } catch {}
  };

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const profileStr = localStorage.getItem("user_profile");

    if (!token || !profileStr) {
      router.push("/login");
      return;
    }

    try {
      const parsed = JSON.parse(profileStr);
      setUser(parsed);
      syncTenantBranding();
    } catch {
      router.push("/login");
    }

    const handleStorageUpdate = () => syncTenantBranding();
    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener("tenant_branding_updated", handleStorageUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener("tenant_branding_updated", handleStorageUpdate);
    };
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_profile");
    localStorage.removeItem("tenant_branding");
    document.documentElement.classList.remove("dark");
    router.push("/login");
  };

  const currentRole = user ? roleLabels[user.role] || roleLabels.CLIENT : roleLabels.CLIENT;
  const RoleIcon = currentRole.icon;
  const brandColor = tenant?.primary_color || "#0284c7";
  const brandName = tenant?.firm_brand_name || "Wealth Advisory";
  const isDark = tenant?.theme_mode === "dark";

  return (
    <TenantConfigProvider>
      <FirmBrandingProvider
        firmType={(tenant as any)?.firm_type || (tenant as any)?.tenant_type}
        userRole={user?.role}
      >
        <div 
          className={`${isDark ? "dark" : ""} min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200`}
          style={{
            ["--tenant-primary" as string]: brandColor,
            ["--tenant-secondary" as string]: tenant?.secondary_color || "#0f172a",
          }}
        >
          {/* Top Header */}
          <header className="border-b border-slate-200 dark:border-slate-900 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2.5">
                {tenant?.logo_url ? (
                  <img 
                    src={tenant.logo_url} 
                    alt={brandName}
                    className="h-8 max-w-[120px] object-contain rounded" 
                  />
                ) : (
                  <div 
                    className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white shadow-md"
                    style={{ backgroundColor: brandColor }}
                  >
                    {brandName.charAt(0)}
                  </div>
                )}
                <span className="font-bold text-lg text-slate-900 dark:text-white">{brandName}</span>
              </Link>
              <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">|</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                {tenant?.subdomain ? `${tenant.subdomain}.unifiedwealth.com` : "Platform"}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <div className="flex items-center gap-2">
                    <DynamicUserRoleBadge role={user.role} />
                    <div className="text-right hidden md:block">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{user.firstName} {user.lastName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{user.email}</div>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition shadow-sm"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </>
              ) : (
                <div className="h-7 w-28 bg-slate-200 dark:bg-slate-900 rounded-lg animate-pulse" />
              )}
            </div>
          </header>

          {/* Primary App Navigation Sub-Header wrapped in Suspense for Next.js Partial Prerendering compliance */}
          <Suspense fallback={<div className="h-10 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-900" />}>
            <DashboardNavBar user={user} />
          </Suspense>

          {/* Main Content: Always rendered so Next.js static shell and instant validation pass */}
          <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
            <Suspense fallback={<div className="text-slate-500 text-xs py-8">Loading workspace view...</div>}>
              {children}
            </Suspense>
          </main>
        </div>
      </FirmBrandingProvider>
    </TenantConfigProvider>
  );
}

// Child Client Navigation Component isolated with Suspense boundary
function DashboardNavBar({ user }: { user: UserProfile | null }) {
  const pathname = usePathname();
  const [planningMenuOpen, setPlanningMenuOpen] = useState(false);

  return (
    <nav className="border-b border-slate-200 dark:border-slate-900 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm px-6 py-2 flex items-center justify-between text-xs z-40 sticky top-[57px]">
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Dashboard Link */}
        <Link
          href={user?.role === "CLIENT" ? "/dashboard/client" : "/dashboard/advisor"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
            pathname === "/dashboard/advisor" || pathname === "/dashboard/client"
              ? "bg-slate-100 dark:bg-slate-800 text-sky-500 dark:text-sky-400 font-bold shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900"
          }`}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </Link>

        {/* Mutual Fund Portfolio Link */}
        <Link
          href="/dashboard/portfolio"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
            pathname.startsWith("/dashboard/portfolio")
              ? "bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 font-bold shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5 text-sky-500" />
          <span>Mutual Fund Portfolio</span>
          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            NEW
          </span>
        </Link>

        {/* Investment Planning Dropdown Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setPlanningMenuOpen(!planningMenuOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              pathname.includes("/planning") || pathname.includes("/clients")
                ? "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 font-bold shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900"
            }`}
          >
            <Target className="h-3.5 w-3.5 text-purple-400" />
            <span>Investment Planning</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${planningMenuOpen ? "rotate-180" : ""}`} />
          </button>

          {planningMenuOpen && (
            <div 
              className="absolute left-0 mt-1.5 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 space-y-1"
              onMouseLeave={() => setPlanningMenuOpen(false)}
            >
              <Link
                href={user?.role === "CLIENT" ? "/dashboard/client" : "/dashboard/advisor"}
                onClick={() => setPlanningMenuOpen(false)}
                className="block p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition"
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5 text-sky-400" />
                  <span>Client 360 &amp; Financial Diagnostics</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Goals, cashflow surplus, and net worth
                </div>
              </Link>

              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 space-y-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1">
                  Upcoming Capabilities
                </span>

                <Link
                  href="/dashboard/planning/retirement"
                  onClick={() => setPlanningMenuOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-purple-400" />
                    <span className="text-xs text-slate-700 dark:text-slate-200">Retirement Planning</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20">
                    Coming Soon
                  </span>
                </Link>

                <Link
                  href="/dashboard/planning/estate"
                  onClick={() => setPlanningMenuOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs text-slate-700 dark:text-slate-200">Estate Planning</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                    Coming Soon
                  </span>
                </Link>

                <Link
                  href="/dashboard/planning/tax"
                  onClick={() => setPlanningMenuOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Calculator className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs text-slate-700 dark:text-slate-200">Tax Planning</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                    Coming Soon
                  </span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Admin Links */}
      <div className="flex items-center gap-2">
        {user && (user.role === "TENANT_ADMIN" || user.role === "SUPER_ADMIN") && (
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[11px] font-bold transition shadow-sm"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Firm Admin</span>
          </Link>
        )}

        {user && user.role === "SUPER_ADMIN" && (
          <Link
            href="/super-admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[11px] font-bold transition shadow-sm"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Super Admin</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
