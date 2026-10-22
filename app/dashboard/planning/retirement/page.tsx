"use client";

import Link from "next/link";
import { Sparkles, Calendar, ShieldCheck, ArrowRight, Clock, CheckCircle2, ChevronRight, Target } from "lucide-react";

export default function RetirementPlanningPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/dashboard/advisor" className="hover:text-white transition">Dashboard</Link>
        <ChevronRight className="h-3 w-3" />
        <span>Investment Planning</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-white font-semibold">Retirement Planning</span>
      </div>

      <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-purple-950/20 to-slate-950 border border-purple-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-4 right-4">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
            Coming Soon &bull; Q4 2026
          </span>
        </div>

        <div className="max-w-2xl space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center">
            <Target className="h-6 w-6" />
          </div>

          <h1 className="text-3xl font-black text-white tracking-tight">
            Comprehensive Retirement &amp; Annuity Planning
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            Model pre-retirement accumulation and post-retirement decumulation. Factor in lifestyle inflation, healthcare reserves, dynamic SWP cashflows, and guaranteed annuity payouts with institutional actuarial precision.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-purple-400" />
              <span>Inflation-adjusted replacement income modeling</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-purple-400" />
              <span>Tax-optimized SWP decumulation ladders</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-purple-400" />
              <span>Pension &amp; National Pension Scheme (NPS) tracking</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-purple-400" />
              <span>Longevity risk &amp; emergency medical buffer</span>
            </div>
          </div>

          <div className="pt-4 flex items-center gap-3">
            <Link
              href="/dashboard/portfolio"
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-lg shadow-purple-600/30"
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
