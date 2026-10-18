"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  UserCheck,
  Settings,
  LogOut,
  ExternalLink,
  Briefcase,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  tenantId?: string;
}

export default function TenantAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firmName, setFirmName] = useState<string>("Firm Administration");
  const [primaryColor, setPrimaryColor] = useState<string>("#0284c7");

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const profileStr = localStorage.getItem("user_profile");

    if (!token || !profileStr) {
      router.push("/login");
      return;
    }

    try {
      const parsed: UserProfile = JSON.parse(profileStr);
      if (!["TENANT_ADMIN", "SUPER_ADMIN"].includes(parsed.role)) {
        router.push("/dashboard/advisor");
        return;
      }
      setUser(parsed);

      // Fetch firm branding for the header
      fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.tenant) {
            setFirmName(data.tenant.firm_brand_name || "Firm Administration");
            if (data.tenant.primary_color) {
              setPrimaryColor(data.tenant.primary_color);
            }
          }
        })
        .catch(() => {});
    } catch {
      router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_profile");
    router.push("/login");
  };

  const navItems = [
    {
      label: "Control Center",
      href: "/admin",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "Team & Advisors",
      href: "/admin/users",
      icon: Users,
      exact: true,
    },
    {
      label: "Clients Oversight",
      href: "/admin/clients",
      icon: UserCheck,
      exact: true,
    },
    {
      label: "Firm Settings",
      href: "/admin/settings",
      icon: Settings,
      exact: true,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-900 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center font-black text-white shadow-md"
              style={{ backgroundColor: primaryColor }}
            >
              {firmName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-white tracking-tight">{firmName}</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  ADMIN
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Firm Administration Console</div>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 ml-4 border-l border-slate-800 pl-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/admin");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user?.role === "SUPER_ADMIN" && (
            <Link
              href="/super-admin"
              className="hidden sm:flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20 mr-1"
            >
              <span>Platform Root</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}

          <Link
            href="/dashboard/advisor"
            className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 hover:text-white bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800 transition"
          >
            <span>Advisor Console</span>
            <ChevronRight className="h-3 w-3" />
          </Link>

          {user ? (
            <>
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-white leading-tight">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">{user.email}</div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition ml-1"
                title="Sign Out"
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

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        <Suspense fallback={<div className="text-slate-500 text-xs py-8">Loading firm dashboard...</div>}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}

