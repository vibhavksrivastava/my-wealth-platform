"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  KeyRound,
  Power,
  CheckCircle2,
  AlertCircle,
  Copy,
  X,
  Loader2,
  Mail,
  Phone,
  Shield,
  Briefcase,
} from "lucide-react";

interface TeamUser {
  id: string;
  email: string;
  phone_number: string | null;
  role: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  clientCount: number;
  last_login_at: string | null;
  created_at: string;
}

export default function TenantAdminUsersPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Add User Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    role: "ADVISOR",
    password: "",
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    tempPass: string;
  } | null>(null);

  // Reset Password Modal State
  const [resetModalUser, setResetModalUser] = useState<TeamUser | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Copy state
  const [copied, setCopied] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to load team members.");
      }

      const json = await res.json();
      setUsers(json.users || []);
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
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user: TeamUser) => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !user.is_active }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update user status.");
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: !user.is_active } : u))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle status.");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUserForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user account.");
      }

      setCreatedCredentials({
        email: data.user.email,
        tempPass: data.temporaryPassword,
      });

      // Refresh list
      fetchUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Creation failed.");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !newPasswordValue.trim()) return;

    setIsResetting(true);
    setResetSuccessMessage(null);

    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/admin/users/${resetModalUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword: newPasswordValue.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setResetSuccessMessage("Password reset successfully. Share credentials with staff member.");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setIsResetting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateRandomPassword = () => {
    return `Advisor@${Math.random().toString(36).slice(-6)}!`;
  };

  const filteredUsers = users.filter((u) => {
    const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Team &amp; User Provisioning</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Staff Directory
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Provision internal advisors and staff, configure role permissions, and manage account access.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              setCreatedCredentials(null);
              setNewUserForm({
                firstName: "",
                lastName: "",
                email: "",
                phoneNumber: "",
                role: "ADVISOR",
                password: generateRandomPassword(),
              });
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-md shadow-amber-600/20 transition"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Add Team Member</span>
          </button>
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
            placeholder="Search by advisor name, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          {["ALL", "ADVISOR", "STAFF", "TENANT_ADMIN"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition ${
                roleFilter === r
                  ? "bg-amber-500/20 text-amber-300"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {r === "ALL" ? "All Roles" : r}
            </button>
          ))}
        </div>
      </div>

      {/* Team Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400">
                <th className="py-3 px-4 font-semibold">Staff Member</th>
                <th className="py-3 px-4 font-semibold">Assigned Role</th>
                <th className="py-3 px-4 font-semibold">Phone Contact</th>
                <th className="py-3 px-4 font-semibold">Assigned Clients</th>
                <th className="py-3 px-4 font-semibold">Last Login</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-400" />
                    <span>Loading team members...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No team members found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/20 transition">
                    {/* User info */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3 text-slate-500" />
                        <span>{user.email}</span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          user.role === "TENANT_ADMIN"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : user.role === "ADVISOR"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                      {user.phone_number || <span className="text-slate-600">&mdash;</span>}
                    </td>

                    {/* Assigned clients */}
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      {user.clientCount || 0}
                    </td>

                    {/* Last Login */}
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Never"}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase transition ${
                          user.is_active
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400"
                            : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-emerald-500/10 hover:text-emerald-400"
                        }`}
                        title="Click to toggle account activation"
                      >
                        <Power className="h-3 w-3" />
                        <span>{user.is_active ? "Active" : "Inactive"}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setResetModalUser(user);
                          setNewPasswordValue(generateRandomPassword());
                          setResetSuccessMessage(null);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition"
                        title="Reset password"
                      >
                        <KeyRound className="h-3 w-3 text-amber-400" />
                        <span>Reset Pass</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Team Member */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-amber-400" />
                Add Advisor / Staff Member
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createdCredentials ? (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Staff Account Provisioned!</div>
                    <div className="text-[11px] text-slate-300 mt-1">
                      Share these initial credentials securely with the staff member:
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500">Email:</span>
                    <span className="font-mono text-white ml-2">{createdCredentials.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-500">Temporary Password:</span>
                      <span className="font-mono text-amber-400 font-bold ml-2">
                        {createdCredentials.tempPass}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `WealthOS Staff Credentials:\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.tempPass}`
                        )
                      }
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pallavi"
                      value={newUserForm.firstName}
                      onChange={(e) =>
                        setNewUserForm({ ...newUserForm, firstName: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Deshmukh"
                      value={newUserForm.lastName}
                      onChange={(e) =>
                        setNewUserForm({ ...newUserForm, lastName: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="advisor@firm.com"
                    value={newUserForm.email}
                    onChange={(e) =>
                      setNewUserForm({ ...newUserForm, email: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                      Role
                    </label>
                    <select
                      value={newUserForm.role}
                      onChange={(e) =>
                        setNewUserForm({ ...newUserForm, role: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="ADVISOR">ADVISOR (Relationship Manager)</option>
                      <option value="STAFF">STAFF (Operations / Backoffice)</option>
                      <option value="TENANT_ADMIN">TENANT_ADMIN (Firm Administrator)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={newUserForm.phoneNumber}
                      onChange={(e) =>
                        setNewUserForm({ ...newUserForm, phoneNumber: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Initial Password
                  </label>
                  <input
                    type="text"
                    value={newUserForm.password}
                    onChange={(e) =>
                      setNewUserForm({ ...newUserForm, password: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 border border-slate-800 rounded-lg text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingUser}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isCreatingUser ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <span>Create Account</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {resetModalUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-400" />
                Reset Password
              </h3>
              <button
                onClick={() => setResetModalUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Reset the password for{" "}
              <span className="font-semibold text-white">
                {resetModalUser.first_name} {resetModalUser.last_name}
              </span>{" "}
              ({resetModalUser.email}).
            </p>

            {resetSuccessMessage ? (
              <div className="space-y-3 py-2">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  {resetSuccessMessage}
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="font-mono text-amber-400 font-bold text-xs">
                    {newPasswordValue}
                  </span>
                  <button
                    onClick={() => copyToClipboard(newPasswordValue)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setResetModalUser(null)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    New Temporary Password
                  </label>
                  <input
                    type="text"
                    required
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="px-4 py-2 border border-slate-800 rounded-lg text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Set New Password</span>
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

