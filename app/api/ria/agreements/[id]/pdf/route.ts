import { NextResponse, connection } from "next/server";
import { verifyAuthHeader } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getClientAgreement } from "@/lib/ria/riaService";
import { generateRiaAgreementPdf, RiaFirmBranding, RiaClientDetails } from "@/lib/ria/riaPdfGenerator";

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

    const { id: agreementId } = await params;
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const tenantId = searchParams.get("tenantId") || session.tenantId;

    if (!tenantId || !clientId) {
      return NextResponse.json({ error: "Tenant ID and Client ID are required." }, { status: 400 });
    }

    // 1. Fetch agreement
    const agreement = await getClientAgreement(tenantId, clientId);
    if (!agreement) {
      return NextResponse.json({ error: "Advisory agreement not found." }, { status: 404 });
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
      email: "advisory@apexwealth.com",
      address: "Bandra Kurla Complex, Mumbai, Maharashtra 400051",
    };

    // 3. Fetch client details
    const { data: clientRec } = await supabaseAdmin
      .from("clients")
      .select("client_id, full_name, uwp_client_code, email, phone")
      .eq("client_id", clientId)
      .maybeSingle();

    const client: RiaClientDetails = {
      fullName: clientRec?.full_name || "Client Investor",
      clientCode: clientRec?.uwp_client_code || "UWP-IND-001",
      email: clientRec?.email || session.email,
      phone: clientRec?.phone || "+91 98765 43210",
      panNumber: "ABCDE1234F",
    };

    // 4. Generate PDF buffer
    const pdfBuffer = await generateRiaAgreementPdf({ agreement, firm, client });

    const safeClientName = client.fullName.replace(/[^a-zA-Z0-9]/g, "_");
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="SEBI_Advisory_Agreement_${safeClientName}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("Error generating RIA agreement PDF:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate agreement PDF." },
      { status: 500 }
    );
  }
}

