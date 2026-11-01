import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { DEFAULT_PLANS } from "@/lib/tenantPlans";

export interface PlanData {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  max_seats: number;
  description?: string;
  is_active: boolean;
  features: {
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
    description?: string;
    is_active?: boolean;
    [key: string]: any;
  };
  tenant_count?: number;
  created_at?: string;
}

// GET: List all plans with tenant subscription counts
export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Platform Super Administrator privileges required." },
        { status: 403 }
      );
    }

    // 1. Fetch plans from Supabase
    const { data: dbPlans, error: plansError } = await supabaseAdmin
      .from("plans")
      .select("*")
      .order("price_monthly", { ascending: true });

    if (plansError) {
      console.warn("Could not query plans table directly:", plansError);
    }

    // 2. Fetch tenant plan_id distribution
    const { data: tenants } = await supabaseAdmin
      .from("tenants")
      .select("id, plan_id, commission_sharing_active, subdomain");

    const tenantCountByPlanId: Record<string, number> = {};
    const tenantCountBySlug: Record<string, number> = {};

    for (const t of tenants || []) {
      if (t.plan_id) {
        tenantCountByPlanId[t.plan_id] = (tenantCountByPlanId[t.plan_id] || 0) + 1;
      }
      if (t.commission_sharing_active) {
        tenantCountBySlug["arn_partnership"] = (tenantCountBySlug["arn_partnership"] || 0) + 1;
      }
    }

    // 3. Merge database plans with default definitions for resilience
    const plansList: PlanData[] = [];
    const seenSlugs = new Set<string>();

    for (const p of dbPlans || []) {
      seenSlugs.add(p.slug);
      const features = p.features || {};
      const count = tenantCountByPlanId[p.id] || tenantCountBySlug[p.slug] || 0;

      plansList.push({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price_monthly: Number(p.price_monthly || 0),
        max_seats: Number(p.max_seats || 1),
        description: features.description || (p as any).description || "",
        is_active: features.is_active !== false && (p as any).is_active !== false,
        features: {
          white_label: Boolean(features.white_label),
          custom_domain: Boolean(features.custom_domain),
          advanced_reports: Boolean(features.advanced_reports),
          bse_star_mf: true, // Universal access guaranteed
          cas_import: features.cas_import !== false,
          client_portal: features.client_portal !== false,
          suggestions_engine: features.suggestions_engine !== false,
          priority_support: Boolean(features.priority_support),
          commission_sharing: Boolean(features.commission_sharing),
          zero_subscription_fee: Boolean(features.zero_subscription_fee),
          ...features,
        },
        tenant_count: count,
        created_at: p.created_at,
      });
    }

    // If any built-in plan was missing in the db, supply it safely
    for (const [slug, def] of Object.entries(DEFAULT_PLANS)) {
      if (!seenSlugs.has(slug)) {
        plansList.push({
          id: def.id,
          name: def.name,
          slug: def.slug,
          price_monthly: def.price_monthly,
          max_seats: def.max_seats,
          description: slug === "arn_partnership" ? "Zero monthly fixed fee with 80/20 trail split" : `${def.max_seats} seats included`,
          is_active: true,
          features: { ...def.features },
          tenant_count: tenantCountBySlug[slug] || 0,
        });
      }
    }

    return NextResponse.json({
      success: true,
      plans: plansList,
    });
  } catch (error: any) {
    console.error("Super Admin Plans GET Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load plans." }, { status: 500 });
  }
}

// POST: Create a new plan tier
export async function POST(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Platform Super Administrator privileges required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      slug: rawSlug,
      price_monthly,
      max_seats,
      description = "",
      is_active = true,
      features = {},
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Plan name is required." }, { status: 400 });
    }

    // Auto-generate or sanitize slug
    const cleanSlug = (rawSlug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    if (!cleanSlug) {
      return NextResponse.json({ error: "A valid plan slug is required." }, { status: 400 });
    }

    // Check slug uniqueness in plans table
    const { data: existing } = await supabaseAdmin
      .from("plans")
      .select("id, slug")
      .eq("slug", cleanSlug)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `A plan with slug "${cleanSlug}" already exists. Please choose a distinct name or slug.` },
        { status: 409 }
      );
    }

    const priceNum = Math.max(0, Number(price_monthly) || 0);
    const seatsNum = Math.max(1, parseInt(String(max_seats), 10) || 1);

    const consolidatedFeatures = {
      white_label: Boolean(features.white_label),
      custom_domain: Boolean(features.custom_domain),
      advanced_reports: Boolean(features.advanced_reports),
      bse_star_mf: true, // Universally guaranteed
      cas_import: features.cas_import !== false,
      client_portal: features.client_portal !== false,
      suggestions_engine: features.suggestions_engine !== false,
      priority_support: Boolean(features.priority_support),
      commission_sharing: Boolean(features.commission_sharing),
      zero_subscription_fee: Boolean(features.zero_subscription_fee),
      description: description.trim(),
      is_active: Boolean(is_active),
    };

    // Insert into plans table
    const { data: newPlan, error: insertError } = await supabaseAdmin
      .from("plans")
      .insert({
        name: name.trim(),
        slug: cleanSlug,
        price_monthly: priceNum,
        max_seats: seatsNum,
        features: consolidatedFeatures,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert plan:", insertError);
      return NextResponse.json({ error: insertError.message || "Failed to create plan." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Plan "${name.trim()}" created successfully.`,
      plan: {
        id: newPlan.id,
        name: newPlan.name,
        slug: newPlan.slug,
        price_monthly: Number(newPlan.price_monthly),
        max_seats: Number(newPlan.max_seats),
        description: description.trim(),
        is_active: Boolean(is_active),
        features: consolidatedFeatures,
        tenant_count: 0,
      },
    });
  } catch (error: any) {
    console.error("Super Admin Plans POST Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create plan." }, { status: 500 });
  }
}

// PATCH: Edit existing plan tier
export async function PATCH(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Platform Super Administrator privileges required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, slug, name, price_monthly, max_seats, description, is_active, features } = body;

    if (!id && !slug) {
      return NextResponse.json({ error: "Plan ID or Slug is required to update a plan." }, { status: 400 });
    }

    // Fetch existing plan
    let query = supabaseAdmin.from("plans").select("*");
    if (id) {
      query = query.eq("id", id);
    } else {
      query = query.eq("slug", slug);
    }

    const { data: existingPlan, error: fetchError } = await query.maybeSingle();

    if (fetchError || !existingPlan) {
      return NextResponse.json({ error: "Plan not found in database." }, { status: 404 });
    }

    const currentFeatures = existingPlan.features || {};

    const updatedFeatures = {
      ...currentFeatures,
      ...(features || {}),
      bse_star_mf: true, // Universal
    };

    if (typeof description === "string") {
      updatedFeatures.description = description.trim();
    }
    if (typeof is_active === "boolean") {
      updatedFeatures.is_active = is_active;
    }

    const updates: Record<string, any> = {
      features: updatedFeatures,
    };

    if (name && typeof name === "string" && name.trim()) {
      updates.name = name.trim();
    }
    if (price_monthly !== undefined && price_monthly !== null) {
      updates.price_monthly = Math.max(0, Number(price_monthly));
    }
    if (max_seats !== undefined && max_seats !== null) {
      updates.max_seats = Math.max(1, parseInt(String(max_seats), 10));
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("plans")
      .update(updates)
      .eq("id", existingPlan.id)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update plan:", updateError);
      return NextResponse.json({ error: updateError.message || "Failed to update plan." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Plan "${updated.name}" updated successfully.`,
      plan: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        price_monthly: Number(updated.price_monthly),
        max_seats: Number(updated.max_seats),
        description: updatedFeatures.description || "",
        is_active: updatedFeatures.is_active !== false,
        features: updatedFeatures,
      },
    });
  } catch (error: any) {
    console.error("Super Admin Plans PATCH Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update plan." }, { status: 500 });
  }
}

// DELETE: Delete plan if no active tenants are subscribed
export async function DELETE(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Platform Super Administrator privileges required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const planId = searchParams.get("id");
    const planSlug = searchParams.get("slug");

    if (!planId && !planSlug) {
      return NextResponse.json({ error: "Plan ID or Slug is required." }, { status: 400 });
    }

    // Check if it is a protected default plan
    if (planSlug && ["basic", "growth", "enterprise", "arn_partnership"].includes(planSlug)) {
      return NextResponse.json(
        { error: "Default system plans (Starter, Growth, Enterprise, ARN Partner) cannot be deleted. You can edit their pricing, seats, and features instead." },
        { status: 400 }
      );
    }

    // Look up plan
    let query = supabaseAdmin.from("plans").select("id, name, slug");
    if (planId) {
      query = query.eq("id", planId);
    } else {
      query = query.eq("slug", planSlug!);
    }

    const { data: targetPlan } = await query.maybeSingle();

    if (!targetPlan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    // Check if tenants are assigned to this plan
    const { count: tenantCount, error: countErr } = await supabaseAdmin
      .from("tenants")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", targetPlan.id);

    if (!countErr && tenantCount && tenantCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete plan "${targetPlan.name}". There are ${tenantCount} tenant firm(s) actively subscribed to this plan. Please migrate them to another plan first or mark this plan as Inactive.`,
        },
        { status: 409 }
      );
    }

    // Safe to delete
    const { error: delError } = await supabaseAdmin
      .from("plans")
      .delete()
      .eq("id", targetPlan.id);

    if (delError) {
      return NextResponse.json({ error: delError.message || "Failed to delete plan." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Plan "${targetPlan.name}" was successfully removed.`,
    });
  } catch (error: any) {
    console.error("Super Admin Plans DELETE Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete plan." }, { status: 500 });
  }
}

