"use client";

import { Suspense } from "react";
import Link from "next/link";
import {
  Calculator,
  TrendingUp,
  Target,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Compass,
  Briefcase,
  Layers,
  Loader2
} from "lucide-react";
import FinancialCalculators from "@/components/calculators/FinancialCalculators";
import { useFirmBranding } from "@/lib/context/FirmBrandingContext";

export default function FinancialCalculatorsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading financial calculators suite...</p>
        </div>
      }
    >
      <CalculatorsContent />
    </Suspense>
  );
}

function CalculatorsContent() {
  const { terms } = useFirmBranding();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-sky-950/20 border border-amber-500/20 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider flex items-center gap-1.5">
              <Calculator className="h-3 w-3" />
              Wealth &amp; Advisory Toolkit
            </span>
            <span className="text-xs text-slate-400">
              9 Specialized Financial Calculators
            </span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
            Financial &amp; Wealth Planning Calculators
          </h1>

          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Interactive calculation engines designed for {terms.roleBadge.toLowerCase()} advisors and investors. Model SIP compounding, lumpsum returns, inflation-adjusted retirement roadmaps, child education funding, and loan amortizations in real time.
          </p>
        </div>

        {/* Quick Action Links */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/dashboard/portfolio"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/70 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 text-xs font-bold transition shadow-sm"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Mutual Fund Portfolio</span>
          </Link>
          <Link
            href="/dashboard/advisor"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition shadow-sm"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Calculator Component */}
      <FinancialCalculators />
    </div>
  );
}

