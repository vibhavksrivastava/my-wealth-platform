import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { DEFAULT_PLANS } from "@/lib/tenantPlans";


export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Super Administrator privileges required." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !tenant) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }

    // Also get plans list
    let plans = Object.values(DEFAULT_PLANS);
    try {
      const { data: dbPlans } = await supabaseAdmin.from("plans").select("*");
      if (dbPlans && dbPlans.length > 0) {
        plans = dbPlans;
      }
    } catch {
      // Fallback
    }

    return NextResponse.json({ tenant, plans });
  } catch (error) {
    console.error("Super Admin Tenant GET Error:", error);
    return NextResponse.json({ error: "Failed to load tenant details." }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Super Administrator privileges required." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const {
      planSlug,
      planId,
      commissionSharingActive,
      subscriptionExpiresAt,
      arnNumber,
      riaNumber,
      firmBrandName,
      firmLegalName,
      customDomain,
      isActive,
    } = body;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (arnNumber !== undefined) updates.arn_number = arnNumber ? arnNumber.trim() : null;
    if (riaNumber !== undefined) updates.ria_number = riaNumber ? riaNumber.trim() : null;
    if (firmBrandName !== undefined) updates.firm_brand_name = firmBrandName.trim();
    if (firmLegalName !== undefined) updates.firm_legal_name = firmLegalName.trim();
    if (customDomain !== undefined) updates.custom_domain = customDomain ? customDomain.trim() : null;
    if (typeof isActive === "boolean") updates.is_active = isActive;
    if (typeof commissionSharingActive === "boolean") {
      updates.commission_sharing_active = commissionSharingActive;
    }

    // Resolve planId from planSlug if provided
    let resolvedPlanId = planId;
    if (!resolvedPlanId && planSlug) {
      try {
        const { data: foundPlan } = await supabaseAdmin
          .from("plans")
          .select("id")
          .eq("slug", planSlug)
          .maybeSingle();

        if (foundPlan) {
          resolvedPlanId = foundPlan.id;
        }
      } catch {
        // Fallback
      }
    }

    if (resolvedPlanId !== undefined) {
      updates.plan_id = resolvedPlanId;
    }

    // Handle Subscription Expiry Date
    if (subscriptionExpiresAt !== undefined) {
      if (subscriptionExpiresAt === null || subscriptionExpiresAt === "") {
        updates.subscription_expires_at = null;
      } else {
        updates.subscription_expires_at = new Date(subscriptionExpiresAt).toISOString();
      }
    }

    // If switching to Zero-Fee ARN partnership, automatically activate commission sharing
    if (planSlug === "arn_partnership") {
      updates.commission_sharing_active = true;
      // Auto-set a generous expiry (e.g. 1 year) so it is never prematurely flagged
      if (!subscriptionExpiresAt) {
        updates.subscription_expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    const { data: updatedTenant, error: updateErr } = await supabaseAdmin
      .from("tenants")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateErr || !updatedTenant) {
      throw updateErr || new Error("Failed to update tenant plan and details.");
    }

    return NextResponse.json({
      success: true,
      message: `Tenant license and plan successfully updated for ${updatedTenant.firm_brand_name}.`,
      tenant: updatedTenant,
    });
  } catch (error) {
    console.error("Super Admin Tenant PATCH Error:", error);
    return NextResponse.json(
      { error: "Failed to update tenant plan and settings." },
      { status: 500 }
    );
  }
}

