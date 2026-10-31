"use client";

import React, { useState, useEffect } from "react";
import {
  Repeat,
  Plus,
  Edit2,
  PauseCircle,
  PlayCircle,
  XCircle,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Building,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  FileText,
  User,
  ShieldCheck,
  CreditCard,
  Hash
} from "lucide-react";

export interface SipRecord {
  id: string;
  tenantId?: string;
  clientId: string;
  clientName?: string;
  ucc?: string;
  arnId?: string;
  sipRegistrationNo?: string;
  mandateId?: string;
  schemeCode?: string;
  schemeName: string;
  installmentAmount: number;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY";
  installmentDay: number;
  startDate?: string;
  endDate?: string;
  installmentsPaid?: number;
  status: "ACTIVE" | "PAUSED" | "CANCELLED" | "COMPLETED" | "REGISTERED";
  source: "CAS_IMPORT" | "MANUAL" | "API_SYNC";
  rawApiResponse?: any;
  createdAt?: string;
  updatedAt?: string;
}

interface SipManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string;
  clientName: string;
  clientCode?: string;
  editingSip?: SipRecord | null;
  tenantsClients?: { client_id: string; full_name: string; uwp_client_code?: string }[];
  isAdvisor?: boolean;
}

function formatINR(val: number) {
  if (isNaN(val)) return "₹0";
  return `₹${val.toLocaleString("en-IN")}`;
}

export default function SipManagerModal({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  clientName,
  clientCode = "",
  editingSip = null,
  tenantsClients = [],
  isAdvisor = true,
}: SipManagerModalProps) {
  const [selectedClientId, setSelectedClientId] = useState(clientId || "");
  const [schemeName, setSchemeName] = useState("");
  const [schemeCode, setSchemeCode] = useState("");
  const [installmentAmount, setInstallmentAmount] = useState<number>(5000);
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY">("MONTHLY");
  const [installmentDay, setInstallmentDay] = useState<number>(10);
  const [mandateId, setMandateId] = useState("");
  const [arnId, setArnId] = useState("ARN-111111");
  const [ucc, setUcc] = useState(clientCode || "");
  const [sipRegistrationNo, setSipRegistrationNo] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "PAUSED" | "CANCELLED" | "COMPLETED" | "REGISTERED">("ACTIVE");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (editingSip) {
      setSelectedClientId(editingSip.clientId || clientId);
      setSchemeName(editingSip.schemeName || "");
      setSchemeCode(editingSip.schemeCode || "");
      setInstallmentAmount(editingSip.installmentAmount || 5000);
      setFrequency(editingSip.frequency || "MONTHLY");
      setInstallmentDay(editingSip.installmentDay || 10);
      setMandateId(editingSip.mandateId || "");
      setArnId(editingSip.arnId || "ARN-111111");
      setUcc(editingSip.ucc || clientCode || "");
      setSipRegistrationNo(editingSip.sipRegistrationNo || "");
      setStartDate(editingSip.startDate || new Date().toISOString().split("T")[0]);
      setEndDate(editingSip.endDate || "");
      setStatus(editingSip.status || "ACTIVE");
    } else {
      setSelectedClientId(clientId || "");
      setSchemeName("");
      setSchemeCode("");
      setInstallmentAmount(10000);
      setFrequency("MONTHLY");
      setInstallmentDay(10);
      setMandateId(`MANDATE-NACH-${Math.floor(100000 + Math.random() * 900000)}`);
      setArnId("ARN-111111");
      setUcc(clientCode || "UWP-CLIENT-01");
      setSipRegistrationNo(`SIP-BSE-${Date.now().toString().slice(-6)}`);
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
      setStatus("ACTIVE");
    }
    setErrorMessage(null);
  }, [editingSip, clientId, clientCode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schemeName.trim()) {
      setErrorMessage("Please enter a valid Scheme Name.");
      return;
    }
    if (!installmentAmount || installmentAmount <= 0) {
      setErrorMessage("Please enter an installment amount greater than 0.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const token = localStorage.getItem("auth_token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      if (editingSip && editingSip.id) {
        // Update existing SIP
        const res = await fetch(`/api/portfolio/sips/${editingSip.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            installmentAmount,
            frequency,
            installmentDay,
            status,
            mandateId,
            endDate: endDate || null,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update SIP.");
      } else {
        // Create new manual SIP
        const res = await fetch("/api/portfolio/sips", {
          method: "POST",
          headers,
          body: JSON.stringify({
            clientId: selectedClientId || clientId,
            schemeName: schemeName.trim(),
            schemeCode: schemeCode.trim() || undefined,
            installmentAmount,
            frequency,
            installmentDay,
            arnId: arnId.trim() || "ARN-111111",
            ucc: ucc.trim() || undefined,
            mandateId: mandateId.trim() || undefined,
            sipRegistrationNo: sipRegistrationNo.trim() || undefined,
            startDate,
            endDate: endDate || null,
            status,
            source: "MANUAL",
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to register SIP.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center">
              <Repeat className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{editingSip ? "Edit SIP Mandate" : "Register Systematic Investment Plan (SIP)"}</span>
                {editingSip?.source && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      editingSip.source === "API_SYNC"
                        ? "bg-sky-500/10 text-sky-500 border border-sky-500/20"
                        : editingSip.source === "CAS_IMPORT"
                        ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                        : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    }`}
                  >
                    {editingSip.source === "API_SYNC"
                      ? "⚡ BSE StAR Live API"
                      : editingSip.source === "CAS_IMPORT"
                      ? "📄 CAS Import"
                      : "✍️ Manual"}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {editingSip
                  ? "Update recurring commitment parameters, execution schedule, or operational status."
                  : "Register a recurring mutual fund debit mandate for this investor."}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Client Target (if editing or multiple clients available) */}
          {isAdvisor && tenantsClients.length > 0 && !editingSip && (
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Target Investor Client
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  const c = tenantsClients.find((tc) => tc.client_id === e.target.value);
                  if (c?.uwp_client_code) setUcc(c.uwp_client_code);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-medium"
              >
                {tenantsClients.map((c) => (
                  <option key={c.client_id} value={c.client_id}>
                    {c.full_name} ({c.uwp_client_code || "No Code"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Scheme Name */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Mutual Fund Scheme Name *
            </label>
            <input
              type="text"
              required
              disabled={Boolean(editingSip && editingSip.source === "API_SYNC")}
              value={schemeName}
              onChange={(e) => setSchemeName(e.target.value)}
              placeholder="e.g. Parag Parikh Flexi Cap Fund - Direct Plan Growth"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 font-medium"
            />
          </div>

          {/* Installment Amount & Quick Chips */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 dark:text-slate-300 font-semibold">
                Monthly Installment Amount (₹) *
              </label>
              <span className="font-bold text-indigo-500 font-mono">
                {formatINR(Number(installmentAmount) || 0)}
              </span>
            </div>
            <input
              type="number"
              min="100"
              step="100"
              required
              value={installmentAmount}
              onChange={(e) => setInstallmentAmount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-bold text-sm"
            />
            {/* Quick Chips */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-400">Quick set:</span>
              {[2500, 5000, 10000, 15000, 25000, 50000].map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => setInstallmentAmount(amt)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border transition ${
                    installmentAmount === amt
                      ? "bg-indigo-500 text-white border-indigo-500"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400"
                  }`}
                >
                  ₹{amt >= 1000 ? `${amt / 1000}k` : amt}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency & Installment Day */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Debit Frequency
              </label>
              <select
                value={frequency}
                onChange={(e: any) => setFrequency(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-medium"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="WEEKLY">Weekly</option>
                <option value="DAILY">Daily</option>
                <option value="QUARTERLY">Quarterly</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                SIP Execution Day
              </label>
              <select
                value={installmentDay}
                onChange={(e) => setInstallmentDay(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-medium"
              >
                {[1, 2, 5, 7, 10, 12, 15, 18, 20, 21, 25, 28].map((d) => (
                  <option key={d} value={d}>
                    {d}th of the month
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Operational Status & Mandate ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Mandate Operational Status
              </label>
              <select
                value={status}
                onChange={(e: any) => setStatus(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border font-bold ${
                  status === "ACTIVE"
                    ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                    : status === "PAUSED"
                    ? "border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400"
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                }`}
              >
                <option value="ACTIVE">ACTIVE (Auto-Debit On)</option>
                <option value="PAUSED">PAUSED (Temporarily Suspended)</option>
                <option value="CANCELLED">CANCELLED (Terminated)</option>
                <option value="REGISTERED">REGISTERED (Pending Mandate Auth)</option>
                <option value="COMPLETED">COMPLETED (Tenure Finished)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Bank Mandate ID / URN
              </label>
              <input
                type="text"
                value={mandateId}
                onChange={(e) => setMandateId(e.target.value)}
                placeholder="e.g. HDFC-NACH-984210"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono placeholder-slate-400"
              />
            </div>
          </div>

          {/* Regulatory ARN & UCC & Registration Number */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
              <span>BSE StAR MF / Exchange Regulatory Identifiers</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-500 text-[10px] uppercase font-semibold mb-1">
                  ARN Code
                </label>
                <input
                  type="text"
                  value={arnId}
                  onChange={(e) => setArnId(e.target.value)}
                  placeholder="ARN-111111"
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] uppercase font-semibold mb-1">
                  Client UCC
                </label>
                <input
                  type="text"
                  value={ucc}
                  onChange={(e) => setUcc(e.target.value)}
                  placeholder="UWP-2026-001"
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] uppercase font-semibold mb-1">
                  SIP Registration No
                </label>
                <input
                  type="text"
                  value={sipRegistrationNo}
                  onChange={(e) => setSipRegistrationNo(e.target.value)}
                  placeholder="BSE-SIP-847291"
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Start Date & End Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                End Date (Optional / Until Cancelled)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="Perpetual if left blank"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{editingSip ? "Save Changes" : "Create SIP Mandate"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

