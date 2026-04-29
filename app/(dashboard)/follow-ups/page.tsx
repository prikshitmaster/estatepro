"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lead, LeadStage, FollowUpLog, FollowUpOutcome } from "@/lib/types";
import { getAllLeads } from "@/lib/db/leads";
import { getFollowUpLogs, logFollowUp, snoozeFollowUp } from "@/lib/db/follow-ups";
import { formatPrice, initials } from "@/lib/mock-data";

// Days before a lead is considered "overdue" based on its stage
const OVERDUE_DAYS: Partial<Record<LeadStage, number>> = {
  negotiating: 1,
  new:         1,
  viewing:     2,
  contacted:   4,
};

const STAGE_COLOR: Partial<Record<LeadStage, string>> = {
  new:         "bg-blue-50 text-blue-600",
  contacted:   "bg-amber-50 text-amber-600",
  viewing:     "bg-violet-50 text-violet-600",
  negotiating: "bg-orange-50 text-orange-600",
};

const AVATAR_COLORS = [
  "bg-blue-500","bg-violet-500","bg-green-500",
  "bg-amber-500","bg-rose-500","bg-cyan-500",
];

const OUTCOMES: { value: FollowUpOutcome; label: string; icon: string }[] = [
  { value: "called",    label: "Called",     icon: "📞" },
  { value: "no_answer", label: "No Answer",  icon: "📵" },
  { value: "busy",      label: "Busy",       icon: "🔴" },
  { value: "callback",  label: "Call Back",  icon: "🔄" },
  { value: "visited",   label: "Site Visit", icon: "🏠" },
  { value: "note",      label: "Note Only",  icon: "📝" },
];

function addDays(days: number): string {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function fmtAgo(dateStr: string): string {
  const d = daysSince(dateStr);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7)  return `${d} days ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ── Log Call Modal ────────────────────────────────────────────────────────────

function LogModal({ lead, onSave, onClose }: {
  lead: Lead;
  onSave: (outcome: FollowUpOutcome, note: string, nextDate: string | null) => Promise<void>;
  onClose: () => void;
}) {
  const [outcome,  setOutcome]  = useState<FollowUpOutcome>("called");
  const [note,     setNote]     = useState("");
  const [nextDate, setNextDate] = useState<string | null>(addDays(1));
  const [saving,   setSaving]   = useState(false);

  async function save() {
    setSaving(true);
    await onSave(outcome, note, nextDate);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-5 p-5">

        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-wide">Log Follow-Up</p>
            <h2 className="text-base font-bold text-gray-900 mt-0.5">{lead.name}</h2>
            <p className="text-xs text-gray-400">{lead.phone}{lead.location ? ` · ${lead.location}` : ""}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 text-xl leading-none">×</button>
        </div>

        {/* Outcome */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">What happened?</p>
          <div className="grid grid-cols-3 gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o.value}
                onClick={() => setOutcome(o.value)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                  outcome === o.value
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                }`}
              >
                <span className="text-base">{o.icon}</span>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Note (optional)</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Interested, wants to visit Saturday…"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none placeholder-gray-400"
          />
        </div>

        {/* Next follow-up */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Call back in</p>
          <div className="flex flex-wrap gap-2">
            {[{ l: "Tomorrow", d: 1 }, { l: "3 Days", d: 3 }, { l: "1 Week", d: 7 }, { l: "No schedule", d: 0 }].map((s) => {
              const val = s.d === 0 ? null : addDays(s.d);
              return (
                <button
                  key={s.l}
                  onClick={() => setNextDate(val)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    nextDate === val
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {s.l}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60">
            {saving ? "Saving…" : "Save ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Snooze dropdown ───────────────────────────────────────────────────────────

function SnoozeBtn({ leadId, onSnooze }: { leadId: string; onSnooze: (id: string, d: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="px-3 py-2 text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl flex items-center gap-1 transition-colors">
        💤 Snooze ▾
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 left-0 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 min-w-[120px]">
          {[{ l: "Tomorrow", d: 1 }, { l: "3 Days", d: 3 }, { l: "1 Week", d: 7 }].map((s) => (
            <button key={s.l} onClick={() => { onSnooze(leadId, addDays(s.d)); setOpen(false); }}
              className="w-full px-4 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-purple-50 hover:text-purple-700">
              {s.l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Lead Row Card ─────────────────────────────────────────────────────────────

function LeadCard({ lead, lastLog, idx, onLog, onSnooze }: {
  lead: Lead;
  lastLog: FollowUpLog | null;
  idx: number;
  onLog: (lead: Lead) => void;
  onSnooze: (id: string, d: string) => void;
}) {
  const lastContactDate = lastLog?.created_at ?? lead.created_at;
  const days            = daysSince(lastContactDate);
  const threshold       = OVERDUE_DAYS[lead.stage] ?? 999;
  const isOverdue       = days >= threshold;
  const daysOver        = days - threshold;

  return (
    <div className={`bg-white rounded-2xl border p-4 flex gap-3 hover:shadow-sm transition-shadow ${isOverdue ? "border-red-200" : "border-gray-100"}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
        {initials(lead.name)}
      </div>

      <div className="flex-1 min-w-0">
        {/* Name + stage + overdue */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/leads/${lead.id}`} className="text-sm font-bold text-gray-900 hover:text-purple-600">
            {lead.name}
          </Link>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STAGE_COLOR[lead.stage] ?? "bg-gray-100 text-gray-600"}`}>
            {lead.stage}
          </span>
          {isOverdue && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
              🔴 {daysOver > 0 ? `${daysOver}d overdue` : "Due today"}
            </span>
          )}
        </div>

        {/* Details */}
        <p className="text-xs text-gray-400 mt-1">
          📞 {lead.phone}
          {lead.location && <span> · {lead.location}</span>}
          {lead.budget_max > 0 && <span> · {formatPrice(lead.budget_max)}</span>}
        </p>

        {/* Last contact */}
        <p className={`text-[11px] font-semibold mt-1 ${isOverdue ? "text-red-500" : "text-gray-400"}`}>
          Last contact: {fmtAgo(lastContactDate)}
        </p>
        {lastLog?.note && (
          <p className="text-[11px] text-gray-400 mt-0.5 italic truncate">📝 &quot;{lastLog.note}&quot;</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button onClick={() => onLog(lead)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors">
            📞 Log Call
          </button>
          <SnoozeBtn leadId={lead.id} onSnooze={onSnooze} />
          <a href={`tel:${lead.phone}`}
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-colors">
            Call Now
          </a>
          <Link href={`/leads/${lead.id}`}
            className="px-3 py-2 text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
            View →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function FollowUpsPage() {
  const router = useRouter();

  const [leads,     setLeads]     = useState<Lead[]>([]);
  const [logs,      setLogs]      = useState<FollowUpLog[]>([]);
  const [userId,    setUserId]    = useState("");
  const [loading,   setLoading]   = useState(true);
  const [logTarget, setLogTarget] = useState<Lead | null>(null);
  const [dbReady,   setDbReady]   = useState(true); // false if SQL migration not run yet

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);
      try {
        const leadsData = await getAllLeads();
        setLeads(leadsData);
      } catch { /* ignore */ }
      try {
        const logsData = await getFollowUpLogs(user.id);
        setLogs(logsData);
      } catch { setDbReady(false); }
      setLoading(false);
    }
    load();
  }, [router]);

  // Most recent log per lead
  const lastLogMap = useMemo(() => {
    const map: Record<string, FollowUpLog> = {};
    logs.forEach((l) => { if (!map[l.lead_id]) map[l.lead_id] = l; });
    return map;
  }, [logs]);

  // All active leads (not closed/lost), sorted: overdue first, then by stage weight
  const activeLeads = useMemo(() => {
    const WEIGHT: Partial<Record<LeadStage, number>> = { negotiating: 4, viewing: 3, contacted: 2, new: 1 };
    return leads
      .filter((l) => l.stage !== "closed" && l.stage !== "lost")
      .filter((l) => {
        // Hide future-snoozed leads
        if (l.next_follow_up_at) {
          return new Date(l.next_follow_up_at).toISOString().slice(0, 10) <= addDays(0);
        }
        return true;
      })
      .sort((a, b) => {
        const daysA = daysSince(lastLogMap[a.id]?.created_at ?? a.created_at);
        const daysB = daysSince(lastLogMap[b.id]?.created_at ?? b.created_at);
        const overdueA = daysA >= (OVERDUE_DAYS[a.stage] ?? 999) ? 1 : 0;
        const overdueB = daysB >= (OVERDUE_DAYS[b.stage] ?? 999) ? 1 : 0;
        if (overdueB !== overdueA) return overdueB - overdueA;
        return (WEIGHT[b.stage] ?? 0) - (WEIGHT[a.stage] ?? 0);
      });
  }, [leads, lastLogMap]);

  const snoozed = useMemo(() =>
    leads.filter((l) => l.next_follow_up_at && new Date(l.next_follow_up_at).toISOString().slice(0, 10) > addDays(0)),
  [leads]);

  const overdueCount = activeLeads.filter((l) => {
    const days = daysSince(lastLogMap[l.id]?.created_at ?? l.created_at);
    return days >= (OVERDUE_DAYS[l.stage] ?? 999);
  }).length;

  const callsToday = logs.filter((l) => l.created_at.slice(0, 10) === addDays(0)).length;

  async function handleSaveLog(outcome: FollowUpOutcome, note: string, nextDate: string | null) {
    if (!logTarget) return;
    const newLog = await logFollowUp({
      lead_id: logTarget.id,
      user_id: userId,
      type: outcome === "visited" ? "visit" : outcome === "note" ? "note" : "call",
      outcome,
      note,
      next_follow_up_at: nextDate ? new Date(nextDate + "T09:00:00").toISOString() : null,
    });
    setLogs((prev) => [newLog, ...prev]);
    if (nextDate) {
      setLeads((prev) => prev.map((l) =>
        l.id === logTarget.id ? { ...l, next_follow_up_at: new Date(nextDate + "T09:00:00").toISOString() } : l
      ));
    } else {
      setLeads((prev) => prev.map((l) =>
        l.id === logTarget.id ? { ...l, next_follow_up_at: null } : l
      ));
    }
  }

  async function handleSnooze(leadId: string, until: string) {
    await snoozeFollowUp(leadId, new Date(until + "T09:00:00").toISOString());
    setLeads((prev) => prev.map((l) =>
      l.id === leadId ? { ...l, next_follow_up_at: new Date(until + "T09:00:00").toISOString() } : l
    ));
  }

  if (loading) return (
    <div className="p-6 pb-24 sm:pb-6 flex flex-col gap-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 pb-24 sm:pb-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Follow-Ups</h1>
          <p className="text-sm text-gray-400 mt-0.5">Log every call. Never miss a lead.</p>
        </div>
        <Link href="/leads" className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-200">
          All Leads →
        </Link>
      </div>

      {/* SQL migration banner */}
      {!dbReady && (
        <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <p className="font-semibold">⚠️ One-time setup needed</p>
          <p className="mt-1 text-xs">Go to <strong>Supabase → SQL Editor</strong> and run the file <code className="bg-amber-100 px-1 rounded">supabase/follow-up-migration.sql</code> to enable call logging.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
          <p className="text-[11px] font-semibold text-red-400 mt-0.5">Overdue</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{activeLeads.length}</p>
          <p className="text-[11px] font-semibold text-blue-400 mt-0.5">Active Leads</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{callsToday}</p>
          <p className="text-[11px] font-semibold text-emerald-400 mt-0.5">Logged Today</p>
        </div>
      </div>

      {/* Empty state */}
      {activeLeads.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl py-16 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-semibold text-gray-700">No active leads</p>
          <p className="text-sm text-gray-400 mt-1">Add leads first, then come here to log your calls.</p>
          <Link href="/leads/new" className="inline-block mt-4 px-5 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-xl">
            + Add Lead
          </Link>
        </div>
      )}

      {/* Lead cards */}
      {activeLeads.length > 0 && (
        <div className="flex flex-col gap-3">
          {activeLeads.map((lead, i) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              lastLog={lastLogMap[lead.id] ?? null}
              idx={i}
              onLog={setLogTarget}
              onSnooze={handleSnooze}
            />
          ))}
        </div>
      )}

      {/* Snoozed section */}
      {snoozed.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            💤 Snoozed ({snoozed.length})
          </p>
          <div className="flex flex-col gap-2">
            {snoozed.map((lead) => (
              <div key={lead.id} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700">{lead.name}</p>
                  <p className="text-xs text-gray-400">{lead.phone}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-blue-600 font-bold">
                    Due {new Date(lead.next_follow_up_at!).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                  <button onClick={() => handleSnooze(lead.id, addDays(-999))}
                    className="text-[10px] text-gray-400 hover:text-red-500 mt-0.5">
                    unsnooze
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log modal */}
      {logTarget && (
        <LogModal
          lead={logTarget}
          onSave={handleSaveLog}
          onClose={() => setLogTarget(null)}
        />
      )}
    </div>
  );
}
