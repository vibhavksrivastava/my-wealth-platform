"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  UserCheck,
  Search,
  Filter,
  RefreshCw,
  UserPlus,
  ShieldAlert,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Mail,
  Phone,
  Briefcase,
  TrendingUp,
} from "lucide-react";

interface ClientRecord {
  id: string;
  profileId: string | null;
  userId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  pan: string | null;
  annualGrossIncome: number;
  riskProfile: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assignedAdvisorId: string | null;
  assignedAdvisorName: string;
  reviewFrequency: string;
  createdAt: string;
}

interface AdvisorOption {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

export default function TenantAdminClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [advisors, setAdvisors] = useState<AdvisorOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");

  // Reassignment Modal State
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>("");
  const [isReassigning, setIsReassigning] = useState(false);
  const [reassignSuccess, setReassignSuccess] = useState<string | null>(null);

  const fetchClients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/admin/clients", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to load client oversight data.");
      }

      const json = await res.json();
      setClients(json.clients || []);
      setAdvisors(json.advisors || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    setIsReassigning(true);
    setReassignSuccess(null);

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/admin/clients", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientId: selectedClient.id,
          newAdvisorId: selectedAdvisorId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reassign client.");
      }

      setReassignSuccess(data.message || "Advisor updated.");

      // Update state locally
      setClients((prev) =>
        prev.map((c) =>
          c.id === selectedClient.id
            ? {
                ...c,
                assignedAdvisorId: data.assignedAdvisorId,
                assignedAdvisorName: data.assignedAdvisorName || "Unassigned",
              }
            : c
        )
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Reassignment failed.");
    } finally {
      setIsReassigning(false);
    }
  };

  const formatINR = (amount: number) => {
    if (!amount) return "₹0";
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.pan && c.pan.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.assignedAdvisorName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRisk =
      riskFilter === "ALL" ||
      c.riskProfile.toLowerCase() === riskFilter.toLowerCase();

    return matchesSearch && matchesRisk;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Client &amp; Advisor Oversight</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {clients.length} Total Clients
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Firm-wide oversight of client net worth, risk categorization, and relationship manager reassignments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchClients}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/dashboard/clients/new"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs shadow-md shadow-sky-600/20 transition"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>New Client Fact-Find</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by client name, PAN, advisor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
          />
        </div>

        <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          {["ALL", "Conservative", "Moderate", "Aggressive"].map((r) => (
            <button
              key={r}
              onClick={() => setRiskFilter(r)}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition ${
                riskFilter === r
                  ? "bg-sky-500/20 text-sky-300"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400">
                <th className="py-3 px-4 font-semibold">Client Name</th>
                <th className="py-3 px-4 font-semibold">PAN / Contact</th>
                <th className="py-3 px-4 font-semibold">Risk Category</th>
                <th className="py-3 px-4 font-semibold">Net Worth</th>
                <th className="py-3 px-4 font-semibold">Total Assets</th>
                <th className="py-3 px-4 font-semibold">Assigned Advisor</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-sky-400" />
                    <span>Loading firm clients...</span>
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No clients found matching the query.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-800/20 transition">
                    {/* Client name */}
                    <td className="py-3.5 px-4 font-bold text-white text-sm">
                      {client.fullName}
                    </td>

                    {/* PAN / Email */}
                    <td className="py-3.5 px-4">
                      {client.pan ? (
                        <div className="font-mono text-[11px] text-slate-200">{client.pan}</div>
                      ) : null}
                      {client.email ? (
                        <div className="text-[10px] text-slate-400 font-mono">{client.email}</div>
                      ) : (
                        <div className="text-[10px] text-slate-500">No linked user login</div>
                      )}
                    </td>

                    {/* Risk profile */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          client.riskProfile.toLowerCase() === "aggressive"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : client.riskProfile.toLowerCase() === "moderate"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {client.riskProfile}
                      </span>
                    </td>

                    {/* Net worth */}
                    <td className="py-3.5 px-4 font-bold text-emerald-400">
                      {formatINR(client.netWorth)}
                    </td>

                    {/* Total assets */}
                    <td className="py-3.5 px-4 text-slate-300">
                      {formatINR(client.totalAssets)}
                    </td>

                    {/* Assigned Advisor */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-3 w-3 text-slate-500" />
                        <span className="font-medium text-slate-200">
                          {client.assignedAdvisorName}
                        </span>
                      </div>
                    </td>

                    {/* Actions: Reassign & 360 */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/dashboard/clients/${client.id}/360`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold transition shadow-sm"
                        >
                          <span>Client 360 &deg;</span>
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedClient(client);
                            setSelectedAdvisorId(client.assignedAdvisorId || "");
                            setReassignSuccess(null);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition"
                        >
                          <ArrowRightLeft className="h-3 w-3 text-sky-400" />
                          <span>Reassign</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Reassign Advisor */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-sky-400" />
                Reassign Relationship Manager
              </h3>
              <button
                onClick={() => setSelectedClient(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select the new relationship manager / advisor for client{" "}
              <span className="font-semibold text-white">{selectedClient.fullName}</span>.
            </p>

            {reassignSuccess ? (
              <div className="space-y-3 py-2">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span>{reassignSuccess}</span>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setSelectedClient(null)}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg text-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReassign} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Select Advisor
                  </label>
                  <select
                    value={selectedAdvisorId}
                    onChange={(e) => setSelectedAdvisorId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- Unassigned --</option>
                    {advisors.map((adv) => (
                      <option key={adv.id} value={adv.id}>
                        {adv.name} ({adv.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedClient(null)}
                    className="px-4 py-2 border border-slate-800 rounded-lg text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isReassigning}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isReassigning ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Save Reassignment</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

