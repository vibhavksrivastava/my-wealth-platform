import { NextResponse, connection } from "next/server";
import { verifyAuthHeader } from "@/lib/auth";
import {
  getTenantConfig,
  updateTenantConfig,
  type TenantServerConfig,
} from "@/lib/tenant-config/server";
import { maskSecret } from "@/lib/tenant-config/crypto";

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

    if (session.role === "SUPER_ADMIN" && requestedTenant) {
      const cleanReq = requestedTenant.toLowerCase().trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanReq);
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
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

    // Fetch full server config including encrypted env vars
    const serverConfig = (await getTenantConfig(
      { tenantId: targetTenantId },
      { includeDecryptedEnv: true }
    )) as TenantServerConfig | null;

    if (!serverConfig) {
      return NextResponse.json(
        { error: "Tenant configuration not found." },
        { status: 404 }
      );
    }

    // Generate safe masked view of environment variables for the Admin UI
    const maskedEnv: Record<
      string,
      { isConfigured: boolean; maskedValue: string }
    > = {};

    const standardKeys = [
      "WHATSAPP_API_TOKEN",
      "WHATSAPP_PHONE_NUMBER_ID",
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_PHONE_NUMBER",
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASSWORD",
      "SMTP_FROM_EMAIL",
      "CUSTOM_WEBHOOK_URL",
      "WEBHOOK_SECRET",
    ];

    // Check standard keys and any custom keys stored in encryptedEnvVars
    const allKeys = new Set([
      ...standardKeys,
      ...Object.keys(serverConfig.env || {}),
    ]);

    for (const key of allKeys) {
      const val = serverConfig.env?.[key];
      if (val && val.trim() !== "") {
        maskedEnv[key] = {
          isConfigured: true,
          maskedValue: maskSecret(val),
        };
      } else {
        maskedEnv[key] = {
          isConfigured: false,
          maskedValue: "",
        };
      }
    }

    const { env, encryptedEnvVars, ...publicConfig } = serverConfig;

    return NextResponse.json({
      success: true,
      config: publicConfig,
      integrations: maskedEnv,
    });
  } catch (error: any) {
    console.error("GET /api/admin/tenant-config error:", error);
    return NextResponse.json(
      { error: "Failed to load tenant configuration." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
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
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
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
    const { customDomain, branding, envVars, featuresOverride } = body;

    // Filter envVars: ignore values that are still masked (e.g. starting with `••••`)
    const sanitizedEnvVars: Record<string, string | null> = {};
    if (envVars && typeof envVars === "object") {
      for (const [key, value] of Object.entries(envVars)) {
        if (typeof value === "string") {
          // If user didn't modify masked value, don't overwrite
          if (value.startsWith("••••")) {
            continue;
          }
          sanitizedEnvVars[key] = value.trim();
        } else if (value === null) {
          sanitizedEnvVars[key] = null; // explicit delete
        }
      }
    }

    const updateResult = await updateTenantConfig(targetTenantId, {
      customDomain,
      branding,
      envVars: sanitizedEnvVars,
      featuresOverride,
    });

    if (!updateResult.success) {
      return NextResponse.json(
        { error: updateResult.error || "Failed to update configuration." },
        { status: 400 }
      );
    }

    // Return fresh updated config
    const updated = await getTenantConfig(
      { tenantId: targetTenantId },
      { includeDecryptedEnv: false }
    );

    return NextResponse.json({
      success: true,
      message: "Tenant environment variables and configuration saved securely.",
      config: updated,
    });
  } catch (error: any) {
    console.error("PUT /api/admin/tenant-config error:", error);
    return NextResponse.json(
      { error: "Failed to update tenant configuration." },
      { status: 500 }
    );
  }
}

