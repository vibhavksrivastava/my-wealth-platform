"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  LogOut, 
  User, 
  Briefcase, 
  ShieldCheck 
} from "lucide-react";
import { TenantConfigProvider } from "@/lib/tenant-config";

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
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${currentRole.color}`}>
                    <RoleIcon className="h-3.5 w-3.5" />
                    {currentRole.label}
                  </span>
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

        {/* Main Content: Always rendered so Next.js static shell and instant validation pass */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <Suspense fallback={<div className="text-slate-500 text-xs py-8">Loading workspace view...</div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </TenantConfigProvider>
  );
}
