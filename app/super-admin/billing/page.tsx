"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Receipt,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  Calendar,
  Clock,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Shield,
  Zap,
  Users,
  ExternalLink,
  ChevronRight,
  FileText,
  Check,
  X,
  Loader2,
  ArrowUpRight,
} from "lucide-react";
import type { SubscriptionInvoice } from "@/app/api/admin/billing/invoices/route";

interface BillingMetrics {
  mrr: number;
  arr: number;
  totalCollected: number;
  totalInvoicesCount: number;
  pendingCount: number;
  pendingAmount: number;
  activeTenants: number;
  totalTenants: number;
  planDistribution: Record<string, number>;
}

interface TenantBillingInfo {
  id: string;
  subdomain: string;
  firm_brand_name: string;
  firm_legal_name: string | null;
  arn_number: string | null;
  is_active: boolean;
  commission_sharing_active: boolean;
  subscription_expires_at: string | null;
  billing_cycle: string;
  plan: {
    id: string;
    name: string;
    slug: string;
    price_monthly: number;
    max_seats: number;
    features: Record<string, boolean>;
  };
  seatsUsed: number;
  maxSeats: number;
}

export default function SuperAdminBillingPage() {
  const [metrics, setMetrics] = useState<BillingMetrics | null>(null);
  const [tenants, setTenants] = useState<TenantBillingInfo[]>([]);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>("ALL");

  // Modal: Generate New Invoice
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    tenantId: "",
    planSlug: "growth",
    customAmount: "",
    status: "paid",
    dueDate: "",
    description: "",
  });

  // Modal: Change Tenant Plan
  const [editingTenant, setEditingTenant] = useState<TenantBillingInfo | null>(null);
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>("growth");
  const [isChangingPlan, setIsChangingPlan] = useState(false);

  const fetchBillingData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/super-admin/billing", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to load platform billing data.");
      }

      const data = await res.json();
      setMetrics(data.metrics);
      setTenants(data.tenants || []);
      setInvoices(data.invoices || []);
    } catch (err: any) {
      setError(err.message || "Failed to load billing overview.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
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

  const handleDownloadInvoice = (invoiceNumber: string) => {
    const token = localStorage.getItem("auth_token") || "";
    window.open(`/api/admin/billing/invoices/${encodeURIComponent(invoiceNumber)}?token=${encodeURIComponent(token)}`, "_blank");
  };

  const handleUpdateStatus = async (invoiceNumber: string, newStatus: string, tenantId: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/admin/billing/invoices", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          invoiceNumber,
          status: newStatus,
          tenantId,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update status.");
      }

      setInvoices((prev) =>
        prev.map((inv) => (inv.invoice_number === invoiceNumber ? { ...inv, status: newStatus } : inv))
      );
      setSuccessMessage(`Invoice ${invoiceNumber} marked as ${newStatus.toUpperCase()}.`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setError(err.message || "Could not update status.");
    }
  };

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.tenantId) {
      setError("Please select a target tenant.");
      return;
    }
    setIsGenerating(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/admin/billing/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantId: invoiceForm.tenantId,
          planSlug: invoiceForm.planSlug,
          customAmount: invoiceForm.customAmount ? Number(invoiceForm.customAmount) : undefined,
          status: invoiceForm.status,
          dueDate: invoiceForm.dueDate || undefined,
          description: invoiceForm.description || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create invoice.");

      setShowGenerateModal(false);
      setSuccessMessage(`Invoice ${json.invoice.invoice_number} created successfully.`);
      await fetchBillingData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to create invoice.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChangePlan = async () => {
    if (!editingTenant) return;
    setIsChangingPlan(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/admin/billing?tenantId=${encodeURIComponent(editingTenant.id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planSlug: selectedPlanSlug }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update plan.");

      setEditingTenant(null);
      setSuccessMessage(`Practice plan for ${editingTenant.firm_brand_name} updated to ${json.plan.name}.`);
      await fetchBillingData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to update tenant plan.");
    } finally {
      setIsChangingPlan(false);
    }
  };

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.tenant_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.tenant_subdomain || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || inv.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesTenant =
      selectedTenantFilter === "ALL" || inv.tenant_id === selectedTenantFilter;

    return matchesSearch && matchesStatus && matchesTenant;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Platform Billing &amp; Subscriptions</h1>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30">
              Super Admin Console
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Global SaaS revenue oversight, tenant plan licensing, automated 18% GST tax invoicing, and status management.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setInvoiceForm({
                tenantId: tenants[0]?.id || "",
                planSlug: "growth",
                customAmount: "",
                status: "paid",
                dueDate: "",
                description: "",
              });
              setShowGenerateModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md shadow-amber-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>Generate Plan Invoice</span>
          </button>

          <button
            onClick={fetchBillingData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-300">✕</button>
        </div>
      )}

      {/* Top Financial Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: MRR */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Monthly Recurring Revenue</span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-white">{formatCurrency(metrics?.mrr || 0)}</div>
          <div className="text-[11px] text-slate-400 font-mono">
            ARR Run-Rate: <span className="text-emerald-400 font-bold">{formatCurrency(metrics?.arr || 0)}</span>
          </div>
        </div>

        {/* Metric 2: Total Collected */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue Invoiced</span>
            <span className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <CreditCard className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-white">{formatCurrency(metrics?.totalCollected || 0)}</div>
          <div className="text-[11px] text-slate-400">
            {metrics?.totalInvoicesCount || 0} Total B2B Tax Receipts Generated
          </div>
        </div>

        {/* Metric 3: Active Subscriptions */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tenant Plan Distribution</span>
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Building2 className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-white">{metrics?.activeTenants || 0} Active Firms</div>
          <div className="flex flex-wrap gap-1 text-[10px] font-mono text-slate-400">
            <span className="text-amber-300 font-bold">{metrics?.planDistribution?.growth || 0} Growth</span>
            <span>&bull;</span>
            <span className="text-sky-300 font-bold">{metrics?.planDistribution?.enterprise || 0} Enterprise</span>
            <span>&bull;</span>
            <span className="text-emerald-300 font-bold">{metrics?.planDistribution?.arn_partnership || 0} ARN Split</span>
          </div>
        </div>

        {/* Metric 4: Pending Invoices */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Collectibles</span>
            <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-white">{formatCurrency(metrics?.pendingAmount || 0)}</div>
          <div className="text-[11px] text-slate-400">
            {metrics?.pendingCount || 0} Invoices Awaiting Settlement
          </div>
        </div>
      </div>

      {/* Tenant Plan & Licensing Control Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-400" />
              Tenant Plan Licensing &amp; Seat Allocation Control
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Control which plan tier and feature capabilities are unlocked for each tenant.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {tenants.length} Managed Practices
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Firm / Subdomain</th>
                <th className="py-3 px-4">Current Plan</th>
                <th className="py-3 px-4">Monthly Rate</th>
                <th className="py-3 px-4">Advisor Seats</th>
                <th className="py-3 px-4">Renewal Expiry</th>
                <th className="py-3 px-4">White-Labeling</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{t.firm_brand_name}</span>
                      {!t.is_active && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400">
                          Suspended
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">{t.subdomain}.unifiedwealth.com</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      t.plan.slug === "basic"
                        ? "bg-slate-800 text-slate-300 border-slate-700"
                        : t.plan.slug === "arn_partnership"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : t.plan.slug === "enterprise"
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    }`}>
                      {t.plan.name}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-white">
                    {t.commission_sharing_active ? (
                      <span className="text-emerald-400">₹0 (80/20 Split)</span>
                    ) : (
                      formatCurrency(t.plan.price_monthly)
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-mono">
                    <span className={t.seatsUsed >= t.maxSeats ? "text-rose-400 font-bold" : "text-white"}>
                      {t.seatsUsed}
                    </span>
                    <span className="text-slate-500"> / {t.maxSeats} seats</span>
                  </td>

                  <td className="py-3.5 px-4 text-slate-400">
                    {t.subscription_expires_at ? formatDate(t.subscription_expires_at) : "Continuous"}
                  </td>

                  <td className="py-3.5 px-4">
                    {t.plan.features.white_label ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                        <Check className="h-3 w-3" /> Unlocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        ✕ Locked
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => {
                        setEditingTenant(t);
                        setSelectedPlanSlug(t.plan.slug);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition"
                    >
                      <Zap className="h-3 w-3" />
                      <span>Change Plan</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Invoices & Statements Ledger */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Receipt className="h-4 w-4 text-amber-400" />
              Global Invoices &amp; Tax Receipts Ledger
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              All B2B subscription invoices generated based on tenant plan tiers with 18% GST calculation.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search invoice or firm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-48"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={selectedTenantFilter}
              onChange={(e) => setSelectedTenantFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-amber-500 max-w-[150px] truncate"
            >
              <option value="ALL">All Tenants</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.firm_brand_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Tenant / Firm</th>
                <th className="py-3 px-4">Billing Date</th>
                <th className="py-3 px-4">Plan / Description</th>
                <th className="py-3 px-4">Base Fee</th>
                <th className="py-3 px-4">18% GST</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id || inv.invoice_number} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-white">
                    {inv.invoice_number}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white truncate max-w-[140px]">{inv.tenant_name}</div>
                    <div className="text-[10px] font-mono text-slate-500">{inv.tenant_subdomain}</div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-400">
                    {formatDate(inv.billing_date)}
                  </td>

                  <td className="py-3.5 px-4 font-medium text-slate-300 max-w-[180px] truncate">
                    {inv.description}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {formatCurrency(inv.base_amount || (inv.amount ? inv.amount / 1.18 : 0))}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    {formatCurrency(inv.gst_amount || (inv.amount ? inv.amount - (inv.amount / 1.18) : 0))}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-white">
                    {formatCurrency(inv.amount)}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      inv.status === "paid"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : inv.status === "pending"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                    }`}>
                      {inv.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      {inv.status === "pending" && (
                        <button
                          onClick={() => handleUpdateStatus(inv.invoice_number, "paid", inv.tenant_id)}
                          title="Mark Invoice as Paid"
                          className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition"
                        >
                          Mark Paid
                        </button>
                      )}
                      {inv.status === "paid" && (
                        <button
                          onClick={() => handleUpdateStatus(inv.invoice_number, "pending", inv.tenant_id)}
                          title="Mark Invoice as Pending"
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] font-semibold transition"
                        >
                          Set Pending
                        </button>
                      )}
                      <button
                        onClick={() => handleDownloadInvoice(inv.invoice_number)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-semibold transition"
                      >
                        <Download className="h-3 w-3" />
                        <span>GST Receipt</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Generate Plan Invoice */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Generate Plan Subscription Invoice</h3>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Target Tenant Practice *
                </label>
                <select
                  required
                  value={invoiceForm.tenantId}
                  onChange={(e) => {
                    const sel = tenants.find((t) => t.id === e.target.value);
                    setInvoiceForm({
                      ...invoiceForm,
                      tenantId: e.target.value,
                      planSlug: sel?.plan.slug || "growth",
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="" disabled>Select firm...</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firm_brand_name} ({t.subdomain}) - Plan: {t.plan.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Plan Tier
                  </label>
                  <select
                    value={invoiceForm.planSlug}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, planSlug: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="basic">Starter / Solo IFA (₹999)</option>
                    <option value="growth">Growth Practice (₹2,499)</option>
                    <option value="enterprise">Enterprise Wealth (₹5,999)</option>
                    <option value="arn_partnership">Zero-Fee ARN Partner (₹0)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={invoiceForm.status}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="paid">Paid (Auto-Debited)</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Custom Base Amount (₹) - Optional
                </label>
                <input
                  type="number"
                  placeholder="Leave empty to use standard plan price"
                  value={invoiceForm.customAmount}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, customAmount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  18% GST (9% CGST + 9% SGST) will be automatically computed and added to the tax invoice.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Custom Description / Line Item
                </label>
                <input
                  type="text"
                  placeholder="e.g. November 2026 Monthly Subscription"
                  value={invoiceForm.description}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                  <span>Generate GST Invoice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Tenant Plan */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Change Plan Tier &bull; {editingTenant.firm_brand_name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Updating the plan immediately recalibrates unlocked feature capabilities and seat licenses.</p>
              </div>
              <button
                onClick={() => setEditingTenant(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {[
                { slug: "basic", name: "Starter / Solo IFA", price: "₹999 / mo", seats: "1 Seat", whiteLabel: false },
                { slug: "growth", name: "Growth Practice", price: "₹2,499 / mo", seats: "Up to 3 Seats", whiteLabel: true },
                { slug: "enterprise", name: "Enterprise Wealth Firm", price: "₹5,999 / mo", seats: "Up to 20 Seats", whiteLabel: true, customDomain: true },
                { slug: "arn_partnership", name: "Zero-Fee ARN Partnership", price: "₹0 / mo (80/20 Revenue Split)", seats: "Up to 3 Seats", whiteLabel: true },
              ].map((p) => (
                <div
                  key={p.slug}
                  onClick={() => setSelectedPlanSlug(p.slug)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    selectedPlanSlug === p.slug
                      ? "bg-amber-500/15 border-amber-500 text-white shadow-md ring-1 ring-amber-500/40"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{p.name}</span>
                      {editingTenant.plan.slug === p.slug && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {p.price} &bull; {p.seats} &bull; {p.whiteLabel ? "White-Labeling Unlocked" : "Standard Branding"}
                    </div>
                  </div>
                  <div className="h-4 w-4 rounded-full border border-slate-700 flex items-center justify-center">
                    {selectedPlanSlug === p.slug && <div className="h-2 w-2 rounded-full bg-amber-400" />}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingTenant(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isChangingPlan}
                onClick={handleChangePlan}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                {isChangingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>Apply Plan Upgrade</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

