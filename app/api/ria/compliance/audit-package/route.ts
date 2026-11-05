import { NextResponse, connection } from "next/server";
import { verifyAuthHeader } from "@/lib/auth";
import { compileRiaAuditVault } from "@/lib/ria/riaService";
import { generateRiaAuditVaultPdf } from "@/lib/ria/riaPdfGenerator";

export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") || session.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required." }, { status: 400 });
    }

    // 1. Compile full audit dataset
    const vaultData = await compileRiaAuditVault(tenantId);

    // 2. Render Audit Vault PDF
    const pdfBuffer = await generateRiaAuditVaultPdf({ vaultData });

    const safeFirmName = (vaultData.tenant.firm_brand_name || "RIA_Firm").replace(/[^a-zA-Z0-9]/g, "_");
    const today = new Date().toISOString().split("T")[0];

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="SEBI_BASL_Audit_Report_${safeFirmName}_${today}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("Error generating RIA compliance audit package PDF:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate compliance audit report." },
      { status: 500 }
    );
  }
}
