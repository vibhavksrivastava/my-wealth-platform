"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Hash,
  Trash2,
  Check
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

export interface ExistingHoldingOption {
  id: string;
  clientId?: string;
  clientName?: string;
  schemeName: string;
  folioNumber?: string;
  monthlySip?: number;
  assetClass?: string;
  currentValue?: number;
  investedCost?: number;
  isin?: string;
}

interface SipManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string;
  clientName: string;
  clientCode?: string;
  editingSip?: SipRecord | null;
  existingHoldings?: ExistingHoldingOption[];
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
  existingHoldings = [],
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

  // Selection from existing portfolio holdings
  const [entryMode, setEntryMode] = useState<"EXISTING" | "NEW">("EXISTING");
  const [selectedHoldingId, setSelectedHoldingId] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter available existing holdings by target client if multi-client view
  const availableHoldings = useMemo(() => {
    if (!existingHoldings || existingHoldings.length === 0) return [];
    if (!selectedClientId || selectedClientId === "ALL") return existingHoldings;
    const filtered = existingHoldings.filter(
      (h) => !h.clientId || h.clientId === selectedClientId
    );
    return filtered.length > 0 ? filtered : existingHoldings;
  }, [existingHoldings, selectedClientId]);

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
      setEntryMode("NEW");
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
      setSelectedHoldingId("");
      setEntryMode(availableHoldings.length > 0 ? "EXISTING" : "NEW");
    }
    setErrorMessage(null);
  }, [editingSip, clientId, clientCode, isOpen, availableHoldings.length]);

  if (!isOpen) return null;

  const handleSelectExistingFund = (holdingId: string) => {
    setSelectedHoldingId(holdingId);
    const fund = availableHoldings.find((h) => h.id === holdingId);
    if (fund) {
      setSchemeName(fund.schemeName);
      setSchemeCode(fund.isin || "");
      if (fund.folioNumber && fund.folioNumber !== "Folio N/A") {
        setSipRegistrationNo(`SIP-${fund.folioNumber}`);
      }
      if (fund.monthlySip && fund.monthlySip > 0) {
        setInstallmentAmount(fund.monthlySip);
      }
    }
  };

  const handleDeleteCurrentSip = async () => {
    if (!editingSip?.id) return;
    if (!confirm(`Are you sure you want to permanently delete the SIP mandate for "${editingSip.schemeName}"?`)) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/portfolio/sips/${editingSip.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete SIP.");
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete SIP.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schemeName.trim()) {
      setErrorMessage("Please enter or select a valid Mutual Fund Scheme Name.");
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
        // Create new manual SIP or SIP mapped to existing fund
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

  const activeHoldingMatch = availableHoldings.find((h) => h.id === selectedHoldingId || h.schemeName === schemeName);

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
                  : "Start a recurring SIP on any existing mutual fund or register a new mandate."}
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

          {/* Client Target (if creating and multiple clients available) */}
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

          {/* Scheme Selection Mode: Existing Fund vs New Fund */}
          {!editingSip && availableHoldings.length > 0 && (
            <div className="space-y-2">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                Select Fund Source
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEntryMode("EXISTING")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    entryMode === "EXISTING"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Building className="h-3.5 w-3.5" />
                  <span>Existing Fund ({availableHoldings.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEntryMode("NEW");
                    setSelectedHoldingId("");
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    entryMode === "NEW"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Enter Other Scheme</span>
                </button>
              </div>
            </div>
          )}

          {/* Scheme Selector: Existing Fund Dropdown */}
          {!editingSip && entryMode === "EXISTING" && availableHoldings.length > 0 ? (
            <div className="space-y-2">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                Choose Existing Mutual Fund from Portfolio *
              </label>
              <select
                value={selectedHoldingId}
                onChange={(e) => handleSelectExistingFund(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Choose one of {availableHoldings.length} portfolio funds --</option>
                {availableHoldings.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.schemeName} {h.folioNumber && h.folioNumber !== "Folio N/A" ? `• Folio: ${h.folioNumber}` : ""}{" "}
                    {h.currentValue ? `• Value: ${formatINR(h.currentValue)}` : ""}{" "}
                    {h.monthlySip && h.monthlySip > 0 ? `• SIP: ${formatINR(h.monthlySip)}/mo` : ""}
                  </option>
                ))}
              </select>

              {activeHoldingMatch && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{activeHoldingMatch.schemeName}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Folio: {activeHoldingMatch.folioNumber || "N/A"} &bull; {activeHoldingMatch.assetClass || "Mutual Fund"}
                      </div>
                    </div>
                  </div>
                  {activeHoldingMatch.monthlySip && activeHoldingMatch.monthlySip > 0 ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-500">
                      Existing SIP: {formatINR(activeHoldingMatch.monthlySip)}/mo
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-500">
                      No Active SIP
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Scheme Name: Manual Input */
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
          )}

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
              min={500}
              step={500}
              required
              value={installmentAmount || ""}
              onChange={(e) => setInstallmentAmount(Number(e.target.value))}
              placeholder="10000"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono text-sm font-semibold"
            />
            {/* Quick Chips */}
            <div className="flex items-center gap-1.5 mt-2">
              {[2500, 5000, 10000, 15000, 25000, 50000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setInstallmentAmount(amt)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                    installmentAmount === amt
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                  }`}
                >
                  ₹{amt >= 1000 ? `${amt / 1000}k` : amt}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency & Execution Day */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                SIP Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-medium"
              >
                <option value="MONTHLY">Monthly (Standard)</option>
                <option value="WEEKLY">Weekly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="DAILY">Daily</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Debit / Execution Day of Month
              </label>
              <select
                value={installmentDay}
                onChange={(e) => setInstallmentDay(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-medium font-mono"
              >
                {[1, 5, 7, 10, 15, 20, 25, 28].map((day) => (
                  <option key={day} value={day}>
                    {day}th of month {day === 10 ? "(Most popular)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Operational Status Selector */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Mandate Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: "ACTIVE", label: "Active", desc: "Debits scheduled regularly" },
                { val: "PAUSED", label: "Paused", desc: "Temporarily held by investor" },
                { val: "CANCELLED", label: "Cancelled", desc: "Mandate terminated" },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => setStatus(s.val as any)}
                  className={`p-2 rounded-xl text-left border transition ${
                    status === s.val
                      ? s.val === "ACTIVE"
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold"
                        : s.val === "PAUSED"
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold"
                        : "bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 font-bold"
                      : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <div className="text-xs">{s.label}</div>
                  <div className="text-[10px] opacity-75">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mandate & Platform Routing Identifiers */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Banking &amp; Exchange Mandate Routing (Optional)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-slate-500 text-[10px] uppercase font-semibold mb-1">
                  Bank Mandate ID / UMRN
                </label>
                <input
                  type="text"
                  value={mandateId}
                  onChange={(e) => setMandateId(e.target.value)}
                  placeholder="MANDATE-NACH-01"
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] uppercase font-semibold mb-1">
                  Investor UCC (BSE Code)
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

          {/* Footer Actions: Delete Button (when editing) + Cancel & Save */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2.5">
            <div>
              {editingSip && (
                <button
                  type="button"
                  disabled={isDeleting || isSubmitting}
                  onClick={handleDeleteCurrentSip}
                  className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 font-bold transition flex items-center gap-1.5"
                  title="Permanently remove this SIP mandate"
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  <span>Delete SIP</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{editingSip ? "Save Changes" : "Create SIP Mandate"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
