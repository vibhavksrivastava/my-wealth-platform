"use client";

import Link from "next/link";
import { Sparkles, ShieldCheck, ArrowRight, ChevronRight, FileCheck, Layers } from "lucide-react";

export default function EstatePlanningPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/dashboard/advisor" className="hover:text-white transition">Dashboard</Link>
        <ChevronRight className="h-3 w-3" />
        <span>Investment Planning</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-white font-semibold">Estate &amp; Succession Planning</span>
      </div>

      <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-950 border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-4 right-4">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
            Coming Soon &bull; Q4 2026
          </span>
        </div>

        <div className="max-w-2xl space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <FileCheck className="h-6 w-6" />
          </div>

          <h1 className="text-3xl font-black text-white tracking-tight">
            Estate Planning, Wills &amp; Trust Structuring
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            Ensure seamless multi-generational wealth preservation. Map folios, real estate deeds, and insurance policies to verified nominees, digital wills, and private family trusts with compliance verification.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span>Centralized asset nominee audit &amp; gap identification</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span>Digital Will drafting and legal custodian repository</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span>Private Family Trust asset allocation mapping</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span>Cross-border succession &amp; NRI asset directives</span>
            </div>
          </div>

          <div className="pt-4 flex items-center gap-3">
            <Link
              href="/dashboard/portfolio"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-600/30"
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

