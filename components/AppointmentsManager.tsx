"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  XCircle,
  Plus,
  Loader2,
  FileText,
  MessageSquare,
  AlertCircle,
  User,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import { AppointmentItem, AppointmentStatus } from "@/lib/appointments";

interface AppointmentsManagerProps {
  clientId?: string;
  clients?: { client_id: string; full_name: string }[];
  userRole: "CLIENT" | "ADVISOR" | "TENANT_ADMIN" | "SUPER_ADMIN" | "STAFF";
  title?: string;
  subtitle?: string;
  brandColor?: string;
}

export default function AppointmentsManager({
  clientId,
  clients,
  userRole,
  title = "Review Calls & Strategy Meetings",
  subtitle = "Schedule calls, confirm meeting slots, and review strategic meeting minutes.",
  brandColor,
}: AppointmentsManagerProps) {
  const activeBrandColor = brandColor || "var(--tenant-primary, #0284c7)";
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal State for Scheduling
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>(clientId || (clients && clients[0]?.client_id) || "");
  const [formTitle, setFormTitle] = useState("Portfolio Strategy & Suggestions Review");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("11:00");
  const [formDuration, setFormDuration] = useState("45");
  const [formNotes, setFormNotes] = useState("");
  const [formLink, setFormLink] = useState("");

  // Notes addition state per appointment
  const [noteInputs, setNoteInputs] = useState<{ [id: string]: string }>({});
  const [isSavingNote, setIsSavingNote] = useState<{ [id: string]: boolean }>({});

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const url = clientId ? `/api/appointments?clientId=${clientId}` : "/api/appointments";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setAppointments(json.appointments || []);
      }
    } catch (err: any) {
      console.error("fetchAppointments error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [clientId]);

  useEffect(() => {
    if (clientId) {
      setSelectedClientId(clientId);
    } else if (!selectedClientId && clients && clients.length > 0) {
      setSelectedClientId(clients[0].client_id);
    }
  }, [clientId, clients, selectedClientId]);

  // Handle scheduling a new call
  const handleScheduleCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!formDate || !formTime) {
      setModalError("Please choose a date and time for the call.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("auth_token");
      const startDateTime = new Date(`${formDate}T${formTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + Number(formDuration) * 60 * 1000);

      const targetClientId = clientId || selectedClientId || (clients && clients[0]?.client_id);
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientId: targetClientId,
          title: formTitle.trim(),
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          notes: formNotes.trim() || undefined,
          meetingLink: formLink.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to schedule appointment.");

      showToast(json.message || "Call scheduled successfully!");
      setIsScheduleOpen(false);
      setModalError(null);
      setFormNotes("");
      setFormLink("");
      await fetchAppointments();
    } catch (err: any) {
      setModalError(err.message || "Failed to schedule appointment.");
      showToast(err.message || "Failed to schedule appointment.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle accepting, declining, or completing call
  const handleUpdateStatus = async (appointmentId: string, action: "ACCEPT" | "DECLINE" | "COMPLETE") => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/appointments", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ appointmentId, action }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update appointment.");

      showToast(
        action === "ACCEPT"
          ? "Call confirmed! Slot added to schedule."
          : action === "COMPLETE"
          ? "Call marked as completed."
          : "Call declined/cancelled."
      );
      await fetchAppointments();
    } catch (err: any) {
      showToast(err.message || "Failed to update appointment.", "error");
    }
  };

  // Handle adding notes/minutes to a call
  const handleAddCallNote = async (appointmentId: string) => {
    const text = noteInputs[appointmentId];
    if (!text || !text.trim()) {
      showToast("Please enter a note to save.", "error");
      return;
    }

    setIsSavingNote((prev) => ({ ...prev, [appointmentId]: true }));
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/appointments", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appointmentId,
          notes: text.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save call note.");

      showToast("Call notes recorded successfully!");
      setNoteInputs((prev) => ({ ...prev, [appointmentId]: "" }));
      await fetchAppointments();
    } catch (err: any) {
      showToast(err.message || "Failed to save note.", "error");
    } finally {
      setIsSavingNote((prev) => ({ ...prev, [appointmentId]: false }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-2.5 text-xs font-semibold ${
            notification.type === "success"
              ? "bg-white dark:bg-slate-900 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
              : "bg-white dark:bg-slate-900 border-rose-500/40 text-rose-600 dark:text-rose-400"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" style={{ color: activeBrandColor }} />
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{title}</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        <button
          onClick={() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setFormDate(tomorrow.toISOString().split("T")[0]);
            setModalError(null);
            setIsScheduleOpen(true);
          }}
          style={{ backgroundColor: activeBrandColor }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-xs font-bold transition shadow-md hover:brightness-110 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span>{userRole === "CLIENT" ? "Request Call with Advisor" : "Schedule Client Review"}</span>
        </button>
      </div>

      {/* Appointments List */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: activeBrandColor }} />
          <span className="text-xs font-medium">Loading scheduled meetings...</span>
        </div>
      ) : appointments.length === 0 ? (
        <div className="p-8 rounded-xl bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 text-center space-y-2">
          <Calendar className="h-8 w-8 text-slate-400 dark:text-slate-600 mx-auto" />
          <p className="text-xs text-slate-600 dark:text-slate-400">No calls scheduled at the moment.</p>
          <button
            onClick={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              setFormDate(tomorrow.toISOString().split("T")[0]);
              setIsScheduleOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
          >
            <Plus className="h-3.5 w-3.5" style={{ color: activeBrandColor }} />
            <span>Schedule First Call</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => {
            const startDate = new Date(appt.start_time);
            const endDate = new Date(appt.end_time);
            const dateStr = startDate.toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            const timeStr = `${startDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} - ${endDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;

            const isPending = appt.status === "PENDING" || appt.status === "REQUESTED";
            const isConfirmed = appt.status === "CONFIRMED";
            const isCompleted = appt.status === "COMPLETED";
            const isCancelled = appt.status === "CANCELLED";

            // If scheduled by client and viewer is advisor -> show accept button
            // If scheduled by advisor and viewer is client -> show accept button
            const canAccept =
              isPending &&
              ((appt.scheduled_by === "CLIENT" && userRole !== "CLIENT") ||
                (appt.scheduled_by === "ADVISOR" && userRole === "CLIENT"));

            return (
              <div
                key={appt.id}
                className="p-5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs transition"
              >
                {/* Top Row: Title, Date, Time & Status */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{appt.title}</h4>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          isConfirmed
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : isPending
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            : isCompleted
                            ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {isPending ? "Pending Review" : appt.status}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      {appt.client_name && (
                        <>
                          <span className="flex items-center gap-1 font-semibold" style={{ color: activeBrandColor }}>
                            <User className="h-3.5 w-3.5" />
                            {appt.client_name}
                          </span>
                          <span>&bull;</span>
                        </>
                      )}
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Calendar className="h-3.5 w-3.5" style={{ color: activeBrandColor }} />
                        {dateStr}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Clock className="h-3.5 w-3.5" style={{ color: activeBrandColor }} />
                        {timeStr}
                      </span>
                      <span>&bull;</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        Initiated by:{" "}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {appt.scheduled_by === "CLIENT" ? "Client" : "Advisor"}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center gap-2">
                    {canAccept && (
                      <button
                        onClick={() => handleUpdateStatus(appt.id, "ACCEPT")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Accept Call</span>
                      </button>
                    )}

                    {!isCompleted && !isCancelled && (
                      <button
                        onClick={() => handleUpdateStatus(appt.id, "COMPLETE")}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Mark Completed</span>
                      </button>
                    )}

                    {!isCancelled && !isCompleted && (
                      <button
                        onClick={() => handleUpdateStatus(appt.id, "DECLINE")}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
                        title="Cancel or decline this call"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Cancel</span>
                      </button>
                    )}

                    {appt.meeting_link && !isCancelled && (
                      <a
                        href={appt.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-bold border border-sky-200 dark:border-sky-500/20 transition"
                      >
                        <Video className="h-3.5 w-3.5" />
                        <span>Join Video Call</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Meeting Minutes & Strategic Notes Section */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" style={{ color: activeBrandColor }} />
                      Strategic Meeting Minutes &amp; Notes (Refer Later)
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Visible to both Client and Advisor
                    </span>
                  </div>

                  {appt.notes ? (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                      {appt.notes}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 text-[11px] text-slate-500 italic">
                      No meeting notes added yet. Use the input below to record strategic takeaways or decisions agreed during the call.
                    </div>
                  )}

                  {/* Add Note Input */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={noteInputs[appt.id] || ""}
                      onChange={(e) => setNoteInputs((prev) => ({ ...prev, [appt.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddCallNote(appt.id);
                        }
                      }}
                      placeholder="Add strategic takeaway or agreement to refer later (e.g., Client agreed to prepay ₹1.5L car loan in Nov)..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none transition"
                    />
                    <button
                      onClick={() => handleAddCallNote(appt.id)}
                      disabled={isSavingNote[appt.id]}
                      style={{ backgroundColor: activeBrandColor }}
                      className="px-3.5 py-1.5 rounded-lg text-white text-xs font-bold transition flex items-center justify-center gap-1 whitespace-nowrap shadow-sm hover:brightness-110"
                    >
                      {isSavingNote[appt.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      <span>Save Note</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Call Modal */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" style={{ color: activeBrandColor }} />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {userRole === "CLIENT" ? "Request Call with Your Advisor" : "Schedule Client Review Call"}
                </h3>
              </div>
              <button
                onClick={() => setIsScheduleOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleCall} className="space-y-4 text-xs">
              {!clientId && userRole !== "CLIENT" && clients && clients.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Client
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none"
                  >
                    {clients.map((c) => (
                      <option key={c.client_id} value={c.client_id}>
                        {c.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Meeting Title &amp; Purpose
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Duration
                  </label>
                  <select
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="30">30 Mins</option>
                    <option value="45">45 Mins</option>
                    <option value="60">60 Mins</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Meeting Link (Google Meet / Zoom URL)
                </label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/... (auto-generated if left blank)"
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Agenda &amp; Topics to Discuss
                </label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g., Review recommendations regarding retirement SIP step-up and tax optimization..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
              </div>

              {modalError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center gap-2 text-xs animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ backgroundColor: activeBrandColor }}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-white font-bold transition shadow-md hover:brightness-110"
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
                  <span>{userRole === "CLIENT" ? "Send Call Request" : "Confirm Schedule"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
