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
  Compass, 
  Receipt, 
  Calendar,
  Menu,
  X
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
      <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 whitespace-nowrap">
        <Briefcase className="h-3 sm:h-3.5 w-3 sm:w-3.5 shrink-0" />
        <span>{isRia ? "RIA Advisor" : isMfd ? "MFD" : "Advisor"}</span>
      </span>
    );
  }
  const currentRole = roleLabels[role] || roleLabels.CLIENT;
  const RoleIcon = currentRole.icon;
  return (
    <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-semibold border ${currentRole.color} whitespace-nowrap`}>
      <RoleIcon className="h-3 sm:h-3.5 w-3 sm:w-3.5 shrink-0" />
      <span>{currentRole.label.split("/")[0].trim()}</span>
    </span>
  );
}

function getNavItems(userRole?: string) {
  return [
    {
      name: "Dashboard",
      href: userRole === "CLIENT" ? "/dashboard/client" : "/dashboard/advisor",
      icon: LayoutDashboard,
      isActive: (p: string) => p === "/dashboard/advisor" || p === "/dashboard/client",
      badge: null,
    },
    {
      name: "Mutual Fund Portfolio",
      href: "/dashboard/portfolio",
      icon: TrendingUp,
      isActive: (p: string) => p.startsWith("/dashboard/portfolio"),
      badge: { label: "NEW", color: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
    },
    {
      name: "Investment Planning",
      href: "/dashboard/planning",
      icon: Compass,
      isActive: (p: string) =>
        p === "/dashboard/planning" ||
        (p.startsWith("/dashboard/planning") &&
          !p.startsWith("/dashboard/planning/tax") &&
          !p.startsWith("/dashboard/planning/retirement") &&
          !p.startsWith("/dashboard/planning/estate")),
      badge: null,
    },
    {
      name: "Tax Planning",
      href: "/dashboard/planning/tax",
      icon: Receipt,
      isActive: (p: string) => p.startsWith("/dashboard/planning/tax"),
      badge: { label: "Soon", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    },
    {
      name: "Retirement Planning",
      href: "/dashboard/planning/retirement",
      icon: Target,
      isActive: (p: string) => p.startsWith("/dashboard/planning/retirement"),
      badge: { label: "Soon", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    },
    {
      name: "Estate Planning",
      href: "/dashboard/planning/estate",
      icon: FileCheck,
      isActive: (p: string) => p.startsWith("/dashboard/planning/estate"),
      badge: { label: "Soon", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    },
    {
      name: "Calendar",
      href: "/dashboard/calendar",
      icon: Calendar,
      isActive: (p: string) => p.startsWith("/dashboard/calendar"),
      badge: null,
    },
    {
      name: "Calculators",
      href: "/dashboard/calculators",
      icon: Calculator,
      isActive: (p: string) => p.startsWith("/dashboard/calculators"),
      badge: null,
    },
  ];
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [tenant, setTenant] = useState<{
    firm_brand_name?: string;
    subdomain?: string;
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
    theme_mode?: string;
  } | null>(null);

  // Lock body scroll when mobile menu drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

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
          <header className="border-b border-slate-200 dark:border-slate-900 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-3.5 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              {/* Mobile Drawer Hamburger Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle mobile navigation menu"
                className="md:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition -ml-1 shrink-0"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <Link href="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                {tenant?.logo_url ? (
                  <img 
                    src={tenant.logo_url} 
                    alt={brandName}
                    className="h-7 sm:h-8 max-w-[110px] sm:max-w-[120px] object-contain rounded shrink-0" 
                  />
                ) : (
                  <div 
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center font-bold text-white shadow-md text-xs sm:text-sm shrink-0"
                    style={{ backgroundColor: brandColor }}
                  >
                    {brandName.charAt(0)}
                  </div>
                )}
                <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-white truncate max-w-[130px] xs:max-w-[200px] sm:max-w-none">
                  {brandName}
                </span>
              </Link>
              <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">|</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline truncate max-w-[180px]">
                {tenant?.subdomain ? `${tenant.subdomain}.unifiedwealth.com` : "Platform"}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition shadow-xs"
                    title="Sign Out"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </>
              ) : (
                <div className="h-7 w-24 bg-slate-200 dark:bg-slate-900 rounded-lg animate-pulse" />
              )}
            </div>
          </header>

          {/* Primary App Navigation Sub-Header (Desktop view) */}
          <div className="hidden md:block">
            <Suspense fallback={<div className="h-10 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-900" />}>
              <DashboardNavBar user={user} />
            </Suspense>
          </div>

          {/* Main Content Area */}
          <main className="flex-1 p-3.5 sm:p-6 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
            <Suspense fallback={<div className="text-slate-500 text-xs py-8">Loading workspace view...</div>}>
              {children}
            </Suspense>
          </main>

          {/* Mobile Bottom Navigation Bar (Thumb-friendly 5 tabs) */}
          <Suspense fallback={null}>
            <MobileBottomNav
              user={user}
              onOpenMenu={() => setIsMobileMenuOpen(true)}
            />
          </Suspense>

          {/* Mobile Drawer (Slide-Over Sheet) */}
          <Suspense fallback={null}>
            <MobileDrawer
              user={user}
              isOpen={isMobileMenuOpen}
              onClose={() => setIsMobileMenuOpen(false)}
              onLogout={handleLogout}
              tenant={tenant}
            />
          </Suspense>
        </div>
      </FirmBrandingProvider>
    </TenantConfigProvider>
  );
}

// Child Client Navigation Component isolated with Suspense boundary for Desktop
function DashboardNavBar({ user }: { user: UserProfile | null }) {
  const pathname = usePathname();
  const navItems = getNavItems(user?.role);

  return (
    <nav className="border-b border-slate-200 dark:border-slate-900 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm px-6 py-2 flex items-center justify-between text-xs z-40 sticky top-[57px] overflow-x-auto">
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {navItems.map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
                active
                  ? "bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.name}</span>
              {item.badge && (
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${item.badge.color}`}>
                  {item.badge.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Quick Admin Links */}
      <div className="flex items-center gap-2">
        {user && (user.role === "TENANT_ADMIN" || user.role === "SUPER_ADMIN") && (
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[11px] font-bold transition shadow-xs"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Firm Admin</span>
          </Link>
        )}

        {user && user.role === "SUPER_ADMIN" && (
          <Link
            href="/super-admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[11px] font-bold transition shadow-xs"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Super Admin</span>
          </Link>
        )}
      </div>
    </nav>
  );
}

// Mobile Bottom Navigation Bar (Sticky at bottom for smartphone users)
function MobileBottomNav({
  user,
  onOpenMenu,
}: {
  user: UserProfile | null;
  onOpenMenu: () => void;
}) {
  const pathname = usePathname();
  const dashboardHref = user?.role === "CLIENT" ? "/dashboard/client" : "/dashboard/advisor";
  const isDashboardActive = pathname === "/dashboard/advisor" || pathname === "/dashboard/client";
  const isPortfolioActive = pathname.startsWith("/dashboard/portfolio");
  const isPlanningActive = pathname.startsWith("/dashboard/planning");
  const isCalendarActive = pathname.startsWith("/dashboard/calendar");

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around pb-[max(0.375rem,env(safe-area-inset-bottom,0.375rem))] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <Link
        href={dashboardHref}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition min-w-[56px] ${
          isDashboardActive
            ? "text-sky-600 dark:text-sky-400 font-bold"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
      >
        <div className={`p-1 rounded-lg ${isDashboardActive ? "bg-sky-500/15" : ""}`}>
          <LayoutDashboard className="h-4 w-4" />
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight font-medium">Home</span>
      </Link>

      <Link
        href="/dashboard/portfolio"
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition min-w-[56px] relative ${
          isPortfolioActive
            ? "text-sky-600 dark:text-sky-400 font-bold"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
      >
        <div className={`p-1 rounded-lg ${isPortfolioActive ? "bg-sky-500/15" : ""}`}>
          <TrendingUp className="h-4 w-4" />
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight font-medium">Portfolio</span>
        <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-sky-500" />
      </Link>

      <Link
        href="/dashboard/planning"
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition min-w-[56px] ${
          isPlanningActive
            ? "text-purple-600 dark:text-purple-400 font-bold"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
      >
        <div className={`p-1 rounded-lg ${isPlanningActive ? "bg-purple-500/15" : ""}`}>
          <Compass className="h-4 w-4" />
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight font-medium">Planning</span>
      </Link>

      <Link
        href="/dashboard/calendar"
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition min-w-[56px] ${
          isCalendarActive
            ? "text-sky-600 dark:text-sky-400 font-bold"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
      >
        <div className={`p-1 rounded-lg ${isCalendarActive ? "bg-sky-500/15" : ""}`}>
          <Calendar className="h-4 w-4" />
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight font-medium">Calendar</span>
      </Link>

      <button
        type="button"
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition min-w-[56px]"
      >
        <div className="p-1 rounded-lg">
          <Menu className="h-4 w-4" />
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight font-medium">Menu</span>
      </button>
    </nav>
  );
}

// Mobile Slide-Over Drawer
function MobileDrawer({
  user,
  isOpen,
  onClose,
  onLogout,
  tenant,
}: {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  tenant: any;
}) {
  const pathname = usePathname();
  const brandName = tenant?.firm_brand_name || "Wealth Advisory";
  const brandColor = tenant?.primary_color || "#0284c7";
  const navItems = getNavItems(user?.role);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-80 max-w-[85vw] h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-r border-slate-200 dark:border-slate-800 z-10 animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {tenant?.logo_url ? (
              <img 
                src={tenant.logo_url} 
                alt={brandName}
                className="h-7 max-w-[110px] object-contain rounded" 
              />
            ) : (
              <div 
                className="h-7 w-7 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-xs shrink-0"
                style={{ backgroundColor: brandColor }}
              >
                {brandName.charAt(0)}
              </div>
            )}
            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
              {brandName}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Profile Card */}
        {user && (
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div 
                className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-xs shrink-0"
                style={{ backgroundColor: brandColor }}
              >
                {user.firstName?.charAt(0) || "U"}{user.lastName?.charAt(0) || ""}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {user.email}
                </div>
                <div className="mt-1.5">
                  <DynamicUserRoleBadge role={user.role} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </div>

          {navItems.map((item) => {
            const active = item.isActive(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  active
                    ? "bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 font-bold shadow-xs"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${active ? "text-sky-500" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${item.badge.color}`}>
                    {item.badge.label}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Admin section */}
          {user && (user.role === "TENANT_ADMIN" || user.role === "SUPER_ADMIN") && (
            <div className="pt-3 mt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Administration
              </div>
              <Link
                href="/admin"
                onClick={onClose}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Firm Admin Console</span>
              </Link>
              {user.role === "SUPER_ADMIN" && (
                <Link
                  href="/super-admin"
                  onClick={onClose}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <ShieldAlert className="h-4 w-4" />
                  <span>Super Admin Portal</span>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Footer with Logout */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition shadow-xs"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
