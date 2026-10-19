"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Check,
  Zap,
  ArrowRight,
  Building2,
  Lock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Sparkles,
} from "lucide-react";

function RenewAccountContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTenant = searchParams.get("tenant") || "";

  const [tenantSubdomain, setTenantSubdomain] = useState(initialTenant);
  const [selectedPlan, setSelectedPlan] = useState<string>("growth");
  const [arnNumber, setArnNumber] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "arn_agreement">("upi");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const plans = [
    {
      slug: "growth",
      name: "Growth Practice",
      priceMonthly: 2499,
      priceAnnual: 23990, // ~20% discount
      seats: 3,
      features: [
        "Full White-Labeling & Logo Branding",
        "Up to 3 Sub-Advisor Licenses",
        "BSE StAR MF Trading Engine",
        "CAS Automated Portfolio Sync",
        "Priority Compliance Support",
      ],
      popular: true,
    },
    {
      slug: "arn_partnership",
      name: "Zero-Fee ARN Partnership",
      priceMonthly: 0,
      priceAnnual: 0,
      seats: 3,
      features: [
        "₹0 / Month Software Fee Forever",
        "80% Mutual Fund Trail Commission Payout",
        "Full White-Label Branding & Reports",
        "BSE StAR MF Order Routing Included",
        "Reconciled Monthly Payout Statements",
      ],
      partner: true,
    },
    {
      slug: "enterprise",
      name: "Enterprise Wealth Firm",
      priceMonthly: 5999,
      priceAnnual: 57590,
      seats: 20,
      features: [
        "Custom Hostname (portal.yourfirm.com)",
        "Up to 20 Advisor & Staff Seats",
        "Institutional Order Execution APIs",
        "Dedicated Success Manager",
        "Custom Compliance Rule Engine",
      ],
      popular: false,
    },
  ];

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Simulate payment processing / renewal API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setIsSuccess(true);
      setTimeout(() => {
        router.push(tenantSubdomain ? `/login` : "/");
      }, 3500);
    } catch {
      setErrorMessage("Failed to process renewal. Please try again or contact support.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-slate-950 text-base shadow-md shadow-amber-500/20">
            W
          </div>
          <div>
            <div className="font-bold text-sm text-white tracking-tight">WealthOS</div>
            <div className="text-[10px] text-slate-400">Distributor SaaS Platform</div>
          </div>
        </Link>
        <Link
          href="/login"
          className="text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          Return to Portal Login
        </Link>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-10 w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold uppercase tracking-wider">
            <Zap className="h-3.5 w-3.5" />
            <span>Account Renewal &amp; Plan Selection</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Renew or Upgrade Your Firm Subscription
          </h1>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            Choose your preferred software plan or activate the Zero-Fee ARN Partnership to restore uninterrupted advisor oversight and client portal access.
          </p>
        </div>

        {isSuccess ? (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-emerald-500/40 text-center space-y-4 shadow-2xl">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-bold text-white">Subscription Successfully Renewed!</h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Your advisory firm license has been extended. Advisor dashboards, client logins, and BSE StAR MF trading execution are now fully active.
            </p>
            <div className="pt-2 text-xs text-slate-500 font-mono">
              Redirecting you back to login in a few seconds...
            </div>
          </div>
        ) : (
          <form onSubmit={handleRenew} className="space-y-6">
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Tenant Subdomain Input if not preset */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Firm Subdomain or Brand Identifier *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. zenith9186"
                  value={tenantSubdomain}
                  onChange={(e) => setTenantSubdomain(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs text-slate-500 font-mono">.wealthos.com</span>
              </div>
            </div>

            {/* Plan Tier Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((p) => {
                const isSelected = selectedPlan === p.slug;
                const isPartner = p.partner;

                return (
                  <div
                    key={p.slug}
                    onClick={() => {
                      setSelectedPlan(p.slug);
                      if (p.slug === "arn_partnership") {
                        setPaymentMethod("arn_agreement");
                      } else if (paymentMethod === "arn_agreement") {
                        setPaymentMethod("upi");
                      }
                    }}
                    className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between relative ${
                      isSelected
                        ? isPartner
                          ? "bg-emerald-500/10 border-emerald-500 shadow-xl"
                          : "bg-amber-500/10 border-amber-500 shadow-xl"
                        : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {p.popular && (
                      <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500 text-slate-950">
                        Popular
                      </span>
                    )}
                    {isPartner && (
                      <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500 text-slate-950">
                        Zero Fee
                      </span>
                    )}

                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          {p.name}
                        </div>
                        <div className="text-2xl font-black text-white mt-1">
                          {isPartner
                            ? "₹0 / Month"
                            : billingCycle === "annual"
                            ? `₹${p.priceMonthly}`
                            : `₹${p.priceMonthly}`}
                          <span className="text-xs font-normal text-slate-400"> / month</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {isPartner
                            ? "Distributor revenue-share model"
                            : `${p.seats} Sub-Advisor seats included`}
                        </div>
                      </div>

                      <ul className="text-xs text-slate-300 space-y-2 border-t border-slate-800/80 pt-3">
                        {p.features.map((feat, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <Check className={`h-3.5 w-3.5 flex-shrink-0 ${isPartner ? "text-emerald-400" : "text-amber-400"}`} />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-800/80 text-center">
                      <span
                        className={`text-xs font-bold ${
                          isSelected
                            ? isPartner
                              ? "text-emerald-400"
                              : "text-amber-400"
                            : "text-slate-400"
                        }`}
                      >
                        {isSelected ? "Selected Tier ✓" : "Choose Tier"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ARN Distributor Details if ARN Partnership selected */}
            {selectedPlan === "arn_partnership" ? (
              <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4" />
                  <span>AMFI ARN Revenue Sharing Agreement</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Under the Zero-Fee ARN Partnership, all platform software fees (₹2,499/mo) are 100% waived. You receive 80% of mutual fund trail commissions generated through your transactions, credited monthly via automated direct bank transfer.
                </p>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Your Registered AMFI ARN Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ARN-XXXXXX"
                    value={arnNumber}
                    onChange={(e) => setArnNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            ) : (
              /* Payment Method Selection for Paid Tiers */
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      paymentMethod === "upi"
                        ? "bg-amber-500/10 border-amber-500 text-white"
                        : "bg-slate-950/60 border-slate-800 text-slate-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="upi"
                      checked={paymentMethod === "upi"}
                      onChange={() => setPaymentMethod("upi")}
                      className="accent-amber-500"
                    />
                    <div className="text-xs font-medium">UPI / Instant Auto-Debit (NACH)</div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      paymentMethod === "card"
                        ? "bg-amber-500/10 border-amber-500 text-white"
                        : "bg-slate-950/60 border-slate-800 text-slate-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={paymentMethod === "card"}
                      onChange={() => setPaymentMethod("card")}
                      className="accent-amber-500"
                    />
                    <div className="text-xs font-medium">Corporate Card / Net Banking</div>
                  </label>
                </div>
              </div>
            )}

            {/* Submit Action */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isProcessing}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-xs transition shadow-lg disabled:opacity-50 ${
                  selectedPlan === "arn_partnership"
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                    : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20"
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing License Renewal...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {selectedPlan === "arn_partnership"
                        ? "Activate Zero-Fee ARN Partnership"
                        : "Complete Subscription Renewal"}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 px-6 py-4 text-center text-xs text-slate-600">
        WealthOS Distributor Platform • Automated AMFI &amp; BSE StAR MF Compliance
      </footer>
    </div>
  );
}

export default function RenewAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      }
    >
      <RenewAccountContent />
    </Suspense>
  );
}

