import { Suspense } from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import TenantLoginForm, { type TenantBranding } from "@/components/TenantLoginForm";

// Supabase client for Server Component lookups

interface LoginPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function LoginContent({ searchParams }: LoginPageProps) {
  const headersList = await headers();
  const params = await searchParams;

  // 1. Resolve subdomain from middleware request header or query parameter fallback
  const headerSubdomain = headersList.get("x-tenant-subdomain");
  const querySubdomain = 
    typeof params.tenant === "string" 
      ? params.tenant 
      : typeof params.subdomain === "string" 
      ? params.subdomain 
      : null;

  const resolvedSubdomain = (querySubdomain || headerSubdomain || "").toLowerCase().trim();

  let tenant: TenantBranding | null = null;

  // 2. If a specific tenant subdomain is requested, lookup the tenant in Supabase
  if (resolvedSubdomain && resolvedSubdomain !== "www") {
    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("id, subdomain, firm_brand_name, firm_legal_name, logo_url, primary_color, secondary_color, disclaimer_text, arn_number, ria_number, is_active, theme_mode, tenant_type, firm_type")
      .eq("subdomain", resolvedSubdomain)
      .maybeSingle();

    if (error) {
      console.error(`Error querying tenant for subdomain '${resolvedSubdomain}':`, error);
    }

    // 3. If the tenant does not exist or is deactivated, trigger Next.js notFound()
    if (!data || data.is_active === false) {
      notFound();
    }

    // Fetch login_portal_style from tenant_settings branding or tenants column
    let loginPortalStyle = (data as any).login_portal_style;
    if (!loginPortalStyle) {
      try {
        const { data: tsData } = await supabaseAdmin
          .from("tenant_settings")
          .select("branding")
          .eq("tenant_id", data.id)
          .maybeSingle();

        if (tsData?.branding?.login_portal_style) {
          loginPortalStyle = tsData.branding.login_portal_style;
        }
      } catch {}
    }

    tenant = {
      ...data,
      login_portal_style: loginPortalStyle || "UNIVERSAL",
    };
  } else {
    // Platform HQ default lookup for root portal
    try {
      const { data: tsData } = await supabaseAdmin
        .from("tenant_settings")
        .select("branding")
        .eq("tenant_id", "00000000-0000-0000-0000-000000000000")
        .maybeSingle();

      if (tsData?.branding?.login_portal_style) {
        tenant = {
          firm_brand_name: "WealthOS Platform",
          login_portal_style: tsData.branding.login_portal_style,
        };
      }
    } catch {}
  }

  // 4. Render the custom-branded or platform login form
  return <TenantLoginForm tenant={tenant} subdomain={resolvedSubdomain || null} />;
}

export default function LoginPage(props: LoginPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
          <div className="h-8 w-8 rounded-lg border-2 border-sky-500 border-t-transparent animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-medium">Resolving firm portal...</p>
        </div>
      }
    >
      <LoginContent {...props} />
    </Suspense>
  );
}