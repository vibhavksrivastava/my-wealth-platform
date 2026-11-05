import { NextResponse, connection } from "next/server";
import { verifyAuthHeader } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { listRiaInvoices } from "@/lib/ria/riaService";
import { generateRiaInvoicePdf, RiaFirmBranding, RiaClientDetails } from "@/lib/ria/riaPdfGenerator";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { id: invoiceId } = await params;
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") || session.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required." }, { status: 400 });
    }

    // 1. Fetch invoice
    const allInvoices = await listRiaInvoices(tenantId);
    const invoice = allInvoices.find((i) => i.invoiceId === invoiceId);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    // 2. Fetch tenant branding
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, subdomain, firm_brand_name, firm_legal_name, arn_number, ria_number, primary_color")
      .eq("id", tenantId)
      .maybeSingle();

    const firm: RiaFirmBranding = {
      firmBrandName: tenant?.firm_brand_name || "Apex Wealth Partners",
      firmLegalName: tenant?.firm_legal_name || "Apex Wealth Advisory Services LLP",
      riaNumber: tenant?.ria_number || "INA000098765",
      baslNumber: "BASL-RIA-2024-098",
      primaryColor: tenant?.primary_color || "#0f766e",
      email: "billing@apexwealth.com",
      address: "Bandra Kurla Complex, Mumbai, Maharashtra 400051",
      gstin: "27AAAAA0000A1Z5",
      bankDetails: {
        accountName: tenant?.firm_legal_name || "Apex Wealth Advisory Services LLP",
        accountNumber: "918020038472918",
        ifscCode: "HDFC0000123",
        bankName: "HDFC Bank Ltd",
        upiHandle: "apexwealth@hdfcbank",
      },
    };

    // 3. Fetch client details
    const { data: clientRec } = await supabaseAdmin
      .from("clients")
      .select("client_id, full_name, uwp_client_code, email, phone")
      .eq("client_id", invoice.clientId)
      .maybeSingle();

    const client: RiaClientDetails = {
      fullName: clientRec?.full_name || "Client Investor",
      clientCode: clientRec?.uwp_client_code || "UWP-IND-001",
      email: clientRec?.email || session.email,
      phone: clientRec?.phone || "+91 98765 43210",
      panNumber: "ABCDE1234F",
    };

    // 4. Generate PDF buffer
    const pdfBuffer = await generateRiaInvoicePdf({ invoice, firm, client });

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Tax_Invoice_${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("Error generating RIA invoice PDF:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate invoice PDF." },
      { status: 500 }
    );
  }
}

