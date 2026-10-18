import Link from 'next/link';
import { 
  ShieldCheck, 
  Layers, 
  Calendar, 
  TrendingUp, 
  FileText, 
  PieChart, 
  Users, 
  CheckCircle2, 
  ArrowRight 
} from 'lucide-react';
import CurrentYear from "@/components/CurrentYear";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 lg:px-16 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-white shadow-lg shadow-sky-500/20">
            W
          </div>
          <span className="text-xl font-bold tracking-tight text-white">WealthOS</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300 font-medium">
          <a href="#features" className="hover:text-sky-400 transition">Capabilities</a>
          <a href="#whitelabel" className="hover:text-sky-400 transition">White-Label</a>
          <a href="#compliance" className="hover:text-sky-400 transition">Compliance</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-semibold px-4 py-2 rounded-lg text-slate-200 hover:text-white transition"
          >
            Sign In
          </Link>
          <Link
            href="#demo"
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-sky-500 text-white hover:bg-sky-400 transition shadow-md shadow-sky-500/20"
          >
            Request Demo
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 lg:px-16 pt-24 pb-20 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-8">
          Enterprise Wealth Management Platform
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
          Unified Platform Infrastructure for <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">MFDs, RIAs & Wealth Managers</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Deliver institutional-grade portfolio tracking, automated net-worth aggregation, CRM appointment management, and customizable white-labeled portals.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-sky-500 text-white font-semibold hover:bg-sky-400 transition shadow-lg shadow-sky-500/25"
          >
            Access Portal <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-300 font-semibold transition"
          >
            Explore Capabilities
          </a>
        </div>
      </section>

      {/* Core Platform Pillars */}
      <section id="features" className="px-6 lg:px-16 py-20 border-t border-slate-900 bg-slate-900/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Purpose-Built for Modern Advisory Practices
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              End-to-end tooling from investor onboarding to portfolio reporting and fee billing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition">
              <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4">
                <PieChart className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Net Worth & Intake Engine</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Automated aggregation across assets (Mutual Funds, Equity, Real Estate, FDs) and liabilities with real-time net-worth updates.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition">
              <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">NAV Engine & Historical Data</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Direct integration with AMFI daily NAV feeds, historical trend analytics, transaction ledgers, and unrealized gain/loss calculations.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition">
              <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Advisory CRM & In-Meeting Notes</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Integrated calendar scheduling, appointment status pipelines, and private in-session rich-text note taking tied directly to client 360 records.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition">
              <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Multi-Tenant White-Labeling</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Dynamic custom subdomains, agency logo insertion, theme palettes, and custom domain mapping per distributor or RIA firm.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition">
              <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Role-Based Client & Advisor Access</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Granular authorization separating Firm Admins, Relationship Managers, back-office staff, and self-service investor portals.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition">
              <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Automated Invoicing & Billing</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Generate AUM-based or flat advisory invoices with automated 18% GST calculation, receipt logs, and client billing lifecycle management.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance & Regulatory Boundary */}
      <section id="compliance" className="px-6 lg:px-16 py-16 border-t border-slate-900">
        <div className="max-w-4xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-8 sm:p-12">
          <div className="flex items-center gap-3 text-sky-400 mb-4">
            <ShieldCheck className="h-6 w-6" />
            <span className="text-xs uppercase tracking-wider font-bold">SEBI & AMFI Regulatory Architecture</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            Architected for Clear Regulatory Separation
          </h3>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            Our multi-tenant engine enforces strict structural boundaries. For <strong>Mutual Fund Distributors (MFDs)</strong>, the platform operates purely on execution and tracking without illegal advisory triggers. For <strong>Registered Investment Advisers (RIAs)</strong>, it unlocks full risk-profiling questionnaires and 5-year fiduciary compliance audit trails.
          </p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-sky-400 flex-shrink-0" />
              <span>Row-Level Security (RLS) data isolation</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-sky-400 flex-shrink-0" />
              <span>Standardized AMFI NAV synchronization</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-sky-400 flex-shrink-0" />
              <span>Immutable investment decision logs</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-sky-400 flex-shrink-0" />
              <span>BSE StAR MF / NSE NMF integration ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-8 px-6 lg:px-16 text-xs text-slate-500 text-center sm:text-left">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <p className="text-slate-400 font-semibold">&copy; <CurrentYear /> WealthOS Technologies. All rights reserved.</p>
            <p className="mt-1">Enterprise B2B SaaS Platform for Financial Intermediaries.</p>
          </div>
          <p className="text-slate-600 text-[11px] max-w-sm text-center sm:text-right">
            Disclaimer: Software infrastructure provider only. Does not provide investment advice or solicit investments directly.
          </p>
        </div>
      </footer>
    </div>
  );
}