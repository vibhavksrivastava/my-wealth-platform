"use client";

import { useState, useEffect } from "react";
import { Shield, ShieldAlert, ShieldCheck, FileText, Download, Edit3, ArrowRight } from "lucide-react";
import { RiaAgreement } from "@/lib/ria/riaService";
import RiaAgreementWizardModal from "./RiaAgreementWizardModal";

interface RiaAgreementBadgeProps {
  clientId: string;
  clientName: string;
  showToast?: (msg: string, type?: "success" | "error") => void;
}

export default function RiaAgreementBadge({
  clientId,
  clientName,
  showToast = () => {},
}: RiaAgreementBadgeProps) {
  const [agreement, setAgreement] = useState<RiaAgreement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAgreement = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/ria/agreements?clientId=${clientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAgreement(data.agreement || null);
      }
    } catch {
      // quiet fail
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgreement();
  }, [clientId]);

  if (isLoading) {
    return (
      <div className="h-7 w-48 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
    );
  }

  const isSigned = agreement?.status === "SIGNED";
  const feeLabel =
    agreement?.feeMode === "FIXED"
      ? `Fixed Fee - ₹${Number(agreement.agreedFeeAmount || 0).toLocaleString("en-IN")}/yr`
      : `AUA - ${agreement?.agreedFeeAmount || 0}%/yr`;

  const handleDownloadPdf = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!agreement?.agreementId) return;
    const token = localStorage.getItem("auth_token");
    window.open(`/api/ria/agreements/${agreement.agreementId}/pdf?clientId=${clientId}&token=${token}`, "_blank");
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Status Badge */}
        {isSigned ? (
          <div
            onClick={() => setIsModalOpen(true)}
            className="group cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition shadow-xs"
            title="Click to view executed SEBI Advisory Agreement"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Active ({feeLabel})</span>
            <button
              onClick={handleDownloadPdf}
              className="p-0.5 rounded-sm hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 transition"
              title="Download Signed Agreement PDF"
            >
              <Download className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => setIsModalOpen(true)}
            className="group cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition shadow-xs animate-pulse"
            title="SEBI Advisory Agreement is mandatory before advising this client. Click to setup."
          >
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Agreement Status: Pending Signature</span>
            <span className="text-[10px] underline ml-1 font-semibold group-hover:text-amber-900 dark:group-hover:text-white">
              Setup & E-Sign &rarr;
            </span>
          </div>
        )}
      </div>

      <RiaAgreementWizardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        clientId={clientId}
        clientName={clientName}
        currentAgreement={agreement}
        onAgreementUpdated={fetchAgreement}
        showToast={showToast}
      />
    </>
  );
}

