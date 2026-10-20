import { NextResponse, connection } from "next/server";
import { verifyAuthHeader } from "@/lib/auth";
import {
  sendWhatsAppMessage,
  sendEmail,
  sendSms,
  type Channel,
  type DispatchResult,
} from "@/lib/communications";

export async function POST(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session || !["SUPER_ADMIN", "TENANT_ADMIN", "ADVISOR"].includes(session.role)) {
      return NextResponse.json(
        { error: "Access denied. Advisor or Administrator privileges required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      channel,
      recipient,
      message,
      subject,
      html,
      templateName,
      templateParams,
      contentSid,
      contentVariables,
    } = body;

    if (!channel || !recipient) {
      return NextResponse.json(
        { error: "Channel (WHATSAPP, EMAIL, SMS) and recipient are required." },
        { status: 400 }
      );
    }

    let result: DispatchResult;

    switch (channel.toUpperCase() as Channel) {
      case "WHATSAPP":
        result = await sendWhatsAppMessage({
          to: recipient,
          text: message,
          templateName,
          templateParams,
          tenantId: session.tenantId,
          contentSid,
          contentVariables,
        });
        break;

      case "EMAIL":
        if (!subject) {
          return NextResponse.json({ error: "Email subject is required." }, { status: 400 });
        }
        result = await sendEmail({
          to: recipient,
          subject,
          html: html || `<p>${message}</p>`,
          text: message,
          tenantId: session.tenantId,
        });
        break;

      case "SMS":
        result = await sendSms({
          to: recipient,
          message: message || "WealthOS notification",
          tenantId: session.tenantId,
        });
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported channel: ${channel}. Allowed: WHATSAPP, EMAIL, SMS` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result.success,
      result,
    });
  } catch (error) {
    console.error("Communications API Error:", error);
    return NextResponse.json(
      { error: "Failed to dispatch communication." },
      { status: 500 }
    );
  }
}

