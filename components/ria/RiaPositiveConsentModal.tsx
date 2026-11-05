"use client";

import { useState } from "react";
import { X, CheckCircle, ShieldAlert, Lock, AlertCircle, FileText } from "lucide-react";

interface RiaPositiveConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  schemeCode: string;
  schemeName: string;
  recommendationType: "BUY" | "SELL" | "HOLD" | "SWITCH" | "STP";
  rationaleText: string;
  targetAmount: number;
  onConsentRecorded: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function RiaPositiveConsentModal({
  isOpen,
  onClose,
  clientId,
  schemeCode,
  schemeName,
  recommendationType,
  rationaleText,
  targetAmount,
  onConsentRecorded,
  showToast,
}: RiaPositiveConsentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);

  if (!isOpen) return null;

  const handleGrantConsent = async () => {
    if (!consentAcknowledged) {
      showToast("Mandatory: Please check the positive consent confirmation box.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/ria/compliance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "PRE_TRADE_CONSENT",
          clientId,
          schemeCode,
          schemeName,
          recommendationType,
          rationaleText,
          targetAmount,
          consentGranted: true,
          consentChannel: "DIGITAL_POSITIVE_CONSENT_OTP",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to log pre-trade consent.");
      }

      showToast("Pre-trade positive consent verified and logged into statutory compliance ledger.", "success");
      onConsentRecorded();
      onClose();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Pre-Trade Positive Consent Gate
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                SEBI Fiduciary Execution Rule &bull; Mandatory Investor Sign-off
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Proposed Action:</span>
              <span className="font-bold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 uppercase text-[10px]">
                {recommendationType}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Scheme:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-right">
                {schemeName}
              </span>
            </div>
            {targetAmount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Target Value:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  ₹{targetAmount.toLocaleString("en-IN")}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
              <span className="text-slate-400 block mb-1">Advisory Rationale:</span>
              <p className="text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
                "{rationaleText}"
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 space-y-2">
            <div className="font-bold flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              <span>SEBI Positive Consent Requirement</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Under SEBI Investment Advisers Regulations, an RIA cannot execute or route any trade without explicit positive consent on every single transaction.
            </p>
            <label className="flex items-start gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={consentAcknowledged}
                onChange={(e) => setConsentAcknowledged(e.target.checked)}
                className="mt-0.5 rounded-sm border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
              />
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                I hereby grant positive, explicit consent for this advisory transaction and acknowledge that I have reviewed the rationale and risk profile.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || !consentAcknowledged}
              onClick={handleGrantConsent}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white transition flex items-center gap-2 shadow-xs"
            >
              <CheckCircle className="h-4 w-4" />
              <span>{isSubmitting ? "Recording..." : "Grant Positive Consent & Route"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

