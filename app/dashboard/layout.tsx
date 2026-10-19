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
    logo_url?: string;
  } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const profileStr = localStorage.getItem("user_profile");
    const tenantStr = localStorage.getItem("tenant_branding");

    if (!token || !profileStr) {
      router.push("/login");
      return;
    }

    try {
      const parsed = JSON.parse(profileStr);
      setUser(parsed);
      if (tenantStr) {
        setTenant(JSON.parse(tenantStr));
      }
    } catch {
      router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_profile");
    localStorage.removeItem("tenant_branding");
    router.push("/login");
  };

  const currentRole = user ? roleLabels[user.role] || roleLabels.CLIENT : roleLabels.CLIENT;
  const RoleIcon = currentRole.icon;
  const brandColor = tenant?.primary_color || "#0284c7";
  const brandName = tenant?.firm_brand_name || "Wealth Advisory";

  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans"
      style={{ ["--tenant-primary" as string]: brandColor }}
    >
      {/* Top Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
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
            <span className="font-bold text-lg text-white">{brandName}</span>
          </Link>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            {tenant?.subdomain ? `${tenant.subdomain}.wealthos.com` : "Platform"}
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
                  <div className="text-xs font-bold text-white">{user.firstName} {user.lastName}</div>
                  <div className="text-[11px] text-slate-400">{user.email}</div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <div className="h-7 w-28 bg-slate-900 rounded-lg animate-pulse" />
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
  );
}
