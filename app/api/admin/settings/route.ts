import { NextResponse, connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAuthHeader } from "@/lib/auth";

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

    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("id, subdomain, firm_legal_name, firm_brand_name, tenant_type, arn_number, ria_number, logo_url, favicon_url, primary_color, secondary_color, custom_domain, disclaimer_text, is_active, created_at")
      .eq("id", session.tenantId)
      .maybeSingle();

    if (error || !tenant) {
      return NextResponse.json({ error: "Tenant settings not found." }, { status: 404 });
    }

    return NextResponse.json({ tenant });
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

    const body = await req.json();
    const {
      firmBrandName,
      firmLegalName,
      arnNumber,
      riaNumber,
      logoUrl,
      primaryColor,
      secondaryColor,
      customDomain,
      disclaimerText,
    } = body;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (firmBrandName) updates.firm_brand_name = firmBrandName.trim();
    if (firmLegalName) updates.firm_legal_name = firmLegalName.trim();
    if (arnNumber !== undefined) updates.arn_number = arnNumber ? arnNumber.trim() : null;
    if (riaNumber !== undefined) updates.ria_number = riaNumber ? riaNumber.trim() : null;
    if (logoUrl !== undefined) updates.logo_url = logoUrl ? logoUrl.trim() : null;
    if (primaryColor) updates.primary_color = primaryColor.trim();
    if (secondaryColor) updates.secondary_color = secondaryColor.trim();
    if (customDomain !== undefined) updates.custom_domain = customDomain ? customDomain.trim() : null;
    if (disclaimerText !== undefined) updates.disclaimer_text = disclaimerText ? disclaimerText.trim() : null;

    const { data: updatedTenant, error } = await supabaseAdmin
      .from("tenants")
      .update(updates)
      .eq("id", session.tenantId)
      .select()
      .single();

    if (error || !updatedTenant) {
      throw error || new Error("Failed to update tenant settings.");
    }

    return NextResponse.json({
      success: true,
      message: "Firm branding and compliance settings updated.",
      tenant: updatedTenant,
    });
  } catch (error) {
    console.error("Tenant Admin Settings PATCH Error:", error);
    return NextResponse.json(
      { error: "Failed to update firm settings." },
      { status: 500 }
    );
  }
}

