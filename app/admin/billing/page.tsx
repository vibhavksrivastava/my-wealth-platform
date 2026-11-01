"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  Calendar,
  Clock,
  Download,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Shield,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  FileText,
  DollarSign,
  Zap,
  Users,
  Check,
  Building2,
} from "lucide-react";

interface BillingData {
  plan: {
    id: string;
    name: string;
    slug: string;
    price_monthly: number;
    max_seats: number;
    features: {
      white_label: boolean;
      custom_domain: boolean;
      advanced_reports: boolean;
      bse_star_mf: boolean;
      cas_import: boolean;
      client_portal: boolean;
      suggestions_engine: boolean;
      commission_sharing?: boolean;
      zero_subscription_fee?: boolean;
    };
  };
  tenant: {
    id: string;
    subdomain: string;
    firm_brand_name: string;
    arn_number?: string | null;
    commission_sharing_active: boolean;
    subscription_expires_at?: string | null;
  };
  seatCapacity: {
    canAddSeat: boolean;
    currentSeats: number;
    maxSeats: number;
    planName: string;
    planSlug: string;
  };
  invoices: Array<{
    id: string;
    invoice_number: string;
    billing_date: string;
    due_date: string;
    amount: number;
    currency: string;
    status: string;
    invoice_type: string;
    description: string;
    metadata?: Record<string, unknown>;
  }>;
  payoutRecords: Array<{
    id: string;
    statement_period: string;
    gross_aum: number;
    gross_commission: number;
    partner_share_pct: number;
    partner_share_amount: number;
    platform_share_amount: number;
    payout_status: string;
    payout_date: string;
    utr_reference: string;
  }>;
  lifecycle: {
    subscriptionExpiresAt: string | null;
    daysUntilExpiry: number | null;
    isExpiringSoon: boolean;
    isExpired: boolean;
    commissionSharingActive: boolean;
  };
}

export default function TenantAdminBillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlanUpgrade, setSelectedPlanUpgrade] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);

  const fetchBillingInfo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/admin/billing", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to load billing and subscription information.");
      }

      const json = await res.json();
      setData(json);
      if (json.plan?.slug) {
        setSelectedPlanUpgrade(json.plan.slug);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  const handleConfirmPlanUpgrade = async () => {
    if (!selectedPlanUpgrade) return;
    setIsUpgrading(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/admin/billing", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planSlug: selectedPlanUpgrade }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update subscription plan.");

      setUpgradeSuccess(`Practice plan successfully updated to ${json.plan.name}! Your feature capabilities and invoices have been recalibrated.`);
      setShowUpgradeModal(false);
      await fetchBillingInfo();
      setTimeout(() => setUpgradeSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to update plan.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleGenerateCycleInvoice = async () => {
    setIsGeneratingInvoice(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/admin/billing/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "paid" }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate invoice.");

      setUpgradeSuccess(`New plan tax invoice ${json.invoice.invoice_number} generated successfully.`);
      await fetchBillingInfo();
      setTimeout(() => setUpgradeSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to generate invoice.");
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    const token = localStorage.getItem("auth_token") || "";
    window.open(`/api/admin/billing/invoices/${encodeURIComponent(invoiceId)}?token=${encodeURIComponent(token)}`, "_blank");
  };

  const isArnPartner = Boolean(data?.tenant?.commission_sharing_active);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {isArnPartner ? "Commission Statements & Payout Receipts" : "Subscription Billing & Invoices"}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                isArnPartner
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-sky-500/10 text-sky-400 border-sky-500/30"
              }`}
            >
              {isArnPartner ? "Zero-Fee ARN Partner" : "Active SaaS Subscription"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isArnPartner
              ? "Track your monthly mutual fund trail revenue splits, gross AUM, and settlement UTR references."
              : "Manage your firm's SaaS platform subscription tier, team seat limits, and download tax receipts."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isArnPartner && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md shadow-amber-500/20"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Change Plan / Seats</span>
            </button>
          )}

          <button
            onClick={fetchBillingInfo}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {upgradeSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{upgradeSuccess}</span>
        </div>
      )}

      {/* Renewal Expiry Warning Banner (if within 15 days) */}
      {data?.lifecycle?.isExpiringSoon && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-slate-950 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                Subscription Renewal Notice: {data.lifecycle.daysUntilExpiry} Days Remaining
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Your subscription expires on{" "}
                <strong className="text-white">
                  {data.lifecycle.subscriptionExpiresAt ? formatDate(data.lifecycle.subscriptionExpiresAt) : "Soon"}
                </strong>
                . Renew early to prevent any interruption in advisor portal access or client reports.
              </div>
            </div>
          </div>
          <Link
            href="/renew-account"
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shadow"
          >
            <span>Renew Subscription Now</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Key Plan & Account Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Active Tier */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Plan</span>
            <span className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <Shield className="h-4 w-4" />
            </span>
          </div>
          <div>
            <div className="text-xl font-black text-white">{data?.plan?.name || "Growth Practice"}</div>
            <div className="text-xs text-slate-400 mt-0.5 font-mono">
              {isArnPartner ? "₹0 / Month • 80/20 Split" : `${formatCurrency(data?.plan?.price_monthly || 2499)} / Month`}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">BSE StAR MF Engine:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Check className="h-3 w-3" /> Universal Active
            </span>
          </div>
        </div>

        {/* Card 2: Team Seats */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sub-Advisor Seats</span>
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div>
            <div className="text-xl font-black text-white">
              {data?.seatCapacity?.currentSeats || 1} / {data?.seatCapacity?.maxSeats || 3}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Active advisor licenses utilized
            </div>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                (data?.seatCapacity?.currentSeats || 1) >= (data?.seatCapacity?.maxSeats || 3)
                  ? "bg-rose-500"
                  : "bg-amber-400"
              }`}
              style={{
                width: `${Math.min(
                  100,
                  (((data?.seatCapacity?.currentSeats || 1) / (data?.seatCapacity?.maxSeats || 3)) * 100)
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Card 3: Next Renewal / Payout Cycle */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isArnPartner ? "Next Commission Settlement" : "Renewal Due Date"}
            </span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Calendar className="h-4 w-4" />
            </span>
          </div>
          <div>
            <div className="text-xl font-black text-white">
              {isArnPartner
                ? "10th of Every Month"
                : data?.lifecycle?.subscriptionExpiresAt
                ? formatDate(data.lifecycle.subscriptionExpiresAt)
                : "Continuous"}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {isArnPartner ? "Automated NEFT direct payout" : "Auto-renews via primary payment mode"}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Payment Status:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Active &amp; Up to Date
            </span>
          </div>
        </div>
      </div>

      {/* Plan Feature Capabilities & Entitlement Matrix */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-sky-400" />
              Feature Capabilities Included in Your Plan
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Capabilities activated for your firm based on the <strong className="text-white">{data?.plan?.name || "Active"} Plan Tier</strong>.
            </p>
          </div>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="self-start sm:self-auto text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
          >
            <span>Compare all plan capabilities</span>
            <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
          {/* Feature 1: Sub-Advisor Seats */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
              <Users className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-white">Sub-Advisor Team Seats</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {data?.seatCapacity?.maxSeats || 3} Seats
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Multi-user role hierarchy with sub-advisor client segregation and audit logging.
              </p>
            </div>
          </div>

          {/* Feature 2: BSE StAR MF Engine */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
              <Zap className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-white">BSE StAR MF Execution</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Included
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Live automated order routing, SIP registration, mandate approvals &amp; switch execution.
              </p>
            </div>
          </div>

          {/* Feature 3: White-Label Branding */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
            data?.plan?.features?.white_label
              ? "bg-slate-950/60 border-slate-800"
              : "bg-slate-950/30 border-slate-800/50 opacity-75"
          }`}>
            <div className={`p-2 rounded-lg mt-0.5 ${
              data?.plan?.features?.white_label ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"
            }`}>
              <Building2 className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-white">White-Label Firm Branding</span>
                {data?.plan?.features?.white_label ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    Growth Tier
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Your firm&apos;s custom logo, portal colors, firm brand title, and custom client reports.
              </p>
            </div>
          </div>

          {/* Feature 4: Custom Domain */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
            data?.plan?.features?.custom_domain
              ? "bg-slate-950/60 border-slate-800"
              : "bg-slate-950/30 border-slate-800/50 opacity-75"
          }`}>
            <div className={`p-2 rounded-lg mt-0.5 ${
              data?.plan?.features?.custom_domain ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"
            }`}>
              <ExternalLink className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-white">Custom Domain CNAME</span>
                {data?.plan?.features?.custom_domain ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    Enterprise
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Host investor portal on your own domain e.g. <span className="font-mono text-slate-300">invest.yourfirm.com</span>.
              </p>
            </div>
          </div>

          {/* Feature 5: Portfolio Diagnostics & Rebalancing */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
            data?.plan?.features?.advanced_reports
              ? "bg-slate-950/60 border-slate-800"
              : "bg-slate-950/30 border-slate-800/50 opacity-75"
          }`}>
            <div className={`p-2 rounded-lg mt-0.5 ${
              data?.plan?.features?.advanced_reports ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"
            }`}>
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-white">Rebalancing &amp; Diagnostics</span>
                {data?.plan?.features?.advanced_reports ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    Growth Tier
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Multi-asset target rebalancing, fund health scoring, overlap alerts, and capital gains tax analysis.
              </p>
            </div>
          </div>

          {/* Feature 6: CAS Import & Client Portal */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
              <FileText className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-white">Automated CAS Engine</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Included
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                CAMS/KFintech consolidated statement ingestion, transaction reconciliation &amp; XIRR tracking.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payout Records Table (For Zero-Fee ARN Partners) */}
      {isArnPartner && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Commission Revenue Split Ledger
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Monthly trail fees collected from AMCs and credited to your registered distributor account.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
              80% Partner Split Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Gross AUM</th>
                  <th className="py-3 px-4">Gross Commission</th>
                  <th className="py-3 px-4">Distributor Share (80%)</th>
                  <th className="py-3 px-4">UTR Reference</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Statement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {(data?.payoutRecords || []).map((payout) => (
                  <tr key={payout.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-bold text-white">{payout.statement_period}</td>
                    <td className="py-3.5 px-4 font-mono">{formatCurrency(payout.gross_aum)}</td>
                    <td className="py-3.5 px-4 font-mono">{formatCurrency(payout.gross_commission)}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      {formatCurrency(payout.partner_share_amount)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{payout.utr_reference}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {payout.payout_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDownloadInvoice(`CS-${payout.statement_period.replace(/\s+/g, "-")}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold transition"
                      >
                        <Download className="h-3 w-3" />
                        <span>Download</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoices & Statements Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Receipt className="h-4 w-4 text-amber-400" />
              {isArnPartner ? "Generated Payout Statements" : "Subscription Invoices & GST Tax Receipts"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Download GST-compliant tax invoices (HSN/SAC 998314) and historical payment receipts for your firm's bookkeeping.
            </p>
          </div>

          {!isArnPartner && (
            <button
              onClick={handleGenerateCycleInvoice}
              disabled={isGeneratingInvoice}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 hover:text-white text-xs font-bold transition disabled:opacity-50 self-start sm:self-auto"
            >
              {isGeneratingInvoice ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              <span>{isGeneratingInvoice ? "Generating..." : "Generate Cycle Invoice"}</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Billing Date</th>
                <th className="py-3 px-4">Plan / Description</th>
                <th className="py-3 px-4 text-right">Base Fee</th>
                <th className="py-3 px-4 text-right">GST (18%)</th>
                <th className="py-3 px-4 text-right">Total (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Tax Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {(data?.invoices || []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No billing invoices recorded yet. Click &quot;Generate Cycle Invoice&quot; to issue your first tax invoice.
                  </td>
                </tr>
              ) : (
                (data?.invoices || []).map((inv) => {
                  const baseFee = Number(inv.metadata?.base_amount ?? Math.round(inv.amount / 1.18));
                  const gstFee = Number(inv.metadata?.gst_amount ?? (inv.amount - baseFee));
                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">{inv.invoice_number}</td>
                      <td className="py-3.5 px-4 text-slate-400">{formatDate(inv.billing_date)}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-200">
                        {inv.description}
                        {Boolean(inv.metadata?.hsn_sac) && (
                          <span className="ml-2 font-mono text-[10px] text-slate-500">SAC: {String(inv.metadata?.hsn_sac)}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        {formatCurrency(baseFee)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-amber-400/90">
                        {formatCurrency(gstFee)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                        {formatCurrency(inv.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            inv.status === "paid"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDownloadInvoice(inv.invoice_number)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-semibold transition"
                        >
                          <Download className="h-3 w-3" />
                          <span>View Invoice</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Upgrade Comparison Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Select Advisory Firm Plan Tier</h3>
                <p className="text-xs text-slate-400 mt-0.5">Scale your practice with white-labeling, additional seats, priority execution, and automated GST billing.</p>
              </div>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Starter */}
              <div
                onClick={() => setSelectedPlanUpgrade("basic")}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  selectedPlanUpgrade === "basic" || data?.plan?.slug === "basic"
                    ? "bg-slate-800/80 border-sky-500 shadow-md ring-1 ring-sky-500"
                    : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase text-slate-400">Starter / Solo IFA</div>
                  <div className="text-xl font-black text-white">₹999 <span className="text-xs font-normal text-slate-400">/mo</span></div>
                  <ul className="text-xs text-slate-300 space-y-2">
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" /> 1 Advisor Seat</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" /> BSE StAR MF Engine</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" /> CAS Import Engine</li>
                    <li className="flex items-center gap-1.5 text-slate-500">✕ Custom White-Label</li>
                    <li className="flex items-center gap-1.5 text-slate-500">✕ Rebalancing Engine</li>
                  </ul>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                  <span className={`text-[11px] font-bold ${data?.plan?.slug === "basic" ? "text-sky-400" : "text-slate-400"}`}>
                    {data?.plan?.slug === "basic" ? "✓ Current Active Plan" : "Select Starter"}
                  </span>
                </div>
              </div>

              {/* Growth */}
              <div
                onClick={() => setSelectedPlanUpgrade("growth")}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between relative ${
                  selectedPlanUpgrade === "growth" || data?.plan?.slug === "growth"
                    ? "bg-amber-500/10 border-amber-500 shadow-md ring-1 ring-amber-500"
                    : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500 text-slate-950">
                  Most Popular
                </span>
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase text-amber-400">Growth Practice</div>
                  <div className="text-xl font-black text-white">₹2,499 <span className="text-xs font-normal text-slate-400">/mo</span></div>
                  <ul className="text-xs text-slate-300 space-y-2">
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" /> Up to 3 Advisor Seats</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" /> Full White-Label Portal &amp; Logo</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" /> Rebalancing &amp; Diagnostics</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" /> BSE StAR MF Trading</li>
                  </ul>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                  <span className={`text-[11px] font-bold ${data?.plan?.slug === "growth" ? "text-amber-400" : "text-slate-400"}`}>
                    {data?.plan?.slug === "growth" ? "✓ Current Active Plan" : "Select Growth"}
                  </span>
                </div>
              </div>

              {/* Enterprise */}
              <div
                onClick={() => setSelectedPlanUpgrade("enterprise")}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  selectedPlanUpgrade === "enterprise" || data?.plan?.slug === "enterprise"
                    ? "bg-slate-800/80 border-sky-500 shadow-md ring-1 ring-sky-500"
                    : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase text-sky-400">Enterprise Firm</div>
                  <div className="text-xl font-black text-white">₹5,999 <span className="text-xs font-normal text-slate-400">/mo</span></div>
                  <ul className="text-xs text-slate-300 space-y-2">
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-sky-400 flex-shrink-0" /> Up to 20 Advisor Seats</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-sky-400 flex-shrink-0" /> Custom Domain (portal.firm.com)</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-sky-400 flex-shrink-0" /> Rebalancing &amp; Diagnostics</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-sky-400 flex-shrink-0" /> Institutional API Access</li>
                  </ul>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                  <span className={`text-[11px] font-bold ${data?.plan?.slug === "enterprise" ? "text-sky-400" : "text-slate-400"}`}>
                    {data?.plan?.slug === "enterprise" ? "✓ Current Active Plan" : "Select Enterprise"}
                  </span>
                </div>
              </div>

              {/* ARN Partnership */}
              <div
                onClick={() => setSelectedPlanUpgrade("arn_partnership")}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  selectedPlanUpgrade === "arn_partnership" || data?.plan?.slug === "arn_partnership"
                    ? "bg-emerald-500/10 border-emerald-500 shadow-md ring-1 ring-emerald-500"
                    : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase text-emerald-400">Zero-Fee ARN Partner</div>
                  <div className="text-xl font-black text-white">₹0 <span className="text-xs font-normal text-slate-400">/mo (80/20)</span></div>
                  <ul className="text-xs text-slate-300 space-y-2">
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" /> 80% Distributor Trail Split</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" /> 3 Sub-Advisor Seats</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" /> White-Label Portal &amp; Logo</li>
                    <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" /> BSE StAR MF Trading</li>
                  </ul>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                  <span className={`text-[11px] font-bold ${data?.plan?.slug === "arn_partnership" ? "text-emerald-400" : "text-slate-400"}`}>
                    {data?.plan?.slug === "arn_partnership" ? "✓ Current Active Plan" : "Select ARN Split"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowUpgradeModal(false)}
                disabled={isUpgrading}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPlanUpgrade}
                disabled={isUpgrading || !selectedPlanUpgrade || selectedPlanUpgrade === data?.plan?.slug}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow disabled:opacity-50"
              >
                {isUpgrading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>{isUpgrading ? "Updating Plan..." : "Confirm Plan Selection"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

