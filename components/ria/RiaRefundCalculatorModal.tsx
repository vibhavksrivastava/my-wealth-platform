"use client";

import { useState } from "react";
import { X, Calculator, AlertCircle, CheckCircle, RefreshCw, DollarSign, Calendar } from "lucide-react";

interface RiaRefundCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function RiaRefundCalculatorModal({
  isOpen,
  onClose,
  showToast,
}: RiaRefundCalculatorModalProps) {
  const [advanceAmount, setAdvanceAmount] = useState<number>(60000);
  const [startDate, setStartDate] = useState<string>("2026-01-01");
  const [endDate, setEndDate] = useState<string>("2026-12-31");
  const [terminationDate, setTerminationDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [allowBreakage, setAllowBreakage] = useState<boolean>(true);

  const [calculation, setCalculation] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  if (!isOpen) return null;

  const handleCalculate = async () => {
    setIsCalculating(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/ria/fees/refund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          advanceAmountPaid: advanceAmount,
          periodStartDate: startDate,
          periodEndDate: endDate,
          terminationDate,
          allowBreakageFee: allowBreakage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to calculate refund.");
      }

      setCalculation(data.calculation);
      showToast("Pro-rata refund calculated per SEBI guidelines.", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                SEBI Early Termination & Pro-Rata Refund Engine
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Statutory unearned fee computation with allowable breakage fee caps
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Advance Fee Collected (₹)
              </label>
              <input
                type="number"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Early Termination Date
              </label>
              <input
                type="date"
                value={terminationDate}
                onChange={(e) => setTerminationDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Cycle Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Cycle End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={allowBreakage}
              onChange={(e) => setAllowBreakage(e.target.checked)}
              className="rounded-sm border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
            />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              Apply allowable breakage fee (capped at 1 quarter / 25% of annual fee per SEBI rules)
            </span>
          </label>

          <button
            type="button"
            disabled={isCalculating}
            onClick={handleCalculate}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white transition flex items-center justify-center gap-2 shadow-xs"
          >
            <RefreshCw className={`h-4 w-4 ${isCalculating ? "animate-spin" : ""}`} />
            <span>{isCalculating ? "Calculating..." : "Compute SEBI Statutory Pro-Rata Refund"}</span>
          </button>

          {/* Results Card */}
          {calculation && (
            <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-500/5 dark:bg-teal-950/20 space-y-3">
              <div className="flex items-center justify-between border-b border-teal-500/20 pb-2">
                <span className="text-xs font-bold text-teal-800 dark:text-teal-300">
                  Net Refund Payable to Investor:
                </span>
                <span className="text-base font-extrabold text-teal-600 dark:text-teal-400 font-mono">
                  ₹{Number(calculation.netRefundPayable).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                <div>
                  <span className="text-slate-400">Days Served:</span>{" "}
                  <span className="font-semibold">{calculation.activeDaysServed} / {calculation.totalCycleDays} days</span>
                </div>
                <div>
                  <span className="text-slate-400">Daily Advisory Rate:</span>{" "}
                  <span className="font-mono">₹{calculation.dailyRate} / day</span>
                </div>
                <div>
                  <span className="text-slate-400">Earned Fee:</span>{" "}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ₹{Number(calculation.earnedFeeAmount).toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Unearned Fee:</span>{" "}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ₹{Number(calculation.unearnedFeeAmount).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-teal-500/10">
                  <span className="text-slate-400">Allowable Breakage Fee Deducted:</span>{" "}
                  <span className="font-semibold text-rose-500">
                    - ₹{Number(calculation.allowableBreakageFee).toLocaleString("en-IN")}
                  </span>{" "}
                  <span className="text-[10px] text-slate-400">(Max 1 Quarter per SEBI)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

