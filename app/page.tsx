"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  PieChart,
  Users,
  Briefcase,
  Layers,
  Phone,
  Mail,
  FileText,
  Sparkles,
  BarChart3,
  Database,
  Lock,
  RefreshCw,
  Award,
  ChevronRight,
  Shield,
  Zap,
  Globe,
  Sliders,
  DollarSign,
  UserCheck,
  Check
} from "lucide-react";
import CurrentYear from "@/components/CurrentYear";

export default function HomePage() {
  // Booking Form State
  const [leadRole, setLeadRole] = useState<"ADVISOR" | "CLIENT">("ADVISOR");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [aumTier, setAumTier] = useState("₹10 Cr - ₹50 Cr");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("11:00");

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setPreferredDate(d.toISOString().split("T")[0]);
  }, []);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] = useState<any>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Interactive Demo Tab preview state
  const [activeDemoTab, setActiveDemoTab] = useState<"360" | "suggestions" | "calendar" | "brokerage">("360");

  const handleBookDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/book-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email,
          phone,
          role: leadRole,
          aumTier,
          date: preferredDate,
          time: preferredTime,
          consultationType:
            leadRole === "CLIENT"
              ? "1-on-1 Discovery & Financial Health Review"
              : "Institutional Wealth Platform Demo",
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to schedule demo.");

      setBookingConfirmation(json.meetingDetails || { title: "Discovery Session Scheduled", date: preferredDate, time: preferredTime });
    } catch (err: any) {
      setBookingError(err.message || "Failed to schedule demo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* 1. Header & Navigation (InvestWell Mint Style) */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md px-4 sm:px-8 lg:px-16 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-600 to-emerald-400 flex items-center justify-center font-bold text-white shadow-md shadow-sky-500/20">
              W
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
                WealthOS <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">MINT</span>
              </span>
            </div>
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-300">
          <a href="#features" className="hover:text-sky-400 transition">Core Modules</a>
          <a href="#crm360" className="hover:text-sky-400 transition">Client 360 & CRM</a>
          <a href="#transactions" className="hover:text-sky-400 transition">Online Transactions</a>
          <a href="#analytics" className="hover:text-sky-400 transition">Brokerage & Payouts</a>
          <a href="#pricing" className="hover:text-sky-400 transition">AUM Pricing</a>
          <a href="#book-demo" className="text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Book Call / Demo
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-bold px-4 py-2 rounded-lg text-slate-200 hover:text-white border border-slate-800 hover:border-slate-700 bg-slate-900/60 transition"
          >
            Portal Login
          </Link>
          <a
            href="#book-demo"
            className="text-xs font-bold px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white transition shadow-md shadow-sky-500/25 flex items-center gap-1.5"
          >
            <span>Book a Demo</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative px-4 sm:px-8 lg:px-16 pt-20 pb-16 max-w-6xl mx-auto text-center">
        {/* Subtle decorative glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 text-xs font-semibold tracking-wide mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>India&apos;s Leading Wealth Management &amp; MFD Platform</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Make Your Financial Advisory <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400">
            Data Driven &bull; Client Centric &bull; High Growth
          </span>
        </h1>

        <p className="mt-5 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          The all-in-one software that wealth managers, MFDs, and clients love. Manage complete household portfolios, automate reconciliation across BSE/NSE/CAMS, schedule strategic client reviews, and scale your AUM seamlessly.
        </p>

        {/* Hero CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <a
            href="#book-demo"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold hover:from-sky-400 hover:to-blue-500 transition shadow-lg shadow-sky-500/25"
          >
            <Calendar className="h-4 w-4" />
            <span>Book a 1-on-1 Demo or Strategy Call</span>
          </a>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-200 text-xs font-bold transition"
          >
            <Briefcase className="h-4 w-4 text-emerald-400" />
            <span>Open Advisor &amp; Client Console</span>
          </Link>
        </div>

        {/* Micro-trust indicators */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-medium text-slate-400">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Zero Integration Friction</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> CAMS &amp; KFintech Automated Folio Sync</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> BSE StAR MF &amp; NSE NMF II Ready</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> SEBI &amp; AMFI Compliant</span>
        </div>
      </section>

      {/* 3. Interactive Platform Preview Box (InvestWell Mint Live Tour Style) */}
      <section className="px-4 sm:px-8 lg:px-16 pb-20 max-w-6xl mx-auto">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-7 shadow-2xl backdrop-blur-xs">
          {/* Mock Window Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800/80 gap-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-500/80" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-xs font-bold text-slate-300">WealthOS Mint Console Live Interactive Showcase</span>
            </div>

            {/* Preview Navigation Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-[11px] font-semibold">
              <button
                onClick={() => setActiveDemoTab("360")}
                className={`px-3 py-1 rounded-md transition ${activeDemoTab === "360" ? "bg-sky-500 text-white shadow-xs" : "text-slate-400 hover:text-white"}`}
              >
                Client 360 &amp; Household
              </button>
              <button
                onClick={() => setActiveDemoTab("suggestions")}
                className={`px-3 py-1 rounded-md transition ${activeDemoTab === "suggestions" ? "bg-sky-500 text-white shadow-xs" : "text-slate-400 hover:text-white"}`}
              >
                Suggestions &amp; Action Plan
              </button>
              <button
                onClick={() => setActiveDemoTab("calendar")}
                className={`px-3 py-1 rounded-md transition ${activeDemoTab === "calendar" ? "bg-sky-500 text-white shadow-xs" : "text-slate-400 hover:text-white"}`}
              >
                Review Calls &amp; Notes
              </button>
              <button
                onClick={() => setActiveDemoTab("brokerage")}
                className={`px-3 py-1 rounded-md transition ${activeDemoTab === "brokerage" ? "bg-sky-500 text-white shadow-xs" : "text-slate-400 hover:text-white"}`}
              >
                Reconciliation
              </button>
            </div>
          </div>

          {/* Tab 1: Client 360 Showcase */}
          {activeDemoTab === "360" && (
            <div className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Consolidated Household Net Worth</span>
                  <div className="text-xl font-bold text-white mt-1">₹3,15,24,886</div>
                  <span className="text-[11px] text-emerald-400 font-semibold mt-1 inline-block">+14.2% Annualized Return</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Family Assets</span>
                  <div className="text-xl font-bold text-sky-400 mt-1">₹4,25,00,000</div>
                  <span className="text-[11px] text-slate-400 mt-1 inline-block">Across Equity, MFs, FDs &amp; Real Estate</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Liabilities</span>
                  <div className="text-xl font-bold text-purple-400 mt-1">₹1,09,75,114</div>
                  <span className="text-[11px] text-slate-400 mt-1 inline-block">Home Loan &amp; Auto EMIs Structured</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">VS</div>
                  <div>
                    <div className="font-semibold text-white">Vibhav Srivastava Household (5 Family Members Linked)</div>
                    <div className="text-[11px] text-slate-400">Retirement &bull; Child Higher Education &bull; Vacation Fund</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">
                  360 PROFILED
                </span>
              </div>
            </div>
          )}

          {/* Tab 2: Suggestions Showcase */}
          {activeDemoTab === "suggestions" && (
            <div className="pt-6 space-y-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    Automated Diagnostic: Monthly Surplus &amp; Goal Rebalancing
                  </span>
                  <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold">SUBMITTED TO CLIENT</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  &quot;Increase monthly SIP by ₹15,000 into multi-cap and flexi-cap schemes to bridge the ₹48L funding gap for Retirement by 2033.&quot;
                </p>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Client Comment: &quot;Reviewed and agreed. Let&apos;s step up the SIP starting next month.&quot;</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Calendar & Notes Showcase */}
          {activeDemoTab === "calendar" && (
            <div className="pt-6 space-y-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">Annual Financial Strategy &amp; Portfolio Review</div>
                    <div className="text-[11px] text-slate-400">Confirmed Call &bull; Video via Google Meet</div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">CONFIRMED</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                  <span className="font-bold text-purple-400">Permanent Call Notes: </span>
                  Client agreed to consolidate 3 old bank folios into primary household account and initiate digital mandate.
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Brokerage Reconciliation Showcase */}
          {activeDemoTab === "brokerage" && (
            <div className="pt-6 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Automated Monthly Commission Received</span>
                  <div className="text-lg font-bold text-emerald-400">₹4,82,350 / mo</div>
                  <span className="text-[11px] text-slate-400">100% matched against CAMS / KFintech statements</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Brokerage Gap / Lost Folios Recovered</span>
                  <div className="text-lg font-bold text-sky-400">₹38,200 Recovered</div>
                  <span className="text-[11px] text-slate-400">Auto-identified missing sub-broker ARN tags</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Key Stats Counter Strip */}
      <section className="border-y border-slate-800/80 bg-slate-900/30 px-4 sm:px-8 lg:px-16 py-12">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white">5,000+</div>
            <div className="mt-1 text-xs sm:text-sm font-semibold text-sky-400">MFDs &amp; Advisory Practices</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Growing their practice across India</p>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white">80 Lakh+</div>
            <div className="mt-1 text-xs sm:text-sm font-semibold text-emerald-400">Managed Portfolios</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Household-consolidated wealth tracking</p>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white">₹6,000+ Cr</div>
            <div className="mt-1 text-xs sm:text-sm font-semibold text-purple-400">Platform AUM</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Assets managed across mutual funds &amp; equity</p>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white">99.8%</div>
            <div className="mt-1 text-xs sm:text-sm font-semibold text-amber-400">Reconciliation Accuracy</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Zero revenue leakage for advisory firms</p>
          </div>
        </div>
      </section>

      {/* 5. Six Core Modules (InvestWell Mint Exact Value Pillars) */}
      <section id="features" className="px-4 sm:px-8 lg:px-16 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Modular Platform Architecture
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Features Designed for Your Practice&apos;s Success
          </h2>
          <p className="mt-3 text-sm text-slate-400 max-w-2xl mx-auto">
            Explore institutional-grade capabilities designed to level up your wealth practice, crafted with insights from thousands of top-performing advisors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pillar 1: CRM & Client 360 */}
          <div id="crm360" className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-sky-500/40 transition group">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">CRM &amp; Household 360</h3>
            <p className="text-xs text-slate-400 mt-1">Engage clients with automated touchpoints and full household net worth visibility.</p>
            <ul className="mt-4 space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>Household Bundling:</b> Group self, spouse, kids into one net worth scorecard</span></li>
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>Meeting Notes:</b> Permanent strategy minutes accessible anytime</span></li>
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>SIP Alerts &amp; Triggers:</b> Timely renewals, milestones, and birthdays</span></li>
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>Risk Profiling:</b> CFP-grade risk questionnaire and asset suitability</span></li>
            </ul>
          </div>

          {/* Pillar 2: Portfolio Review & Diagnostics */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-sky-500/40 transition group">
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <PieChart className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Portfolio Review &amp; Analytics</h3>
            <p className="text-xs text-slate-400 mt-1">Deep institutional analysis across multi-asset folios and goal projections.</p>
            <ul className="mt-4 space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>Valuation Summaries:</b> Daily NAV updates and XIRR performance</span></li>
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>Asset Allocation:</b> Multi-asset distribution across equity, debt &amp; gold</span></li>
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>Capital Gains Tax Reports:</b> Realized &amp; unrealized tax estimates</span></li>
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>Goal Feasibility Engine:</b> Inflation-adjusted corpus gap analysis</span></li>
            </ul>
          </div>

          {/* Pillar 3: Online Transactions */}
          <div id="transactions" className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-sky-500/40 transition group">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Online Transactions &amp; Execution</h3>
            <p className="text-xs text-slate-400 mt-1">Zero-paperwork trade execution connected to major exchange platforms.</p>
            <ul className="mt-4 space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>Exchange Integrated:</b> Transact via BSE StAR MF, NSE NMF II &amp; MFU</span></li>
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>DigiLocker KYC:</b> Instant digital onboarding and CKYC checks</span></li>
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>One-Click Mandates:</b> Auto-debit registration for recurring SIPs</span></li>
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>DFIM (Do It For Me):</b> RMs initiate transactions for client WhatsApp approval</span></li>
            </ul>
          </div>

          {/* Pillar 4: Business Analytics */}
          <div id="analytics" className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-sky-500/40 transition group">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Business &amp; AUM Analytics</h3>
            <p className="text-xs text-slate-400 mt-1">Executive intelligence on practice growth, inflows, and client retention.</p>
            <ul className="mt-4 space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>Granular AUM Reports:</b> Breakdowns by AMC, scheme category &amp; RM</span></li>
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>SIP Mining:</b> Track new, paused, and maturing SIP book sizes</span></li>
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>Broker Change Tracking:</b> In/Out portfolio transfer logs</span></li>
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>Cross-Sell Intelligence:</b> Detect unallocated client funds</span></li>
            </ul>
          </div>

          {/* Pillar 5: Brokerage & Revenue Reconciliation */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-sky-500/40 transition group">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <DollarSign className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Brokerage &amp; Payout Engine</h3>
            <p className="text-xs text-slate-400 mt-1">End-to-end commission management with automated gap reconciliation.</p>
            <ul className="mt-4 space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>Income Analysis:</b> Revenue grouped by fund house, RM &amp; sub-broker</span></li>
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>Sub-Broker Splits:</b> Automatic commission calculations and slips</span></li>
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>Reconciliation Gap Finder:</b> Pinpoints receivable vs. received amounts</span></li>
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>Lost Brokerage Recovery:</b> Alerts on missing folio tags and low rates</span></li>
            </ul>
          </div>

          {/* Pillar 6: Advisory Tools & Calculators */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-sky-500/40 transition group">
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <Sliders className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Advisory Tools &amp; Calculators</h3>
            <p className="text-xs text-slate-400 mt-1">Comprehensive planning toolset to pitch, present, and close prospective HNI clients.</p>
            <ul className="mt-4 space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>Top Schemes Screener:</b> Real-time performance analysis and peer filters</span></li>
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>Portfolio X-Ray:</b> Compare actual portfolio against model allocation</span></li>
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>Calculators Suite:</b> SIP, SWP, STP, Education, and Tax Estimators</span></li>
              <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> <span><b>Branded Fact-Find Forms:</b> Pre-filled KYC &amp; advisory agreements</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* 6. Dedicated Interactive Booking Form ("Book Call or Demo with Client / Advisor") */}
      <section id="book-demo" className="px-4 sm:px-8 lg:px-16 py-20 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-t border-slate-800">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider">
              Direct Advisory &amp; Platform Access
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-3">
              Book a Call or Demo Session
            </h2>
            <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
              Whether you are an advisor evaluating WealthOS Mint or an investor seeking a comprehensive 360 portfolio review, schedule a dedicated session with our senior team.
            </p>
          </div>

          {/* Form Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl relative">
            {bookingConfirmation ? (
              <div className="py-8 text-center space-y-4 animate-in fade-in">
                <div className="h-14 w-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-white">Call Scheduled Successfully!</h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Your strategy &amp; discovery session has been recorded. Our Senior Wealth Advisor will connect with you at your chosen slot.
                </p>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 max-w-md mx-auto text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Meeting Topic:</span>
                    <span className="font-semibold text-white">{bookingConfirmation.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date &amp; Time:</span>
                    <span className="font-semibold text-sky-400">{bookingConfirmation.date} at {bookingConfirmation.time}</span>
                  </div>
                  {bookingConfirmation.meetingLink && (
                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400">Google Meet:</span>
                      <a
                        href={bookingConfirmation.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 font-bold transition flex items-center gap-1"
                      >
                        <Video className="h-3 w-3" />
                        Join Room Link
                      </a>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setBookingConfirmation(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Schedule Another Call
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookDemo} className="space-y-5">
                {/* Role Switcher */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-2">
                    I am scheduling as a:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setLeadRole("ADVISOR")}
                      className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                        leadRole === "ADVISOR"
                          ? "bg-sky-500/15 border-sky-500 text-sky-400"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Briefcase className="h-4 w-4" />
                      <span>Financial Advisor / MFD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeadRole("CLIENT")}
                      className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                        leadRole === "CLIENT"
                          ? "bg-sky-500/15 border-sky-500 text-sky-400"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>Prospective Investor / Client</span>
                    </button>
                  </div>
                </div>

                {/* Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Sharma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Work / Personal Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="rajesh@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Phone & AUM Tier */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Mobile / WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      {leadRole === "ADVISOR" ? "Practice AUM Range" : "Household Portfolio Size"}
                    </label>
                    <select
                      value={aumTier}
                      onChange={(e) => setAumTier(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="Under ₹10 Cr">Under ₹10 Cr</option>
                      <option value="₹10 Cr - ₹50 Cr">₹10 Cr - ₹50 Cr</option>
                      <option value="₹50 Cr - ₹250 Cr">₹50 Cr - ₹250 Cr</option>
                      <option value="₹250+ Cr (Institutional / Family Office)">₹250+ Cr (Family Office / National)</option>
                    </select>
                  </div>
                </div>

                {/* Preferred Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      required
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Preferred Time Slot
                    </label>
                    <select
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="10:00">10:00 AM IST</option>
                      <option value="11:30">11:30 AM IST</option>
                      <option value="14:00">02:00 PM IST</option>
                      <option value="15:30">03:30 PM IST</option>
                      <option value="17:00">05:00 PM IST</option>
                    </select>
                  </div>
                </div>

                {/* Topics & Remarks */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Primary Financial Goal or Discussion Topic
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      leadRole === "ADVISOR"
                        ? "e.g., Interested in automated reconciliation, sub-broker payouts, and white-labeled client app..."
                        : "e.g., Looking to consolidate 30+ mutual fund folios and build a ₹3 Cr retirement corpus..."
                    }
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Error Banner */}
                {bookingError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                    {bookingError}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  <span>{isSubmitting ? "Confirming Slot..." : leadRole === "ADVISOR" ? "Confirm Free Platform Demo" : "Confirm Discovery Call with Advisor"}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 7. Transparent Pricing (InvestWell Mint Exact Model) */}
      <section id="pricing" className="px-4 sm:px-8 lg:px-16 py-16 border-t border-slate-800/80 bg-slate-900/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            All Features, All Modules. Pay Only Based on Your AUM.
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400">
            Transparent annual pricing with zero per-client penalties or module lock-outs.
          </p>

          <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">MINT ADVANTAGE PLAN</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Starting at ₹25,000<span className="text-xs text-slate-400 font-normal"> / year</span></div>
              <p className="text-xs text-slate-400 mt-1">For advisory practices with AUM up to ₹25 Cr. Scales gracefully as your AUM multiplies.</p>
            </div>
            <a
              href="#book-demo"
              className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition shadow-md shadow-sky-500/20 whitespace-nowrap"
            >
              Get Custom Proposal
            </a>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 px-4 sm:px-8 lg:px-16 py-12 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-white text-xs">
                W
              </div>
              <span className="text-sm font-bold text-white">WealthOS Mint</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Unified Wealth Management &amp; Mutual Fund Distribution software platform for MFDs, RIAs, and multi-family offices across India.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold mb-3 text-xs">Platform Modules</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><a href="#crm360" className="hover:text-white transition">Client 360 &amp; Household</a></li>
              <li><a href="#features" className="hover:text-white transition">Future Suggestions Engine</a></li>
              <li><a href="#transactions" className="hover:text-white transition">BSE &amp; NSE Execution</a></li>
              <li><a href="#analytics" className="hover:text-white transition">Brokerage Reconciliation</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-3 text-xs">Advisory Portals</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><Link href="/dashboard/advisor" className="hover:text-white transition">Advisor Console</Link></li>
              <li><Link href="/dashboard/client" className="hover:text-white transition">Client Portal</Link></li>
              <li><Link href="/admin" className="hover:text-white transition">Firm Admin</Link></li>
              <li><Link href="/super-admin" className="hover:text-white transition">Platform Super Admin</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-3 text-xs">Contact &amp; Demos</h4>
            <p className="text-[11px] leading-relaxed mb-3">
              Book a live 1-on-1 walkthrough or portfolio diagnostic with a Certified Financial Planner (CFP).
            </p>
            <a
              href="#book-demo"
              className="inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-bold text-[11px]"
            >
              <Calendar className="h-3 w-3" />
              <span>Schedule 15-Min Discovery &rarr;</span>
            </a>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <div>
            &copy; <CurrentYear /> WealthOS Mint Inc. All rights reserved. SEBI &amp; AMFI compliant wealth architecture.
          </div>
          <div className="flex gap-4">
            <span className="hover:text-slate-300 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-300 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-300 cursor-pointer">Security Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
}