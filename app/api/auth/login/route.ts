import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import { ROLE_PERMISSIONS, ROLES, type Role } from "@/lib/permissions";

// Initialize Supabase Admin Client using HTTPS (Bypasses raw TCP/SASL issues completely)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_local_dev";

export async function POST(req: Request) {
  try {
    const { email, password, portalType, tenantSubdomain } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    let lookupEmail = email.toLowerCase().trim();
    const sub = (tenantSubdomain || "").toLowerCase().trim();

    if (lookupEmail === "superadmin") lookupEmail = "superadmin@unifiedwealth.com";
    if (lookupEmail === "admin") {
      if (sub === "zenith9186") lookupEmail = "admin@zenith9186.com";
      else if (sub === "aasinvestment") lookupEmail = "abachhan@aasinvestment.com";
      else if (sub === "apex") lookupEmail = "admin@example.com";
      else lookupEmail = "superadmin@unifiedwealth.com"; // Default for root platform / localhost:3000
    }
    if (lookupEmail === "advisor") {
      if (sub === "zenith9186") lookupEmail = "ssharma@zenith9186.com";
      else if (sub === "aasinvestment") lookupEmail = "mpandey@aasinvestment.com";
      else lookupEmail = "pallavi@example.com";
    }
    if (lookupEmail === "client") {
      if (sub === "zenith9186") lookupEmail = "kabir@zenith9186.com";
      else if (sub === "aasinvestment") lookupEmail = "vikram@aasinvestment.com";
      else lookupEmail = "vibhav@example.com";
    }

    // Query user record securely over HTTPS via Supabase API
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, tenant_id, email, password_hash, role, first_name, last_name, is_active")
      .eq("email", lookupEmail)
      .maybeSingle();

    if (userError) {
      console.error("Auth User Query Error:", userError);
      return NextResponse.json(
        { error: "Database error during authentication." },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: `Invalid credentials provided. No account found for ${lookupEmail}.` },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: "This account has been deactivated. Contact administration." },
        { status: 403 }
      );
    }

    // Verify Password Hash using bcrypt
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid password provided. Please verify your password." },
        { status: 401 }
      );
    }

    // Role vs Tab Validation (SUPER_ADMIN can authenticate from any portal tab)
    if (user.role !== ROLES.SUPER_ADMIN) {
      if (portalType === "CLIENT" && user.role !== ROLES.CLIENT) {
        return NextResponse.json(
          { error: "Please use the Advisor or Admin tab to log into your account." },
          { status: 403 }
        );
      }
      if (portalType === "ADVISOR" && ![ROLES.ADVISOR, ROLES.STAFF].includes(user.role)) {
        return NextResponse.json(
          { error: "This tab is reserved for Advisors and Distributors." },
          { status: 403 }
        );
      }
      if (portalType === "ADMIN" && ![ROLES.TENANT_ADMIN].includes(user.role)) {
        return NextResponse.json(
          { error: "Access denied. Administrative rights required." },
          { status: 403 }
        );
      }
    }

    // Subdomain Tenant Isolation Validation
    if (tenantSubdomain && tenantSubdomain !== "platform" && user.role !== ROLES.SUPER_ADMIN) {
      const { data: targetTenant } = await supabaseAdmin
        .from("tenants")
        .select("id, firm_brand_name")
        .eq("subdomain", tenantSubdomain.toLowerCase().trim())
        .maybeSingle();

      if (targetTenant && user.tenant_id && user.tenant_id !== targetTenant.id) {
        return NextResponse.json(
          { 
            error: `Access Denied: This account is registered with another advisory firm, not ${targetTenant.firm_brand_name}. Please log in via your firm's designated URL.` 
          },
          { status: 403 }
        );
      }
    }

    // Fetch Tenant Branding & Validate Lifecycle (Active + Subscription Expiry)
    let tenantData = null;
    if (user.tenant_id) {
      let { data: tenant, error: tenantErr } = await supabaseAdmin
        .from("tenants")
        .select("id, subdomain, firm_brand_name, tenant_type, primary_color, secondary_color, theme_mode, logo_url, is_active, subscription_expires_at, commission_sharing_active")
        .eq("id", user.tenant_id)
        .maybeSingle();

      if (tenantErr) {
        const fallback = await supabaseAdmin
          .from("tenants")
          .select("id, subdomain, firm_brand_name, tenant_type, primary_color, secondary_color, theme_mode, logo_url, is_active")
          .eq("id", user.tenant_id)
          .maybeSingle();
        tenant = fallback.data as any;
      }

      if (tenant) {
        tenantData = tenant;

        // SUPER_ADMIN is exempt from tenant deactivation or expiry
        if (user.role !== ROLES.SUPER_ADMIN) {
          if (tenant.is_active === false) {
            return NextResponse.json(
              { error: "This advisory firm account has been deactivated. Please contact support." },
              { status: 403 }
            );
          }

          // Subscription Expiry Check (bypassed if commission_sharing_active is true)
          const isArnPartner = Boolean(tenant.commission_sharing_active);
          if (!isArnPartner && tenant.subscription_expires_at) {
            const expiresAt = new Date(tenant.subscription_expires_at).getTime();
            if (Date.now() > expiresAt) {
              return NextResponse.json(
                {
                  error: `Subscription Expired: The platform subscription for ${tenant.firm_brand_name} has expired. Please renew your plan to restore advisor and client portal access.`,
                  code: "SUBSCRIPTION_EXPIRED",
                  subscriptionExpired: true,
                  renewalUrl: `/renew-account?tenant=${tenant.subdomain}`,
                  tenantSubdomain: tenant.subdomain,
                },
                { status: 403 }
              );
            }
          }
        }
      }
    }

    // Generate Session JWT
    const token = jwt.sign(
      {
        sub: user.id,
        tenantId: user.tenant_id,
        role: user.role,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        permissions: ROLE_PERMISSIONS[user.role as Role] || [],
      },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    // Update last login timestamp
    await supabaseAdmin
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.id);

    return NextResponse.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
      },
      tenant: tenantData,
    });
  } catch (error) {
    console.error("Auth Login Route Error:", error);
    return NextResponse.json(
      { error: "Internal server error during authentication." },
      { status: 500 }
    );
  }
}