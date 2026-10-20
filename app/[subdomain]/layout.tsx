import React, { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { 
  ShieldCheck, 
  ArrowRight, 
  LogIn, 
  Sun, 
  Moon, 
  Lock,
  Building2
} from "lucide-react";

// Initialize Supabase admin client for server-side lookups

export interface TenantRecord {
  id: string;
  subdomain: string;
  firm_brand_name: string;
  firm_legal_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  theme_mode: "light" | "dark" | string | null;
  disclaimer_text: string | null;
  arn_number: string | null;
  ria_number: string | null;
  is_active: boolean;
}

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ subdomain: string }>;
}

async function TenantLayoutContent({ children, params }: TenantLayoutProps) {
  const { subdomain } = await params;
  const cleanSubdomain = (subdomain || "").toLowerCase().trim();

  // 1. Fetch tenant record from Supabase based on the subdomain parameter
  const { data: tenant, error } = await supabaseAdmin
    .from("tenants")
    .select("id, subdomain, firm_brand_name, firm_legal_name, logo_url, primary_color, secondary_color, theme_mode, disclaimer_text, arn_number, ria_number, is_active")
    .eq("subdomain", cleanSubdomain)
    .maybeSingle();

  // 3. Error Handling: If the tenant does not exist or is_active is false, trigger Next.js notFound()
  if (error || !tenant || tenant.is_active === false) {
    notFound();
  }

  // 2. Dynamic Theme Check: If theme_mode is 'dark', apply 'dark' CSS class
  const isDark = tenant.theme_mode === "dark";
  const primaryColor = tenant.primary_color || "#0284c7";
  const secondaryColor = tenant.secondary_color || "#0f172a";
  const brandName = tenant.firm_brand_name || "Wealth Advisory";

  return (
    <div
      className={`${isDark ? "dark" : ""} min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200`}
      style={{
        ["--tenant-primary" as string]: primaryColor,
        ["--tenant-secondary" as string]: secondaryColor,
      }}
    >
      {/* Regulatory & License Bar */}
      <div className="bg-slate-100 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 py-1.5 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
              <ShieldCheck className="h-3.5 w-3.5" style={{ color: primaryColor }} />
              <span>Certified Advisory Portal</span>
            </span>
            {tenant.arn_number && (
              <span className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-700 dark:text-slate-300">
                ARN: {tenant.arn_number}
              </span>
            )}
            {tenant.ria_number && (
              <span className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-700 dark:text-slate-300">
                RIA: {tenant.ria_number}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
              {isDark ? (
                <Moon className="h-3 w-3 text-sky-400" />
              ) : (
                <Sun className="h-3 w-3 text-amber-500" />
              )}
              <span className="capitalize">{tenant.theme_mode || "light"} Theme Active</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
            <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
              AMFI Registered Mutual Fund Distributor
            </span>
          </div>
        </div>
      </div>

      {/* Branded Header Banner */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          {/* Custom Logo / Monogram & Brand Name */}
          <Link href={`/${tenant.subdomain}`} className="flex items-center gap-3 group">
            {tenant.logo_url ? (
              <div className="h-9 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                <img
                  src={tenant.logo_url}
                  alt={brandName}
                  className="h-7 max-w-[140px] object-contain"
                />
              </div>
            ) : (
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md transition group-hover:scale-105"
                style={{ backgroundColor: primaryColor }}
              >
                {brandName.charAt(0)}
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                {brandName}
              </span>
              {tenant.firm_legal_name && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {tenant.firm_legal_name}
                </span>
              )}
            </div>
          </Link>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href={`/login?tenant=${tenant.subdomain}`}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-800"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Advisor Login</span>
            </Link>

            {/* Dynamic Button with Tenant Primary Color */}
            <Link
              href={`/login?tenant=${tenant.subdomain}`}
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 text-xs font-bold text-white rounded-lg shadow-md hover:brightness-110 active:scale-95 transition flex items-center gap-1.5"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Client Portal</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {children}
      </main>

      {/* Branded Regulatory Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 py-8 px-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div 
                className="h-2.5 w-2.5 rounded-full" 
                style={{ backgroundColor: primaryColor }}
              />
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {brandName}
              </span>
              <span>• Unified Wealth Advisory Platform</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Mutual fund investments are subject to market risks. Read all scheme related documents carefully.
            </p>
          </div>

          {tenant.disclaimer_text && (
            <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-800 pt-3">
              {tenant.disclaimer_text}
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}

export default function TenantLayout(props: TenantLayoutProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
          <div className="h-8 w-8 rounded-lg border-2 border-sky-500 border-t-transparent animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-medium">Resolving tenant advisory workspace...</p>
        </div>
      }
    >
      <TenantLayoutContent {...props} />
    </Suspense>
  );
}
