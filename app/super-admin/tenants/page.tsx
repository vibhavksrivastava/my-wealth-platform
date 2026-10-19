"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Search,
  Filter,
  UserPlus,
  RefreshCw,
  Globe,
  Shield,
  Users,
  Briefcase,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Power,
  ChevronRight,
  ExternalLink,
  Zap,
  Calendar,
  Edit3,
  Save,
  Clock,
  ShieldCheck,
  Check,
} from "lucide-react";

interface TenantData {
  id: string;
  subdomain: string;
  firm_legal_name: string;
  firm_brand_name: string;
  tenant_type: string;
  arn_number: string | null;
  ria_number: string | null;
  primary_color: string;
  custom_domain: string | null;
  logo_url: string | null;
  is_active: boolean;
  commission_sharing_active?: boolean;
  subscription_expires_at?: string | null;
  plan?: {
    id: string;
    name: string;
    slug: string;
    price_monthly: number;
    max_seats: number;
  } | null;
  created_at: string;
  stats: {
    clientCount: number;
    advisorCount: number;
    adminCount: number;
    totalAUM: number;
    totalNetWorth: number;
  };
  primaryAdmin: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
  } | null;
}

export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Edit Plan & License Modal State
  const [editingTenant, setEditingTenant] = useState<TenantData | null>(null);
  const [editPlanForm, setEditPlanForm] = useState({
    planSlug: "growth",
    arnNumber: "",
    commissionSharingActive: false,
    subscriptionExpiresAt: "",
  });
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const fetchTenants = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/super-admin/tenants", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load tenants list.");
      }

      const json = await res.json();
      setTenants(json.tenants || []);
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
    fetchTenants();
  }, []);

  const handleToggleStatus = async (tenantId: string, currentStatus: boolean) => {
    setUpdatingId(tenantId);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/super-admin/tenants/${tenantId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to toggle tenant status.");
      }

      // Update local state
      setTenants((prev) =>
        prev.map((t) => (t.id === tenantId ? { ...t, is_active: !currentStatus } : t))
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to update status.");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenEditModal = (tenant: TenantData) => {
    setEditingTenant(tenant);
    setSaveSuccessMsg(null);
    setEditPlanForm({
      planSlug: tenant.plan?.slug || (tenant.commission_sharing_active ? "arn_partnership" : "growth"),
      arnNumber: tenant.arn_number || "",
      commissionSharingActive: Boolean(tenant.commission_sharing_active),
      subscriptionExpiresAt: tenant.subscription_expires_at
        ? new Date(tenant.subscription_expires_at).toISOString().slice(0, 10)
        : "",
    });
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setIsSavingPlan(true);
    setSaveSuccessMsg(null);

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/super-admin/tenants/${editingTenant.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editPlanForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update tenant plan.");
      }

      setSaveSuccessMsg(`Plan updated successfully for ${editingTenant.firm_brand_name}!`);
      setTimeout(() => {
        setSaveSuccessMsg(null);
        setEditingTenant(null);
        fetchTenants();
      }, 1200);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to update tenant plan.");
      }
    } finally {
      setIsSavingPlan(false);
    }
  };

  const setExtensionDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setEditPlanForm((prev) => ({
      ...prev,
      subscriptionExpiresAt: d.toISOString().slice(0, 10),
    }));
  };

  const formatINR = (amount: number) => {
    if (!amount) return "₹0";
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredTenants = tenants.filter((tenant) => {
    const matchesQuery =
      tenant.firm_brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.firm_legal_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.subdomain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tenant.arn_number && tenant.arn_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tenant.ria_number && tenant.ria_number.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && tenant.is_active) ||
      (statusFilter === "SUSPENDED" && !tenant.is_active);

    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Tenant Organizations Directory</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
              {tenants.length} Total Firms
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage multi-tenant B2B advisory firms, assign software plans, set AMFI ARNs, and manage platform licenses.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchTenants}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/super-admin/tenants/new"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-md shadow-rose-600/20 transition"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Onboard New Firm</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, subdomain, ARN, RIA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
          />
        </div>

        <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1 rounded-md text-[11px] font-semibold transition ${
              statusFilter === "ALL" ? "bg-rose-500/20 text-rose-300" : "text-slate-400 hover:text-white"
            }`}
          >
            All Firms
          </button>
          <button
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-3 py-1 rounded-md text-[11px] font-semibold transition ${
              statusFilter === "ACTIVE" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400 hover:text-white"
            }`}
          >
            Active Only
          </button>
          <button
            onClick={() => setStatusFilter("SUSPENDED")}
            className={`px-3 py-1 rounded-md text-[11px] font-semibold transition ${
              statusFilter === "SUSPENDED" ? "bg-amber-500/20 text-amber-300" : "text-slate-400 hover:text-white"
            }`}
          >
            Suspended
          </button>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400">
                <th className="py-3 px-4 font-semibold">Firm Organization</th>
                <th className="py-3 px-4 font-semibold">Subdomain</th>
                <th className="py-3 px-4 font-semibold">Active Plan &amp; License</th>
                <th className="py-3 px-4 font-semibold">AMFI ARN</th>
                <th className="py-3 px-4 font-semibold">Primary Admin</th>
                <th className="py-3 px-4 font-semibold">Advisors</th>
                <th className="py-3 px-4 font-semibold">AUM</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-rose-400" />
                    <span>Loading multi-tenant directory...</span>
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No matching tenants found.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => {
                  const planName = tenant.plan?.name || (tenant.commission_sharing_active ? "Zero-Fee ARN Partnership" : "Growth Practice");
                  const isPartner = Boolean(tenant.commission_sharing_active);

                  return (
                    <tr key={tenant.id} className="hover:bg-slate-800/20 transition">
                      {/* Organization details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0"
                            style={{ backgroundColor: tenant.primary_color || "#e11d48" }}
                          >
                            {tenant.firm_brand_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{tenant.firm_brand_name}</div>
                            <div className="text-[10px] text-slate-400">{tenant.firm_legal_name}</div>
                          </div>
                        </div>
                      </td>

                      {/* Subdomain */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-slate-200 font-mono text-[11px]">
                          <Globe className="h-3 w-3 text-slate-500" />
                          <span>{tenant.subdomain}.wealthos.com</span>
                        </div>
                        {tenant.custom_domain && (
                          <div className="text-[10px] text-sky-400 font-mono mt-0.5">
                            {tenant.custom_domain}
                          </div>
                        )}
                      </td>

                      {/* Plan & License */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            isPartner
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : tenant.plan?.slug === "enterprise"
                              ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                              : tenant.plan?.slug === "basic"
                              ? "bg-slate-800 text-slate-300 border-slate-700"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {planName}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-500" />
                          <span>
                            {isPartner
                              ? "No Expiry • Partner"
                              : tenant.subscription_expires_at
                              ? `Expires: ${new Date(tenant.subscription_expires_at).toLocaleDateString()}`
                              : "Active"}
                          </span>
                        </div>
                      </td>

                      {/* AMFI ARN */}
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {tenant.arn_number ? (
                          <span className="text-white font-semibold">{tenant.arn_number}</span>
                        ) : (
                          <span className="text-slate-500">&mdash;</span>
                        )}
                      </td>

                      {/* Primary Admin */}
                      <td className="py-3.5 px-4">
                        {tenant.primaryAdmin ? (
                          <div>
                            <div className="font-medium text-slate-200">{tenant.primaryAdmin.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{tenant.primaryAdmin.email}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Unassigned</span>
                        )}
                      </td>

                      {/* Advisors */}
                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        {tenant.stats.advisorCount}
                      </td>

                      {/* AUM */}
                      <td className="py-3.5 px-4 font-bold text-emerald-400">
                        {formatINR(tenant.stats.totalAUM)}
                      </td>

                      {/* Status Toggle Button */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(tenant.id, tenant.is_active)}
                          disabled={updatingId === tenant.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition ${
                            tenant.is_active
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30"
                          }`}
                          title={tenant.is_active ? "Click to suspend firm" : "Click to activate firm"}
                        >
                          <Power className={`h-3 w-3 ${updatingId === tenant.id ? "animate-spin" : ""}`} />
                          <span>{tenant.is_active ? "Active" : "Suspended"}</span>
                        </button>
                      </td>

                      {/* Action: Edit Plan & License */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenEditModal(tenant)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 font-semibold text-[11px] transition shadow-sm"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Edit Plan</span>
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

      {/* Modal: Edit Plan & License */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span>Edit Plan &amp; License: {editingTenant.firm_brand_name}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Subdomain: {editingTenant.subdomain}.wealthos.com
                </p>
              </div>
              <button
                onClick={() => setEditingTenant(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {saveSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSavePlan} className="space-y-4">
              {/* Select Plan */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Software Subscription Tier *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { slug: "basic", name: "Starter / Solo IFA", price: "₹999/mo", seats: "1 Seat" },
                    { slug: "growth", name: "Growth Practice", price: "₹2,499/mo", seats: "3 Seats • White-Label" },
                    { slug: "enterprise", name: "Enterprise Wealth", price: "₹5,999/mo", seats: "20 Seats • Custom Domain" },
                    { slug: "arn_partnership", name: "Zero-Fee ARN Partner", price: "₹0/mo", seats: "80/20 Trail Split" },
                  ].map((p) => {
                    const isSelected = editPlanForm.planSlug === p.slug;
                    return (
                      <div
                        key={p.slug}
                        onClick={() => {
                          setEditPlanForm((prev) => ({
                            ...prev,
                            planSlug: p.slug,
                            commissionSharingActive: p.slug === "arn_partnership" ? true : prev.commissionSharingActive,
                          }));
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition ${
                          isSelected
                            ? "bg-amber-500/10 border-amber-500 text-white"
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="font-bold text-xs text-white">{p.name}</div>
                        <div className="text-[11px] text-amber-400 mt-0.5">{p.price}</div>
                        <div className="text-[10px] text-slate-400">{p.seats}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AMFI ARN Number */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  AMFI ARN Registration Number
                </label>
                <input
                  type="text"
                  placeholder="ARN-XXXXXX"
                  value={editPlanForm.arnNumber}
                  onChange={(e) => setEditPlanForm({ ...editPlanForm, arnNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Commission Sharing Active Toggle */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Zero-Fee Commission Sharing Active</div>
                  <div className="text-[11px] text-slate-400">
                    Bypasses monthly SaaS fees in exchange for 80/20 trail commission split.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={editPlanForm.commissionSharingActive}
                  onChange={(e) =>
                    setEditPlanForm({ ...editPlanForm, commissionSharingActive: e.target.checked })
                  }
                  className="h-4 w-4 accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Subscription Expiry Date */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Subscription License Expiry Date
                  </label>
                  <div className="flex gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setExtensionDays(30)}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                    >
                      +30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setExtensionDays(365)}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                    >
                      +1 Year
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  value={editPlanForm.subscriptionExpiresAt}
                  onChange={(e) =>
                    setEditPlanForm({ ...editPlanForm, subscriptionExpiresAt: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlan}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition disabled:opacity-50 shadow"
                >
                  {isSavingPlan ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving Plan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Update Tenant Plan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
