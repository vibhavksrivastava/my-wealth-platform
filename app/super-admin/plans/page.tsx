"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Shield,
  Zap,
  Users,
  Building2,
  ExternalLink,
  TrendingUp,
  Receipt,
  FileText,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  Sparkles,
  Info,
} from "lucide-react";

interface PlanFeatureState {
  white_label: boolean;
  custom_domain: boolean;
  advanced_reports: boolean;
  bse_star_mf: boolean;
  cas_import: boolean;
  client_portal: boolean;
  suggestions_engine: boolean;
  priority_support?: boolean;
  commission_sharing?: boolean;
  zero_subscription_fee?: boolean;
  [key: string]: any;
}

interface PlanItem {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  max_seats: number;
  description?: string;
  is_active: boolean;
  features: PlanFeatureState;
  tenant_count?: number;
  created_at?: string;
}

const DEFAULT_FEATURE_STATE: PlanFeatureState = {
  white_label: false,
  custom_domain: false,
  advanced_reports: false,
  bse_star_mf: true,
  cas_import: true,
  client_portal: true,
  suggestions_engine: true,
  priority_support: false,
  commission_sharing: false,
  zero_subscription_fee: false,
  ai_features: false,
  ai_chat_agents: false,
  risk_planning: false,
  retirement_planning: true,
};

export default function SuperAdminPlansPage() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [planForm, setPlanForm] = useState({
    id: "",
    name: "",
    slug: "",
    price_monthly: "2499",
    max_seats: "3",
    description: "",
    is_active: true,
    features: { ...DEFAULT_FEATURE_STATE },
  });

  const fetchPlans = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/super-admin/plans", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to load platform subscription plans.");
      }

      const json = await res.json();
      setPlans(json.plans || []);
    } catch (err: any) {
      setError(err.message || "Failed to load plans.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setPlanForm({
      id: "",
      name: "",
      slug: "",
      price_monthly: "2499",
      max_seats: "3",
      description: "",
      is_active: true,
      features: { ...DEFAULT_FEATURE_STATE },
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan: PlanItem) => {
    setIsEditing(true);
    setPlanForm({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      price_monthly: String(plan.price_monthly),
      max_seats: String(plan.max_seats),
      description: plan.description || plan.features?.description || "",
      is_active: plan.is_active,
      features: {
        ...DEFAULT_FEATURE_STATE,
        ...(plan.features || {}),
        bse_star_mf: true,
      },
    });
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setPlanForm((prev) => {
      const updates: any = { name: val };
      if (!isEditing && (!prev.slug || prev.slug === prev.name.toLowerCase().replace(/[^a-z0-9]+/g, "_"))) {
        updates.slug = val.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      }
      return { ...prev, ...updates };
    });
  };

  const handleToggleFeature = (featureKey: keyof PlanFeatureState) => {
    if (featureKey === "bse_star_mf") return; // BSE StAR MF is universally guaranteed
    setPlanForm((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [featureKey]: !prev.features[featureKey],
      },
    }));
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name.trim()) {
      setError("Plan name is required.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const url = "/api/super-admin/plans";
      const method = isEditing ? "PATCH" : "POST";

      const payload: Record<string, any> = {
        name: planForm.name.trim(),
        price_monthly: Number(planForm.price_monthly) || 0,
        max_seats: Number(planForm.max_seats) || 1,
        description: planForm.description.trim(),
        is_active: planForm.is_active,
        features: planForm.features,
      };

      if (isEditing) {
        payload.id = planForm.id;
        payload.slug = planForm.slug;
      } else {
        payload.slug = planForm.slug.trim() || planForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save plan.");
      }

      setSuccessMessage(isEditing ? `Plan "${planForm.name}" updated successfully.` : `Plan "${planForm.name}" created successfully.`);
      setIsModalOpen(false);
      await fetchPlans();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to save plan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async (plan: PlanItem) => {
    if (["basic", "growth", "enterprise", "arn_partnership"].includes(plan.slug)) {
      alert("System default plans cannot be deleted. You can edit their pricing, seats, and features instead.");
      return;
    }

    if ((plan.tenant_count || 0) > 0) {
      alert(`Cannot delete plan "${plan.name}" because ${plan.tenant_count} tenant firm(s) are actively subscribed. Please migrate them first or mark the plan as Inactive.`);
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete plan "${plan.name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/super-admin/plans?id=${encodeURIComponent(plan.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete plan.");
      }

      setSuccessMessage(`Plan "${plan.name}" was successfully removed.`);
      await fetchPlans();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to delete plan.");
    }
  };

  const handleToggleActiveStatus = async (plan: PlanItem) => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/super-admin/plans", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: plan.id,
          is_active: !plan.is_active,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update status.");

      setSuccessMessage(`Plan "${plan.name}" marked as ${!plan.is_active ? "Active" : "Inactive"}.`);
      await fetchPlans();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to update active status.");
    }
  };

  const filteredPlans = plans.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q)
    );
  });

  const totalTenantsOnPlans = plans.reduce((acc, p) => acc + (p.tenant_count || 0), 0);
  const activePlansCount = plans.filter((p) => p.is_active).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Subscription Plans &amp; Licensing</h1>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/30">
              Tenant Control Matrix
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Create, configure, and edit SaaS licensing tiers, pricing, seat caps, and feature entitlements for tenant advisory firms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/super-admin/billing"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition"
          >
            <Receipt className="h-3.5 w-3.5 text-amber-400" />
            <span>Billing &amp; Invoices</span>
          </Link>

          <button
            onClick={fetchPlans}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Reload</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition shadow-md shadow-sky-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Plan</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Defined Plans</span>
          <div className="text-2xl font-black text-white">{plans.length} Tiers</div>
          <p className="text-[11px] text-slate-500">Platform pricing offerings</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-1">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Active For Self-Service</span>
          <div className="text-2xl font-black text-emerald-400">{activePlansCount} Active</div>
          <p className="text-[11px] text-slate-500">Available in firm upgrade modal</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-1">
          <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Assigned Tenants</span>
          <div className="text-2xl font-black text-sky-400">{totalTenantsOnPlans} Firms</div>
          <p className="text-[11px] text-slate-500">Subscribed advisory practices</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-1">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">BSE StAR MF Execution</span>
          <div className="text-2xl font-black text-amber-400">100% Guaranteed</div>
          <p className="text-[11px] text-slate-500">Universal engine on all tiers</p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search plans by name, slug or features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
          />
        </div>
        <span className="text-xs text-slate-400">
          Showing <strong className="text-white">{filteredPlans.length}</strong> of {plans.length} plans
        </span>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPlans.map((plan) => {
          const isArn = plan.slug === "arn_partnership" || plan.features.commission_sharing;
          const isSystem = ["basic", "growth", "enterprise", "arn_partnership"].includes(plan.slug);

          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition relative shadow-lg ${
                plan.is_active
                  ? "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                  : "bg-slate-950/40 border-slate-800/60 opacity-60"
              }`}
            >
              <div className="space-y-4">
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white tracking-tight">{plan.name}</h3>
                      {isSystem && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                          System
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">slug: {plan.slug}</div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      plan.is_active
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {plan.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Price and Seat Metrics */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Monthly Price</span>
                    <div className="text-xl font-black text-white">
                      {isArn ? (
                        <span>₹0 <span className="text-xs font-normal text-slate-400">/mo (80/20)</span></span>
                      ) : (
                        <span>{formatCurrency(plan.price_monthly)} <span className="text-xs font-normal text-slate-400">/mo</span></span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Seat Limit</span>
                    <div className="text-sm font-bold text-amber-400 flex items-center justify-end gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>{plan.max_seats} Seats</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {plan.description && (
                  <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">
                    &ldquo;{plan.description}&rdquo;
                  </p>
                )}

                {/* Feature Capabilities Matrix */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Feature Capabilities
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="text-[11px]">BSE StAR MF</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${plan.features.white_label ? "text-slate-300" : "text-slate-500"}`}>
                      {plan.features.white_label ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                      )}
                      <span className="text-[11px]">White-Labeling</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${plan.features.custom_domain ? "text-slate-300" : "text-slate-500"}`}>
                      {plan.features.custom_domain ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                      )}
                      <span className="text-[11px]">Custom Domain</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${plan.features.advanced_reports ? "text-slate-300" : "text-slate-500"}`}>
                      {plan.features.advanced_reports ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                      )}
                      <span className="text-[11px]">Rebalancing</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${plan.features.cas_import ? "text-slate-300" : "text-slate-500"}`}>
                      {plan.features.cas_import ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                      )}
                      <span className="text-[11px]">CAS Engine</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${plan.features.priority_support ? "text-slate-300" : "text-slate-500"}`}>
                      {plan.features.priority_support ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                      )}
                      <span className="text-[11px]">Priority Support</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${plan.features.ai_features ? "text-slate-300" : "text-slate-500"}`}>
                      {plan.features.ai_features ? (
                        <Check className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                      )}
                      <span className="text-[11px] font-semibold text-purple-300">AI Intelligence Suite</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${plan.features.ai_chat_agents ? "text-slate-300" : "text-slate-500"}`}>
                      {plan.features.ai_chat_agents ? (
                        <Check className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                      )}
                      <span className="text-[11px] text-indigo-300">AI Chat Agents</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${plan.features.risk_planning ? "text-slate-300" : "text-slate-500"}`}>
                      {plan.features.risk_planning ? (
                        <Check className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                      )}
                      <span className="text-[11px] text-blue-300">Risk &amp; Insurance</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer: Tenant Count & Actions */}
              <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">
                  <strong className="text-white font-mono">{plan.tenant_count || 0}</strong> tenants on this plan
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleActiveStatus(plan)}
                    title={plan.is_active ? "Deactivate plan" : "Activate plan"}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs"
                  >
                    {plan.is_active ? "Pause" : "Resume"}
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(plan)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold transition"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>

                  {!isSystem && (
                    <button
                      onClick={() => handleDeletePlan(plan)}
                      disabled={(plan.tenant_count || 0) > 0}
                      title={(plan.tenant_count || 0) > 0 ? "Cannot delete plan with active tenants" : "Delete plan"}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {isEditing ? `Edit Plan Tier: ${planForm.name}` : "Create New Subscription Plan"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Define pricing, team seat limits, and unlockable platform capabilities.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Plan Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5">
                    Plan Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pro Multi-Family Office"
                    value={planForm.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>

                {/* Plan Slug */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5">
                    Plan Unique Slug *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isEditing}
                    placeholder="e.g. pro_mfo"
                    value={planForm.slug}
                    onChange={(e) =>
                      setPlanForm((prev) => ({
                        ...prev,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, "_"),
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 disabled:opacity-50 font-mono transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Price Monthly */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5">
                    Monthly Price (INR ₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={planForm.price_monthly}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, price_monthly: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Set 0 for Zero-Fee ARN revenue-split models</span>
                </div>

                {/* Seat Limit */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5">
                    Max Sub-Advisor Seats *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={planForm.max_seats}
                    onChange={(e) => setPlanForm((prev) => ({ ...prev, max_seats: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Included advisor/staff login licenses</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5">
                  Plan Description / Scope
                </label>
                <input
                  type="text"
                  placeholder="e.g. Best suited for high-growth RIAs and MFD teams requiring custom domain and rebalancing."
                  value={planForm.description}
                  onChange={(e) => setPlanForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  id="is_active_toggle"
                  checked={planForm.is_active}
                  onChange={(e) => setPlanForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500/20"
                />
                <label htmlFor="is_active_toggle" className="text-xs text-slate-200 cursor-pointer">
                  <strong>Active &amp; Available for Tenants:</strong> Check to allow tenant admins to select or upgrade to this plan.
                </label>
              </div>

              {/* Feature Capabilities Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-xs font-bold text-white uppercase tracking-wider">
                  Platform Capabilities &amp; Entitlements
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* BSE StAR MF */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                    <span className="text-xs text-slate-300">BSE StAR MF Order Engine</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Universal Active
                    </span>
                  </div>

                  {/* White-Label */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                    <span className="text-xs text-slate-300">White-Label Portal &amp; Logo</span>
                    <input
                      type="checkbox"
                      checked={planForm.features.white_label}
                      onChange={() => handleToggleFeature("white_label")}
                      className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500/20"
                    />
                  </label>

                  {/* Custom Domain */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                    <span className="text-xs text-slate-300">Custom Domain CNAME</span>
                    <input
                      type="checkbox"
                      checked={planForm.features.custom_domain}
                      onChange={() => handleToggleFeature("custom_domain")}
                      className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500/20"
                    />
                  </label>

                  {/* Advanced Reports / Rebalancing */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                    <span className="text-xs text-slate-300">Portfolio Rebalancing Engine</span>
                    <input
                      type="checkbox"
                      checked={planForm.features.advanced_reports}
                      onChange={() => handleToggleFeature("advanced_reports")}
                      className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500/20"
                    />
                  </label>

                  {/* CAS Parser */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                    <span className="text-xs text-slate-300">CAS PDF Parser &amp; Sync</span>
                    <input
                      type="checkbox"
                      checked={planForm.features.cas_import}
                      onChange={() => handleToggleFeature("cas_import")}
                      className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500/20"
                    />
                  </label>

                  {/* Client Portal */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                    <span className="text-xs text-slate-300">Client Investor Portal</span>
                    <input
                      type="checkbox"
                      checked={planForm.features.client_portal}
                      onChange={() => handleToggleFeature("client_portal")}
                      className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500/20"
                    />
                  </label>

                  {/* AI Suggestions */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                    <span className="text-xs text-slate-300">AI Suggestions Engine</span>
                    <input
                      type="checkbox"
                      checked={planForm.features.suggestions_engine}
                      onChange={() => handleToggleFeature("suggestions_engine")}
                      className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500/20"
                    />
                  </label>

                  {/* Priority Support */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                    <span className="text-xs text-slate-300">Priority Support SLA</span>
                    <input
                      type="checkbox"
                      checked={planForm.features.priority_support}
                      onChange={() => handleToggleFeature("priority_support")}
                      className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500/20"
                    />
                  </label>

                  {/* ARN Commission Sharing */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                    <span className="text-xs text-slate-300">80/20 ARN Revenue Split</span>
                    <input
                      type="checkbox"
                      checked={planForm.features.commission_sharing}
                      onChange={() => handleToggleFeature("commission_sharing")}
                      className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500/20"
                    />
                  </label>

                  {/* AI Intelligence Suite */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-purple-950/20 border border-purple-800/40 cursor-pointer hover:border-purple-600 transition">
                    <span className="text-xs font-semibold text-purple-200">AI Intelligence Suite (Gemini)</span>
                    <input
                      type="checkbox"
                      checked={planForm.features.ai_features}
                      onChange={() => handleToggleFeature("ai_features")}
                      className="rounded border-purple-700 bg-slate-900 text-purple-500 focus:ring-purple-500/20"
                    />
                  </label>

                  {/* AI Chat Agents */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-800/40 cursor-pointer hover:border-indigo-600 transition">
                    <span className="text-xs font-semibold text-indigo-200">Interactive AI Chat Agents</span>
                    <input
                      type="checkbox"
                      checked={planForm.features.ai_chat_agents}
                      onChange={() => handleToggleFeature("ai_chat_agents")}
                      className="rounded border-indigo-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/20"
                    />
                  </label>

                  {/* Risk & Insurance Planning */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-blue-950/20 border border-blue-800/40 cursor-pointer hover:border-blue-600 transition">
                    <span className="text-xs font-semibold text-blue-200">Risk Planning (Health &amp; Term)</span>
                    <input
                      type="checkbox"
                      checked={planForm.features.risk_planning}
                      onChange={() => handleToggleFeature("risk_planning")}
                      className="rounded border-blue-700 bg-slate-900 text-blue-500 focus:ring-blue-500/20"
                    />
                  </label>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition shadow-md shadow-sky-500/20 disabled:opacity-50"
                >
                  {isSaving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isSaving ? "Saving..." : isEditing ? "Save Plan Changes" : "Create Plan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

