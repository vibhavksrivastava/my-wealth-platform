import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { MASTER_FEATURE_CATALOG, DEFAULT_ROLE_PERMISSIONS } from "@/lib/featureFlags";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Access denied. Super Admin privileges required." }, { status: 403 });
    }

    const { id: tenantId } = await params;

    // Fetch tenant master features
    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("id, subdomain, firm_brand_name, enabled_features, plan_id")
      .eq("id", tenantId)
      .maybeSingle();

    if (error || !tenant) {
      return NextResponse.json({ error: "Tenant record not found." }, { status: 404 });
    }

    // Default all features from catalog if not yet set
    const defaultFeatures: Record<string, boolean> = {};
    MASTER_FEATURE_CATALOG.forEach((f) => {
      defaultFeatures[f.key] = f.defaultEnabled;
    });

    const masterFeatures = {
      ...defaultFeatures,
      ...(tenant.enabled_features || {}),
    };

    // Fetch tenant role permissions (Client, Advisor, Staff)
    let rolePermissions = { ...DEFAULT_ROLE_PERMISSIONS };
    try {
      const { data: tSettings } = await supabaseAdmin
        .from("tenant_settings")
        .select("role_permissions, features_override")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (tSettings?.features_override) {
        Object.assign(masterFeatures, tSettings.features_override);
      }

      if (tSettings?.role_permissions) {
        rolePermissions = {
          ...DEFAULT_ROLE_PERMISSIONS,
          ...tSettings.role_permissions,
        };
      }
    } catch {
      // Fallback to default role permissions
    }

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        subdomain: tenant.subdomain,
        firmBrandName: tenant.firm_brand_name,
      },
      masterFeatures,
      rolePermissions,
      catalog: MASTER_FEATURE_CATALOG,
    });
  } catch (err: any) {
    console.error("Super Admin Tenant Features GET Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load tenant features." }, { status: 500 });
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
      return NextResponse.json({ error: "Access denied. Super Admin privileges required." }, { status: 403 });
    }

    const { id: tenantId } = await params;
    const body = await req.json();
    const { features, rolePermissions } = body;

    let updatedFeatures = features;

    // 1. If features provided, update `enabled_features` in `tenants` & `tenant_settings`
    if (features && typeof features === "object") {
      const { error: updateErr } = await supabaseAdmin
        .from("tenants")
        .update({
          enabled_features: features,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tenantId);

      if (updateErr) {
        await supabaseAdmin
          .from("tenant_settings")
          .upsert({
            tenant_id: tenantId,
            features_override: features,
            updated_at: new Date().toISOString(),
          });
      } else {
        await supabaseAdmin
          .from("tenant_settings")
          .upsert({
            tenant_id: tenantId,
            features_override: features,
            updated_at: new Date().toISOString(),
          });
      }
      updatedFeatures = features;
    }

    // 2. If rolePermissions provided, sanitize against master features and save
    let sanitizedRolePermissions = rolePermissions;
    if (rolePermissions && typeof rolePermissions === "object") {
      sanitizedRolePermissions = {};
      const activeMaster = updatedFeatures || {};

      for (const [role, perms] of Object.entries(rolePermissions)) {
        sanitizedRolePermissions[role] = { ...((perms as any) || {}) };
        for (const [fKey, isEnabled] of Object.entries(sanitizedRolePermissions[role])) {
          // If feature is disabled by Super Admin at tenant master level, it CANNOT be enabled for any role
          if (activeMaster[fKey] === false) {
            sanitizedRolePermissions[role][fKey] = false;
          }
        }
      }

      await supabaseAdmin
        .from("tenant_settings")
        .upsert({
          tenant_id: tenantId,
          role_permissions: sanitizedRolePermissions,
          updated_at: new Date().toISOString(),
        });
    }

    return NextResponse.json({
      success: true,
      message: "Tenant subscription features and client role permissions updated successfully.",
      features: updatedFeatures,
      rolePermissions: sanitizedRolePermissions,
    });
  } catch (err: any) {
    console.error("Super Admin Tenant Features PATCH Error:", err);
    return NextResponse.json({ error: err.message || "Failed to update tenant features." }, { status: 500 });
  }
}
