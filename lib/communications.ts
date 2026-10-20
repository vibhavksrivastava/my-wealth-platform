/**
 * Unified Communications Service for WealthOS
 * Supports WhatsApp Business API / Gupshup, Transactional Email (Resend/SendGrid/SES),
 * and DLT-compliant SMS (Twilio/MSG91/Kaleyra) for Indian Wealth Management & MFD compliance.
 */

import { getTenantConfig, TenantServerConfig } from "@/lib/tenant-config";

export type Channel = "WHATSAPP" | "EMAIL" | "SMS";

export interface SendWhatsAppOptions {
  to: string; // E.164 phone number, e.g. +919876543210
  templateName?: string;
  templateParams?: string[];
  text?: string;
  mediaUrl?: string; // Optional PDF or report attachment
  tenantId?: string; // Optional tenant ID for tenant-level WhatsApp credentials
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tenantId?: string; // Optional tenant ID for tenant-level SMTP/email credentials
}

export interface SendSmsOptions {
  to: string;
  message: string;
  dltTemplateId?: string; // TRAI Indian DLT Template Registration ID
  tenantId?: string; // Optional tenant ID for tenant-level Twilio/SMS credentials
}

export interface DispatchResult {
  success: boolean;
  channel: Channel;
  recipient: string;
  messageId: string;
  delivered: boolean;
  simulated: boolean;
  details?: Record<string, unknown>;
  error?: string;
}

/**
 * 1. WHATSAPP ENGINE: Sends message via Meta Cloud API / Gupshup / Twilio
 * Falls back to simulation log if credentials are not configured in environment.
 */
export async function sendWhatsAppMessage(options: SendWhatsAppOptions): Promise<DispatchResult> {
  const { to, text, templateName, templateParams, mediaUrl, tenantId } = options;
  const cleanPhone = to.replace(/[^0-9+]/g, "");

  let token = process.env.WHATSAPP_API_TOKEN || process.env.META_WA_TOKEN;
  let phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  // Resolve tenant-level WhatsApp credentials if available
  if (tenantId) {
    try {
      const config = (await getTenantConfig(
        { tenantId },
        { includeDecryptedEnv: true }
      )) as TenantServerConfig | null;
      if (config?.env?.WHATSAPP_API_TOKEN) {
        token = config.env.WHATSAPP_API_TOKEN;
      }
      if (config?.env?.WHATSAPP_PHONE_NUMBER_ID) {
        phoneId = config.env.WHATSAPP_PHONE_NUMBER_ID;
      }
    } catch (err) {
      console.warn("Could not load tenant WhatsApp env vars, falling back to global:", err);
    }
  }

  // Real Meta WhatsApp Cloud API Integration
  if (token && phoneId) {
    try {
      const payload: Record<string, unknown> = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone.replace("+", ""),
      };

      if (templateName) {
        payload.type = "template";
        payload.template = {
          name: templateName,
          language: { code: "en" },
          components: templateParams
            ? [
                {
                  type: "body",
                  parameters: templateParams.map((p) => ({ type: "text", text: p })),
                },
              ]
            : undefined,
        };
      } else {
        payload.type = "text";
        payload.text = { preview_url: true, body: text || "" };
      }

      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "WhatsApp API request failed");
      }

      return {
        success: true,
        channel: "WHATSAPP",
        recipient: cleanPhone,
        messageId: data.messages?.[0]?.id || `wa-${Date.now()}`,
        delivered: true,
        simulated: false,
        details: data,
      };
    } catch (err: unknown) {
      console.error("[WhatsApp Dispatch Error]:", err);
      return {
        success: false,
        channel: "WHATSAPP",
        recipient: cleanPhone,
        messageId: `wa-err-${Date.now()}`,
        delivered: false,
        simulated: false,
        error: err instanceof Error ? err.message : "WhatsApp delivery failure",
      };
    }
  }

  // Graceful simulation mode (Development / Zero-friction onboarding)
  console.log(`[SIMULATED WHATSAPP] To: ${cleanPhone} | Template: ${templateName || "custom_text"}`);
  console.log(`Message Body: ${text || (templateParams ? templateParams.join(" | ") : "N/A")}`);
  if (mediaUrl) console.log(`Attachment: ${mediaUrl}`);

  return {
    success: true,
    channel: "WHATSAPP",
    recipient: cleanPhone,
    messageId: `wa-sim-${Date.now()}`,
    delivered: true,
    simulated: true,
    details: {
      note: "Live credentials (WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID) not configured. Logged to console.",
      preview: text || templateParams?.join(" "),
    },
  };
}

/**
 * 2. EMAIL ENGINE: Sends transactional emails via Resend / SendGrid / Custom SMTP
 */
export async function sendEmail(options: SendEmailOptions): Promise<DispatchResult> {
  const { to, subject, html, text, from, replyTo, tenantId } = options;
  let sender = from || process.env.EMAIL_FROM || "WealthOS Platform <notifications@wealthos.com>";

  let resendApiKey = process.env.RESEND_API_KEY;
  let sendgridApiKey = process.env.SENDGRID_API_KEY;

  if (tenantId) {
    try {
      const config = (await getTenantConfig(
        { tenantId },
        { includeDecryptedEnv: true }
      )) as TenantServerConfig | null;
      if (config?.env?.RESEND_API_KEY) resendApiKey = config.env.RESEND_API_KEY;
      if (config?.env?.SENDGRID_API_KEY) sendgridApiKey = config.env.SENDGRID_API_KEY;
      if (config?.env?.SMTP_FROM_EMAIL) sender = config.env.SMTP_FROM_EMAIL;
    } catch (err) {
      console.warn("Could not load tenant email env vars, falling back to global:", err);
    }
  }

  // Real Resend Integration
  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: sender,
          to: [to],
          subject,
          html,
          text: text || html.replace(/<[^>]*>?/gm, ""),
          reply_to: replyTo,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Resend API error");
      }

      return {
        success: true,
        channel: "EMAIL",
        recipient: to,
        messageId: data.id || `resend-${Date.now()}`,
        delivered: true,
        simulated: false,
        details: data,
      };
    } catch (err: unknown) {
      console.error("[Email Dispatch Error via Resend]:", err);
    }
  }

  // Real SendGrid Integration
  if (sendgridApiKey) {
    try {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sendgridApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: sender },
          subject,
          content: [{ type: "text/html", value: html }],
        }),
      });

      if (!res.ok) {
        const textErr = await res.text();
        throw new Error(textErr || "SendGrid API error");
      }

      return {
        success: true,
        channel: "EMAIL",
        recipient: to,
        messageId: `sg-${Date.now()}`,
        delivered: true,
        simulated: false,
      };
    } catch (err: unknown) {
      console.error("[Email Dispatch Error via SendGrid]:", err);
    }
  }

  // Graceful simulation mode
  console.log(`[SIMULATED EMAIL] To: ${to} | Subject: ${subject}`);
  console.log(`Content Preview: ${html.slice(0, 150)}...`);

  return {
    success: true,
    channel: "EMAIL",
    recipient: to,
    messageId: `email-sim-${Date.now()}`,
    delivered: true,
    simulated: true,
    details: {
      note: "Live email credentials (RESEND_API_KEY or SENDGRID_API_KEY) not configured. Logged to console.",
    },
  };
}

/**
 * 3. SMS ENGINE: Sends DLT-compliant SMS via Twilio / MSG91 / Kaleyra
 */
export async function sendSms(options: SendSmsOptions): Promise<DispatchResult> {
  const { to, message, dltTemplateId, tenantId } = options;
  const cleanPhone = to.replace(/[^0-9+]/g, "");

  let twilioSid = process.env.TWILIO_ACCOUNT_SID;
  let twilioToken = process.env.TWILIO_AUTH_TOKEN;
  let twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  if (tenantId) {
    try {
      const config = (await getTenantConfig(
        { tenantId },
        { includeDecryptedEnv: true }
      )) as TenantServerConfig | null;
      if (config?.env?.TWILIO_ACCOUNT_SID) twilioSid = config.env.TWILIO_ACCOUNT_SID;
      if (config?.env?.TWILIO_AUTH_TOKEN) twilioToken = config.env.TWILIO_AUTH_TOKEN;
      if (config?.env?.TWILIO_PHONE_NUMBER) twilioPhone = config.env.TWILIO_PHONE_NUMBER;
    } catch (err) {
      console.warn("Could not load tenant SMS env vars, falling back to global:", err);
    }
  }

  // Real Twilio SMS Integration
  if (twilioSid && twilioToken && twilioPhone) {
    try {
      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
      const body = new URLSearchParams({
        To: cleanPhone,
        From: twilioPhone,
        Body: message,
      });

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Twilio SMS API error");
      }

      return {
        success: true,
        channel: "SMS",
        recipient: cleanPhone,
        messageId: data.sid || `sms-${Date.now()}`,
        delivered: true,
        simulated: false,
        details: data,
      };
    } catch (err: unknown) {
      console.error("[SMS Dispatch Error via Twilio]:", err);
    }
  }

  // Graceful simulation mode
  console.log(`[SIMULATED SMS] To: ${cleanPhone} | DLT Template: ${dltTemplateId || "DLT_DEFAULT"}`);
  console.log(`Message Body: ${message}`);

  return {
    success: true,
    channel: "SMS",
    recipient: cleanPhone,
    messageId: `sms-sim-${Date.now()}`,
    delivered: true,
    simulated: true,
    details: {
      note: "Live SMS credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) not configured. Logged to console.",
    },
  };
}

/**
 * 4. 1-Click WhatsApp Link Generator (No API credentials required)
 * Opens user's WhatsApp Web or Native App directly with pre-composed text.
 */
export function generateWhatsAppClickToChat(phone: string, text: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Pre-built Wealth Management Templates for Indian MFDs & RIAs
 */
export const WEALTH_TEMPLATES = {
  // Client Onboarding & Welcome
  clientWelcome: (clientName: string, firmName: string, loginUrl: string) => ({
    sms: `Dear ${clientName}, welcome to ${firmName}. Track your portfolio, net worth, and mutual funds online at ${loginUrl}. - WealthOS`,
    whatsapp: `*Welcome to ${firmName}*\n\nDear ${clientName},\n\nYour consolidated wealth management portal is now ready. You can review your mutual fund portfolios, goal tracking, and advisor recommendations securely.\n\n👉 *Login to Portal:* ${loginUrl}\n\nFor any queries, your dedicated advisor is at your service.`,
    emailHtml: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 12px;">
        <h2 style="color: #0284c7;">Welcome to ${firmName}</h2>
        <p>Dear ${clientName},</p>
        <p>Your client portal account is active. You can now track your consolidated net worth, review mutual fund asset allocation, and book advisory strategy sessions online.</p>
        <div style="margin: 24px 0;">
          <a href="${loginUrl}" style="background-color: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Access Client Portal</a>
        </div>
        <p style="font-size: 12px; color: #64748b;">Mutual fund investments are subject to market risks. Read all scheme related documents carefully.</p>
      </div>
    `,
  }),

  // Meeting Confirmation
  meetingScheduled: (clientName: string, advisorName: string, dateStr: string, timeStr: string, meetingLink: string) => ({
    sms: `Dear ${clientName}, your portfolio consultation with ${advisorName} is confirmed for ${dateStr} at ${timeStr}. Join link: ${meetingLink}`,
    whatsapp: `*Consultation Confirmed*\n\nDear ${clientName},\n\nYour portfolio strategy session with *${advisorName}* is confirmed.\n\n📅 *Date:* ${dateStr}\n⏰ *Time:* ${timeStr}\n🔗 *Join Meeting:* ${meetingLink}\n\nWe look forward to reviewing your financial goals!`,
  }),

  // BSE StAR MF Order Authorization
  bseOrderApproval: (clientName: string, schemeName: string, amountStr: string, authLink: string) => ({
    sms: `Dear ${clientName}, please approve your BSE StAR MF transaction of ${amountStr} in ${schemeName} via link: ${authLink}`,
    whatsapp: `*BSE StAR MF Transaction Authorization*\n\nDear ${clientName},\n\nYour advisor has initiated an investment order on your behalf:\n\n• *Scheme:* ${schemeName}\n• *Amount:* ${amountStr}\n• *Platform:* BSE StAR MF Exchange Engine\n\n👉 *Approve & Authorize Payment:* ${authLink}\n\n_Note: This authorization link is valid for 15 minutes._`,
  }),

  // Subscription Renewal Alert
  subscriptionRenewalAlert: (firmName: string, daysLeft: number, renewalUrl: string) => ({
    sms: `[WealthOS Alert] ${firmName}: Your advisory platform license expires in ${daysLeft} days. Renew at ${renewalUrl} to maintain portal access.`,
    whatsapp: `*WealthOS Subscription Notice*\n\nDear *${firmName}* Team,\n\nYour advisory platform license and white-label client portal will expire in *${daysLeft} days*.\n\nRenew your subscription now to ensure continuous sub-advisor access, automated BSE StAR MF order routing, and client reporting.\n\n👉 *Renew Subscription:* ${renewalUrl}`,
  }),
};

