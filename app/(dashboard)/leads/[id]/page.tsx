"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getLeadById, updateLead, deleteLead } from "@/lib/db/leads";
import { getFollowUpLogs } from "@/lib/db/follow-ups";
import { formatPrice } from "@/lib/mock-data";
import { Lead, LeadStage, LeadSource, FollowUpLog } from "@/lib/types";

interface Props { params: Promise<{ id: string }> }

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGES: { value: LeadStage; label: string; color: string; dot: string }[] = [
  { value: "new",         label: "New",         color: "bg-blue-100 text-blue-700 border-blue-300",     dot: "bg-blue-500"   },
  { value: "contacted",   label: "Contacted",   color: "bg-amber-100 text-amber-700 border-amber-300",   dot: "bg-amber-500"  },
  { value: "viewing",     label: "Viewing",     color: "bg-violet-100 text-violet-700 border-violet-300", dot: "bg-violet-500" },
  { value: "negotiating", label: "Negotiating", color: "bg-orange-100 text-orange-700 border-orange-300", dot: "bg-orange-500" },
  { value: "closed",      label: "Won ✓",       color: "bg-emerald-100 text-emerald-700 border-emerald-300", dot: "bg-emerald-500" },
  { value: "lost",        label: "Lost",        color: "bg-red-100 text-red-600 border-red-300",         dot: "bg-red-400"    },
];

const PROPERTY_TYPES = ["1BHK", "2BHK", "3BHK", "4BHK", "Villa", "Plot", "Commercial"];

const BUDGET_PRESETS = [
  { label: "₹10L",   value: 1000000  },
  { label: "₹25L",   value: 2500000  },
  { label: "₹50L",   value: 5000000  },
  { label: "₹75L",   value: 7500000  },
  { label: "₹1Cr",   value: 10000000 },
  { label: "₹1.5Cr", value: 15000000 },
  { label: "₹2Cr",   value: 20000000 },
  { label: "₹2Cr+",  value: 30000000 },
];

const SOURCES: LeadSource[] = ["website", "referral", "social", "walk-in", "ad", "other"];

const OUTCOME_LABEL: Record<string, string> = {
  called: "📞 Called", no_answer: "📵 No Answer", busy: "🔴 Busy",
  callback: "🔄 Call Back", visited: "🏠 Site Visit", note: "📝 Note",
};

function fmtAgo(dateStr: string): string {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7)  return `${d} days ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ── Parse budget string (e.g. "35L", "1.2Cr", "5000000") ─────────────────────
function parseBudget(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  const m = s.match(/^(\d+\.?\d*)\s*(l|lakh|lac|cr|crore)?$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = m[2] ?? "";
  if (unit === "cr" || unit === "crore") return Math.round(n * 10000000);
  if (unit === "l" || unit === "lakh" || unit === "lac") return Math.round(n * 100000);
  return Math.round(n);
}

// ── Custom budget input ────────────────────────────────────────────────────────
function CustomBudgetInput({ onSave }: { onSave: (v: number) => void }) {
  const [val, setVal]   = useState("");
  const [err, setErr]   = useState(false);

  function commit() {
    if (!val.trim()) return;
    const parsed = parseBudget(val);
    if (!parsed || parsed <= 0) { setErr(true); return; }
    setErr(false);
    onSave(parsed);
    setVal("");
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <input
        type="text"
        value={val}
        onChange={(e) => { setVal(e.target.value); setErr(false); }}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
        placeholder="e.g. 35L or 1.2Cr"
        className={`flex-1 px-3 py-1.5 text-xs rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          err ? "border-red-300 bg-red-50 placeholder-red-300" : "border-gray-200 bg-gray-50 placeholder-gray-400"
        }`}
      />
      <button
        onMouseDown={(e) => { e.preventDefault(); commit(); }}
        className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shrink-0"
      >
        Set
      </button>
      {err && <span className="text-[10px] text-red-500 shrink-0">Invalid format</span>}
    </div>
  );
}

// ── Inline text field ─────────────────────────────────────────────────────────

function InlineText({ value, placeholder, onSave, type = "text" }: {
  value: string; placeholder: string; onSave: (v: string) => void; type?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function commit() {
    setEditing(false);
    if (draft.trim() !== value) onSave(draft.trim());
  }

  if (editing) return (
    <input
      ref={inputRef} type={type} value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
      className="w-full px-3 py-2 text-sm border-2 border-blue-400 rounded-xl focus:outline-none bg-white font-medium"
    />
  );

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true); }}
      className="w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-gray-100 transition-colors group flex items-center justify-between gap-2"
    >
      <span className={value ? "text-gray-900 font-medium" : "text-gray-400 italic"}>{value || placeholder}</span>
      <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function LeadDetailPage({ params }: Props) {
  const router = useRouter();

  const [lead,       setLead]       = useState<Lead | null>(null);
  const [logs,       setLogs]       = useState<FollowUpLog[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [notes,      setNotes]      = useState("");

  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      const { id } = await params;
      const data = await getLeadById(id);
      if (!data) { setNotFound(true); setLoading(false); return; }
      setLead(data);
      setNotes(data.notes ?? "");
      setLoading(false);
      // Load follow-up history silently
      getFollowUpLogs("").then(() => {}).catch(() => {});
      // Load logs for this lead
      import("@/lib/db/follow-ups").then(({ getFollowUpLogs: fn }) =>
        fn(data.user_id).then((l) => setLogs(l.filter((x) => x.lead_id === id)))
      ).catch(() => {});
    }
    load();
  }, []); // eslint-disable-line

  // Auto-save helper — debounces saves so we don't hit Supabase on every keystroke
  const save = useCallback((changes: Partial<Lead>) => {
    if (!lead) return;
    setLead((prev) => prev ? { ...prev, ...changes } : prev);
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await updateLead(lead.id, changes);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch { setSaveStatus("idle"); }
    }, 600);
  }, [lead]);

  function handleNotesChange(val: string) {
    setNotes(val);
    setSaveStatus("saving");
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      if (!lead) return;
      try {
        await updateLead(lead.id, { notes: val });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch { setSaveStatus("idle"); }
    }, 1000);
  }

  async function handleDelete() {
    if (!lead) return;
    setDeleting(true);
    await deleteLead(lead.id);
    router.push("/leads");
  }

  if (loading) return (
    <div className="p-6 max-w-2xl mx-auto animate-pulse space-y-3">
      <div className="h-8 bg-gray-200 rounded w-1/3" />
      <div className="h-16 bg-gray-100 rounded-2xl" />
      <div className="h-40 bg-gray-100 rounded-2xl" />
      <div className="h-32 bg-gray-100 rounded-2xl" />
    </div>
  );

  if (notFound || !lead) return (
    <div className="p-6 text-center py-20">
      <p className="text-gray-400">Lead not found.</p>
      <Link href="/leads" className="text-blue-600 text-sm mt-2 block">← Back</Link>
    </div>
  );

  const currentStage = STAGES.find((s) => s.value === lead.stage)!;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 sm:pb-6 space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link href="/leads" className="text-gray-400 hover:text-gray-600 shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">{lead.name}</h1>
          <p className="text-xs text-gray-400 mt-0.5 capitalize">{lead.source} · Added {fmtAgo(lead.created_at)}</p>
        </div>
        {/* Auto-save indicator */}
        <div className={`text-[11px] font-semibold shrink-0 transition-all ${
          saveStatus === "saved"  ? "text-emerald-600" :
          saveStatus === "saving" ? "text-amber-500 animate-pulse" : "text-transparent"
        }`}>
          {saveStatus === "saved" ? "✓ Saved" : "Saving…"}
        </div>
      </div>

      {/* ── Stage Pipeline ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Stage</p>
        <div className="flex gap-1.5 flex-wrap">
          {STAGES.map((s) => {
            const active = lead.stage === s.value;
            return (
              <button
                key={s.value}
                onClick={() => save({ stage: s.value })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  active ? s.color + " border-current shadow-sm scale-105" : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${active ? s.dot : "bg-gray-300"}`} />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Contact ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Contact</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-12 shrink-0">Phone</span>
            <div className="flex-1">
              <InlineText value={lead.phone} placeholder="Phone number" onSave={(v) => save({ phone: v })} type="tel" />
            </div>
            <a href={`tel:${lead.phone}`} className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </a>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-12 shrink-0">Email</span>
            <div className="flex-1">
              <InlineText value={lead.email ?? ""} placeholder="Email (optional)" onSave={(v) => save({ email: v })} type="email" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-12 shrink-0">Name</span>
            <div className="flex-1">
              <InlineText value={lead.name} placeholder="Full name" onSave={(v) => save({ name: v })} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-12 shrink-0">Location</span>
            <div className="flex-1">
              <InlineText value={lead.location ?? ""} placeholder="Area, City" onSave={(v) => save({ location: v })} />
            </div>
          </div>
          {/* Source */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-12 shrink-0">Source</span>
            <div className="flex flex-wrap gap-1.5 flex-1">
              {SOURCES.map((s) => (
                <button key={s} onClick={() => save({ source: s })}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize transition-colors ${
                    lead.source === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Requirements ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Looking For</p>

        {/* Property type chips */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Property type</p>
          <div className="flex flex-wrap gap-1.5">
            {PROPERTY_TYPES.map((t) => (
              <button key={t} onClick={() => save({ property_interest: t as Lead["property_interest"] })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  lead.property_interest === t
                    ? "bg-blue-600 text-white border-blue-600 scale-105"
                    : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Budget quick-pick */}
        <div>
          <p className="text-xs text-gray-500 mb-2">
            Budget Max — currently <span className="font-bold text-gray-800">{formatPrice(lead.budget_max)}</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {BUDGET_PRESETS.map((p) => (
              <button key={p.label} onClick={() => save({ budget_max: p.value })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  lead.budget_max === p.value
                    ? "bg-blue-600 text-white border-blue-600 scale-105"
                    : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <CustomBudgetInput onSave={(v) => save({ budget_max: v })} />
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-2">
            Budget Min — currently <span className="font-bold text-gray-800">{formatPrice(lead.budget_min)}</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {BUDGET_PRESETS.map((p) => (
              <button key={p.label} onClick={() => save({ budget_min: p.value })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  lead.budget_min === p.value
                    ? "bg-indigo-600 text-white border-indigo-600 scale-105"
                    : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <CustomBudgetInput onSave={(v) => save({ budget_min: v })} />
        </div>
      </div>

      {/* ── Notes (auto-save) ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Notes</p>
          {saveStatus === "saved" && <span className="text-[10px] text-emerald-600 font-semibold">✓ Saved</span>}
        </div>
        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Add notes about this lead…"
          rows={3}
          className="w-full text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none leading-relaxed"
        />
      </div>

      {/* ── Activity Feed ── */}
      {logs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Activity ({logs.length})</p>
          <div className="flex flex-col gap-3">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center shrink-0 text-sm">
                  {OUTCOME_LABEL[log.outcome]?.split(" ")[0] ?? "📝"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700">
                    {OUTCOME_LABEL[log.outcome] ?? log.outcome}
                  </p>
                  {log.note && <p className="text-[11px] text-gray-400 italic mt-0.5">&quot;{log.note}&quot;</p>}
                  <p className="text-[10px] text-gray-300 mt-0.5">{fmtAgo(log.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/follow-ups" className="block text-center text-xs text-purple-600 font-semibold mt-3 hover:underline">
            Log a call →
          </Link>
        </div>
      )}

      {logs.length === 0 && (
        <Link href="/follow-ups"
          className="flex items-center justify-between px-4 py-3 bg-purple-50 border border-purple-100 rounded-2xl hover:bg-purple-100 transition-colors">
          <span className="text-sm font-semibold text-purple-700">📞 Log a call for this lead</span>
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}

      {/* ── Delete ── */}
      <div className="pt-2">
        {!confirmDel ? (
          <button onClick={() => setConfirmDel(true)}
            className="w-full py-3 border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500 text-sm font-medium rounded-xl transition-colors">
            Delete Lead
          </button>
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700 font-medium mb-3">
              ⚠️ Permanently delete <strong>{lead.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-60">
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
              <button onClick={() => setConfirmDel(false)}
                className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-white">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
