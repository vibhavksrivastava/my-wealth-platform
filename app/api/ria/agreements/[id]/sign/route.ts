import { NextResponse, connection } from "next/server";
import { verifyAuthHeader } from "@/lib/auth";
import { signAgreementDigital } from "@/lib/ria/riaService";

export async function POST(
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
    const body = await req.json();
    const { clientSignatureName, mitcAccepted, tenantId = session.tenantId } = body;

    if (!agreementId) {
      return NextResponse.json({ error: "Agreement ID is required." }, { status: 400 });
    }
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required." }, { status: 400 });
    }
    if (!mitcAccepted) {
      return NextResponse.json(
        {
          error:
            "Mandatory SEBI Requirement: You must explicitly review and accept the Most Important Terms and Conditions (MITC) before executing the agreement.",
        },
        { status: 400 }
      );
    }
    if (!clientSignatureName || !clientSignatureName.trim()) {
      return NextResponse.json(
        { error: "Full legal name is required for digital e-signature." },
        { status: 400 }
      );
    }

    const forwarded = req.headers.get("x-forwarded-for");
    const signerIpAddress = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Web Client";

    const updatedAgreement = await signAgreementDigital({
      tenantId,
      agreementId,
      clientSignatureName: clientSignatureName.trim(),
      signerIpAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "Advisory agreement signed and executed digitally. Client is now activated for advisory services.",
      agreement: updatedAgreement,
    });
  } catch (err: any) {
    console.error("Error signing RIA agreement:", err);
    return NextResponse.json(
      { error: err.message || "Failed to sign advisory agreement." },
      { status: 500 }
    );
  }
}

