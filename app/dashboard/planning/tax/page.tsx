"use client";

import Link from "next/link";
import { Sparkles, Receipt, ArrowRight, ChevronRight, CheckCircle2, Calculator, Percent } from "lucide-react";

export default function TaxPlanningPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/dashboard/advisor" className="hover:text-white transition">Dashboard</Link>
        <ChevronRight className="h-3 w-3" />
        <span>Investment Planning</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-white font-semibold">Tax Planning &amp; Tax-Loss Harvesting</span>
      </div>

      <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-950 border border-emerald-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-4 right-4">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            Coming Soon &bull; Q4 2026
          </span>
        </div>

        <div className="max-w-2xl space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <Calculator className="h-6 w-6" />
          </div>

          <h1 className="text-3xl font-black text-white tracking-tight">
            Capital Gains Optimization &amp; Tax-Loss Harvesting
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            Maximize post-tax portfolio alpha. Algorithmic tax-loss harvesting for equity and debt funds, ₹1.25L annual LTCG exemption utilization, and Section 80C/80D advisory comparisons for old vs new tax regimes.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Year-end LTCG harvesting (₹1,25,000 tax-free window)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Real-time STCG offset via tax-loss harvesting scanner</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Old vs New Regime tax liability simulator</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Automated Capital Gains statement generation for ITR filing</span>
            </div>
          </div>

          <div className="pt-4 flex items-center gap-3">
            <Link
              href="/dashboard/portfolio"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/30"
            >
              Explore Mutual Fund Portfolio &rarr;
            </Link>
            <Link
              href="/dashboard/advisor"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
            >
              Back to Overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
