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
  Calendar,
  Send,
  Lock,
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
  ai_features?: boolean;
  ai_chat_agents?: boolean;
  risk_planning?: boolean;
  retirement_planning?: boolean;
  category?: "MFD" | "RIA" | "HYBRID";
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

interface TenantOption {
  id: string;
  subdomain: string;
  firm_brand_name: string;
  arn_number?: string | null;
  ria_number?: string | null;
  plan_id?: string | null;
  is_active: boolean;
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
  category: "MFD",
};

export default function SuperAdminPlansPage() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "MFD" | "RIA" | "AI_ENABLED">("ALL");

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Assign Plan to Tenant Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [planToAssign, setPlanToAssign] = useState<PlanItem | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [assignExpiryMonths, setAssignExpiryMonths] = useState("12");
  const [isAssigning, setIsAssigning] = useState(false);

  // Form State
  const [planForm, setPlanForm] = useState({
    id: "",
    name: "",
    slug: "",
    category: "MFD" as "MFD" | "RIA" | "HYBRID",
    price_monthly: "2499",
    max_seats: "3",
    description: "",
    is_active: true,
    features: { ...DEFAULT_FEATURE_STATE },
  });

  const fetchPlansAndTenants = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const [plansRes, tenantsRes] = await Promise.all([
        fetch("/api/super-admin/plans", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/super-admin/tenants", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!plansRes.ok) throw new Error("Failed to load platform subscription plans.");
      const plansJson = await plansRes.json();
      setPlans(plansJson.plans || []);

      if (tenantsRes.ok) {
        const tenantsJson = await tenantsRes.json();
        setTenants(tenantsJson.tenants || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load plans.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlansAndTenants();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const handleOpenAddModal = (presetCategory: "MFD" | "RIA" = "MFD", withAi = true) => {
    setIsEditing(false);
    setPlanForm({
      id: "",
      name: presetCategory === "MFD" ? (withAi ? "MFD Growth + AI" : "MFD Starter Solo") : (withAi ? "RIA Enterprise AI Suite" : "RIA Practice Standard"),
      slug: "",
      category: presetCategory,
      price_monthly: presetCategory === "MFD" ? (withAi ? "2499" : "999") : (withAi ? "6999" : "2999"),
      max_seats: presetCategory === "MFD" ? (withAi ? "3" : "1") : (withAi ? "15" : "3"),
      description: presetCategory === "MFD" ? (withAi ? "Full AI copilot, white-label portal, and risk planning for MFDs." : "Essential execution and client reporting for solo IFAs.") : (withAi ? "Multi-family office and RIA flagship plan with custom domain and 4 AI agents." : "Direct plan analytics, fee billing, and goal modeling for RIAs."),
      is_active: true,
      features: {
        ...DEFAULT_FEATURE_STATE,
        category: presetCategory,
        ai_features: withAi,
        ai_chat_agents: withAi,
        risk_planning: withAi || presetCategory === "RIA",
        white_label: withAi,
        custom_domain: presetCategory === "RIA" && withAi,
      },
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan: PlanItem) => {
    setIsEditing(true);
    const cat = plan.features?.category || (plan.slug.startsWith("ria") ? "RIA" : "MFD");
    setPlanForm({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      category: cat,
      price_monthly: String(plan.price_monthly),
      max_seats: String(plan.max_seats),
      description: plan.description || plan.features?.description || "",
      is_active: plan.is_active,
      features: {
        ...DEFAULT_FEATURE_STATE,
        ...(plan.features || {}),
        category: cat,
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

  const handleApplyAiPreset = (withAi: boolean) => {
    setPlanForm((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        ai_features: withAi,
        ai_chat_agents: withAi,
        risk_planning: withAi ? true : prev.features.risk_planning,
        suggestions_engine: withAi ? true : prev.features.suggestions_engine,
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

      const consolidatedFeatures = {
        ...planForm.features,
        category: planForm.category,
      };

      const payload: Record<string, any> = {
        name: planForm.name.trim(),
        price_monthly: Number(planForm.price_monthly) || 0,
        max_seats: Number(planForm.max_seats) || 1,
        description: planForm.description.trim(),
        is_active: planForm.is_active,
        features: consolidatedFeatures,
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
      await fetchPlansAndTenants();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to save plan.");
    } finally {
      setIsSaving(false);
    }
  };

  // Open Assign Plan to Tenant Modal
  const handleOpenAssignModal = (plan: PlanItem) => {
    setPlanToAssign(plan);
    setSelectedTenantId(tenants[0]?.id || "");
    setAssignExpiryMonths("12");
    setIsAssignModalOpen(true);
  };

  // Submit Plan Assignment to Tenant
  const handleExecuteAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planToAssign || !selectedTenantId) return;

    setIsAssigning(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + Number(assignExpiryMonths));

      const res = await fetch(`/api/super-admin/tenants/${selectedTenantId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId: planToAssign.id,
          planSlug: planToAssign.slug,
          subscriptionExpiresAt: expiryDate.toISOString(),
          commissionSharingActive: planToAssign.slug === "arn_partnership" || Boolean(planToAssign.features?.commission_sharing),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to assign plan to tenant.");

      const tenantObj = tenants.find((t) => t.id === selectedTenantId);
      setSuccessMessage(`Plan "${planToAssign.name}" successfully assigned to ${tenantObj?.firm_brand_name || "tenant"}!`);
      setIsAssignModalOpen(false);
      await fetchPlansAndTenants();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to assign plan.");
    } finally {
      setIsAssigning(false);
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
      await fetchPlansAndTenants();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to update active status.");
    }
  };

  const filteredPlans = plans.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q);

    const planCat = p.features?.category || (p.slug.startsWith("ria") ? "RIA" : "MFD");
    const matchesCategory =
      categoryFilter === "ALL" ||
      (categoryFilter === "MFD" && planCat === "MFD") ||
      (categoryFilter === "RIA" && planCat === "RIA") ||
      (categoryFilter === "AI_ENABLED" && Boolean(p.features?.ai_features));

    return matchesSearch && matchesCategory;
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
            Create, configure, and assign MFD and RIA plans (with or without AI copilot) directly to tenant practices.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/super-admin/tenants"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition cursor-pointer"
          >
            <Building2 className="h-3.5 w-3.5 text-sky-400" />
            <span>Manage Tenants</span>
          </Link>

          <button
            onClick={() => handleOpenAddModal("MFD", true)}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition shadow-md shadow-sky-500/20 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add MFD Plan</span>
          </button>

          <button
            onClick={() => handleOpenAddModal("RIA", true)}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add RIA Plan</span>
          </button>
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

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
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
          <p className="text-[11px] text-slate-500">MFD &amp; RIA practice offerings</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-1">
          <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">AI Copilot Tiers</span>
          <div className="text-2xl font-black text-purple-400">
            {plans.filter((p) => p.features?.ai_features).length} Plans
          </div>
          <p className="text-[11px] text-slate-500">Includes 4 autonomous AI agents</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-1">
          <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Assigned Tenants</span>
          <div className="text-2xl font-black text-sky-400">{totalTenantsOnPlans} Firms</div>
          <p className="text-[11px] text-slate-500">Subscribed advisory practices</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-1">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">BSE StAR MF Execution</span>
          <div className="text-2xl font-black text-amber-400">100% Guaranteed</div>
          <p className="text-[11px] text-slate-500">Universal order engine on all tiers</p>
        </div>
      </div>

      {/* Category Pills & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(
            [
              { id: "ALL", label: "All Plans" },
              { id: "MFD", label: "MFD Plans" },
              { id: "RIA", label: "RIA Plans" },
              { id: "AI_ENABLED", label: "✨ With AI Copilot" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setCategoryFilter(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                categoryFilter === t.id
                  ? "bg-sky-500 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search plans by name, slug or features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
          />
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPlans.map((plan) => {
          const isArn = plan.slug === "arn_partnership" || plan.features?.commission_sharing;
          const planCat = plan.features?.category || (plan.slug.startsWith("ria") ? "RIA" : "MFD");
          const hasAi = Boolean(plan.features?.ai_features);

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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-base font-bold text-white tracking-tight">{plan.name}</h3>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {planCat}
                      </span>
                      {hasAi && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 flex items-center gap-0.5">
                          <Sparkles className="h-2.5 w-2.5" /> AI
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">slug: {plan.slug}</div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border shrink-0 ${
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
                      <span>{plan.max_seats} {plan.max_seats === 1 ? "Seat" : "Seats"}</span>
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
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className="text-[11px]">BSE StAR MF</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${plan.features?.white_label ? "text-slate-300" : "text-slate-500"}`}>
                      {plan.features?.white_label ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                      )}
                      <span className="text-[11px]">White-Labeling</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${plan.features?.custom_domain ? "text-slate-300" : "text-slate-500"}`}>
                      {plan.features?.custom_domain ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                      )}
                      <span className="text-[11px]">Custom Domain</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${plan.features?.advanced_reports ? "text-slate-300" : "text-slate-500"}`}>
                      {plan.features?.advanced_reports ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                      )}
                      <span className="text-[11px]">Rebalancing Engine</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${plan.features?.ai_features ? "text-slate-300" : "text-slate-500"}`}>
                      {plan.features?.ai_features ? (
                        <Check className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                      )}
                      <span className="text-[11px] font-semibold text-purple-300">AI Intelligence Suite</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${plan.features?.ai_chat_agents ? "text-slate-300" : "text-slate-500"}`}>
                      {plan.features?.ai_chat_agents ? (
                        <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                      )}
                      <span className="text-[11px] text-indigo-300">AI Chat Agents</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${plan.features?.risk_planning ? "text-slate-300" : "text-slate-500"}`}>
                      {plan.features?.risk_planning ? (
                        <Check className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                      )}
                      <span className="text-[11px] text-blue-300">Risk &amp; Insurance</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${plan.features?.priority_support ? "text-slate-300" : "text-slate-500"}`}>
                      {plan.features?.priority_support ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                      )}
                      <span className="text-[11px]">Priority Support</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer: Assign to Tenant & Actions */}
              <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">
                  <strong className="text-white font-mono">{plan.tenant_count || 0}</strong> tenants
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenAssignModal(plan)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition cursor-pointer"
                    title="Assign this plan to a tenant practice"
                  >
                    <Building2 className="h-3 w-3" />
                    <span>Assign Plan</span>
                  </button>

                  <button
                    onClick={() => handleToggleActiveStatus(plan)}
                    title={plan.is_active ? "Deactivate plan" : "Activate plan"}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs cursor-pointer"
                  >
                    {plan.is_active ? "Pause" : "Resume"}
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(plan)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold transition cursor-pointer"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: Create / Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-sky-400" />
                  <span>{isEditing ? `Edit Plan: ${planForm.name}` : "Create New Subscription Plan"}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure plan pricing, seat allocations, and capabilities for MFD and RIA firms.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5">
                  Firm Category *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["MFD", "RIA", "HYBRID"] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPlanForm((prev) => ({ ...prev, category: cat }))}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
                        planForm.category === cat
                          ? "bg-sky-500/20 text-sky-300 border-sky-500"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {cat === "MFD" ? "MFD (Distributor)" : cat === "RIA" ? "RIA (Advisor)" : "Hybrid Wealth"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick AI Presets */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                <span className="text-slate-300 font-semibold">AI Features Configuration:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyAiPreset(true)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" /> With AI Copilot
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyAiPreset(false)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition cursor-pointer"
                  >
                    Standard (Without AI)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Plan Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5">
                    Plan Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MFD Growth + AI"
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
                    placeholder="e.g. mfd_growth_ai"
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
                  placeholder="e.g. Best suited for high-growth RIAs and MFD teams requiring custom domain and AI copilot."
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
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                    <span className="text-xs text-slate-300">BSE StAR MF Order Engine</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Universal Active
                    </span>
                  </div>

                  {/* AI Intelligence Suite */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-purple-950/20 border border-purple-800/40 cursor-pointer hover:border-purple-600 transition">
                    <span className="text-xs font-semibold text-purple-200">AI Intelligence Suite (Gemini)</span>
                    <input
                      type="checkbox"
                      checked={planForm.features.ai_features}
                      onChange={() => handleToggleFeature("ai_features")}
                      className="rounded border-purple-700 bg-slate-900 text-purple-500 focus:ring-purple-500/20 cursor-pointer"
                    />
                  </label>

                  {/* AI Chat Agents */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-800/40 cursor-pointer hover:border-indigo-600 transition">
                    <span className="text-xs font-semibold text-indigo-200">Interactive AI Chat Agents</span>
                    <input
                      type="checkbox"
                      checked={planForm.features.ai_chat_agents}
                      onChange={() => handleToggleFeature("ai_chat_agents")}
                      className="rounded border-indigo-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/20 cursor-pointer"
                    />
                  </label>

                  {/* Risk Planning */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-blue-950/20 border border-blue-800/40 cursor-pointer hover:border-blue-600 transition">
                    <span className="text-xs font-semibold text-blue-200">Risk Planning (Health &amp; Term)</span>
                    <input
                      type="checkbox"
                      checked={planForm.features.risk_planning}
                      onChange={() => handleToggleFeature("risk_planning")}
                      className="rounded border-blue-700 bg-slate-900 text-blue-500 focus:ring-blue-500/20 cursor-pointer"
                    />
                  </label>

                  {/* White-Label */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                    <span className="text-xs text-slate-300">White-Label Portal &amp; Logo</span>
                    <input
                      type="checkbox"
                      checked={planForm.features.white_label}
                      onChange={() => handleToggleFeature("white_label")}
                      className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500/20 cursor-pointer"
                    />
                  </label>

                  {/* Custom Domain */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                    <span className="text-xs text-slate-300">Custom Domain CNAME</span>
                    <input
                      type="checkbox"
                      checked={planForm.features.custom_domain}
                      onChange={() => handleToggleFeature("custom_domain")}
                      className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500/20 cursor-pointer"
                    />
                  </label>

                  {/* Advanced Reports / Rebalancing */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                    <span className="text-xs text-slate-300">Portfolio Rebalancing Engine</span>
                    <input
                      type="checkbox"
                      checked={planForm.features.advanced_reports}
                      onChange={() => handleToggleFeature("advanced_reports")}
                      className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500/20 cursor-pointer"
                    />
                  </label>

                  {/* CAS Parser */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                    <span className="text-xs text-slate-300">CAS PDF Parser &amp; Sync</span>
                    <input
                      type="checkbox"
                      checked={planForm.features.cas_import}
                      onChange={() => handleToggleFeature("cas_import")}
                      className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500/20 cursor-pointer"
                    />
                  </label>

                  {/* Client Portal */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                    <span className="text-xs text-slate-300">Client Investor Portal</span>
                    <input
                      type="checkbox"
                      checked={planForm.features.client_portal}
                      onChange={() => handleToggleFeature("client_portal")}
                      className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500/20 cursor-pointer"
                    />
                  </label>

                  {/* Priority Support */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                    <span className="text-xs text-slate-300">Priority Support SLA</span>
                    <input
                      type="checkbox"
                      checked={planForm.features.priority_support}
                      onChange={() => handleToggleFeature("priority_support")}
                      className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500/20 cursor-pointer"
                    />
                  </label>

                  {/* ARN Commission Sharing */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                    <span className="text-xs text-slate-300">80/20 ARN Revenue Split</span>
                    <input
                      type="checkbox"
                      checked={planForm.features.commission_sharing}
                      onChange={() => handleToggleFeature("commission_sharing")}
                      className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500/20 cursor-pointer"
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
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition shadow-md shadow-sky-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isSaving ? "Saving..." : isEditing ? "Save Plan Changes" : "Create Plan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Direct Assign Plan to Tenant */}
      {isAssignModalOpen && planToAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-400" />
                  <span>Assign Plan to Tenant</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Assign &ldquo;{planToAssign.name}&rdquo; ({formatCurrency(planToAssign.price_monthly)}/mo) to an active firm.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteAssignPlan} className="space-y-4">
              {/* Target Tenant Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5">
                  Select Tenant Organization *
                </label>
                <select
                  required
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firm_brand_name} ({t.subdomain}.unifiedwealth.com)
                    </option>
                  ))}
                </select>
              </div>

              {/* Plan Summary Preview */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Plan:</span>
                  <span className="font-bold text-white">{planToAssign.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Seat Capacity:</span>
                  <span className="text-amber-400 font-bold">{planToAssign.max_seats} Seats</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">AI Features Included:</span>
                  <span className={planToAssign.features?.ai_features ? "text-purple-400 font-bold" : "text-slate-500"}>
                    {planToAssign.features?.ai_features ? "✓ Full AI Copilot Suite" : "No AI (Standard)"}
                  </span>
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5">
                  Subscription License Duration *
                </label>
                <select
                  value={assignExpiryMonths}
                  onChange={(e) => setAssignExpiryMonths(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition"
                >
                  <option value="1">1 Month (Monthly Trial)</option>
                  <option value="3">3 Months (Quarterly)</option>
                  <option value="6">6 Months (Half-Yearly)</option>
                  <option value="12">12 Months (1 Year Standard)</option>
                  <option value="36">36 Months (3 Years Long-Term)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  disabled={isAssigning}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isAssigning && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isAssigning ? "Assigning..." : "Confirm Plan Assignment"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
