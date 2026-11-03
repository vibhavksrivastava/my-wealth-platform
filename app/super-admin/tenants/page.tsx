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
  Sliders,
  Lock,
  Sparkles,
  Loader2,
  UserCheck,
} from "lucide-react";
import { MASTER_FEATURE_CATALOG, DEFAULT_ROLE_PERMISSIONS, type RolePermissionsMap } from "@/lib/featureFlags";
import { DEFAULT_PLANS } from "@/lib/tenantPlans";

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
  plan_id?: string | null;
  enabled_features?: Record<string, boolean>;
  plan?: {
    id: string;
    name: string;
    slug: string;
    price_monthly: number;
    max_seats: number;
    features?: Record<string, any>;
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

interface PlanOption {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  max_seats: number;
  features?: {
    ai_features?: boolean;
    ai_chat_agents?: boolean;
    risk_planning?: boolean;
    category?: "MFD" | "RIA" | "HYBRID";
    [key: string]: any;
  };
}

export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [availablePlans, setAvailablePlans] = useState<PlanOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Edit Plan & Feature Capabilities Modal State
  const [editingTenant, setEditingTenant] = useState<TenantData | null>(null);
  const [editModalTab, setEditModalTab] = useState<"PLAN" | "FEATURES" | "CLIENT_ROLES">("PLAN");
  const [planFilterCategory, setPlanFilterCategory] = useState<"ALL" | "MFD" | "RIA" | "AI" | "NO_AI">("ALL");

  const [tenantFeatures, setTenantFeatures] = useState<Record<string, boolean>>({});
  const [rolePermissions, setRolePermissions] = useState<RolePermissionsMap>(DEFAULT_ROLE_PERMISSIONS);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false);

  const [editPlanForm, setEditPlanForm] = useState({
    planSlug: "mfd_pro_ai",
    arnNumber: "",
    riaNumber: "",
    commissionSharingActive: false,
    subscriptionExpiresAt: "",
  });

  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const fetchTenantsAndPlans = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const [tenantsRes, plansRes] = await Promise.all([
        fetch("/api/super-admin/tenants", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/super-admin/plans", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!tenantsRes.ok) throw new Error("Failed to load tenants list.");
      const tenantsJson = await tenantsRes.json();
      setTenants(tenantsJson.tenants || []);

      if (plansRes.ok) {
        const plansJson = await plansRes.json();
        if (plansJson.plans && plansJson.plans.length > 0) {
          setAvailablePlans(plansJson.plans);
        } else {
          setAvailablePlans(Object.values(DEFAULT_PLANS));
        }
      } else {
        setAvailablePlans(Object.values(DEFAULT_PLANS));
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
    fetchTenantsAndPlans();
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

  const handleOpenEditModal = async (
    tenant: TenantData,
    initialTab: "PLAN" | "FEATURES" | "CLIENT_ROLES" = "PLAN"
  ) => {
    setEditingTenant(tenant);
    setEditModalTab(initialTab);
    setSaveSuccessMsg(null);
    setPlanFilterCategory("ALL");

    const defaultSlug =
      tenant.plan?.slug ||
      (tenant.commission_sharing_active ? "arn_partnership" : "mfd_pro_ai");

    setEditPlanForm({
      planSlug: defaultSlug,
      arnNumber: tenant.arn_number || "",
      riaNumber: tenant.ria_number || "",
      commissionSharingActive: Boolean(tenant.commission_sharing_active),
      subscriptionExpiresAt: tenant.subscription_expires_at
        ? new Date(tenant.subscription_expires_at).toISOString().slice(0, 10)
        : "",
    });

    // Fetch tenant master features & role permissions
    setIsLoadingFeatures(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/super-admin/tenants/${tenant.id}/features`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setTenantFeatures(json.masterFeatures || {});
        if (json.rolePermissions) {
          setRolePermissions(json.rolePermissions);
        } else {
          setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingFeatures(false);
    }
  };

  // Toggle master feature at practice level
  const handleToggleMasterFeature = (key: string) => {
    setTenantFeatures((prev) => {
      const nextVal = prev[key] === false ? true : false;
      return {
        ...prev,
        [key]: nextVal,
      };
    });
  };

  // Toggle role feature for CLIENT, ADVISOR, or STAFF
  const handleToggleRoleFeature = (role: "CLIENT" | "ADVISOR" | "STAFF", featureKey: string) => {
    if (tenantFeatures[featureKey] === false) return; // Master veto: cannot enable if blocked by Super Admin

    setRolePermissions((prev) => {
      const roleObj = prev[role] || {};
      const currentVal = roleObj[featureKey] !== false;
      return {
        ...prev,
        [role]: {
          ...roleObj,
          [featureKey]: !currentVal,
        },
      };
    });
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setIsSavingPlan(true);
    setSaveSuccessMsg(null);

    try {
      const token = localStorage.getItem("auth_token");

      // 1. Save Plan Assignment & Licensing
      const res1 = await fetch(`/api/super-admin/tenants/${editingTenant.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editPlanForm),
      });

      // 2. Save Master Feature Flags AND Client Role Permissions
      const res2 = await fetch(`/api/super-admin/tenants/${editingTenant.id}/features`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          features: tenantFeatures,
          rolePermissions,
        }),
      });

      const data1 = await res1.json();
      if (!res1.ok) throw new Error(data1.error || "Failed to update tenant plan.");

      const data2 = await res2.json();
      if (!res2.ok) throw new Error(data2.error || "Failed to update tenant features.");

      setSaveSuccessMsg(
        `Plan & Feature capabilities successfully updated for ${editingTenant.firm_brand_name}!`
      );
      setTimeout(() => {
        setSaveSuccessMsg(null);
        setEditingTenant(null);
        fetchTenantsAndPlans();
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

  // Filter plans in modal
  const filteredModalPlans = availablePlans.filter((p) => {
    const cat = p.features?.category || (p.slug.startsWith("ria") ? "RIA" : "MFD");
    const hasAi = Boolean(p.features?.ai_features);

    if (planFilterCategory === "MFD") return cat === "MFD";
    if (planFilterCategory === "RIA") return cat === "RIA";
    if (planFilterCategory === "AI") return hasAi;
    if (planFilterCategory === "NO_AI") return !hasAi;
    return true;
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
            Assign subscription plans, configure MFD vs RIA models with/without AI, and manage feature permissions for firms and clients.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/super-admin/plans"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Manage Plans ({availablePlans.length})</span>
          </Link>

          <button
            onClick={fetchTenantsAndPlans}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Reload</span>
          </button>

          <Link
            href="/super-admin/tenants/new"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition shadow-md shadow-sky-500/20"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Provision New Tenant</span>
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by firm name, subdomain, ARN, RIA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="h-3.5 w-3.5 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Firms</option>
            <option value="SUSPENDED">Suspended Firms</option>
          </select>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Organization &amp; Brand</th>
                <th className="py-3 px-4">Subdomain / Domain</th>
                <th className="py-3 px-4">Assigned Plan &amp; AI</th>
                <th className="py-3 px-4">AMFI ARN / RIA</th>
                <th className="py-3 px-4">Primary Admin</th>
                <th className="py-3 px-4">Seats</th>
                <th className="py-3 px-4">AUM</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-sky-400" />
                    <span>Loading tenant records...</span>
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No tenant organizations matched the query.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => {
                  const planName =
                    tenant.plan?.name ||
                    (tenant.commission_sharing_active ? "Zero-Fee ARN Partnership" : "MFD Growth + AI");
                  const isPartner = Boolean(tenant.commission_sharing_active);
                  const hasAiActive = Boolean(
                    tenant.enabled_features?.ai_features ?? tenant.plan?.features?.ai_features
                  );

                  return (
                    <tr key={tenant.id} className="hover:bg-slate-800/20 transition">
                      {/* Organization details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white shadow-sm shrink-0"
                            style={{ backgroundColor: tenant.primary_color || "#0284c7" }}
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
                          <span>{tenant.subdomain}.unifiedwealth.com</span>
                        </div>
                        {tenant.custom_domain && (
                          <div className="text-[10px] text-sky-400 font-mono mt-0.5">
                            {tenant.custom_domain}
                          </div>
                        )}
                      </td>

                      {/* Plan & License */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              isPartner
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : tenant.plan?.slug?.startsWith("ria")
                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                                : "bg-sky-500/10 text-sky-400 border-sky-500/30"
                            }`}
                          >
                            {planName}
                          </span>
                          {hasAiActive && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 flex items-center gap-0.5">
                              <Sparkles className="h-2.5 w-2.5" /> AI
                            </span>
                          )}
                        </div>
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

                      {/* AMFI ARN / RIA */}
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {tenant.arn_number ? (
                          <div className="text-white font-semibold">{tenant.arn_number}</div>
                        ) : tenant.ria_number ? (
                          <div className="text-indigo-300 font-semibold">{tenant.ria_number}</div>
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

                      {/* Seats */}
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
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition cursor-pointer ${
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

                      {/* Actions: Assign Plan, Master Features & Client Entitlements */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(tenant, "PLAN")}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-[11px] transition shadow-xs cursor-pointer"
                            title="Assign Plan & Licensing"
                          >
                            <Zap className="h-3 w-3" />
                            <span>Assign Plan</span>
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(tenant, "FEATURES")}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 font-semibold text-[11px] transition shadow-xs cursor-pointer"
                            title="Configure Practice Capabilities"
                          >
                            <Sliders className="h-3 w-3" />
                            <span>Practice</span>
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(tenant, "CLIENT_ROLES")}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-semibold text-[11px] transition shadow-xs cursor-pointer"
                            title="Configure Client & Role Entitlements"
                          >
                            <UserCheck className="h-3 w-3" />
                            <span>Clients</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Assign Plan, Practice Capabilities & Client Entitlements */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span>Tenant Control: {editingTenant.firm_brand_name}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Subdomain: {editingTenant.subdomain}.unifiedwealth.com
                </p>
              </div>
              <button
                onClick={() => setEditingTenant(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 3 Sub-Tabs: Plan vs Practice Features vs Client Roles */}
            <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setEditModalTab("PLAN")}
                className={`px-3.5 py-2 text-xs font-bold border-b-2 transition -mb-px flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  editModalTab === "PLAN"
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span>1. Assign Plan &amp; Licensing</span>
              </button>

              <button
                type="button"
                onClick={() => setEditModalTab("FEATURES")}
                className={`px-3.5 py-2 text-xs font-bold border-b-2 transition -mb-px flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  editModalTab === "FEATURES"
                    ? "border-sky-500 text-sky-400"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>
                  2. Tenant Master Features (
                  {MASTER_FEATURE_CATALOG.filter((f) => tenantFeatures[f.key] !== false).length}/
                  {MASTER_FEATURE_CATALOG.length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setEditModalTab("CLIENT_ROLES")}
                className={`px-3.5 py-2 text-xs font-bold border-b-2 transition -mb-px flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  editModalTab === "CLIENT_ROLES"
                    ? "border-purple-500 text-purple-400"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>3. Client &amp; Advisor Entitlements</span>
              </button>
            </div>

            {saveSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSavePlan} className="space-y-4">
              {/* TAB 1: Plan & Licensing */}
              {editModalTab === "PLAN" && (
                <div className="space-y-4">
                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                      Filter Plans:
                    </span>
                    {(
                      [
                        { id: "ALL", label: "All Plans" },
                        { id: "MFD", label: "MFD Practice" },
                        { id: "RIA", label: "RIA Practice" },
                        { id: "AI", label: "✨ With AI" },
                        { id: "NO_AI", label: "Standard (No AI)" },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setPlanFilterCategory(f.id)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                          planFilterCategory === f.id
                            ? "bg-amber-500 text-slate-950 font-bold"
                            : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Plan Grid */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                      Select Subscription Plan to Assign *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                      {filteredModalPlans.map((p) => {
                        const isSelected = editPlanForm.planSlug === p.slug;
                        const cat = p.features?.category || (p.slug.startsWith("ria") ? "RIA" : "MFD");
                        const hasAi = Boolean(p.features?.ai_features);

                        return (
                          <div
                            key={p.id || p.slug}
                            onClick={() => {
                              setEditPlanForm((prev) => ({
                                ...prev,
                                planSlug: p.slug,
                                commissionSharingActive:
                                  p.slug === "arn_partnership" ? true : prev.commissionSharingActive,
                              }));
                            }}
                            className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                              isSelected
                                ? "bg-amber-500/10 border-amber-500 text-white shadow-xs"
                                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-xs text-white truncate">{p.name}</span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-300">
                                  {cat}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-amber-400 mt-1">
                                {p.price_monthly === 0 ? "₹0 (80/20)" : `₹${p.price_monthly}/mo`}
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
                              <span>{p.max_seats} Seats</span>
                              {hasAi ? (
                                <span className="text-purple-400 font-semibold flex items-center gap-0.5">
                                  <Sparkles className="h-2.5 w-2.5" /> AI Suite
                                </span>
                              ) : (
                                <span className="text-slate-500">Standard</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Registrations */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                        SEBI RIA Registration Number
                      </label>
                      <input
                        type="text"
                        placeholder="INA0000XXXXX"
                        value={editPlanForm.riaNumber}
                        onChange={(e) => setEditPlanForm({ ...editPlanForm, riaNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Commission Sharing */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Zero-Fee Commission Sharing Active</div>
                      <div className="text-[11px] text-slate-400">
                        Bypasses monthly SaaS fees in exchange for 80/20 trail brokerage revenue split.
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

                  {/* Expiration */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Subscription License Expiry Date
                      </label>
                      <div className="flex gap-1.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setExtensionDays(30)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                        >
                          +30 Days
                        </button>
                        <button
                          type="button"
                          onClick={() => setExtensionDays(365)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                        >
                          +1 Year
                        </button>
                        <button
                          type="button"
                          onClick={() => setExtensionDays(1095)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                        >
                          +3 Years
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
                </div>
              )}

              {/* TAB 2: Tenant Master Feature Capabilities */}
              {editModalTab === "FEATURES" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs pb-1">
                    <span className="text-slate-400">
                      Master Veto: If a feature is turned off here, it cannot be accessed by any role in this firm.
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allOn: Record<string, boolean> = {};
                          MASTER_FEATURE_CATALOG.forEach((f) => { allOn[f.key] = true; });
                          setTenantFeatures(allOn);
                        }}
                        className="text-[10px] text-amber-400 hover:underline font-semibold cursor-pointer"
                      >
                        Enable All
                      </button>
                      <span className="text-slate-600">&bull;</span>
                      <button
                        type="button"
                        onClick={() => {
                          const standard: Record<string, boolean> = {};
                          MASTER_FEATURE_CATALOG.forEach((f) => {
                            standard[f.key] = !["ai_features", "ai_chat_agents", "billing_invoicing"].includes(f.key);
                          });
                          setTenantFeatures(standard);
                        }}
                        className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
                      >
                        Standard (No AI)
                      </button>
                      <span className="text-slate-600">&bull;</span>
                      <button
                        type="button"
                        onClick={() => {
                          const aiReady: Record<string, boolean> = {};
                          MASTER_FEATURE_CATALOG.forEach((f) => { aiReady[f.key] = true; });
                          setTenantFeatures(aiReady);
                        }}
                        className="text-[10px] text-purple-400 hover:underline font-bold cursor-pointer"
                      >
                        AI Practice
                      </button>
                    </div>
                  </div>

                  {isLoadingFeatures ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-400" />
                      <span>Loading feature configuration...</span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {MASTER_FEATURE_CATALOG.map((f) => {
                        const isEnabled = tenantFeatures[f.key] !== false;

                        return (
                          <div
                            key={f.key}
                            onClick={() => handleToggleMasterFeature(f.key)}
                            className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-start justify-between gap-3 ${
                              isEnabled
                                ? "bg-amber-500/5 border-amber-500/30"
                                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">{f.label}</span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-800 text-slate-300">
                                  {f.category}
                                </span>
                                {f.key.startsWith("ai_") && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                                    AI Agent
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                {f.description}
                              </p>
                            </div>

                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() => {}} // handled by container onClick
                              className="h-4 w-4 accent-amber-500 mt-1 cursor-pointer shrink-0"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Client & Role Entitlements */}
              {editModalTab === "CLIENT_ROLES" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs pb-1">
                    <span className="text-slate-400">
                      Add or remove capabilities for end <strong>Clients</strong>, <strong>Advisors</strong>, and <strong>Staff</strong> in this firm.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setRolePermissions((prev) => ({
                          ...prev,
                          CLIENT: {
                            mutual_funds: true,
                            mf_transactions: true,
                            mf_sips: true,
                            investment_planning: true,
                            client_portal: true,
                            retirement_planning: true,
                            risk_planning: true,
                            ai_features: true,
                            ai_chat_agents: true,
                            tax_planning: true,
                          },
                        }));
                      }}
                      className="text-[10px] text-purple-400 hover:underline font-bold cursor-pointer"
                    >
                      Enable All for Clients
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60 max-h-80 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-900 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800 text-[10px] sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3">Module / Capability</th>
                          <th className="py-2.5 px-3 text-center text-sky-400">Client Access</th>
                          <th className="py-2.5 px-3 text-center text-emerald-400">Advisor Access</th>
                          <th className="py-2.5 px-3 text-center text-slate-400">Staff Access</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {MASTER_FEATURE_CATALOG.map((f) => {
                          const isMasterBlocked = tenantFeatures[f.key] === false;
                          const clientAllowed = !isMasterBlocked && rolePermissions.CLIENT?.[f.key] !== false;
                          const advisorAllowed = !isMasterBlocked && rolePermissions.ADVISOR?.[f.key] !== false;
                          const staffAllowed = !isMasterBlocked && rolePermissions.STAFF?.[f.key] !== false;

                          return (
                            <tr
                              key={f.key}
                              className={`hover:bg-slate-900/40 transition ${
                                isMasterBlocked ? "opacity-40 bg-slate-950/80" : ""
                              }`}
                            >
                              <td className="py-2 px-3">
                                <div className="font-semibold text-white">{f.label}</div>
                                {isMasterBlocked && (
                                  <div className="text-[10px] text-rose-400 flex items-center gap-1 font-mono">
                                    <Lock className="h-2.5 w-2.5" /> Blocked by Super Admin Practice Veto
                                  </div>
                                )}
                              </td>

                              {/* Client Toggle */}
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="checkbox"
                                  disabled={isMasterBlocked}
                                  checked={clientAllowed}
                                  onChange={() => handleToggleRoleFeature("CLIENT", f.key)}
                                  className="h-4 w-4 accent-sky-500 cursor-pointer disabled:cursor-not-allowed"
                                />
                              </td>

                              {/* Advisor Toggle */}
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="checkbox"
                                  disabled={isMasterBlocked}
                                  checked={advisorAllowed}
                                  onChange={() => handleToggleRoleFeature("ADVISOR", f.key)}
                                  className="h-4 w-4 accent-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                                />
                              </td>

                              {/* Staff Toggle */}
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="checkbox"
                                  disabled={isMasterBlocked}
                                  checked={staffAllowed}
                                  onChange={() => handleToggleRoleFeature("STAFF", f.key)}
                                  className="h-4 w-4 accent-slate-500 cursor-pointer disabled:cursor-not-allowed"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlan}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition disabled:opacity-50 shadow-md cursor-pointer"
                >
                  {isSavingPlan ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Plan &amp; Entitlements</span>
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
