"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  Building2,
  BarChart3,
  UserPlus,
  LogOut,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Activity,
  Layers,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const profileStr = localStorage.getItem("user_profile");

    if (!token || !profileStr) {
      router.push("/login");
      return;
    }

    try {
      const parsed: UserProfile = JSON.parse(profileStr);
      if (parsed.role !== "SUPER_ADMIN") {
        router.push("/dashboard/admin");
        return;
      }
      setUser(parsed);
      setIsAuthorized(true);
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
      label: "Platform Analytics",
      href: "/super-admin",
      icon: BarChart3,
      exact: true,
    },
    {
      label: "Tenants Directory",
      href: "/super-admin/tenants",
      icon: Building2,
      exact: false,
    },
    {
      label: "Onboard New Firm",
      href: "/super-admin/tenants/new",
      icon: UserPlus,
      exact: true,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Top Banner Warning: Super Admin Authority */}
      <div className="bg-gradient-to-r from-rose-950/70 via-purple-950/40 to-slate-950 border-b border-rose-900/30 px-6 py-1.5 flex items-center justify-between text-[11px] text-rose-300">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
          <span className="font-semibold tracking-wide uppercase">Super Administrator Console</span>
          <span className="text-rose-500/50">|</span>
          <span className="text-slate-400">Multi-tenant root access mode active</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admin"
            className="text-slate-400 hover:text-white flex items-center gap-1 transition"
          >
            <span>Firm Admin View</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Main Super Admin Navigation Bar */}
      <header className="border-b border-slate-900 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/super-admin" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center font-black text-white shadow-md shadow-rose-500/20">
              W
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-white tracking-tight">WealthOS</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  ROOT
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Platform Management HQ</div>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 ml-4 border-l border-slate-800 pl-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/super-admin");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
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
          {user ? (
            <>
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300 font-bold text-xs">
                  {user.firstName[0]}
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-white leading-tight">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-[10px] text-slate-400">{user.email}</div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition ml-2"
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

      {/* Main Body */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        <Suspense fallback={<div className="text-slate-500 text-xs py-8">Loading platform console...</div>}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}

