import React, { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  TrendingUp,
  PieChart,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  CalendarCheck,
  CheckCircle2,
  FileSpreadsheet,
  Building2,
  Lock,
  ExternalLink,
} from "lucide-react";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TenantPageProps {
  params: Promise<{ subdomain: string }>;
}

async function TenantPageContent({ params }: TenantPageProps) {
  const { subdomain } = await params;
  const cleanSubdomain = (subdomain || "").toLowerCase().trim();

  // Query tenant details
  const { data: tenant, error } = await supabaseAdmin
    .from("tenants")
    .select("id, subdomain, firm_brand_name, firm_legal_name, logo_url, primary_color, secondary_color, theme_mode, disclaimer_text, arn_number, ria_number, is_active")
    .eq("subdomain", cleanSubdomain)
    .maybeSingle();

  if (error || !tenant || tenant.is_active === false) {
    notFound();
  }

  const primaryColor = tenant.primary_color || "#0284c7";
  const brandName = tenant.firm_brand_name || "Wealth Advisory";
  const isDark = tenant.theme_mode === "dark";

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      {/* Hero Welcome Banner */}
      <section className="text-center max-w-3xl mx-auto space-y-5">
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border shadow-sm"
          style={{
            color: primaryColor,
            borderColor: `${primaryColor}40`,
            backgroundColor: `${primaryColor}15`,
          }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>
            {brandName} Private Client Portal • {isDark ? "Dark Mode" : "Light Mode"} Active
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
          Next-Generation Wealth Advisory with{" "}
          <span style={{ color: primaryColor }}>{brandName}</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          Integrated multi-asset consolidation, institutional portfolio analytics, and automated mutual fund execution tailored for Indian high-net-worth families and retail investors.
        </p>

        {/* Dynamic CTA Buttons with tenant.primary_color */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href={`/login?tenant=${tenant.subdomain}`}
            style={{ backgroundColor: primaryColor }}
            className="px-6 py-3 rounded-xl font-bold text-sm text-white shadow-lg hover:brightness-110 active:scale-95 transition flex items-center gap-2"
          >
            <span>Access Client Portal</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/#book-demo"
            className="px-6 py-3 rounded-xl font-bold text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2"
          >
            <CalendarCheck className="h-4 w-4 text-slate-500" />
            <span>Book Consultation Call</span>
          </Link>
        </div>
      </section>

      {/* Feature Pillar Cards with Adaptive Light/Dark Colors */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition space-y-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            <PieChart className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Consolidated 360° Portfolio
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Direct integration with CAMS &amp; KFintech CAS statements, tracking domestic equity, debt, gold, real estate, and liabilities in a single ledger.
          </p>
          <div className="pt-2">
            <span 
              className="text-xs font-semibold inline-flex items-center gap-1 hover:underline"
              style={{ color: primaryColor }}
            >
              Learn about CAS sync <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition space-y-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            <TrendingUp className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Institutional Asset Allocation
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Dynamic rebalancing alerts and goal-based modeling powered by modern portfolio theory and algorithmic glidepaths.
          </p>
          <div className="pt-2">
            <span 
              className="text-xs font-semibold inline-flex items-center gap-1 hover:underline"
              style={{ color: primaryColor }}
            >
              Explore asset allocation <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition space-y-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            SEBI Regulatory Compliance
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Bank-grade 256-bit encryption with full KYC document validation and certified AMFI distributor transparency.
          </p>
          <div className="pt-2">
            <span 
              className="text-xs font-semibold inline-flex items-center gap-1 hover:underline"
              style={{ color: primaryColor }}
            >
              View compliance details <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </section>

      {/* Advisory Portal Fast Access Section */}
      <section className="bg-gradient-to-r from-slate-100 to-white dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" style={{ color: primaryColor }} />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Are you an Advisor or Relationship Manager at {brandName}?
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
            Access your Advisor CRM, client book manager, automated SIP orders via BSE StAR MF, and generate comprehensive PDF wealth reports.
          </p>
        </div>

        <Link
          href={`/login?tenant=${tenant.subdomain}`}
          className="px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 transition flex items-center gap-2 whitespace-nowrap shadow-sm"
        >
          <Lock className="h-3.5 w-3.5" />
          <span>Advisor Console Login</span>
        </Link>
      </section>
    </div>
  );
}

export default function TenantHomePage(props: TenantPageProps) {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center">
          <div className="h-7 w-7 rounded-lg border-2 border-sky-500 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading advisor portal...</p>
        </div>
      }
    >
      <TenantPageContent {...props} />
    </Suspense>
  );
}
