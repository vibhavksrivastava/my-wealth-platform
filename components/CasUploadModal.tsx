"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Sparkles,
  Check,
  ChevronDown,
  Search,
  User,
  ShieldCheck,
  Lock,
  Layers,
  HelpCircle,
  ExternalLink,
} from "lucide-react";

export interface CasUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userRole?: string;
  clients?: { client_id: string; full_name: string; uwp_client_code?: string }[];
  initialClientId?: string;
  currentClientId?: string;
  currentClientName?: string;
  brandColor?: string;
}

function formatINR(val: number) {
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  } else if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)} L`;
  } else {
    return `₹${val.toLocaleString("en-IN")}`;
  }
}

const SAMPLE_CAS_DATA = [
  {
    scheme: "Parag Parikh Flexi Cap Fund - Direct Plan Growth",
    folio: "93821049",
    valuation: 980000,
    cost: 680000,
    units: 1485.42,
    nav: 659.74,
  },
  {
    scheme: "HDFC Top 100 Fund - Growth Direct",
    folio: "10492819/22",
    valuation: 750000,
    cost: 550000,
    units: 642.18,
    nav: 1167.9,
  },
  {
    scheme: "Mirae Asset Large Cap Fund - Direct Growth",
    folio: "84729104",
    valuation: 520000,
    cost: 400000,
    units: 4895.12,
    nav: 106.23,
  },
  {
    scheme: "Nippon India Small Cap Fund - Growth",
    folio: "72619028",
    valuation: 430000,
    cost: 250000,
    units: 2544.38,
    nav: 169.0,
  },
];

export default function CasUploadModal({
  isOpen,
  onClose,
  onSuccess,
  userRole = "CLIENT",
  clients = [],
  initialClientId = "",
  currentClientId = "",
  currentClientName = "",
  brandColor = "#0284c7",
}: CasUploadModalProps) {
  const isAdvisor = ["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN"].includes(userRole);

  const [activeTab, setActiveTab] = useState<"FILE" | "PASTE">("FILE");
  const [selectedTargetClientId, setSelectedTargetClientId] = useState<string>("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pdfPassword, setPdfPassword] = useState("");
  const [showPdfPassword, setShowPdfPassword] = useState(false);

  // Paste / Text State
  const [casText, setCasText] = useState("");

  // Parsed Preview Holdings
  const [parsedHoldings, setParsedHoldings] = useState<any[]>([]);

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfInvestorInfo, setPdfInvestorInfo] = useState<{ name?: string; pan?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-set target client ID
  useEffect(() => {
    if (isAdvisor) {
      if (initialClientId) {
        setSelectedTargetClientId(initialClientId);
      } else if (clients && clients.length > 0) {
        setSelectedTargetClientId(clients[0].client_id);
      }
    } else {
      setSelectedTargetClientId(currentClientId || "");
    }
  }, [isAdvisor, initialClientId, currentClientId, clients]);

  // Clean state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      if (!casText && !selectedFile) {
        // start fresh
      }
    }
  }, [isOpen]);

  // Filter clients for advisor dropdown
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients;
    const q = clientSearchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.uwp_client_code?.toLowerCase().includes(q)
    );
  }, [clients, clientSearchQuery]);

  const selectedClientObj = useMemo(() => {
    return clients.find((c) => c.client_id === selectedTargetClientId) || null;
  }, [clients, selectedTargetClientId]);

  // Try parsing file or text whenever input changes
  const parseRawText = (text: string) => {
    if (!text.trim()) {
      setParsedHoldings([]);
      return;
    }

    try {
      const parsed = JSON.parse(text);
      let arr: any[] = [];
      if (Array.isArray(parsed)) arr = parsed;
      else if (parsed.data && Array.isArray(parsed.data)) arr = parsed.data;
      else if (parsed.folios && Array.isArray(parsed.folios)) arr = parsed.folios;
      else if (parsed.holdings && Array.isArray(parsed.holdings)) arr = parsed.holdings;
      else if (parsed.schemes && Array.isArray(parsed.schemes)) arr = parsed.schemes;

      if (arr.length > 0) {
        const normalized = arr.map((item) => ({
          scheme: item.scheme || item.scheme_name || item.schemeName || item.description || "Mutual Fund Scheme",
          folio: item.folio || item.folio_number || item.folioNumber || item.folioNo || "",
          units: Number(item.units) || undefined,
          nav: Number(item.nav || item.current_nav) || undefined,
          valuation: Number(item.valuation || item.current_market_value || item.current_value || item.value || item.amount || 0),
          cost: Number(item.cost || item.purchase_cost || item.invested_amount || item.cost_value || 0),
        }));
        setParsedHoldings(normalized);
        return;
      }
    } catch {
      // Fallback: parse CSV or lines
      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      const items: any[] = [];
      for (const line of lines) {
        // Skip header lines
        if (/^(scheme|fund|folio|sr|s\.no|date)/i.test(line.trim())) continue;

        const parts = line.split(/[,\t|]/).map((p) => p.trim());
        if (parts.length >= 2) {
          const lastNum = parts[parts.length - 1].replace(/[₹,RsINR\s]/gi, "");
          const val = Number(lastNum);
          if (!isNaN(val) && val > 0) {
            items.push({
              scheme: parts[0].replace(/^["']|["']$/g, ""),
              folio: (parts[1] || "").replace(/folio:?/i, "").trim(),
              valuation: val,
              cost: parts.length >= 3 ? Number(parts[parts.length - 2].replace(/[₹,RsINR\s]/gi, "")) || undefined : undefined,
            });
          }
        }
      }
      setParsedHoldings(items);
    }
  };

  const handleParsePdf = async (fileToParse?: File, pwd?: string): Promise<any[] | null> => {
    const targetFile = fileToParse || selectedFile;
    if (!targetFile) return null;
    const targetPwd = (pwd !== undefined ? pwd : pdfPassword).trim();

    setIsParsingPdf(true);
    setErrorMessage(null);
    try {
      const token = localStorage.getItem("auth_token");
      const formData = new FormData();
      formData.append("file", targetFile);
      if (targetPwd) {
        formData.append("password", targetPwd);
      }

      const res = await fetch("/api/cas/parse-pdf", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to decrypt and analyze CAS PDF.");
      }

      if (json.holdings && Array.isArray(json.holdings) && json.holdings.length > 0) {
        setParsedHoldings(json.holdings);
        if (json.investorName || json.pan) {
          setPdfInvestorInfo({ name: json.investorName, pan: json.pan });
        }
        return json.holdings;
      } else {
        throw new Error("No active mutual fund folios detected in this statement.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to decrypt PDF. Please verify your password.");
      return null;
    } finally {
      setIsParsingPdf(false);
    }
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    setErrorMessage(null);
    setPdfInvestorInfo(null);

    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      setParsedHoldings([]);
      if (pdfPassword.trim()) {
        handleParsePdf(file, pdfPassword);
      }
    } else {
      // Text / JSON / CSV
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          setCasText(text);
          parseRawText(text);
        }
      };
      reader.onerror = () => {
        setErrorMessage("Failed to read the selected file. Please verify file permissions.");
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSample = () => {
    const formatted = JSON.stringify(SAMPLE_CAS_DATA, null, 2);
    setCasText(formatted);
    parseRawText(formatted);
    setErrorMessage(null);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const targetId = isAdvisor ? selectedTargetClientId : currentClientId || selectedTargetClientId || "me";
    if (!targetId) {
      setErrorMessage("Please select a client account to import mutual fund folios into.");
      return;
    }

    let payloadData = parsedHoldings;
    if (payloadData.length === 0 && selectedFile && selectedFile.name.toLowerCase().endsWith(".pdf")) {
      const parsed = await handleParsePdf();
      if (!parsed || parsed.length === 0) {
        return;
      }
      payloadData = parsed;
    }

    if (!payloadData || (Array.isArray(payloadData) && payloadData.length === 0)) {
      payloadData = casText.trim() ? (parseRawText(casText), parsedHoldings) : [];
      if (!payloadData || (Array.isArray(payloadData) && payloadData.length === 0)) {
        setErrorMessage("Please select a CAS file or paste your statement details to import.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/clients/${targetId}/import-cas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          casData: payloadData,
          pdfPassword: pdfPassword.trim() || undefined,
          fileName: selectedFile?.name || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to ingest CAS statement folios.");
      }

      setSuccessMessage(
        json.message ||
          `Successfully ingested ${json.importedCount || parsedHoldings.length || "all"} mutual fund folios totaling ${formatINR(
            json.totalImportedValuation || 0
          )}!`
      );

      // Trigger success callback after 1.5 seconds
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1600);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred while importing CAS statement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const totalPreviewValuation = parsedHoldings.reduce((sum, h) => sum + Number(h.valuation || 0), 0);
  const totalPreviewCost = parsedHoldings.reduce((sum, h) => sum + Number(h.cost || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close CAS Import Dialog"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition p-1"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 pr-8">
          <div
            className="p-2.5 rounded-xl border shrink-0"
            style={{ backgroundColor: `${brandColor}15`, borderColor: `${brandColor}30`, color: brandColor }}
          >
            <UploadCloud className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: `${brandColor}15`, color: brandColor }}
              >
                CAMS &bull; KFintech &bull; MF Central
              </span>
              <span className="text-[10px] text-slate-400">Institutional CAS Ingestion</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
              {isAdvisor ? "Import Client CAMS / KFin CAS Statement" : "Upload Your Mutual Fund CAS Statement"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAdvisor
                ? "Parse and update mutual fund folios, units, and valuations directly into client net worth."
                : "Upload your consolidated mutual fund statement to sync your portfolio folios and valuations."}
            </p>
          </div>
        </div>

        {/* Alerts & Notifications */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="font-semibold leading-relaxed">{successMessage}</div>
          </div>
        )}

        <form onSubmit={handleImportSubmit} className="space-y-4">
          {/* Target Client Selection */}
          {isAdvisor ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Target Client Portfolio <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left text-xs text-slate-900 dark:text-white flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-2 truncate">
                    <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold truncate">
                      {selectedClientObj ? selectedClientObj.full_name : "Select Client Account..."}
                    </span>
                    {selectedClientObj?.uwp_client_code && (
                      <span className="text-[10px] font-mono text-slate-400">
                        ({selectedClientObj.uwp_client_code})
                      </span>
                    )}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                </button>

                {isClientDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                    <div className="relative mb-2">
                      <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search client by name or code..."
                        value={clientSearchQuery}
                        onChange={(e) => setClientSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-0.5">
                      {filteredClients.map((c) => (
                        <button
                          key={c.client_id}
                          type="button"
                          onClick={() => {
                            setSelectedTargetClientId(c.client_id);
                            setIsClientDropdownOpen(false);
                            setClientSearchQuery("");
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                            selectedTargetClientId === c.client_id
                              ? "bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 font-bold"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <span>{c.full_name}</span>
                          <span className="text-[10px] font-mono text-slate-400">{c.uwp_client_code || "Client"}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-sky-500" />
                <span className="text-slate-600 dark:text-slate-400">Target Investor Portfolio:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {currentClientName || "Self Account"}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                Authorized Client
              </span>
            </div>
          )}

          {/* Ingestion Mode Selector Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("FILE")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === "FILE"
                  ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Upload Statement File (PDF / JSON / CSV)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("PASTE")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === "PASTE"
                  ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Paste Text / JSON / CSV</span>
            </button>
          </div>

          {/* TAB 1: FILE UPLOAD */}
          {activeTab === "FILE" && (
            <div className="space-y-3">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 ${
                  isDragging
                    ? "border-sky-500 bg-sky-50/50 dark:bg-sky-950/20"
                    : "border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/40"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.json,.csv,.txt,.xlsx"
                  onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                  className="hidden"
                />

                <div
                  className="p-3 rounded-2xl border"
                  style={{ backgroundColor: `${brandColor}15`, borderColor: `${brandColor}30`, color: brandColor }}
                >
                  <UploadCloud className="h-6 w-6" />
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {selectedFile ? (
                      <span className="text-sky-600 dark:text-sky-400">{selectedFile.name}</span>
                    ) : (
                      <>
                        <span className="text-sky-600 dark:text-sky-400">Click to browse</span> or drag &amp; drop statement
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Supports CAMS / KFintech CAS in PDF, JSON, CSV, or Text format (up to 25MB)
                  </p>
                </div>
              </div>

              {/* PDF Password Field if PDF selected */}
              {selectedFile && selectedFile.name.toLowerCase().endsWith(".pdf") && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-slate-400" />
                      <span>CAS PDF Password</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">PAN in ALL CAPS (e.g., BFHPS4115P) or DOB</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showPdfPassword ? "text" : "password"}
                        value={pdfPassword}
                        onChange={(e) => setPdfPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleParsePdf();
                          }
                        }}
                        placeholder="Enter PAN in ALL CAPS (e.g. BFHPS4115P)..."
                        className="w-full px-3 py-2 pr-9 text-xs rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none uppercase font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPdfPassword(!showPdfPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                      >
                        {showPdfPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleParsePdf()}
                      disabled={isParsingPdf}
                      className="px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 transition shrink-0 flex items-center gap-1.5 shadow-xs"
                    >
                      {isParsingPdf ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Decrypting...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Unlock &amp; Parse</span>
                        </>
                      )}
                    </button>
                  </div>

                  {pdfInvestorInfo && (
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                      <span className="font-semibold">Statement Holder: {pdfInvestorInfo.name}</span>
                      {pdfInvestorInfo.pan && (
                        <span className="font-mono text-[10px] bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                          PAN: {pdfInvestorInfo.pan}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PASTE TEXT OR JSON */}
          {activeTab === "PASTE" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  CAS Data (JSON, Tab-Separated, or CSV)
                </label>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Load Sample CAMS / KFin CAS (1-Click Test)</span>
                </button>
              </div>
              <textarea
                rows={6}
                value={casText}
                onChange={(e) => {
                  setCasText(e.target.value);
                  parseRawText(e.target.value);
                }}
                placeholder='Paste CAMS or KFintech CAS JSON or table rows here, e.g.:&#10;[&#10;  { "scheme": "Parag Parikh Flexi Cap Fund", "folio": "93821049", "valuation": 980000, "cost": 680000 }&#10;]'
                className="w-full p-3 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 leading-relaxed"
              />
            </div>
          )}

          {/* LIVE FOLIO PARSED PREVIEW ACCORDION */}
          {parsedHoldings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Detected {parsedHoldings.length} Mutual Fund Folios</span>
                </span>
                <span className="text-sky-600 dark:text-sky-400">
                  Total Value: {formatINR(totalPreviewValuation)}
                </span>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {parsedHoldings.map((h, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {h.scheme}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {h.folio ? `Folio: ${h.folio}` : "No Folio Spec"} &bull;{" "}
                        {h.units ? `${h.units} Units` : "Units N/A"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {formatINR(h.valuation)}
                      </div>
                      {h.cost && (
                        <div className="text-[10px] text-slate-400">
                          Cost: {formatINR(h.cost)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!selectedFile && !casText.trim() && parsedHoldings.length === 0)}
              style={{ backgroundColor: brandColor }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Ingesting Statement...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  <span>
                    Import {parsedHoldings.length > 0 ? `${parsedHoldings.length} Folios` : "CAS Statement"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

