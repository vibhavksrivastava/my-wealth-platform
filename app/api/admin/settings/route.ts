import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { getTenantPlan, checkTenantFeature } from "@/lib/tenantPlans";
import { clearTenantConfigCache } from "@/lib/tenant-config/server";


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
      .select("id, subdomain, firm_legal_name, firm_brand_name, tenant_type, firm_type, arn_number, ria_number, logo_url, favicon_url, primary_color, secondary_color, custom_domain, disclaimer_text, is_active, created_at, plan_id, commission_sharing_active, subscription_expires_at, theme_mode")
      .eq("id", targetTenantId)
      .maybeSingle();

    // Fallback if firm_type, plan_id, commission_sharing_active, or subscription_expires_at columns do not exist yet
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

    // Retrieve tenant_settings branding row for additional configurations
    let loginPortalStyle = (tenant as any).login_portal_style;
    try {
      const { data: tsRow } = await supabaseAdmin
        .from("tenant_settings")
        .select("branding")
        .eq("tenant_id", targetTenantId)
        .maybeSingle();

      if (tsRow?.branding?.login_portal_style) {
        loginPortalStyle = tsRow.branding.login_portal_style;
      }
    } catch {}

    // Normalize firm_type with tenant_type fallback and login_portal_style
    const resolvedTenant = {
      ...tenant,
      firm_type: (tenant as any).firm_type || (tenant as any).tenant_type || "MFD",
      login_portal_style: loginPortalStyle || "UNIVERSAL",
    };

    // Resolve tenant plan details & feature flags
    const { plan } = await getTenantPlan(targetTenantId);

    return NextResponse.json({ 
      tenant: resolvedTenant,
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
      firmType,
      logoUrl,
      primaryColor,
      secondaryColor,
      themeMode,
      customDomain,
      disclaimerText,
      loginPortalStyle,
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
    if (firmType && ["MFD", "RIA", "BOTH"].includes(firmType)) {
      updates.tenant_type = firmType;
      updates.firm_type = firmType;
    }
    
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

    if (loginPortalStyle && ["UNIVERSAL", "INVESTOR_PORTAL", "MULTI_TAB"].includes(loginPortalStyle)) {
      updates.login_portal_style = loginPortalStyle;
    }

    // Also update tenant_settings JSONB branding for resilient persistence
    try {
      const { data: currentSettings } = await supabaseAdmin
        .from("tenant_settings")
        .select("branding")
        .eq("tenant_id", targetTenantId)
        .maybeSingle();

      const existingBranding = currentSettings?.branding || {};
      const newBranding = {
        ...existingBranding,
        ...(firmBrandName ? { firm_brand_name: firmBrandName.trim() } : {}),
        ...(logoUrl !== undefined ? { logo_url: logoUrl ? logoUrl.trim() : null } : {}),
        ...(primaryColor ? { primary_color: primaryColor.trim() } : {}),
        ...(secondaryColor ? { secondary_color: secondaryColor.trim() } : {}),
        ...(themeMode ? { theme_mode: themeMode === "dark" ? "dark" : "light" } : {}),
        ...(disclaimerText !== undefined ? { disclaimer_text: disclaimerText ? disclaimerText.trim() : null } : {}),
        ...(loginPortalStyle && ["UNIVERSAL", "INVESTOR_PORTAL", "MULTI_TAB"].includes(loginPortalStyle) 
            ? { login_portal_style: loginPortalStyle } 
            : {}),
      };

      await supabaseAdmin
        .from("tenant_settings")
        .upsert(
          {
            tenant_id: targetTenantId,
            branding: newBranding,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id" }
        );
    } catch (tsErr) {
      console.warn("Could not upsert tenant_settings branding:", tsErr);
    }

    let { data: updatedTenant, error } = await supabaseAdmin
      .from("tenants")
      .update(updates)
      .eq("id", targetTenantId)
      .select()
      .single();

    // If firm_type or login_portal_style column does not exist yet in PostgreSQL schema, retry gracefully
    if (error && ((error as any).code === "42703" || error.message?.includes("column"))) {
      if (error.message?.includes("login_portal_style") || (updates.login_portal_style && (error as any).code === "42703")) {
        delete updates.login_portal_style;
      }
      if (error.message?.includes("firm_type")) {
        delete updates.firm_type;
      }
      const retry = await supabaseAdmin
        .from("tenants")
        .update(updates)
        .eq("id", targetTenantId)
        .select()
        .single();
      updatedTenant = retry.data;
      error = retry.error;
    }

    if (error || !updatedTenant) {
      throw error || new Error("Failed to update tenant settings.");
    }

    clearTenantConfigCache(targetTenantId);

    const resolvedUpdatedTenant = {
      ...updatedTenant,
      firm_type: (updatedTenant as any).firm_type || (updatedTenant as any).tenant_type || "MFD",
      login_portal_style: loginPortalStyle || (updatedTenant as any).login_portal_style || "UNIVERSAL",
    };

    const { plan } = await getTenantPlan(targetTenantId);

    return NextResponse.json({
      success: true,
      message: "Firm branding and compliance settings updated.",
      tenant: resolvedUpdatedTenant,
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
