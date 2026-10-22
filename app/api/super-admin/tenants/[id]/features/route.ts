import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { MASTER_FEATURE_CATALOG } from "@/lib/featureFlags";

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

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        subdomain: tenant.subdomain,
        firmBrandName: tenant.firm_brand_name,
      },
      masterFeatures,
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
    const { features } = body;

    if (!features || typeof features !== "object") {
      return NextResponse.json({ error: "Valid features object is required." }, { status: 400 });
    }

    // Update `enabled_features` in `tenants`
    const { data: updatedTenant, error: updateErr } = await supabaseAdmin
      .from("tenants")
      .update({
        enabled_features: features,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenantId)
      .select("id, subdomain, firm_brand_name, enabled_features")
      .single();

    if (updateErr) {
      // Fallback: If enabled_features column is pending migration, save to tenant_settings.features_override
      await supabaseAdmin
        .from("tenant_settings")
        .upsert({
          tenant_id: tenantId,
          features_override: features,
          updated_at: new Date().toISOString(),
        });
    } else {
      // Also sync to tenant_settings.features_override for compatibility
      await supabaseAdmin
        .from("tenant_settings")
        .upsert({
          tenant_id: tenantId,
          features_override: features,
          updated_at: new Date().toISOString(),
        });
    }

    return NextResponse.json({
      success: true,
      message: "Tenant subscription features updated successfully.",
      features,
    });
  } catch (err: any) {
    console.error("Super Admin Tenant Features PATCH Error:", err);
    return NextResponse.json({ error: err.message || "Failed to update tenant features." }, { status: 500 });
  }
}
