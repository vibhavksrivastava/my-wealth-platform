import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { verifyAuthHeader } from "@/lib/auth";
import { DEFAULT_PLANS } from "@/lib/tenantPlans";


export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Super Administrator privileges required." },
        { status: 403 }
      );
    }

    const [tenantsRes, usersRes, clientProfilesRes, plansRes] = await Promise.all([
      supabaseAdmin.from("tenants").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("users").select("id, tenant_id, role, email, first_name, last_name, is_active"),
      supabaseAdmin.from("client_profiles").select("tenant_id, total_assets, net_worth"),
      supabaseAdmin.from("plans").select("*"),
    ]);

    if (tenantsRes.error) {
      throw tenantsRes.error;
    }

    const tenants = tenantsRes.data || [];
    const users = usersRes.data || [];
    const clientProfiles = clientProfilesRes.data || [];
    const dbPlans = plansRes?.data || [];

    const plansMap: Record<string, unknown> = {};
    dbPlans.forEach((p) => {
      plansMap[p.id] = p;
      plansMap[p.slug] = p;
    });

    // Aggregate stats per tenant
    const enrichedTenants = tenants.map((tenant) => {
      const tenantUsers = users.filter((u) => u.tenant_id === tenant.id);
      const tenantAdmins = tenantUsers.filter((u) => u.role === "TENANT_ADMIN");
      const clientCount = tenantUsers.filter((u) => u.role === "CLIENT").length;
      const advisorCount = tenantUsers.filter((u) => u.role === "ADVISOR" || u.role === "STAFF").length;

      const tenantProfiles = clientProfiles.filter((cp) => cp.tenant_id === tenant.id);
      const totalAUM = tenantProfiles.reduce((sum, cp) => sum + Number(cp.total_assets || 0), 0);
      const totalNetWorth = tenantProfiles.reduce((sum, cp) => sum + Number(cp.net_worth || 0), 0);

      const primaryAdmin = tenantAdmins[0] || null;

      let resolvedPlan = tenant.plan_id ? (plansMap[tenant.plan_id] as typeof DEFAULT_PLANS["growth"]) : null;
      if (!resolvedPlan) {
        if (tenant.commission_sharing_active) resolvedPlan = DEFAULT_PLANS.arn_partnership;
        else if (tenant.subdomain === "apex" || tenant.subdomain === "platform") resolvedPlan = DEFAULT_PLANS.enterprise;
        else resolvedPlan = DEFAULT_PLANS.growth;
      }

      return {
        ...tenant,
        plan: resolvedPlan,
        stats: {
          clientCount,
          advisorCount,
          adminCount: tenantAdmins.length,
          totalAUM,
          totalNetWorth,
        },
        primaryAdmin: primaryAdmin
          ? {
              id: primaryAdmin.id,
              name: `${primaryAdmin.first_name} ${primaryAdmin.last_name}`,
              email: primaryAdmin.email,
              isActive: primaryAdmin.is_active,
            }
          : null,
      };
    });

    return NextResponse.json({ tenants: enrichedTenants });
  } catch (error) {
    console.error("Super Admin Tenants GET Error:", error);
    return NextResponse.json({ error: "Failed to load tenants directory." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Super Administrator privileges required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      firmLegalName,
      firmBrandName,
      tenantType = "RIA",
      subdomain,
      customDomain,
      arnNumber,
      riaNumber,
      primaryColor = "#0284c7",
      secondaryColor = "#0f172a",
      logoUrl,
      disclaimerText = "Mutual fund investments are subject to market risks. Read all scheme related documents carefully.",
      adminFirstName,
      adminLastName,
      adminEmail,
      adminPhone,
      initialPassword,
    } = body;

    if (!firmLegalName || !firmBrandName || !subdomain || !adminEmail || !adminFirstName || !adminLastName) {
      return NextResponse.json(
        { error: "Missing required fields: firm legal name, brand name, subdomain, admin email, and admin name." },
        { status: 400 }
      );
    }

    const cleanSubdomain = subdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, "");
    const cleanAdminEmail = adminEmail.toLowerCase().trim();

    // Check if subdomain is already taken
    const { data: existingSubdomain } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("subdomain", cleanSubdomain)
      .maybeSingle();

    if (existingSubdomain) {
      return NextResponse.json(
        { error: `The subdomain "${cleanSubdomain}" is already registered. Please choose another.` },
        { status: 409 }
      );
    }

    // Check if admin email already exists
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", cleanAdminEmail)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: `A user with email "${cleanAdminEmail}" already exists across the platform.` },
        { status: 409 }
      );
    }

    // Generate or use temporary password
    const tempPassword = initialPassword?.trim() || `Wealth@${Math.random().toString(36).slice(-6)}!`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Resolve Plan ID
    const planSlug = body.planSlug || "growth";
    let planId = body.planId || null;
    try {
      const { data: dbPlan } = await supabaseAdmin
        .from("plans")
        .select("id")
        .eq("slug", planSlug)
        .maybeSingle();
      if (dbPlan) planId = dbPlan.id;
    } catch {
      // Fallback
    }

    const isArnPartner = Boolean(body.commissionSharingActive || planSlug === "arn_partnership");
    const expiryDays = isArnPartner ? 365 : 45;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

    // 1. Create Tenant
    const { data: newTenant, error: tenantErr } = await supabaseAdmin
      .from("tenants")
      .insert({
        subdomain: cleanSubdomain,
        firm_legal_name: firmLegalName.trim(),
        firm_brand_name: firmBrandName.trim(),
        tenant_type: tenantType,
        arn_number: arnNumber ? arnNumber.trim() : null,
        ria_number: riaNumber ? riaNumber.trim() : null,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        custom_domain: customDomain ? customDomain.trim() : null,
        logo_url: logoUrl ? logoUrl.trim() : null,
        disclaimer_text: disclaimerText.trim(),
        plan_id: planId,
        commission_sharing_active: isArnPartner,
        subscription_expires_at: expiresAt,
        is_active: true,
      })
      .select()
      .single();

    if (tenantErr || !newTenant) {
      console.error("Failed to create tenant:", tenantErr);
      return NextResponse.json(
        { error: tenantErr?.message || "Failed to create tenant organization." },
        { status: 500 }
      );
    }

    // 2. Create Initial Tenant Admin User
    const { data: newUser, error: userErr } = await supabaseAdmin
      .from("users")
      .insert({
        tenant_id: newTenant.id,
        email: cleanAdminEmail,
        password_hash: passwordHash,
        first_name: adminFirstName.trim(),
        last_name: adminLastName.trim(),
        phone_number: adminPhone ? adminPhone.trim() : null,
        role: "TENANT_ADMIN",
        is_active: true,
      })
      .select("id, email, role, first_name, last_name, is_active, created_at")
      .single();

    if (userErr || !newUser) {
      console.error("Failed to provision tenant admin:", userErr);
      // Clean up tenant if user creation fails
      await supabaseAdmin.from("tenants").delete().eq("id", newTenant.id);
      return NextResponse.json(
        { error: "Failed to create Tenant Administrator account. Tenant creation reverted." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tenant firm and Administrator provisioned successfully.",
      tenant: newTenant,
      admin: {
        id: newUser.id,
        email: newUser.email,
        fullName: `${newUser.first_name} ${newUser.last_name}`,
        role: newUser.role,
        tempPassword,
      },
    });
  } catch (error) {
    console.error("Super Admin Tenants POST Error:", error);
    return NextResponse.json(
      { error: "Internal server error while provisioning new tenant firm." },
      { status: 500 }
    );
  }
}

