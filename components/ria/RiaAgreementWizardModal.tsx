"use client";

import { useState, useEffect } from "react";
import {
  X,
  Shield,
  FileCheck,
  AlertTriangle,
  Download,
  CheckCircle2,
  DollarSign,
  Percent,
  Clock,
  ExternalLink,
  Lock,
} from "lucide-react";
import { SEBI_RIA_LIMITS, RiaFeeMode, RiaBillingFrequency, RiaAgreement } from "@/lib/ria/riaService";

interface RiaAgreementWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  currentAgreement: RiaAgreement | null;
  onAgreementUpdated: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function RiaAgreementWizardModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  currentAgreement,
  onAgreementUpdated,
  showToast,
}: RiaAgreementWizardModalProps) {
  const [feeMode, setFeeMode] = useState<RiaFeeMode>(currentAgreement?.feeMode || "FIXED");
  const [feeAmount, setFeeAmount] = useState<number>(currentAgreement?.agreedFeeAmount || 50000);
  const [frequency, setFrequency] = useState<RiaBillingFrequency>(currentAgreement?.agreedFeeFrequency || "ANNUALLY");
  const [scopeOfServices, setScopeOfServices] = useState<string>(
    currentAgreement?.scopeOfServices ||
      "Comprehensive Fee-Only Investment Advisory, Fiduciary Asset Allocation, and Goal Planning. Zero commission model with mandatory pre-trade client positive consent on every execution."
  );

  const [mitcAccepted, setMitcAccepted] = useState<boolean>(currentAgreement?.mitcAccepted || false);
  const [signatureName, setSignatureName] = useState<string>(currentAgreement?.clientSignatureName || clientName || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [activeTab, setActiveTab] = useState<"TERMS" | "SIGN" | "PREVIEW">("TERMS");

  useEffect(() => {
    if (currentAgreement) {
      setFeeMode(currentAgreement.feeMode);
      setFeeAmount(currentAgreement.agreedFeeAmount);
      setFrequency(currentAgreement.agreedFeeFrequency);
      setScopeOfServices(currentAgreement.scopeOfServices);
      setMitcAccepted(currentAgreement.mitcAccepted);
      if (currentAgreement.clientSignatureName) {
        setSignatureName(currentAgreement.clientSignatureName);
      }
    }
  }, [currentAgreement]);

  if (!isOpen) return null;

  // Real-time SEBI Regulatory Validation
  const annualFixedEquivalent = frequency === "QUARTERLY" ? feeAmount * 4 : feeAmount;
  const isFixedCapExceeded = feeMode === "FIXED" && annualFixedEquivalent > SEBI_RIA_LIMITS.MAX_FIXED_FEE_ANNUAL;
  const isAuaCapExceeded = feeMode === "AUA_PERCENTAGE" && feeAmount > SEBI_RIA_LIMITS.MAX_AUA_PERCENTAGE_ANNUAL;
  const hasCapViolation = isFixedCapExceeded || isAuaCapExceeded;

  const handleSaveAgreement = async () => {
    if (hasCapViolation) {
      showToast(
        feeMode === "FIXED"
          ? `Fixed fee exceeds SEBI statutory cap of ₹${SEBI_RIA_LIMITS.MAX_FIXED_FEE_ANNUAL.toLocaleString("en-IN")}/yr per family.`
          : `AUA percentage exceeds SEBI statutory cap of ${SEBI_RIA_LIMITS.MAX_AUA_PERCENTAGE_ANNUAL}% p.a.`,
        "error"
      );
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/ria/agreements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientId,
          feeMode,
          agreedFeeAmount: feeAmount,
          agreedFeeFrequency: frequency,
          scopeOfServices,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save advisory agreement.");
      }

      showToast("SEBI Advisory Agreement configured successfully!", "success");
      onAgreementUpdated();
      setActiveTab("SIGN");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDigitalSign = async () => {
    if (!currentAgreement?.agreementId) {
      showToast("Please save agreement terms before executing signature.", "error");
      return;
    }
    if (!mitcAccepted) {
      showToast("Mandatory: You must accept the Most Important Terms and Conditions (MITC).", "error");
      return;
    }
    if (!signatureName.trim()) {
      showToast("Please enter client legal name to sign.", "error");
      return;
    }

    setIsSigning(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/ria/agreements/${currentAgreement.agreementId}/sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientSignatureName: signatureName.trim(),
          mitcAccepted: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to sign agreement.");
      }

      showToast("Agreement signed digitally! Client is now fully active for advisory services.", "success");
      onAgreementUpdated();
      onClose();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSigning(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!currentAgreement?.agreementId) {
      showToast("Please save agreement terms before downloading PDF.", "error");
      return;
    }
    const token = localStorage.getItem("auth_token");
    window.open(`/api/ria/agreements/${currentAgreement.agreementId}/pdf?clientId=${clientId}&token=${token}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                SEBI Investment Advisory Agreement Wizard
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Client: <span className="font-semibold text-slate-800 dark:text-slate-200">{clientName}</span> &bull; SEBI Reg. 19(1) Compliance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Wizard Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-100/50 dark:bg-slate-900/50">
          <button
            onClick={() => setActiveTab("TERMS")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "TERMS"
                ? "border-teal-500 text-teal-600 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span>1. Regulatory Fee Setup</span>
          </button>
          <button
            onClick={() => setActiveTab("SIGN")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "SIGN"
                ? "border-teal-500 text-teal-600 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span>2. MITC & Digital Signature</span>
            {currentAgreement?.status === "SIGNED" && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Signed
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("PREVIEW")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "PREVIEW"
                ? "border-teal-500 text-teal-600 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span>3. Model Agreement Document</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {activeTab === "TERMS" && (
            <div className="space-y-5">
              {/* SEBI Compliance Notice */}
              <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-500/5 text-xs text-teal-800 dark:text-teal-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
                  <Shield className="h-4 w-4" />
                  <span>SEBI Regulatory Mandate for Registered Investment Advisers</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  Under SEBI (Investment Advisers) Regulations, 2013, an RIA operates on a strict zero-commission, fee-only model.
                  Advisory fees are capped at maximum <strong>₹1,51,000 p.a. per family</strong> under Fixed Fee mode, or <strong>2.50% p.a. of AUA</strong>.
                </p>
              </div>

              {/* Fee Mode Switcher */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Advisory Fee Mode (SEBI Reg. 15A)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFeeMode("FIXED")}
                    className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      feeMode === "FIXED"
                        ? "border-teal-500 bg-teal-500/10 text-teal-900 dark:text-teal-100"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 text-teal-500" />
                        Fixed Retainer Fee
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                        Max ₹1.51 L/yr
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Capped at ₹1,51,000 per family per annum across all advisory services.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeeMode("AUA_PERCENTAGE")}
                    className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      feeMode === "AUA_PERCENTAGE"
                        ? "border-teal-500 bg-teal-500/10 text-teal-900 dark:text-teal-100"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <Percent className="h-4 w-4 text-teal-500" />
                        AUA Percentage Fee
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                        Max 2.50% p.a.
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Calculated on Assets Under Advice, capped at 2.50% per annum per family.
                    </p>
                  </button>
                </div>
              </div>

              {/* Amount & Frequency Input */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {feeMode === "FIXED" ? "Agreed Fee Amount (INR)" : "AUA Percentage (%)"}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step={feeMode === "FIXED" ? "1000" : "0.05"}
                      value={feeAmount}
                      onChange={(e) => setFeeAmount(Number(e.target.value))}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm border font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition focus:outline-hidden ${
                        hasCapViolation
                          ? "border-rose-500 focus:ring-2 focus:ring-rose-500/30"
                          : "border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500/30"
                      }`}
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-mono text-slate-400">
                      {feeMode === "FIXED" ? "INR" : "% p.a."}
                    </span>
                  </div>
                  {isFixedCapExceeded && (
                    <p className="mt-1.5 text-xs text-rose-500 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      SEBI Cap Exceeded: Max ₹1,51,000/yr (Annualized: ₹{annualFixedEquivalent.toLocaleString("en-IN")})
                    </p>
                  )}
                  {isAuaCapExceeded && (
                    <p className="mt-1.5 text-xs text-rose-500 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      SEBI Cap Exceeded: Max 2.50% per annum.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Billing Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as RiaBillingFrequency)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-500/30"
                  >
                    <option value="ANNUALLY">Annually (1 Invoice per year)</option>
                    <option value="QUARTERLY">Quarterly (4 Invoices per year)</option>
                  </select>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Advance billing cannot exceed 12 months under SEBI regulations.
                  </p>
                </div>
              </div>

              {/* Scope of Services */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Scope of Advisory Services (Included in Agreement)
                </label>
                <textarea
                  rows={3}
                  value={scopeOfServices}
                  onChange={(e) => setScopeOfServices(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500/30"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-teal-500" />
                  SEBI Regulatory Cap Guardrails Active
                </span>
                <button
                  type="button"
                  disabled={isSaving || hasCapViolation}
                  onClick={handleSaveAgreement}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white transition flex items-center gap-2 shadow-xs"
                >
                  <FileCheck className="h-4 w-4" />
                  <span>{isSaving ? "Saving Terms..." : "Save Terms & Proceed to E-Sign"}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "SIGN" && (
            <div className="space-y-5">
              {/* MITC Mandate Card */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Most Important Terms and Conditions (MITC) Disclosures</span>
                </div>
                <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                    <strong className="text-slate-900 dark:text-white">1. Zero-Commission Declaration:</strong> The RIA confirms that it operates solely on a fee-only basis and receives no commissions, brokerage, or kickbacks from any product providers.
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                    <strong className="text-slate-900 dark:text-white">2. Mandatory Pre-Trade Positive Consent:</strong> The RIA cannot execute trades on behalf of the client without explicit, positive, recorded consent on each transaction.
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                    <strong className="text-slate-900 dark:text-white">3. Statutory Fee Limits:</strong> Total fee charged does not exceed ₹1,51,000 p.a. (Fixed mode) or 2.50% p.a. of AUA per family group.
                  </div>
                </div>

                <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mitcAccepted}
                    onChange={(e) => setMitcAccepted(e.target.checked)}
                    className="mt-0.5 rounded-sm border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    I have reviewed, explained, and confirmed the client's acceptance of the MITC clauses as per SEBI regulations.
                  </span>
                </label>
              </div>

              {/* Digital E-Sign Input */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Investor Legal Name for Digital E-Sign
                </label>
                <input
                  type="text"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="e.g. Vibhav Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500/30"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Clicking "Execute Digital E-Sign" records a binding timestamped signature audit log with IP address tracking.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("TERMS")}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  &larr; Back to Fee Terms
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Draft PDF</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSigning || !mitcAccepted || !signatureName.trim()}
                    onClick={handleDigitalSign}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition flex items-center gap-2 shadow-xs"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{isSigning ? "Signing..." : "Execute Digital E-Sign"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "PREVIEW" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Agreement Status:
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                      currentAgreement?.status === "SIGNED"
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    }`}
                  >
                    {currentAgreement?.status || "PENDING"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Agreed Fee: </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {feeMode === "FIXED" ? `₹${feeAmount.toLocaleString("en-IN")}` : `${feeAmount}% of AUA`} ({frequency})
                  </span>
                </div>
                {currentAgreement?.signedAt && (
                  <div>
                    <span className="text-slate-400">Signed At: </span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {new Date(currentAgreement.signedAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                {currentAgreement?.clientSignatureName && (
                  <div>
                    <span className="text-slate-400">Signer: </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {currentAgreement.clientSignatureName}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-center py-4">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-6 py-3 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition flex items-center gap-2 mx-auto shadow-md"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Formal SEBI Model Advisory Agreement PDF</span>
                </button>
                <p className="text-[11px] text-slate-400 mt-2">
                  Formatted in accordance with SEBI circular SEBI/HO/IMD/DF1/CIR/P/2020/182 and BASL standards.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

