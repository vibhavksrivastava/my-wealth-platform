"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  Users,
  User,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  FileText,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Filter,
  Loader2,
  Check,
  X,
  MessageSquare,
  TrendingUp,
  LayoutDashboard,
  CalendarCheck,
} from "lucide-react";
import { useFirmBranding } from "@/lib/context/FirmBrandingContext";
import { AppointmentItem, AppointmentStatus } from "@/lib/appointments";

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="h-8 w-8 text-sky-500 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading advisory calendar...</p>
        </div>
      }
    >
      <CalendarContent />
    </Suspense>
  );
}

function CalendarContent() {
  const { terms, isRia } = useFirmBranding();
  const [isMounted, setIsMounted] = useState(false);
  const [userRole, setUserRole] = useState<string>("CLIENT");
  const [userId, setUserId] = useState<string>("");

  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [clients, setClients] = useState<{ client_id: string; full_name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filters & Search
  const [filterTab, setFilterTab] = useState<"ALL" | "NEXT_7" | "UPCOMING" | "PAST" | "PENDING">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Scheduling Modal
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [formTitle, setFormTitle] = useState("Quarterly Portfolio Review & Asset Allocation");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("10:30");
  const [formDuration, setFormDuration] = useState("45");
  const [formNotes, setFormNotes] = useState("");
  const [formLink, setFormLink] = useState("https://meet.google.com/uwp-advisory-session");

  // Inline Note Recording State
  const [noteInputs, setNoteInputs] = useState<{ [id: string]: string }>({});
  const [isSavingNote, setIsSavingNote] = useState<{ [id: string]: boolean }>({});
  const [expandedNotes, setExpandedNotes] = useState<{ [id: string]: boolean }>({});

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    setIsMounted(true);
    try {
      const p = localStorage.getItem("user_profile");
      if (p) {
        const parsed = JSON.parse(p);
        setUserRole(parsed.role || "CLIENT");
        setUserId(parsed.id || "");
      }
    } catch {}
  }, []);

  const isAdvisor = ["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN"].includes(userRole);

  // Fetch appointments and clients
  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      const [apptRes, clientsRes] = await Promise.all([
        fetch("/api/appointments", { headers: { Authorization: `Bearer ${token}` } }),
        isAdvisor
          ? fetch("/api/advisor/overview", { headers: { Authorization: `Bearer ${token}` } })
          : Promise.resolve(null),
      ]);

      if (apptRes.ok) {
        const json = await apptRes.json();
        setAppointments(json.appointments || []);
      }

      if (clientsRes && clientsRes.ok) {
        const cJson = await clientsRes.json();
        const clientList = (cJson.clients || []).map((c: any) => ({
          client_id: c.client_id,
          full_name: c.full_name,
        }));
        setClients(clientList);
        if (clientList.length > 0 && !selectedClientId) {
          setSelectedClientId(clientList[0].client_id);
        }
      }
    } catch (err: any) {
      console.error("fetchAppointments error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isMounted) {
      fetchAppointments();
    }
  }, [isMounted]);

  // Handle scheduling call
  const handleScheduleCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!formDate || !formTime) {
      setModalError("Please select a valid date and time.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("auth_token");
      const startDateTime = new Date(`${formDate}T${formTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + Number(formDuration) * 60 * 1000);

      const targetClientId = selectedClientId || (clients && clients[0]?.client_id);
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

      showToast(json.message || "Meeting scheduled successfully!");
      setIsScheduleOpen(false);
      setModalError(null);
      setFormNotes("");
      await fetchAppointments();
    } catch (err: any) {
      setModalError(err.message || "Failed to schedule meeting.");
      showToast(err.message || "Failed to schedule meeting.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle status update
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
          ? "Meeting confirmed! Slot confirmed in calendar."
          : action === "COMPLETE"
          ? "Meeting marked as completed."
          : "Meeting cancelled."
      );
      await fetchAppointments();
    } catch (err: any) {
      showToast(err.message || "Failed to update appointment.", "error");
    }
  };

  // Handle saving notes
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

  // ──────────────────────────────────────────────────────────────────────────
  // Latest / Next Upcoming Meeting Spotlight Resolution
  // ──────────────────────────────────────────────────────────────────────────
  const now = useMemo(() => new Date(), []);
  const next7DaysEnd = useMemo(() => new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), [now]);

  // Find the next upcoming confirmed/requested meeting closest to now
  const latestMeeting = useMemo(() => {
    const active = appointments.filter((a) => a.status !== "CANCELLED");
    const upcoming = active
      .filter((a) => new Date(a.start_time).getTime() >= now.getTime() - 2 * 60 * 60 * 1000)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    if (upcoming.length > 0) return upcoming[0];
    // Fallback to most recent meeting if no future meeting exists
    const sorted = [...active].sort(
      (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );
    return sorted[0] || null;
  }, [appointments, now]);

  // Metric counts
  const next7DaysCount = useMemo(() => {
    return appointments.filter((a) => {
      const d = new Date(a.start_time);
      return d >= now && d <= next7DaysEnd && a.status !== "CANCELLED";
    }).length;
  }, [appointments, now, next7DaysEnd]);

  const upcomingCount = useMemo(() => {
    return appointments.filter((a) => {
      const d = new Date(a.start_time);
      return d >= now && a.status !== "CANCELLED";
    }).length;
  }, [appointments, now]);

  const pastCount = useMemo(() => {
    return appointments.filter((a) => {
      const d = new Date(a.start_time);
      return d < now || a.status === "COMPLETED";
    }).length;
  }, [appointments, now]);

  const pendingCount = useMemo(() => {
    return appointments.filter((a) => a.status === "REQUESTED" || a.status === "PENDING").length;
  }, [appointments]);

  // Filtered appointments list
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const d = new Date(a.start_time);

      // Tab filter
      if (filterTab === "NEXT_7") {
        if (!(d >= now && d <= next7DaysEnd && a.status !== "CANCELLED")) return false;
      } else if (filterTab === "UPCOMING") {
        if (!(d >= now && a.status !== "CANCELLED")) return false;
      } else if (filterTab === "PAST") {
        if (!(d < now || a.status === "COMPLETED" || a.status === "CANCELLED")) return false;
      } else if (filterTab === "PENDING") {
        if (!(a.status === "REQUESTED" || a.status === "PENDING")) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = a.title.toLowerCase().includes(q);
        const matchesClient = (a.client_name || "").toLowerCase().includes(q);
        const matchesAdvisor = (a.advisor_name || "").toLowerCase().includes(q);
        const matchesNotes = (a.notes || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesClient && !matchesAdvisor && !matchesNotes) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // In NEXT_7 and UPCOMING tabs, show soonest first (ascending)
      if (filterTab === "NEXT_7" || filterTab === "UPCOMING") {
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      }
      // In ALL and PAST tabs, show newest first (descending)
      return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
    });
  }, [appointments, filterTab, searchQuery, now, next7DaysEnd]);

  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-8 w-8 text-sky-500 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading advisory calendar...</p>
      </div>
    );
  }

  // Format countdown / relative label for latest meeting
  const getRelativeTimeLabel = (startTimeStr: string) => {
    const target = new Date(startTimeStr);
    const diffMs = target.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0 && diffMs > -2 * 60 * 60 * 1000) return "Happening Now • Active Call";
    if (diffMs < 0) return "Completed / Past Call";
    if (diffHours < 24) return `Today at ${target.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
    if (diffDays === 1) return `Tomorrow at ${target.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
    return `In ${diffDays} days (${target.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })})`;
  };

  return (
    <div className="space-y-6">
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
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. HEADER BANNER
      ───────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-sky-900/30 via-indigo-900/20 to-slate-900/40 border border-sky-500/20 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30 uppercase tracking-wider flex items-center gap-1">
              <CalendarCheck className="h-3 w-3" />
              <span>Advisory Review Calendar</span>
            </span>
            <span className="text-xs text-slate-400">
              {appointments.length} Total Meetings Scheduled &bull; {next7DaysCount} in Next 7 Days
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
            Meetings &amp; Client Consultation Calendar
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Consolidated timeline of all upcoming strategy reviews, portfolio checkups, client consultation requests, and permanent advisory minutes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              setFormDate(tomorrow.toISOString().split("T")[0]);
              setModalError(null);
              setIsScheduleOpen(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/20 transition whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>{isAdvisor ? "+ Schedule Client Review" : "+ Request Advisor Call"}</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. KPI SUMMARY METRICS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Meetings */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs">
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            All Scheduled Meetings
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {appointments.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Across entire engagement</div>
        </div>

        {/* Next 7 Days Active */}
        <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/20 shadow-xs">
          <div className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
            Next 7 Days
          </div>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
            {next7DaysCount}
          </div>
          <div className="text-[10px] text-sky-600/70 dark:text-sky-400/70 mt-0.5">Upcoming this week</div>
        </div>

        {/* Future Upcoming */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs">
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Upcoming
          </div>
          <div className="text-2xl font-black text-emerald-500 mt-1">
            {upcomingCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Active pipeline calls</div>
        </div>

        {/* Pending Requests */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs">
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Pending Confirmation
          </div>
          <div className="text-2xl font-black text-amber-500 mt-1">
            {pendingCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Awaiting advisor review</div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. SPOTLIGHT: LATEST / FOCUSED UPCOMING MEETING (HIGHLIGHTED)
      ───────────────────────────────────────────────────────────── */}
      {latestMeeting && (
        <div className="p-6 rounded-2xl border-2 border-sky-500/40 bg-gradient-to-r from-sky-500/10 via-indigo-500/5 to-slate-900/40 shadow-xl relative overflow-hidden group">
          {/* Subtle Ambient Glow */}
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500 text-white shadow-sm animate-pulse">
                  <Sparkles className="h-3 w-3" />
                  <span>SPOTLIGHT &bull; NEXT UPCOMING MEETING</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  {getRelativeTimeLabel(latestMeeting.start_time)}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {latestMeeting.status}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {latestMeeting.title}
              </h2>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                {latestMeeting.client_name && (
                  <div className="flex items-center gap-1.5 font-bold text-sky-600 dark:text-sky-400">
                    <User className="h-4 w-4 text-sky-500" />
                    <span>Investor: {latestMeeting.client_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 font-medium">
                  <CalendarIcon className="h-4 w-4 text-slate-400" />
                  <span>
                    {new Date(latestMeeting.start_time).toLocaleDateString("en-IN", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>
                    {new Date(latestMeeting.start_time).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {new Date(latestMeeting.end_time).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {latestMeeting.notes && (
                <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 mt-2">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1 mb-1">
                    <FileText className="h-3.5 w-3.5 text-sky-500" />
                    <span>Advisory Notes / Agenda:</span>
                  </span>
                  <p className="line-clamp-2 leading-relaxed">{latestMeeting.notes}</p>
                </div>
              )}
            </div>

            {/* Quick Actions for Latest Meeting */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-2.5 shrink-0">
              {latestMeeting.meeting_link && (
                <a
                  href={latestMeeting.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition"
                >
                  <Video className="h-4 w-4" />
                  <span>Join Video Call Now</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                </a>
              )}

              {latestMeeting.status !== "COMPLETED" && isAdvisor && (
                <button
                  onClick={() => handleUpdateStatus(latestMeeting.id, "COMPLETE")}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition shadow-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Mark as Completed</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. ALL MEETINGS LEDGER WITH TABS & SEARCH
      ───────────────────────────────────────────────────────────── */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-5">
        {/* Navigation & Search Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setFilterTab("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                filterTab === "ALL"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All Meetings ({appointments.length})
            </button>
            <button
              onClick={() => setFilterTab("NEXT_7")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                filterTab === "NEXT_7"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Next 7 Days ({next7DaysCount})
            </button>
            <button
              onClick={() => setFilterTab("UPCOMING")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                filterTab === "UPCOMING"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Upcoming ({upcomingCount})
            </button>
            <button
              onClick={() => setFilterTab("PAST")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                filterTab === "PAST"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Past / Completed ({pastCount})
            </button>
            <button
              onClick={() => setFilterTab("PENDING")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                filterTab === "PENDING"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Pending Requests ({pendingCount})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by client or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Meeting Cards List */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="h-8 w-8 text-sky-500 animate-spin" />
            <p className="text-xs font-medium">Loading calendar meetings...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <CalendarIcon className="h-10 w-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No matching meetings found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No meetings matching "${searchQuery}". Try clearing search or choosing another tab.`
                : "There are no meetings recorded in this view tab."}
            </p>
            <button
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setFormDate(tomorrow.toISOString().split("T")[0]);
                setIsScheduleOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Schedule New Meeting</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appt) => {
              const startDate = new Date(appt.start_time);
              const endDate = new Date(appt.end_time);
              const isSpotlight = latestMeeting?.id === appt.id;

              const isPending = appt.status === "PENDING" || appt.status === "REQUESTED";
              const isConfirmed = appt.status === "CONFIRMED";
              const isCompleted = appt.status === "COMPLETED";
              const isCancelled = appt.status === "CANCELLED";

              const canAccept =
                isPending &&
                ((appt.scheduled_by === "CLIENT" && isAdvisor) ||
                  (appt.scheduled_by === "ADVISOR" && !isAdvisor));

              return (
                <div
                  key={appt.id}
                  className={`p-5 rounded-xl border transition space-y-3.5 ${
                    isSpotlight
                      ? "bg-sky-50/40 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800 shadow-sm"
                      : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {/* Top Row: Title, Status, and Relative Date */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{appt.title}</h4>
                        {isSpotlight && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-sky-500 text-white uppercase tracking-wider">
                            Latest Upcoming
                          </span>
                        )}
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

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        {appt.client_name && (
                          <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-sky-500" />
                            <span>Client: {appt.client_name}</span>
                          </span>
                        )}
                        <span>&bull;</span>
                        <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                          <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {startDate.toLocaleDateString("en-IN", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {startDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} -{" "}
                            {endDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Actions on this meeting */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {canAccept && (
                        <button
                          onClick={() => handleUpdateStatus(appt.id, "ACCEPT")}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Accept &amp; Confirm</span>
                        </button>
                      )}

                      {appt.meeting_link && !isCancelled && (
                        <a
                          href={appt.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/80 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold transition shadow-xs"
                        >
                          <Video className="h-3.5 w-3.5 text-sky-500" />
                          <span>Join Video</span>
                        </a>
                      )}

                      {!isCompleted && !isCancelled && isAdvisor && (
                        <button
                          onClick={() => handleUpdateStatus(appt.id, "COMPLETE")}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                          title="Mark Meeting Complete"
                        >
                          Complete
                        </button>
                      )}

                      {!isCompleted && !isCancelled && (
                        <button
                          onClick={() => handleUpdateStatus(appt.id, "DECLINE")}
                          className="px-2 py-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-semibold transition"
                          title="Cancel Call"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notes / Minutes Section */}
                  {appt.notes && (
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 text-xs">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                          <FileText className="h-3.5 w-3.5" />
                          <span>Advisory Notes &amp; Action Minutes:</span>
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {appt.notes}
                      </p>
                    </div>
                  )}

                  {/* Inline Note Addition Box */}
                  <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      placeholder="Append call note or action item..."
                      value={noteInputs[appt.id] || ""}
                      onChange={(e) => setNoteInputs({ ...noteInputs, [appt.id]: e.target.value })}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <button
                      onClick={() => handleAddCallNote(appt.id)}
                      disabled={isSavingNote[appt.id] || !noteInputs[appt.id]?.trim()}
                      className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold disabled:opacity-50 transition"
                    >
                      {isSavingNote[appt.id] ? "Saving..." : "Record Note"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. SCHEDULE CALL MODAL
      ───────────────────────────────────────────────────────────── */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsScheduleOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isAdvisor ? "Schedule Client Review Call" : "Request Advisor Strategy Call"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAdvisor
                    ? "Lock in meeting slot, link Google Meet or Zoom, and set initial review agenda."
                    : "Request a review slot with your wealth advisor. You'll receive meeting link once confirmed."}
                </p>
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-lg text-xs flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleScheduleCall} className="space-y-4">
              {/* Client Selection (if Advisor) */}
              {isAdvisor && clients.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Client / Household
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    {clients.map((c) => (
                      <option key={c.client_id} value={c.client_id}>
                        {c.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Meeting Topic / Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Portfolio Rebalancing & Tax Planning"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  required
                />
              </div>

              {/* Date, Time, Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Duration
                  </label>
                  <select
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                  </select>
                </div>
              </div>

              {/* Meeting Link (for Advisor) */}
              {isAdvisor && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Meeting Link (Google Meet / Zoom / Teams)
                  </label>
                  <input
                    type="url"
                    value={formLink}
                    onChange={(e) => setFormLink(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              )}

              {/* Notes / Agenda */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Agenda / Call Notes
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Items to discuss, goal targets, questions..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <span>{isAdvisor ? "Confirm & Schedule" : "Submit Request"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

