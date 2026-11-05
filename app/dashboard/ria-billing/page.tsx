"use client";

import { useEffect, useState } from "react";
import {
  Receipt,
  Download,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Shield,
  CreditCard,
  Search,
  RefreshCw,
  X,
  Calculator,
} from "lucide-react";
import { RiaInvoice, RiaPaymentChannel } from "@/lib/ria/riaService";
import RiaRefundCalculatorModal from "@/components/ria/RiaRefundCalculatorModal";

export default function RiaBillingPage() {
  const [invoices, setInvoices] = useState<RiaInvoice[]>([]);
  const [clients, setClients] = useState<Array<{ client_id: string; full_name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // New Invoice Modal
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [baseFee, setBaseFee] = useState<number>(25000);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  });
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);

  // Mark Paid Modal
  const [payModalInvoice, setPayModalInvoice] = useState<RiaInvoice | null>(null);
  const [paymentChannel, setPaymentChannel] = useState<RiaPaymentChannel>("UPI");
  const [paymentReference, setPaymentReference] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Refund Modal
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const [invRes, clientRes] = await Promise.all([
        fetch("/api/ria/invoices", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/clients?limit=100", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
      ]);

      if (invRes.ok) {
        const d = await invRes.json();
        setInvoices(d.invoices || []);
      }

      if (clientRes && clientRes.ok) {
        const cd = await clientRes.json();
        setClients(cd.clients || cd.data || []);
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateInvoice = async () => {
    if (!selectedClientId) {
      showToast("Please select a client for invoicing.", "error");
      return;
    }
    if (baseFee <= 0) {
      showToast("Base fee amount must be positive.", "error");
      return;
    }

    setIsSubmittingInvoice(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/ria/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientId: selectedClientId,
          baseFeeAmount: baseFee,
          periodStartDate: startDate,
          periodEndDate: endDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create invoice.");
      }

      showToast("Tax Invoice generated with 18% statutory GST breakdown.", "success");
      setIsNewInvoiceOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!payModalInvoice) return;
    if (!paymentReference.trim()) {
      showToast("Bank Transaction Reference / UTR is mandatory under SEBI rules.", "error");
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/ria/invoices", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          invoiceId: payModalInvoice.invoiceId,
          paymentChannel,
          paymentReference: paymentReference.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to mark invoice as paid.");
      }

      showToast("Payment reconciled on banking rails and logged to compliance vault.", "success");
      setPayModalInvoice(null);
      setPaymentReference("");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleDownloadInvoicePdf = (invoiceId: string) => {
    const token = localStorage.getItem("auth_token");
    window.open(`/api/ria/invoices/${invoiceId}/pdf?token=${token}`, "_blank");
  };

  const filteredInvoices = invoices.filter((i) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      i.invoiceNumber.toLowerCase().includes(q) ||
      (i.paymentReference && i.paymentReference.toLowerCase().includes(q))
    );
  });

  const totalBilled = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalCollected = invoices.filter((i) => i.paymentStatus === "PAID").reduce((sum, i) => sum + i.totalAmount, 0);
  const totalPending = invoices.filter((i) => i.paymentStatus === "PENDING").reduce((sum, i) => sum + i.totalAmount, 0);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 border ${
            toast.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-500/30"
              : "bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-500/30"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 font-mono">
              SEBI Fiduciary Invoicing &bull; 18% GST (SAC 997159)
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Advisory Billing & Invoicing Portal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Issue compliant tax invoices, reconcile bank collections (UPI/NEFT/RTGS), and enforce statutory fee caps.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsRefundModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 shadow-xs"
          >
            <Calculator className="h-4 w-4 text-teal-500" />
            <span>Refund Calculator</span>
          </button>
          <button
            onClick={() => setIsNewInvoiceOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition flex items-center gap-1.5 shadow-md shadow-teal-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Create Tax Invoice</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Advisory Invoiced</span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            ₹{totalBilled.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-slate-400">Includes 18% GST (CGST + SGST)</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Official Banking Collections</span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
            ₹{totalCollected.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-emerald-600/80">Reconciled with bank UTR reference</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Outstanding Invoices</span>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
            ₹{totalPending.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-amber-600/80">Awaiting client bank transfer</p>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by invoice number or UTR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3">Invoice No</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Base Fee</th>
                <th className="px-4 py-3">18% GST</th>
                <th className="px-4 py-3">Total Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment Channel</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No tax invoices generated yet. Click "Create Tax Invoice" to get started.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.invoiceId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                      ₹{inv.baseFeeAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">
                      ₹{inv.gstAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                      ₹{inv.totalAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          inv.paymentStatus === "PAID"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : inv.paymentStatus === "REFUNDED"
                            ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                            : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        }`}
                      >
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {inv.paymentChannel !== "NONE" ? (
                        <div>
                          <span className="font-semibold">{inv.paymentChannel}</span>
                          {inv.paymentReference && (
                            <span className="block font-mono text-[10px] text-slate-400">
                              UTR: {inv.paymentReference}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unpaid</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5">
                      <button
                        onClick={() => handleDownloadInvoicePdf(inv.invoiceId)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                        title="Download Tax Invoice PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      {inv.paymentStatus === "PENDING" && (
                        <button
                          onClick={() => setPayModalInvoice(inv)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Invoice Modal */}
      {isNewInvoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="h-4 w-4 text-teal-500" />
                <span>Create Advisory Tax Invoice</span>
              </h3>
              <button onClick={() => setIsNewInvoiceOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Client</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose Client --</option>
                  {clients.map((c) => (
                    <option key={c.client_id} value={c.client_id}>
                      {c.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Base Fee Amount (INR, Excl. GST)
                </label>
                <input
                  type="number"
                  value={baseFee}
                  onChange={(e) => setBaseFee(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cycle Start</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cycle End</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Tax preview */}
              <div className="p-3.5 rounded-xl border border-teal-500/20 bg-teal-500/5 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Base Fee:</span>
                  <span className="font-mono font-semibold">₹{baseFee.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>18% GST (CGST 9% + SGST 9%):</span>
                  <span className="font-mono">₹{Math.round(baseFee * 0.18).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-teal-500/20">
                  <span>Total Tax Invoice:</span>
                  <span className="font-mono text-teal-600 dark:text-teal-400">
                    ₹{Math.round(baseFee * 1.18).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewInvoiceOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingInvoice}
                onClick={handleCreateInvoice}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white"
              >
                {isSubmittingInvoice ? "Generating..." : "Generate Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      {payModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-500" />
                <span>Reconcile Official Banking Receipt</span>
              </h3>
              <button onClick={() => setPayModalInvoice(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400">Invoice:</span>{" "}
                <strong className="text-slate-900 dark:text-white font-mono">{payModalInvoice.invoiceNumber}</strong>
                <div className="text-base font-bold text-emerald-600 mt-1">
                  ₹{payModalInvoice.totalAmount.toLocaleString("en-IN")}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Official Banking Rail
                </label>
                <select
                  value={paymentChannel}
                  onChange={(e) => setPaymentChannel(e.target.value as RiaPaymentChannel)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="UPI">UPI (Unified Payments Interface)</option>
                  <option value="NEFT">NEFT (National Electronic Funds Transfer)</option>
                  <option value="RTGS">RTGS (Real-Time Gross Settlement)</option>
                  <option value="NETBANKING">Direct NetBanking</option>
                  <option value="CHEQUE">Account Payee Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Transaction Reference / UTR Number (Mandatory)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR192837465012 or UPI txn ref"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Required by SEBI compliance audit trails for independent auditor inspection.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayModalInvoice(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingPayment || !paymentReference.trim()}
                onClick={handleMarkPaid}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
              >
                {isSubmittingPayment ? "Reconciling..." : "Confirm Bank Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Early Termination Refund Modal */}
      <RiaRefundCalculatorModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        showToast={showToast}
      />
    </div>
  );
}

