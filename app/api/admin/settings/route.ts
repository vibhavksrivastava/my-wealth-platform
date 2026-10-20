import { NextResponse, connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAuthHeader } from "@/lib/auth";
import { getTenantPlan, checkTenantFeature } from "@/lib/tenantPlans";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || !["TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json(
        { error: "Access denied. Firm Administrator privileges required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedTenant = searchParams.get("tenant") || searchParams.get("tenantId") || searchParams.get("subdomain");

    let targetTenantId = session.tenantId;

    // SUPER_ADMIN can inspect any tenant practice or Platform HQ
    if (session.role === "SUPER_ADMIN" && requestedTenant) {
      const cleanReq = requestedTenant.toLowerCase().trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanReq);
      let query = supabaseAdmin.from("tenants").select("id");
      if (isUuid) {
        query = query.or(`id.eq.${cleanReq},subdomain.eq.${cleanReq}`);
      } else {
        query = query.eq("subdomain", cleanReq);
      }
      const { data: target } = await query.maybeSingle();
      if (target) {
        targetTenantId = target.id;
      }
    }

    let { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("id, subdomain, firm_legal_name, firm_brand_name, tenant_type, arn_number, ria_number, logo_url, favicon_url, primary_color, secondary_color, custom_domain, disclaimer_text, is_active, created_at, plan_id, commission_sharing_active, subscription_expires_at, theme_mode")
      .eq("id", targetTenantId)
      .maybeSingle();

    // Fallback if plan_id, commission_sharing_active, or subscription_expires_at columns do not exist yet
    if (error) {
      const fallbackQuery = await supabaseAdmin
        .from("tenants")
        .select("id, subdomain, firm_legal_name, firm_brand_name, tenant_type, arn_number, ria_number, logo_url, favicon_url, primary_color, secondary_color, custom_domain, disclaimer_text, is_active, created_at, theme_mode")
        .eq("id", targetTenantId)
        .maybeSingle();
      tenant = fallbackQuery.data as any;
      error = fallbackQuery.error;
    }

    if (error || !tenant) {
      console.error("Tenant Admin Settings GET Query Error:", error);
      return NextResponse.json({ error: "Tenant settings not found." }, { status: 404 });
    }

    // Resolve tenant plan details & feature flags
    const { plan } = await getTenantPlan(targetTenantId);

    return NextResponse.json({ 
      tenant,
      plan,
    });
  } catch (error) {
    console.error("Tenant Admin Settings GET Error:", error);
    return NextResponse.json({ error: "Failed to load firm settings." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || !["TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json(
        { error: "Access denied. Firm Administrator privileges required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedTenant = searchParams.get("tenant") || searchParams.get("tenantId") || searchParams.get("subdomain");

    let targetTenantId = session.tenantId;

    if (session.role === "SUPER_ADMIN" && requestedTenant) {
      const cleanReq = requestedTenant.toLowerCase().trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanReq);
      let query = supabaseAdmin.from("tenants").select("id");
      if (isUuid) {
        query = query.or(`id.eq.${cleanReq},subdomain.eq.${cleanReq}`);
      } else {
        query = query.eq("subdomain", cleanReq);
      }
      const { data: target } = await query.maybeSingle();
      if (target) {
        targetTenantId = target.id;
      }
    }

    const body = await req.json();
    const {
      firmBrandName,
      firmLegalName,
      arnNumber,
      riaNumber,
      logoUrl,
      primaryColor,
      secondaryColor,
      themeMode,
      customDomain,
      disclaimerText,
    } = body;

    // Check plan permission for white-labeling features
    const hasWhiteLabel = await checkTenantFeature(targetTenantId, "white_label");
    const hasCustomDomain = await checkTenantFeature(targetTenantId, "custom_domain");

    const isUpdatingWhiteLabel =
      logoUrl !== undefined ||
      primaryColor !== undefined ||
      secondaryColor !== undefined ||
      themeMode !== undefined;

    if (isUpdatingWhiteLabel && !hasWhiteLabel) {
      return NextResponse.json(
        {
          error: "White-label branding is locked on your current plan. Please upgrade to the Growth Plan to upload custom logos and modify color schemes.",
          code: "PLAN_RESTRICTION_WHITE_LABEL",
        },
        { status: 403 }
      );
    }

    if (customDomain && !hasCustomDomain) {
      return NextResponse.json(
        {
          error: "Custom hostnames require the Enterprise Wealth Firm plan.",
          code: "PLAN_RESTRICTION_CUSTOM_DOMAIN",
        },
        { status: 403 }
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (firmBrandName) updates.firm_brand_name = firmBrandName.trim();
    if (firmLegalName) updates.firm_legal_name = firmLegalName.trim();
    if (arnNumber !== undefined) updates.arn_number = arnNumber ? arnNumber.trim() : null;
    if (riaNumber !== undefined) updates.ria_number = riaNumber ? riaNumber.trim() : null;
    
    // Only apply branding updates if plan allows
    if (hasWhiteLabel) {
      if (logoUrl !== undefined) updates.logo_url = logoUrl ? logoUrl.trim() : null;
      if (primaryColor) updates.primary_color = primaryColor.trim();
      if (secondaryColor) updates.secondary_color = secondaryColor.trim();
      if (themeMode) updates.theme_mode = themeMode === "dark" ? "dark" : "light";
    }

    if (hasCustomDomain && customDomain !== undefined) {
      updates.custom_domain = customDomain ? customDomain.trim() : null;
    }

    if (disclaimerText !== undefined) updates.disclaimer_text = disclaimerText ? disclaimerText.trim() : null;

    const { data: updatedTenant, error } = await supabaseAdmin
      .from("tenants")
      .update(updates)
      .eq("id", targetTenantId)
      .select()
      .single();

    if (error || !updatedTenant) {
      throw error || new Error("Failed to update tenant settings.");
    }

    const { plan } = await getTenantPlan(targetTenantId);

    return NextResponse.json({
      success: true,
      message: "Firm branding and compliance settings updated.",
      tenant: updatedTenant,
      plan,
    });
  } catch (error) {
    console.error("Tenant Admin Settings PATCH Error:", error);
    return NextResponse.json(
      { error: "Failed to update firm settings." },
      { status: 500 }
    );
  }
}
