"use client";

import React, { useState } from "react";
import {
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ShieldCheck,
  FileCode,
  ArrowRight,
  Info
} from "lucide-react";

interface BseSipSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string;
  clientName: string;
  clientUcc?: string;
}

export default function BseSipSyncModal({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  clientName,
  clientUcc = "UWP-2026-001",
}: BseSipSyncModalProps) {
  const [overwriteManual, setOverwriteManual] = useState(false);
  const [customJson, setCustomJson] = useState("");
  const [useCustomPayload, setUseCustomPayload] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Default sample BSE StAR payload matching the client
  const defaultSamplePayload = [
    {
      SIP_REG_NO: `BSE-SIP-${Math.floor(800000 + Math.random() * 100000)}`,
      CLIENT_CODE: clientUcc || "UWP-2026-001",
      MANDATE_ID: `BSE-MANDATE-${Math.floor(500000 + Math.random() * 500000)}`,
      SCHEME_CODE: "INF109K01852",
      SCHEME_NAME: "ICICI Prudential Aggressive Hybrid Active FOF - Growth",
      AMOUNT: 10000,
      FREQUENCY: "MONTHLY",
      SIP_DAY: 10,
      START_DATE: "2026-10-10",
      END_DATE: "2036-10-10",
      STATUS: "ACTIVE",
      INSTALLMENTS_PAID: 8,
      ARN: "ARN-175318",
    },
    {
      SIP_REG_NO: `BSE-SIP-${Math.floor(800000 + Math.random() * 100000)}`,
      CLIENT_CODE: clientUcc || "UWP-2026-001",
      MANDATE_ID: `BSE-MANDATE-${Math.floor(500000 + Math.random() * 500000)}`,
      SCHEME_CODE: "INF090I01296",
      SCHEME_NAME: "Templeton India Value Fund - Growth",
      AMOUNT: 10000,
      FREQUENCY: "MONTHLY",
      SIP_DAY: 21,
      START_DATE: "2026-09-21",
      END_DATE: "2036-09-21",
      STATUS: "ACTIVE",
      INSTALLMENTS_PAID: 12,
      ARN: "ARN-175318",
    },
    {
      SIP_REG_NO: `BSE-SIP-${Math.floor(800000 + Math.random() * 100000)}`,
      CLIENT_CODE: clientUcc || "UWP-2026-001",
      MANDATE_ID: `BSE-MANDATE-${Math.floor(500000 + Math.random() * 500000)}`,
      SCHEME_CODE: "INF209K01157",
      SCHEME_NAME: "HDFC Mid Cap Fund - Regular Plan - Growth",
      AMOUNT: 5000,
      FREQUENCY: "MONTHLY",
      SIP_DAY: 5,
      START_DATE: "2026-09-05",
      END_DATE: "2035-09-05",
      STATUS: "ACTIVE",
      INSTALLMENTS_PAID: 6,
      ARN: "ARN-175318",
    },
  ];

  const handleSync = async () => {
    setIsSyncing(true);
    setErrorMessage(null);
    setSyncResult(null);

    let payload: any[] = defaultSamplePayload;
    if (useCustomPayload && customJson.trim()) {
      try {
        const parsed = JSON.parse(customJson.trim());
        payload = Array.isArray(parsed) ? parsed : parsed.sips || parsed.mandates || [parsed];
      } catch (e: any) {
        setErrorMessage("Invalid JSON format. Please verify your BSE StAR API JSON.");
        setIsSyncing(false);
        return;
      }
    }

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/portfolio/sips/sync-bse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sips: payload,
          overwriteManual,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sync BSE StAR SIP mandates.");

      setSyncResult(data);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during API sync.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center justify-center">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>BSE StAR MF Mandate &amp; SIP Sync</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-500 border border-sky-500/20">
                  API v2.4
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated synchronization of exchange auto-debit mandates &amp; SIP registration numbers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {syncResult ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5" />
                <span>{syncResult.message}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-500/20 text-xs text-center">
                <div className="p-2 rounded bg-emerald-500/5">
                  <div className="font-mono font-bold text-base">{syncResult.stats?.insertedCount || 0}</div>
                  <div className="text-[10px] text-slate-400">New SIPs Added</div>
                </div>
                <div className="p-2 rounded bg-emerald-500/5">
                  <div className="font-mono font-bold text-base">{syncResult.stats?.updatedCount || 0}</div>
                  <div className="text-[10px] text-slate-400">SIPs Updated</div>
                </div>
                <div className="p-2 rounded bg-emerald-500/5">
                  <div className="font-mono font-bold text-base">{syncResult.stats?.skippedManualCount || 0}</div>
                  <div className="text-[10px] text-slate-400">Manual Kept</div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Target Investor Badge */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Sync Scope</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{clientName}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Exchange UCC</span>
                  <div className="font-mono font-bold text-sky-500 text-xs mt-0.5">{clientUcc || "UWP-CLIENT-01"}</div>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center justify-between pt-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Sync Payload Mode</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUseCustomPayload(false)}
                    className={`px-3 py-1 rounded-md font-bold transition text-xs ${
                      !useCustomPayload
                        ? "bg-sky-500 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Simulated Live Mandates (3)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCustomPayload(true)}
                    className={`px-3 py-1 rounded-md font-bold transition text-xs ${
                      useCustomPayload
                        ? "bg-sky-500 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Custom JSON Payload
                  </button>
                </div>
              </div>

              {useCustomPayload ? (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    BSE StAR MF Response JSON
                  </label>
                  <textarea
                    rows={6}
                    value={customJson}
                    onChange={(e) => setCustomJson(e.target.value)}
                    placeholder={JSON.stringify(defaultSamplePayload, null, 2)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-[11px] text-slate-900 dark:text-white placeholder-slate-500"
                  />
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
                    <Info className="h-3.5 w-3.5 text-sky-400" />
                    <span>The following active exchange SIP records will be synchronized:</span>
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60">
                      <span>ICICI Prudential Aggressive Hybrid FOF</span>
                      <strong className="text-emerald-500">₹10,000 / mo</strong>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60">
                      <span>Templeton India Value Fund</span>
                      <strong className="text-emerald-500">₹10,000 / mo</strong>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60">
                      <span>HDFC Mid Cap Fund</span>
                      <strong className="text-emerald-500">₹5,000 / mo</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Overwrite Manual Checkbox */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="overwriteManualCheck"
                  checked={overwriteManual}
                  onChange={(e) => setOverwriteManual(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="overwriteManualCheck" className="cursor-pointer text-slate-600 dark:text-slate-300">
                  <strong className="text-slate-900 dark:text-white">Overwrite manual user customizations</strong>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    When unchecked (recommended), records manually registered by your advisory firm retain their custom installment day and amount.
                  </p>
                </label>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition"
            >
              Close
            </button>
            {!syncResult && (
              <button
                type="button"
                onClick={handleSync}
                disabled={isSyncing}
                className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold transition flex items-center gap-2 shadow-md shadow-sky-600/20 disabled:opacity-50"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Synchronizing BSE StAR...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Execute BSE Sync Now</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

