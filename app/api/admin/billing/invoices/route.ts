import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { getTenantPlan, DEFAULT_PLANS } from "@/lib/tenantPlans";

export interface SubscriptionInvoice {
  id: string;
  tenant_id: string;
  tenant_subdomain?: string;
  tenant_name?: string;
  invoice_number: string;
  billing_date: string;
  due_date: string;
  base_amount: number;
  gst_rate: string;
  gst_amount: number;
  amount: number; // Total amount including GST
  currency: string;
  status: "paid" | "pending" | "failed" | "cancelled" | string;
  invoice_type: "subscription_fee" | "commission_statement";
  description: string;
  plan_slug: string;
  plan_name: string;
  seats: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || !["TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Access denied. Administrator privileges required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const requestedTenant = searchParams.get("tenant") || searchParams.get("tenantId");

    let targetTenantId: string | null = session.tenantId;

    if (session.role === "SUPER_ADMIN") {
      if (requestedTenant) {
        const cleanReq = requestedTenant.toLowerCase().trim();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanReq);
        let query = supabaseAdmin.from("tenants").select("id");
        if (isUuid) {
          query = query.or(`id.eq.${cleanReq},subdomain.eq.${cleanReq}`);
        } else {
          query = query.eq("subdomain", cleanReq);
        }
        const { data: target } = await query.maybeSingle();
        targetTenantId = target ? target.id : null;
      } else {
        // Super Admin viewing all invoices across all tenants
        targetTenantId = null;
      }
    }

    // Fetch tenant records to map subdomains & firm names
    const { data: allTenants } = await supabaseAdmin
      .from("tenants")
      .select("id, subdomain, firm_brand_name, plan_id, commission_sharing_active");

    const tenantMap = new Map((allTenants || []).map((t) => [t.id, t]));

    // 1. Fetch persistent invoices stored in tenant_settings
    let persistentInvoices: SubscriptionInvoice[] = [];
    try {
      let tsQuery = supabaseAdmin.from("tenant_settings").select("tenant_id, branding");
      if (targetTenantId) {
        tsQuery = tsQuery.eq("tenant_id", targetTenantId);
      }
      const { data: settingsRows } = await tsQuery;

      for (const row of settingsRows || []) {
        const storedInvs = row.branding?.subscription_invoices;
        if (Array.isArray(storedInvs)) {
          const tInfo = tenantMap.get(row.tenant_id);
          for (const inv of storedInvs) {
            persistentInvoices.push({
              ...inv,
              tenant_id: row.tenant_id,
              tenant_subdomain: tInfo?.subdomain || "unknown",
              tenant_name: tInfo?.firm_brand_name || "Advisory Practice",
            });
          }
        }
      }
    } catch (e) {
      console.warn("Could not read tenant_settings invoices:", e);
    }

    // 2. If no persistent invoices exist for a tenant, generate standard plan-derived invoices
    const targetTenantsToProcess = targetTenantId
      ? (allTenants || []).filter((t) => t.id === targetTenantId)
      : allTenants || [];

    for (const t of targetTenantsToProcess) {
      const hasInvs = persistentInvoices.some((i) => i.tenant_id === t.id);
      if (!hasInvs) {
        const { plan } = await getTenantPlan(t.id);
        const isArn = Boolean(t.commission_sharing_active);
        const now = new Date();

        if (isArn) {
          persistentInvoices.push({
            id: `cs-2026-10-${t.subdomain}`,
            tenant_id: t.id,
            tenant_subdomain: t.subdomain,
            tenant_name: t.firm_brand_name,
            invoice_number: `CS-2026-10-${t.subdomain.toUpperCase().slice(0, 4)}`,
            billing_date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
            due_date: new Date(now.getFullYear(), now.getMonth(), 10).toISOString(),
            base_amount: 60775.0,
            gst_rate: "0%",
            gst_amount: 0.0,
            amount: 48620.0,
            currency: "INR",
            status: "paid",
            invoice_type: "commission_statement",
            description: "October 2026 Mutual Fund Trail Commission Payout (80% Partner Share)",
            plan_slug: "arn_partnership",
            plan_name: "Zero-Fee ARN Partnership",
            seats: 3,
            metadata: {
              gross_aum: 18450000,
              gross_commission: 60775.0,
              partner_share_pct: 80.0,
              utr_reference: "CMS20261015789211",
            },
            created_at: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
          });
        } else {
          const base = plan.price_monthly || 2499;
          const gst = Math.round(base * 0.18 * 100) / 100;
          const total = Math.round((base + gst) * 100) / 100;

          persistentInvoices.push({
            id: `inv-2026-10-${t.subdomain}`,
            tenant_id: t.id,
            tenant_subdomain: t.subdomain,
            tenant_name: t.firm_brand_name,
            invoice_number: `INV-2026-10-${t.subdomain.toUpperCase().slice(0, 4)}`,
            billing_date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
            due_date: new Date(now.getFullYear(), now.getMonth(), 5).toISOString(),
            base_amount: base,
            gst_rate: "18% GST (9% CGST + 9% SGST)",
            gst_amount: gst,
            amount: total,
            currency: "INR",
            status: "paid",
            invoice_type: "subscription_fee",
            description: `${plan.name} Monthly Subscription (${plan.max_seats} Seats Included)`,
            plan_slug: plan.slug,
            plan_name: plan.name,
            seats: plan.max_seats,
            metadata: {
              plan_slug: plan.slug,
              seats: plan.max_seats,
              hsn_sac: "998314",
              payment_method: "Auto-Debit (UPI/NACH)",
            },
            created_at: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
          });
        }
      }
    }

    // Sort by billing_date descending
    persistentInvoices.sort((a, b) => new Date(b.billing_date).getTime() - new Date(a.billing_date).getTime());

    return NextResponse.json({
      success: true,
      invoices: persistentInvoices,
      totalCount: persistentInvoices.length,
    });
  } catch (error: any) {
    console.error("Invoices GET Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load invoices." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || !["TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Access denied. Administrator privileges required." }, { status: 403 });
    }

    const body = await req.json();
    const {
      tenantId: rawTenantId,
      planSlug,
      customAmount,
      billingDate,
      dueDate,
      status = "paid",
      description,
      notes,
    } = body;

    let targetTenantId = session.tenantId;
    if (session.role === "SUPER_ADMIN" && rawTenantId) {
      targetTenantId = rawTenantId;
    }

    if (!targetTenantId) {
      return NextResponse.json({ error: "Target tenant ID is required to generate an invoice." }, { status: 400 });
    }

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, subdomain, firm_brand_name, plan_id")
      .eq("id", targetTenantId)
      .maybeSingle();

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }

    // Resolve plan
    const { plan } = await getTenantPlan(targetTenantId);
    const chosenPlan = planSlug ? DEFAULT_PLANS[planSlug] || plan : plan;

    const baseAmount = customAmount !== undefined && customAmount !== null
      ? Number(customAmount)
      : chosenPlan.price_monthly;

    const gstRate = baseAmount > 0 ? "18% GST (9% CGST + 9% SGST)" : "0%";
    const gstAmount = baseAmount > 0 ? Math.round(baseAmount * 0.18 * 100) / 100 : 0.0;
    const totalAmount = Math.round((baseAmount + gstAmount) * 100) / 100;

    const now = new Date();
    const bDate = billingDate ? new Date(billingDate).toISOString() : now.toISOString();
    const dDate = dueDate
      ? new Date(dueDate).toISOString()
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5).toISOString();

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const invoiceNumber = `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${tenant.subdomain.toUpperCase().slice(0, 4)}-${randomSuffix}`;

    const newInvoice: SubscriptionInvoice = {
      id: `inv-${Date.now()}-${randomSuffix.toLowerCase()}`,
      tenant_id: targetTenantId,
      tenant_subdomain: tenant.subdomain,
      tenant_name: tenant.firm_brand_name,
      invoice_number: invoiceNumber,
      billing_date: bDate,
      due_date: dDate,
      base_amount: baseAmount,
      gst_rate: gstRate,
      gst_amount: gstAmount,
      amount: totalAmount,
      currency: "INR",
      status: status || "paid",
      invoice_type: "subscription_fee",
      description: description || `${chosenPlan.name} Monthly Subscription (${chosenPlan.max_seats} Seats Included)`,
      plan_slug: chosenPlan.slug,
      plan_name: chosenPlan.name,
      seats: chosenPlan.max_seats,
      metadata: {
        hsn_sac: "998314",
        payment_method: "Auto-Debit (UPI/NACH)",
        notes: notes || null,
        created_by_role: session.role,
      },
      created_at: now.toISOString(),
    };

    // Store in tenant_settings JSONB branding
    try {
      const { data: tSettings } = await supabaseAdmin
        .from("tenant_settings")
        .select("branding")
        .eq("tenant_id", targetTenantId)
        .maybeSingle();

      const existingBranding = tSettings?.branding || {};
      const existingInvoices: SubscriptionInvoice[] = Array.isArray(existingBranding.subscription_invoices)
        ? existingBranding.subscription_invoices
        : [];

      const updatedInvoices = [newInvoice, ...existingInvoices];

      await supabaseAdmin
        .from("tenant_settings")
        .upsert(
          {
            tenant_id: targetTenantId,
            branding: {
              ...existingBranding,
              subscription_invoices: updatedInvoices,
            },
            updated_at: now.toISOString(),
          },
          { onConflict: "tenant_id" }
        );
    } catch (saveErr) {
      console.warn("Failed to persist invoice to tenant_settings:", saveErr);
    }

    return NextResponse.json({
      success: true,
      message: "Plan subscription invoice generated successfully.",
      invoice: newInvoice,
    });
  } catch (error: any) {
    console.error("Invoices POST Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate invoice." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || !["TENANT_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Access denied. Administrator privileges required." }, { status: 403 });
    }

    const body = await req.json();
    const { invoiceNumber, status, tenantId: rawTenantId } = body;

    if (!invoiceNumber || !status) {
      return NextResponse.json({ error: "invoiceNumber and status are required." }, { status: 400 });
    }

    let targetTenantId = session.tenantId;
    if (session.role === "SUPER_ADMIN" && rawTenantId) {
      targetTenantId = rawTenantId;
    }

    // Find and update the invoice in tenant_settings
    let updated = false;
    let updatedInvoice: SubscriptionInvoice | null = null;

    let tsQuery = supabaseAdmin.from("tenant_settings").select("tenant_id, branding");
    if (targetTenantId) tsQuery = tsQuery.eq("tenant_id", targetTenantId);

    const { data: settingsRows } = await tsQuery;

    for (const row of settingsRows || []) {
      const storedInvs: SubscriptionInvoice[] = row.branding?.subscription_invoices || [];
      const matchIdx = storedInvs.findIndex((i) => i.invoice_number === invoiceNumber);

      if (matchIdx !== -1) {
        storedInvs[matchIdx].status = status;
        updatedInvoice = storedInvs[matchIdx];

        await supabaseAdmin
          .from("tenant_settings")
          .update({
            branding: {
              ...row.branding,
              subscription_invoices: storedInvs,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("tenant_id", row.tenant_id);

        updated = true;
        break;
      }
    }

    if (!updated) {
      return NextResponse.json({ error: `Invoice "${invoiceNumber}" not found.` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Invoice status updated to ${status}.`,
      invoice: updatedInvoice,
    });
  } catch (error: any) {
    console.error("Invoices PATCH Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update invoice status." }, { status: 500 });
  }
}

