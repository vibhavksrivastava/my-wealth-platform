import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { MASTER_FEATURE_CATALOG, DEFAULT_ROLE_PERMISSIONS } from "@/lib/featureFlags";

export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || !["TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Access denied. Firm Administrator privileges required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const requestedTenant = searchParams.get("tenant") || searchParams.get("tenantId");
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
      if (target) targetTenantId = target.id;
    }

    // 1. Fetch Super Admin Master Features for this tenant
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, subdomain, firm_brand_name, enabled_features")
      .eq("id", targetTenantId)
      .maybeSingle();

    const defaultFeatures: Record<string, boolean> = {};
    MASTER_FEATURE_CATALOG.forEach((f) => {
      defaultFeatures[f.key] = f.defaultEnabled;
    });

    const tenantMasterFeatures = {
      ...defaultFeatures,
      ...(tenant?.enabled_features || {}),
    };

    // 2. Fetch Tenant Admin Role Permissions
    let rolePermissions = { ...DEFAULT_ROLE_PERMISSIONS };
    try {
      const { data: tSettings } = await supabaseAdmin
        .from("tenant_settings")
        .select("role_permissions, features_override")
        .eq("tenant_id", targetTenantId)
        .maybeSingle();

      if (tSettings?.features_override) {
        Object.assign(tenantMasterFeatures, tSettings.features_override);
      }

      if (tSettings?.role_permissions) {
        rolePermissions = {
          ...DEFAULT_ROLE_PERMISSIONS,
          ...tSettings.role_permissions,
        };
      }
    } catch {}

    return NextResponse.json({
      success: true,
      tenantId: targetTenantId,
      tenantMasterFeatures,
      rolePermissions,
      catalog: MASTER_FEATURE_CATALOG,
    });
  } catch (err: any) {
    console.error("Admin Features GET Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load firm feature permissions." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || !["TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Access denied. Firm Administrator privileges required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const requestedTenant = searchParams.get("tenant") || searchParams.get("tenantId");
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
      if (target) targetTenantId = target.id;
    }

    const body = await req.json();
    const { rolePermissions } = body;

    if (!rolePermissions || typeof rolePermissions !== "object") {
      return NextResponse.json({ error: "Valid rolePermissions map is required." }, { status: 400 });
    }

    // 1. Fetch Super Admin Master Features for Strict Veto Enforcement
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("enabled_features")
      .eq("id", targetTenantId)
      .maybeSingle();

    const masterFeatures = tenant?.enabled_features || {};

    // 2. Clean & sanitize role permissions: Super Admin disabled features CANNOT be turned on by Tenant Admin!
    const sanitizedPermissions: any = {};
    for (const [role, perms] of Object.entries(rolePermissions)) {
      sanitizedPermissions[role] = { ...((perms as any) || {}) };
      for (const [fKey, isEnabled] of Object.entries(sanitizedPermissions[role])) {
        // Strict Veto Enforcement
        if (masterFeatures[fKey] === false) {
          sanitizedPermissions[role][fKey] = false;
        }
      }
    }

    // 3. Save to `tenant_settings.role_permissions`
    const { error: upsertErr } = await supabaseAdmin
      .from("tenant_settings")
      .upsert({
        tenant_id: targetTenantId,
        role_permissions: sanitizedPermissions,
        updated_at: new Date().toISOString(),
      });

    if (upsertErr) {
      console.error("Failed to save role_permissions:", upsertErr);
    }

    return NextResponse.json({
      success: true,
      message: "Role-level feature permissions saved successfully.",
      rolePermissions: sanitizedPermissions,
    });
  } catch (err: any) {
    console.error("Admin Features PATCH Error:", err);
    return NextResponse.json({ error: err.message || "Failed to save firm feature permissions." }, { status: 500 });
  }
}
