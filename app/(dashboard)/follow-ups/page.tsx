"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lead, LeadStage, FollowUpLog, FollowUpOutcome } from "@/lib/types";
import { getAllLeads } from "@/lib/db/leads";
import { getFollowUpLogs, logFollowUp, snoozeFollowUp } from "@/lib/db/follow-ups";
import { formatPrice, initials } from "@/lib/mock-data";

// ── Constants ─────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

const OVERDUE_DAYS: Partial<Record<LeadStage, number>> = {
  negotiating: 1, new: 1, viewing: 2, contacted: 4,
};

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-green-500",
  "bg-amber-500", "bg-rose-500",  "bg-cyan-500",
];

const STAGE_COLOR: Partial<Record<LeadStage, string>> = {
  new:         "bg-blue-50 text-blue-600",
  contacted:   "bg-amber-50 text-amber-600",
  viewing:     "bg-violet-50 text-violet-600",
  negotiating: "bg-orange-50 text-orange-600",
};

const STAGE_LABEL: Partial<Record<LeadStage, string>> = {
  new:         "New Enquiry",
  contacted:   "Contacted",
  viewing:     "Site Visit",
  negotiating: "In Talks",
};

const OUTCOME_ICON: Record<string, string> = {
  called: "✅", no_answer: "📵", busy: "🔴",
  callback: "🔄", visited: "🏠", note: "📝",
};

const SNOOZE_OPTIONS = [
  { l: "Tomorrow", msg: "for tomorrow", d: 1 },
  { l: "3 Days",   msg: "for 3 days",   d: 3 },
  { l: "1 Week",   msg: "for 1 week",   d: 7 },
];

type Tab = "pending" | "called" | "snoozed";

// ── Helpers ───────────────────────────────────────────────────────────────────

function addDays(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function fmtDate(dateStr: string): string {
  const d = daysSince(dateStr);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7)  return `${d} days ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FollowUpsPage() {
  const router = useRouter();

  const [leads,      setLeads]      = useState<Lead[]>([]);
  const [logs,       setLogs]       = useState<FollowUpLog[]>([]);
  const [userId,     setUserId]     = useState("");
  const [loading,    setLoading]    = useState(true);
  const [note,       setNote]       = useState("");
  const [showNote,   setShowNote]   = useState(false);
  const [showSnooze, setShowSnooze] = useState(false);
  const [logging,    setLogging]    = useState(false);
  const [cardKey,    setCardKey]    = useState(0);
  const [dbReady,    setDbReady]    = useState(true);
  const [activeTab,  setActiveTab]  = useState<Tab>("pending");
  const [undoSnooze, setUndoSnooze] = useState<{ leadId: string; msg: string; prevAt: string | null } | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);
      try { setLeads(await getAllLeads()); } catch { /* ignore */ }
      try { setLogs(await getFollowUpLogs(user.id)); } catch { setDbReady(false); }
      setLoading(false);
    }
    load();
  }, [router]);

  // Auto-clear undo toast after 5 seconds
  useEffect(() => {
    if (!undoSnooze) return;
    const t = setTimeout(() => setUndoSnooze(null), 5000);
    return () => clearTimeout(t);
  }, [undoSnooze]);

  // Most recent log per lead
  const lastLogMap = useMemo(() => {
    const map: Record<string, FollowUpLog> = {};
    logs.forEach((l) => { if (!map[l.lead_id]) map[l.lead_id] = l; });
    return map;
  }, [logs]);

  // Active leads sorted by priority (overdue first, then by stage weight)
  const activeLeads = useMemo(() => {
    const WEIGHT: Partial<Record<LeadStage, number>> = { negotiating: 4, viewing: 3, contacted: 2, new: 1 };
    return leads
      .filter((l) => l.stage !== "closed" && l.stage !== "lost")
      .filter((l) => !l.next_follow_up_at || new Date(l.next_follow_up_at).toISOString().slice(0, 10) <= TODAY)
      .sort((a, b) => {
        const daysA    = daysSince(lastLogMap[a.id]?.created_at ?? a.created_at);
        const daysB    = daysSince(lastLogMap[b.id]?.created_at ?? b.created_at);
        const overdueA = daysA >= (OVERDUE_DAYS[a.stage] ?? 999) ? 1 : 0;
        const overdueB = daysB >= (OVERDUE_DAYS[b.stage] ?? 999) ? 1 : 0;
        if (overdueB !== overdueA) return overdueB - overdueA;
        return (WEIGHT[b.stage] ?? 0) - (WEIGHT[a.stage] ?? 0);
      });
  }, [leads, lastLogMap]);

  const pendingLeads = useMemo(() =>
    activeLeads.filter((l) => lastLogMap[l.id]?.created_at.slice(0, 10) !== TODAY),
    [activeLeads, lastLogMap]
  );

  const calledTodayLeads = useMemo(() =>
    leads
      .filter((l) => l.stage !== "closed" && l.stage !== "lost")
      .filter((l) => lastLogMap[l.id]?.created_at.slice(0, 10) === TODAY),
    [leads, lastLogMap]
  );

  const snoozed = useMemo(() =>
    leads.filter((l) => l.next_follow_up_at && new Date(l.next_follow_up_at).toISOString().slice(0, 10) > TODAY),
    [leads]
  );

  const currentLead = pendingLeads[0] ?? null;
  const avatarColor = AVATAR_COLORS[(activeLeads.findIndex((l) => l.id === currentLead?.id) + 6) % AVATAR_COLORS.length];
  const totalActive = pendingLeads.length + calledTodayLeads.length;
  const doneCount   = calledTodayLeads.length;
  const progress    = totalActive > 0 ? Math.round((doneCount / totalActive) * 100) : 100;

  async function handleOutcome(outcome: FollowUpOutcome) {
    if (!currentLead || logging) return;
    setLogging(true);
    try {
      const newLog = await logFollowUp({
        lead_id:           currentLead.id,
        user_id:           userId,
        type:              outcome === "visited" ? "visit" : outcome === "note" ? "note" : "call",
        outcome,
        note:              note.trim(),
        next_follow_up_at: null,
      });
      setLogs((prev) => [newLog, ...prev]);
      setNote("");
      setShowNote(false);
      setShowSnooze(false);
      setCardKey((k) => k + 1);
    } catch (err) { console.error(err); }
    setLogging(false);
  }

  async function handleSnooze(days: number, msg: string) {
    if (!currentLead || logging) return;
    const prevAt = currentLead.next_follow_up_at ?? null;
    setLogging(true);
    try {
      const until = new Date(addDays(days) + "T09:00:00").toISOString();
      await snoozeFollowUp(currentLead.id, until);
      setLeads((prev) => prev.map((l) =>
        l.id === currentLead.id ? { ...l, next_follow_up_at: until } : l
      ));
      setShowSnooze(false);
      setCardKey((k) => k + 1);
      setUndoSnooze({ leadId: currentLead.id, msg, prevAt });
    } catch (err) { console.error(err); }
    setLogging(false);
  }

  async function handleUndoSnooze() {
    if (!undoSnooze) return;
    const { leadId, prevAt } = undoSnooze;
    setUndoSnooze(null);
    setLeads((prev) => prev.map((l) =>
      l.id === leadId ? { ...l, next_follow_up_at: prevAt } : l
    ));
    await supabase.from("leads").update({ next_follow_up_at: prevAt }).eq("id", leadId);
  }

  async function handleUnsnooze(leadId: string) {
    setLeads((prev) => prev.map((l) =>
      l.id === leadId ? { ...l, next_follow_up_at: null } : l
    ));
    await supabase.from("leads").update({ next_follow_up_at: null }).eq("id", leadId);
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="p-6 pb-24 flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-20 h-20 bg-gray-100 rounded-full animate-pulse" />
      <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
      <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 pb-28 sm:pb-6 max-w-md mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Calls</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {doneCount} done today · {pendingLeads.length} remaining
          </p>
        </div>
        <Link href="/leads" className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-200 transition-colors">
          All Leads →
        </Link>
      </div>

      {/* ── Progress bar ── */}
      {totalActive > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
            <span className="text-gray-400">Today&apos;s progress</span>
            <span className={doneCount === totalActive ? "text-emerald-600" : "text-purple-600"}>
              {doneCount}/{totalActive} · {progress}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, background: doneCount === totalActive ? "#1BC47D" : "#7C3AED" }}
            />
          </div>
        </div>
      )}

      {/* DB warning */}
      {!dbReady && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <strong>⚠️ Setup needed:</strong> Run <code>supabase/follow-up-migration.sql</code> in Supabase SQL Editor.
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-6">
        {([
          { key: "pending" as Tab, label: "Pending", count: pendingLeads.length },
          { key: "called"  as Tab, label: "Called",  count: calledTodayLeads.length },
          { key: "snoozed" as Tab, label: "Snoozed", count: snoozed.length },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === tab.key
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.key
                  ? tab.key === "pending" ? "bg-purple-100 text-purple-700"
                  : tab.key === "called"  ? "bg-emerald-100 text-emerald-700"
                  : "bg-violet-100 text-violet-700"
                  : "bg-gray-200 text-gray-500"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── PENDING TAB ── */}
      {activeTab === "pending" && (
        <>
          {pendingLeads.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#F0FDF9" }}>
                <svg className="w-8 h-8" style={{ color: "#1BC47D" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">All done for today!</h2>
              <p className="text-sm text-gray-400 mt-2">
                {doneCount > 0
                  ? `You called ${doneCount} lead${doneCount !== 1 ? "s" : ""} today. Great work!`
                  : "No leads to call right now."}
              </p>
              <Link href="/leads" className="inline-block mt-6 px-6 py-3 bg-purple-600 text-white text-sm font-semibold rounded-2xl hover:bg-purple-700 transition-colors">
                View All Leads
              </Link>
            </div>
          ) : (
            <div key={cardKey} className="animate-fade-up">

              {/* Remaining counter */}
              <p className="text-center text-xs text-gray-400 font-semibold mb-3">
                {pendingLeads.length} lead{pendingLeads.length !== 1 ? "s" : ""} left to call
              </p>

              {/* ── Main card ── */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-4">

                {/* Avatar + name + stage */}
                <div className="flex flex-col items-center mb-5">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3 ${avatarColor}`}>
                    {initials(currentLead!.name)}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 text-center">{currentLead!.name}</h2>
                  <span className={`mt-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase ${STAGE_COLOR[currentLead!.stage] ?? "bg-gray-100 text-gray-500"}`}>
                    {STAGE_LABEL[currentLead!.stage] ?? currentLead!.stage}
                  </span>
                </div>

                {/* Lead details */}
                <div className="space-y-2 mb-4">
                  <a href={`tel:${currentLead!.phone}`}
                    className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-2xl hover:bg-emerald-50 transition-colors group">
                    <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-sm font-bold text-gray-800 group-hover:text-emerald-700">{currentLead!.phone}</span>
                    <span className="ml-auto text-[11px] text-gray-400 group-hover:text-emerald-600 font-semibold">Tap to call →</span>
                  </a>

                  {currentLead!.location && (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-2xl">
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm text-gray-600">{currentLead!.location}</span>
                    </div>
                  )}

                  {currentLead!.budget_max > 0 && (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-2xl">
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-gray-600">
                        {formatPrice(currentLead!.budget_min)} – {formatPrice(currentLead!.budget_max)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-2xl">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-500">
                      Last contact: {fmtDate(lastLogMap[currentLead!.id]?.created_at ?? currentLead!.created_at)}
                    </span>
                  </div>

                  {lastLogMap[currentLead!.id]?.note && (
                    <div className="flex items-start gap-3 px-4 py-2.5 bg-violet-50 rounded-2xl">
                      <svg className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <p className="text-xs text-violet-600 italic">&quot;{lastLogMap[currentLead!.id].note}&quot;</p>
                    </div>
                  )}
                </div>

                {/* Optional note input */}
                {showNote && (
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Interested, wants to visit Saturday…"
                    rows={2}
                    autoFocus
                    className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none placeholder-gray-400 mb-2"
                  />
                )}
                <button
                  onClick={() => setShowNote((v) => !v)}
                  className="text-xs text-purple-500 hover:text-purple-700 font-semibold"
                >
                  {showNote ? "− Hide note" : "+ Add note (optional)"}
                </button>
              </div>

              {/* ── Outcome buttons ── */}
              <div className="flex flex-col gap-2 mb-3">
                <button onClick={() => handleOutcome("called")} disabled={logging}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 text-left"
                  style={{ background: "#F0FDF4", color: "#15803D", border: "1px solid #BBF7D0" }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#22C55E" }} />
                  Called — reached the lead
                  <svg className="w-4 h-4 ml-auto text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <button onClick={() => handleOutcome("no_answer")} disabled={logging}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 text-left"
                  style={{ background: "#F9FAFB", color: "#374151", border: "1px solid #E5E7EB" }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#9CA3AF" }} />
                  No Answer — call not picked
                  <svg className="w-4 h-4 ml-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <button onClick={() => handleOutcome("busy")} disabled={logging}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 text-left"
                  style={{ background: "#FFF7F7", color: "#B91C1C", border: "1px solid #FECACA" }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#EF4444" }} />
                  Busy — call back later
                  <svg className="w-4 h-4 ml-auto text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <button onClick={() => setShowSnooze((v) => !v)} disabled={logging}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 text-left ${showSnooze ? "ring-2 ring-violet-300" : ""}`}
                  style={{ background: "#FAF5FF", color: "#6D28D9", border: "1px solid #DDD6FE" }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#8B5CF6" }} />
                  Snooze — remind me later
                  <svg className="w-4 h-4 ml-auto text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showSnooze ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} /></svg>
                </button>
              </div>

              {/* Snooze options */}
              {showSnooze && (
                <div className="flex gap-2 mb-3 animate-fade-up">
                  {SNOOZE_OPTIONS.map((s) => (
                    <button key={s.l}
                      onClick={() => handleSnooze(s.d, s.msg)}
                      disabled={logging}
                      className="flex-1 py-2.5 text-xs font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50">
                      {s.l}
                    </button>
                  ))}
                </div>
              )}

              {/* View full lead */}
              <Link href={`/leads/${currentLead!.id}`}
                className="block text-center text-xs text-gray-400 hover:text-gray-600 font-semibold py-2 transition-colors">
                View full lead profile →
              </Link>
            </div>
          )}
        </>
      )}

      {/* ── CALLED TAB ── */}
      {activeTab === "called" && (
        <div>
          {calledTodayLeads.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📞</div>
              <p className="text-sm text-gray-400">No calls logged today yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {calledTodayLeads.map((lead, i) => {
                const log = lastLogMap[lead.id];
                return (
                  <div key={lead.id} className="bg-white border border-emerald-100 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                      {initials(lead.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{lead.name}</p>
                      {log?.note
                        ? <p className="text-xs text-gray-400 italic truncate">&quot;{log.note}&quot;</p>
                        : <p className="text-xs text-gray-400">{lead.location}{lead.budget_max > 0 ? ` · ${formatPrice(lead.budget_max)}` : ""}</p>
                      }
                    </div>
                    <span className="text-xl shrink-0">{OUTCOME_ICON[log?.outcome ?? "called"]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SNOOZED TAB ── */}
      {activeTab === "snoozed" && (
        <div>
          {snoozed.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">💤</div>
              <p className="text-sm text-gray-400">No snoozed leads.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {snoozed.map((lead) => (
                <div key={lead.id} className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{lead.name}</p>
                    <p className="text-xs text-blue-600 font-semibold mt-0.5">
                      Due {new Date(lead.next_follow_up_at!).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                    <p className="text-xs text-gray-400">{lead.phone}</p>
                  </div>
                  <button
                    onClick={() => handleUnsnooze(lead.id)}
                    className="shrink-0 px-3 py-1.5 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-xl transition-colors"
                  >
                    Unsnooze
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Undo Snooze Toast (fixed, above mobile nav) ── */}
      {undoSnooze && (
        <div className="fixed bottom-20 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-xs z-50 animate-fade-up">
          <div className="bg-gray-900 text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-2xl">
            <span className="text-sm">💤 Snoozed {undoSnooze.msg}</span>
            <button
              onClick={handleUndoSnooze}
              className="ml-4 text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors"
            >
              UNDO
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
