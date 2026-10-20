"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Mail,
  Smartphone,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Shield,
  Zap,
  Code2,
  Copy,
  Check,
  Calendar,
  Sparkles,
} from "lucide-react";

export default function CommunicationsDashboardPage() {
  const [selectedChannel, setSelectedChannel] = useState<"WHATSAPP" | "EMAIL" | "SMS">("WHATSAPP");
  const [recipient, setRecipient] = useState("+91 98765 43210");
  const [subject, setSubject] = useState("Portfolio Valuation & Strategy Review");
  const [selectedTemplate, setSelectedTemplate] = useState("welcome");
  const [customMessage, setCustomMessage] = useState(
    "Dear Rajesh, your monthly mutual fund portfolio valuation report is ready. You can review your asset allocation and book our quarterly strategy call at: https://zenith9186.wealthos.com/dashboard/client"
  );

  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleTemplateChange = (tpl: string) => {
    setSelectedTemplate(tpl);
    if (tpl === "welcome") {
      setCustomMessage(
        "Welcome to Zenith Wealth! Your consolidated wealth management portal is now active. Log in at https://zenith9186.wealthos.com/login to review your investments."
      );
      setSubject("Welcome to Your Wealth Management Portal");
    } else if (tpl === "meeting") {
      setCustomMessage(
        "Dear Rajesh, your portfolio strategy consultation with Advisor Pallavi is confirmed for Friday at 3:00 PM IST. Join link: https://meet.google.com/xyz-wealth"
      );
      setSubject("Meeting Confirmed: Portfolio Strategy Consultation");
    } else if (tpl === "bse") {
      setCustomMessage(
        "BSE StAR MF Authorization: Your advisor initiated an SIP of ₹25,000 in HDFC Top 100 Fund. Click to authorize payment: https://bsetransact.com/auth/9186"
      );
      setSubject("Action Required: Authorize BSE StAR MF Transaction");
    } else if (tpl === "renewal") {
      setCustomMessage(
        "[WealthOS Alert] Your advisory software license expires in 7 days. Renew now at https://zenith9186.wealthos.com/renew-account to prevent service interruption."
      );
      setSubject("Urgent: Platform License Renewal Notice");
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setError(null);
    setLastResult(null);

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/communications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          channel: selectedChannel,
          recipient,
          message: customMessage,
          subject,
          html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h3 style="color: #0284c7;">${subject}</h3>
            <p>${customMessage.replace(/\n/g, "<br/>")}</p>
            <p style="font-size: 11px; color: #64748b; margin-top: 20px;">Sent via WealthOS Multi-Channel Communications Engine</p>
          </div>`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch notification.");
      }

      setLastResult(data.result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setIsSending(false);
    }
  };

  const directWhatsAppLink = `https://wa.me/${recipient.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(customMessage)}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Communications &amp; Alerts Engine</h1>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Multi-Channel Live
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure WhatsApp Business API, Transactional Email, and DLT SMS gateways to notify clients and advisors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={directWhatsAppLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Open WhatsApp Web Chat</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* 3 Gateway Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* WhatsApp Card */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">WhatsApp Business</span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <MessageSquare className="h-4 w-4" />
            </span>
          </div>
          <div>
            <div className="text-base font-bold text-white">Meta Cloud API / Gupshup</div>
            <div className="text-xs text-emerald-400 mt-0.5 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Active &amp; Ready
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800/80 pt-2">
            Supports rich interactive templates, portfolio PDF delivery, and direct 1-click <code>wa.me</code> messaging.
          </p>
        </div>

        {/* Email Card */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transactional Email</span>
            <span className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <Mail className="h-4 w-4" />
            </span>
          </div>
          <div>
            <div className="text-base font-bold text-white">Resend / SendGrid / SES</div>
            <div className="text-xs text-sky-400 mt-0.5 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> HTML Dispatcher Ready
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800/80 pt-2">
            Password reset tokens, consolidated CAS sync notifications, and meeting ICS calendar invites.
          </p>
        </div>

        {/* SMS Card */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">DLT SMS Gateway</span>
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Smartphone className="h-4 w-4" />
            </span>
          </div>
          <div>
            <div className="text-base font-bold text-white">Twilio / MSG91 / Kaleyra</div>
            <div className="text-xs text-amber-400 mt-0.5 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> TRAI DLT Compliant
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800/80 pt-2">
            Instant 2FA security OTPs, BSE StAR MF authorization alerts, and urgent 24h subscription reminders.
          </p>
        </div>
      </div>

      {/* Interactive Testing & Dispatch Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Panel */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Send className="h-4 w-4 text-emerald-400" />
              Live Notification Dispatcher &amp; Simulator
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select a channel and template to trigger live dispatch or preview the rendered notification payload.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSendNotification} className="space-y-4">
            {/* Channel Tabs */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Delivery Channel *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedChannel("WHATSAPP")}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                    selectedChannel === "WHATSAPP"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedChannel("EMAIL")}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                    selectedChannel === "EMAIL"
                      ? "bg-sky-500/20 border-sky-500 text-sky-300 shadow"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedChannel("SMS")}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                    selectedChannel === "SMS"
                      ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>DLT SMS</span>
                </button>
              </div>
            </div>

            {/* Recipient Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                {selectedChannel === "EMAIL" ? "Recipient Email Address *" : "Recipient Mobile Number (with country code) *"}
              </label>
              <input
                type={selectedChannel === "EMAIL" ? "email" : "text"}
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={selectedChannel === "EMAIL" ? "client@example.com" : "+91 98765 43210"}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Subject (for Email) */}
            {selectedChannel === "EMAIL" && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Email Subject Line *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            )}

            {/* Template Presets */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Quick Wealth Templates
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "welcome", label: "Client Welcome" },
                  { id: "meeting", label: "Meeting Confirmed" },
                  { id: "bse", label: "BSE StAR MF Order" },
                  { id: "renewal", label: "Subscription Renewal" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTemplateChange(t.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition ${
                      selectedTemplate === t.id
                        ? "bg-slate-800 text-white border-slate-600"
                        : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Notification Message Body
              </label>
              <textarea
                rows={4}
                required
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
              />
              <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                <span>Variables like [ClientName] and [PortalLink] are automatically resolved.</span>
                <span>{customMessage.length} characters</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <span className="text-[11px] text-slate-500">
                Safe dispatch: automatically logs to console if API keys are unconfigured.
              </span>

              <button
                type="submit"
                disabled={isSending}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Dispatching Message...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send {selectedChannel} Notification</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview & Result Panel */}
        <div className="space-y-4">
          {/* Live Mobile Device Preview */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                Live Client Screen Preview
              </h3>
              <span className="text-[10px] font-mono text-slate-400">{selectedChannel}</span>
            </div>

            {/* Mock Chat Bubble */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
                <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                  W
                </div>
                <div className="text-[11px] font-bold text-white">Zenith Wealth Advisory</div>
              </div>

              {selectedChannel === "WHATSAPP" ? (
                <div className="bg-emerald-950/40 border border-emerald-900/40 rounded-xl p-3 text-xs text-slate-200 space-y-1.5 leading-relaxed font-sans shadow-sm">
                  <div className="whitespace-pre-line">{customMessage}</div>
                  <div className="text-[9px] text-emerald-400 text-right pt-1 font-mono">15:42 ✓✓</div>
                </div>
              ) : selectedChannel === "SMS" ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono space-y-1 leading-relaxed">
                  <div className="text-[10px] text-amber-400 font-bold">VK-WLTHOS</div>
                  <div className="whitespace-pre-line text-[11px]">{customMessage}</div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 space-y-2 leading-relaxed">
                  <div className="text-[11px] font-bold text-white border-b border-slate-800 pb-1">{subject}</div>
                  <div className="whitespace-pre-line text-[11px] text-slate-300">{customMessage}</div>
                  <div className="text-[9px] text-slate-500 pt-1">From: notifications@zenith9186.wealthos.com</div>
                </div>
              )}

              {/* Direct Link Copy Button */}
              {selectedChannel === "WHATSAPP" && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(directWhatsAppLink);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[11px] font-semibold text-emerald-400 transition"
                  >
                    {copiedLink ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedLink ? "Link Copied!" : "Copy WhatsApp Click Link"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Dispatch Server Response Card */}
          {lastResult && (
            <div
              className={`p-4 rounded-xl space-y-2 border ${
                lastResult.success
                  ? lastResult.simulated
                    ? "bg-amber-950/30 border-amber-500/30 text-amber-200"
                    : "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
                  : "bg-red-950/30 border-red-500/30 text-red-200"
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold">
                {lastResult.success ? (
                  lastResult.simulated ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                      <span className="text-amber-400">Message Simulated (No live gateway credentials configured)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span className="text-emerald-400">Live Gateway Dispatched Successfully</span>
                    </>
                  )
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <span className="text-red-400">Gateway Dispatch Failed</span>
                  </>
                )}
              </div>
              <div className="text-[11px] text-slate-300 font-mono space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div>Channel: {String(lastResult.channel || selectedChannel)}</div>
                <div>Recipient: {String(lastResult.recipient || recipient)}</div>
                {lastResult.messageId && <div>Message ID: {String(lastResult.messageId)}</div>}
                <div>
                  Mode:{" "}
                  {lastResult.simulated
                    ? "Simulated (Logs to server console)"
                    : lastResult.success
                    ? "Live Gateway Provider"
                    : "Failed"}
                </div>
                {lastResult.error && (
                  <div className="text-red-400 pt-1 border-t border-slate-800 font-sans text-xs">
                    Error: {String(lastResult.error)}
                  </div>
                )}
                {(lastResult.details as Record<string, any>)?.note && (
                  <div className="text-amber-300 pt-1 border-t border-slate-800 font-sans text-xs">
                    Note: {String((lastResult.details as Record<string, any>).note)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

