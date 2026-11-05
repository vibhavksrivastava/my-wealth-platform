import { NextResponse, connection } from "next/server";
import { verifyAuthHeader } from "@/lib/auth";
import {
  compileRiaAuditVault,
  recordClientRiskAssessment,
  recordPreTradeConsent,
} from "@/lib/ria/riaService";

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

    const vault = await compileRiaAuditVault(tenantId);

    return NextResponse.json({
      success: true,
      vault,
    });
  } catch (err: any) {
    console.error("Error fetching RIA compliance vault data:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch RIA compliance vault." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await req.json();
    const { action, tenantId = session.tenantId } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required." }, { status: 400 });
    }

    if (action === "RISK_ASSESSMENT") {
      const { clientId, riskScore, riskCategory, questionnaireResponses, assessorName } = body;
      if (!clientId) {
        return NextResponse.json({ error: "Client ID is required." }, { status: 400 });
      }

      const log = await recordClientRiskAssessment({
        tenantId,
        clientId,
        riskScore: Number(riskScore || 50),
        riskCategory: riskCategory || "Moderate",
        questionnaireResponses: questionnaireResponses || {},
        assessorName: assessorName || session.firstName + " " + session.lastName,
      });

      return NextResponse.json({
        success: true,
        message: "Risk assessment recorded. Annual renewal timer initialized (365 days).",
        log,
      });
    }

    if (action === "PRE_TRADE_CONSENT") {
      const {
        clientId,
        schemeCode,
        schemeName,
        recommendationType,
        rationaleText,
        targetAmount,
        consentGranted,
        consentChannel,
      } = body;

      if (!clientId || !schemeCode || !rationaleText) {
        return NextResponse.json(
          { error: "Client ID, Scheme Code, and Advisory Rationale are required." },
          { status: 400 }
        );
      }

      const forwarded = req.headers.get("x-forwarded-for");
      const clientIp = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

      const log = await recordPreTradeConsent({
        tenantId,
        clientId,
        schemeCode,
        schemeName: schemeName || schemeCode,
        recommendationType: recommendationType || "BUY",
        rationaleText,
        targetAmount: Number(targetAmount || 0),
        consentGranted: Boolean(consentGranted),
        consentChannel: consentChannel || "DIGITAL_POSITIVE_CONSENT",
        clientIp,
      });

      return NextResponse.json({
        success: true,
        message: consentGranted
          ? "Pre-trade positive consent verified & logged for regulatory audit."
          : "Trade recommendation logged without execution consent.",
        log,
      });
    }

    return NextResponse.json({ error: "Invalid compliance action specified." }, { status: 400 });
  } catch (err: any) {
    console.error("Error logging RIA compliance record:", err);
    return NextResponse.json(
      { error: err.message || "Failed to record compliance entry." },
      { status: 500 }
    );
  }
}

