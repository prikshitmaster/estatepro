"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { getAllLeads, updateLead, deleteLead } from "@/lib/db/leads";
import { formatPrice, initials, STAGE_LABEL } from "@/lib/mock-data";
import { Lead, LeadStage } from "@/lib/types";

// ── Scoring ────────────────────────────────────────────────────────────────────

const PORTAL_KW = ["magicbricks","99acres","housing","nobroker","proptiger",
  "squareyards","commonfloor","justdial","sulekha","olx","quikr","makaan","anarock"];

function score(lead: Lead): number {
  let s = 0;
  const nameReal = lead.name && !lead.name.includes("@") &&
    !PORTAL_KW.some((k) => lead.name.toLowerCase().includes(k));
  if ((lead.phone ?? "").replace(/\D/g, "").length >= 10) s += 3;
  if (nameReal)                                            s += 2;
  if ((lead.budget_max ?? 0) > 0)                         s += 1;
  if (lead.location)                                       s += 1;
  if (lead.email)                                          s += 1;
  if (lead.property_interest)                             s += 1;
  if ((lead.notes ?? "").length > 30)                     s += 1;
  return s;
}

type Quality = "hot" | "warm" | "cold";
function quality(s: number): Quality { return s >= 7 ? "hot" : s >= 4 ? "warm" : "cold"; }

const Q_PILL: Record<Quality, { bg: string; text: string; label: string }> = {
  hot:  { bg: "#FEF2F2", text: "#DC2626", label: "🔥 Hot"    },
  warm: { bg: "#FFFBEB", text: "#D97706", label: "🌡️ Warm"  },
  cold: { bg: "#EFF6FF", text: "#3B82F6", label: "❄️ Cold"  },
};

// ── Stage ──────────────────────────────────────────────────────────────────────

const STAGE_PILL: Record<LeadStage, { bg: string; text: string }> = {
  new:         { bg: "#DBEAFE", text: "#1D4ED8" },
  contacted:   { bg: "#FEF3C7", text: "#92400E" },
  viewing:     { bg: "#EDE9FE", text: "#5B21B6" },
  negotiating: { bg: "#FFEDD5", text: "#9A3412" },
  closed:      { bg: "#D1FAE5", text: "#065F46" },
  lost:        { bg: "#FEE2E2", text: "#991B1B" },
};

const ALL_STAGES: LeadStage[] = ["new","contacted","viewing","negotiating","closed","lost"];

// ── Auto-source badge ──────────────────────────────────────────────────────────

const SOURCE_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  magicbricks: { label: "MagicBricks", bg: "#FFF0F6", text: "#C2185B" },
  "99acres":   { label: "99acres",     bg: "#FFF3E0", text: "#E65100" },
  housing:     { label: "Housing",     bg: "#E3F2FD", text: "#1565C0" },
  nobroker:    { label: "NoBroker",    bg: "#E8F5E9", text: "#2E7D32" },
  proptiger:   { label: "PropTiger",   bg: "#EDE7F6", text: "#512DA8" },
  squareyards: { label: "SquareYards", bg: "#E0F2F1", text: "#00695C" },
  justdial:    { label: "JustDial",    bg: "#FFF8E1", text: "#F57F17" },
  facebook:    { label: "Facebook",    bg: "#E3F2FD", text: "#1877F2" },
  instagram:   { label: "Instagram",   bg: "#FCE4EC", text: "#C2185B" },
};

function autoSource(notes: string | null) {
  const m = (notes ?? "").match(/Auto-captured from (\S+)/i);
  const key = m ? m[1].toLowerCase() : null;
  return key ? (SOURCE_BADGE[key] ?? null) : null;
}

const AVATAR_COLORS = ["#6366F1","#0EA5E9","#F59E0B","#EF4444","#8B5CF6","#14B8A6","#EC4899","#10B981"];

type SortKey = "name" | "budget" | "stage" | "created";
type SortDir = "asc" | "desc";

// ── Smart Lists ────────────────────────────────────────────────────────────────

type SmartListId = "all" | "hot" | "no-contact" | "new-week" | "site-visit" | "negotiating" | "follow-up" | "closed-month";

const SMART_LISTS: { id: SmartListId; label: string; icon: string; filter: (l: Lead) => boolean }[] = [
  {
    id: "all", label: "All Leads", icon: "👥",
    filter: () => true,
  },
  {
    id: "hot", label: "Hot Leads", icon: "🔥",
    filter: (l) => quality(score(l)) === "hot",
  },
  {
    id: "no-contact", label: "No Contact 7+ Days", icon: "📵",
    filter: (l) => {
      if (l.stage === "closed" || l.stage === "lost") return false;
      const days = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86400000);
      return days >= 7;
    },
  },
  {
    id: "new-week", label: "New This Week", icon: "✨",
    filter: (l) => {
      const days = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86400000);
      return days <= 7;
    },
  },
  {
    id: "site-visit", label: "Site Visit Scheduled", icon: "🏠",
    filter: (l) => l.stage === "viewing",
  },
  {
    id: "negotiating", label: "In Negotiation", icon: "🤝",
    filter: (l) => l.stage === "negotiating",
  },
  {
    id: "follow-up", label: "Follow Up Today", icon: "📅",
    filter: (l) => {
      if (!l.next_follow_up_at) return false;
      const today = new Date().toISOString().slice(0, 10);
      return l.next_follow_up_at.slice(0, 10) === today;
    },
  },
  {
    id: "closed-month", label: "Closed This Month", icon: "✅",
    filter: (l) => {
      if (l.stage !== "closed") return false;
      const now = new Date();
      const d = new Date(l.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    },
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [leads,       setLeads]       = useState<Lead[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [stageFilter, setStageFilter] = useState<LeadStage | "all">("all");
  const [qualFilter,  setQualFilter]  = useState<Quality | "all">("all");
  const [sortKey,     setSortKey]     = useState<SortKey>("created");
  const [sortDir,     setSortDir]     = useState<SortDir>("desc");
  const [stagePop,    setStagePop]    = useState<string | null>(null);
  const [smartList,   setSmartList]   = useState<SmartListId>("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [bulkPop,     setBulkPop]     = useState(false);
  const [bulkDel,     setBulkDel]     = useState(false);

  useEffect(() => {
    getAllLeads().then(setLeads).catch(() => {}).finally(() => setLoading(false));
    // Close stage pop on outside click
    function onDown() { setStagePop(null); }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const handleStageChange = useCallback(async (id: string, s: LeadStage) => {
    setStagePop(null);
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, stage: s } : l));
    try { await updateLead(id, { stage: s }); } catch { getAllLeads().then(setLeads); }
  }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((l) => l.id)));
    }
  }

  async function bulkChangeStage(stage: LeadStage) {
    const ids = Array.from(selected);
    setLeads((prev) => prev.map((l) => ids.includes(l.id) ? { ...l, stage } : l));
    setBulkPop(false);
    setSelected(new Set());
    await Promise.allSettled(ids.map((id) => updateLead(id, { stage })));
  }

  async function bulkDelete() {
    const ids = Array.from(selected);
    setLeads((prev) => prev.filter((l) => !ids.includes(l.id)));
    setBulkDel(false);
    setSelected(new Set());
    await Promise.allSettled(ids.map((id) => deleteLead(id)));
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const counts = useMemo(() => {
    const c = { hot: 0, warm: 0, cold: 0, all: leads.length };
    leads.forEach((l) => { c[quality(score(l))]++; });
    return c;
  }, [leads]);

  const stageCounts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length };
    leads.forEach((l) => { c[l.stage] = (c[l.stage] ?? 0) + 1; });
    return c;
  }, [leads]);

  const smartListFn = useMemo(() => SMART_LISTS.find((sl) => sl.id === smartList)?.filter ?? (() => true), [smartList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads
      .filter((l) => {
        if (!smartListFn(l)) return false;
        if (stageFilter !== "all" && l.stage !== stageFilter) return false;
        if (qualFilter  !== "all" && quality(score(l)) !== qualFilter) return false;
        if (q && !l.name.toLowerCase().includes(q) && !l.phone.includes(q) && !(l.location ?? "").toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "name")    cmp = a.name.localeCompare(b.name);
        if (sortKey === "budget")  cmp = (a.budget_max ?? 0) - (b.budget_max ?? 0);
        if (sortKey === "stage")   cmp = ALL_STAGES.indexOf(a.stage) - ALL_STAGES.indexOf(b.stage);
        if (sortKey === "created") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [leads, search, stageFilter, qualFilter, sortKey, sortDir, smartListFn]);

  const smartListCounts = useMemo(() =>
    Object.fromEntries(SMART_LISTS.map((sl) => [sl.id, leads.filter(sl.filter).length]))
  , [leads]);

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;
    return sortDir === "asc"
      ? <svg className="w-3 h-3" style={{ color: "#1BC47D" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
      : <svg className="w-3 h-3" style={{ color: "#1BC47D" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>;
  }

  const activeSmartList = SMART_LISTS.find((sl) => sl.id === smartList)!;

  return (
    <div className="flex h-full">

      {/* ══ Smart Lists Left Panel — desktop always visible, mobile drawer ══ */}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-56 bg-white flex flex-col transition-transform duration-200
        md:static md:translate-x-0 md:z-auto md:min-h-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `} style={{ borderRight: "1px solid #E5E7EB" }}>
        <div className="px-4 pt-4 pb-2 shrink-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Smart Lists</p>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {SMART_LISTS.map((sl) => {
            const on = smartList === sl.id;
            const cnt = smartListCounts[sl.id] ?? 0;
            return (
              <button key={sl.id}
                onClick={() => { setSmartList(sl.id); setStageFilter("all"); setQualFilter("all"); setSidebarOpen(false); }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors text-left"
                style={{
                  background: on ? "#F0FDF9" : "transparent",
                  color: on ? "#1BC47D" : "#374151",
                  fontWeight: on ? 600 : 400,
                  borderRight: on ? "3px solid #1BC47D" : "3px solid transparent",
                }}>
                <span className="text-base shrink-0">{sl.icon}</span>
                <span className="flex-1 truncate text-xs">{sl.label}</span>
                {cnt > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: on ? "#1BC47D22" : "#F3F4F6", color: on ? "#1BC47D" : "#9CA3AF" }}>
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="px-4 py-3 shrink-0" style={{ borderTop: "1px solid #F3F4F6" }}>
          <Link href="/leads/new"
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-white text-xs font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#1BC47D" }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Add Lead
          </Link>
        </div>
      </div>

      {/* ══ Right content ══ */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

      {/* ── Bulk action bar — shown when items selected ── */}
      {selected.size > 0 && (
        <div className="bg-[#1e293b] px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid #334155" }}>
          <span className="text-white text-sm font-semibold">{selected.size} selected</span>
          <button onClick={() => setSelected(new Set())}
            className="text-slate-400 hover:text-white text-xs transition-colors">Clear</button>
          <div className="flex-1" />

          {/* Change stage */}
          <div className="relative">
            <button onClick={() => { setBulkPop((v) => !v); setBulkDel(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: "#334155" }}>
              Change Stage
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {bulkPop && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl z-50 py-1 w-44 border border-gray-100">
                {ALL_STAGES.map((s) => (
                  <button key={s} onClick={() => bulkChangeStage(s)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: STAGE_PILL[s].bg, color: STAGE_PILL[s].text }}>
                      {STAGE_LABEL[s] ?? s}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Delete */}
          {!bulkDel ? (
            <button onClick={() => { setBulkDel(true); setBulkPop(false); }}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-red-400 hover:text-red-300 transition-colors">
              Delete
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Delete {selected.size} leads?</span>
              <button onClick={bulkDelete}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors">
                Confirm
              </button>
              <button onClick={() => setBulkDel(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Header bar ── */}
      <div className="bg-white px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid #E5E7EB" }}>
        {/* Mobile: Smart List toggle */}
        <button onClick={() => setSidebarOpen(true)}
          className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 shrink-0 transition-colors hover:bg-gray-50"
          style={{ color: "#374151" }}>
          <span>{activeSmartList.icon}</span>
          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Title */}
        <div className="shrink-0 hidden md:block">
          <h1 className="text-base font-bold text-gray-900">{activeSmartList.label}</h1>
          <p className="text-xs text-gray-400">{loading ? "Loading…" : `${filtered.length} leads`}</p>
        </div>
        <p className="text-xs text-gray-400 md:hidden">{loading ? "Loading…" : `${filtered.length} leads`}</p>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 rounded-xl px-3 py-2" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent min-w-0"
          />
          {search && <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>}
        </div>

        <Link href="/leads/new"
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-sm font-semibold shrink-0 transition-opacity hover:opacity-90"
          style={{ background: "#1BC47D" }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          Add Lead
        </Link>
      </div>

      {/* ── Filter tabs ── */}
      <div className="bg-white px-4 sm:px-6 overflow-x-auto" style={{ borderBottom: "1px solid #E5E7EB" }}>
        <div className="flex gap-1 py-2 min-w-max">
          {/* Stage filters */}
          {([
            { label: "All",         value: "all"         },
            { label: "New",         value: "new"         },
            { label: "Contacted",   value: "contacted"   },
            { label: "Site Visit",  value: "viewing"     },
            { label: "In Talks",    value: "negotiating" },
            { label: "Deal Done",   value: "closed"      },
            { label: "Lost",        value: "lost"        },
          ] as { label: string; value: LeadStage | "all" }[]).map(({ label, value }) => {
            const on = stageFilter === value;
            const cnt = stageCounts[value] ?? 0;
            return (
              <button key={value} onClick={() => setStageFilter(value)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
                style={{
                  background: on ? "#111827" : "transparent",
                  color: on ? "#ffffff" : "#6B7280",
                  border: on ? "1px solid #111827" : "1px solid transparent",
                }}>
                {label}
                {cnt > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: on ? "#ffffff22" : "#F3F4F6", color: on ? "#fff" : "#6B7280" }}>
                  {cnt}
                </span>}
              </button>
            );
          })}

          <div className="w-px bg-gray-200 mx-1 self-stretch" />

          {/* Quality filters */}
          {(["all","hot","warm","cold"] as (Quality | "all")[]).map((v) => {
            const on = qualFilter === v;
            const label = v === "all" ? "All Quality" : Q_PILL[v].label;
            return (
              <button key={v} onClick={() => setQualFilter(v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
                style={{
                  background: on ? (v === "all" ? "#111827" : Q_PILL[v as Quality]?.bg) : "transparent",
                  color: on ? (v === "all" ? "#fff" : Q_PILL[v as Quality]?.text) : "#6B7280",
                  border: on ? `1px solid ${v === "all" ? "#111827" : Q_PILL[v as Quality]?.text}44` : "1px solid transparent",
                }}>
                {label}
                {v !== "all" && <span className="text-[10px]">{counts[v]}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table (desktop) ── */}
      <div className="flex-1 overflow-auto pb-24 sm:pb-0">
        {/* Desktop table */}
        <div className="hidden sm:block">
          {loading ? (
            <div className="divide-y divide-gray-50">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                    <div className="h-2.5 bg-gray-50 rounded w-1/3" />
                  </div>
                  <div className="h-5 bg-gray-100 rounded-full w-20" />
                  <div className="h-5 bg-gray-100 rounded-full w-16" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <span className="text-4xl">🔍</span>
              <p className="text-gray-500 font-medium">No leads found</p>
              <p className="text-gray-400 text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-white z-10" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      ref={(el) => { if (el) el.indeterminate = selected.size > 0 && selected.size < filtered.length; }}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-[#1BC47D]"
                    />
                  </th>
                  <SortTh label="Name" sortKey="name" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Location</th>
                  <SortTh label="Budget" sortKey="budget" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortTh label="Stage" sortKey="stage" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Source</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Quality</th>
                  <SortTh label="Added" sortKey="created" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3 w-28" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, i) => {
                  const q      = quality(score(lead));
                  const pill   = STAGE_PILL[lead.stage];
                  const src    = autoSource(lead.notes ?? "");
                  const avatar = AVATAR_COLORS[i % AVATAR_COLORS.length];
                  const isOpen = stagePop === lead.id;

                  return (
                    <tr key={lead.id} className="group border-b border-gray-50 transition-colors"
                      style={{ background: "white" }}
                      onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "#F9FAFB"}
                      onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "white"}>

                      {/* Checkbox */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox"
                          checked={selected.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-[#1BC47D]"
                        />
                      </td>

                      {/* Name + phone */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                            style={{ background: avatar }}>
                            {initials(lead.name)}
                          </div>
                          <div>
                            <Link href={`/leads/${lead.id}`}
                              className="text-sm font-semibold text-gray-900 hover:text-[#1BC47D] transition-colors block">
                              {lead.name}
                            </Link>
                            <a href={`tel:${lead.phone}`} className="text-xs text-gray-400 hover:text-[#1BC47D]">{lead.phone}</a>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-[140px]">
                        <span className="truncate block">{lead.location || "—"}</span>
                      </td>

                      {/* Budget */}
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">
                        {lead.budget_max ? formatPrice(lead.budget_max) : "—"}
                      </td>

                      {/* Stage — click to change */}
                      <td className="px-4 py-3 relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setStagePop(isOpen ? null : lead.id); }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-opacity hover:opacity-80"
                          style={{ background: pill.bg, color: pill.text }}>
                          {STAGE_LABEL[lead.stage] ?? lead.stage}
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                        </button>

                        {/* Stage dropdown */}
                        {isOpen && (
                          <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-lg z-30 py-1 min-w-[160px]"
                            style={{ border: "1px solid #E5E7EB" }}
                            onMouseDown={(e) => e.stopPropagation()}>
                            {ALL_STAGES.map((s) => (
                              <button key={s}
                                onClick={() => handleStageChange(lead.id, s)}
                                className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-xs font-medium transition-colors"
                                style={{ color: lead.stage === s ? "#1BC47D" : "#374151" }}
                                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "#F9FAFB"}
                                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = ""}>
                                {lead.stage === s && <span style={{ color: "#1BC47D", fontSize: 10 }}>✓</span>}
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                  style={{ background: STAGE_PILL[s].bg, color: STAGE_PILL[s].text }}>
                                  {STAGE_LABEL[s] ?? s}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Source badge */}
                      <td className="px-4 py-3">
                        {src ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{ background: src.bg, color: src.text }}>
                            ⚡ {src.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 capitalize">{lead.source}</span>
                        )}
                      </td>

                      {/* Quality badge */}
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: Q_PILL[q].bg, color: Q_PILL[q].text }}>
                          {Q_PILL[q].label}
                        </span>
                      </td>

                      {/* Added date */}
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(lead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </td>

                      {/* Actions — show on row hover */}
                      <td className="px-4 py-3">
                        <div className="hidden group-hover:flex items-center gap-1.5 justify-end">
                          <a href={`tel:${lead.phone}`}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
                            style={{ background: "#1BC47D" }}>
                            Call
                          </a>
                          <a href={`https://wa.me/91${lead.phone.replace(/\D/g,"")}`}
                            target="_blank" rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
                            style={{ background: "#25D366" }}>
                            WA
                          </a>
                          <Link href={`/leads/${lead.id}`}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors"
                            style={{ background: "#F3F4F6", color: "#374151" }}>
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Mobile card list ── */}
        <div className="sm:hidden divide-y divide-gray-100">
          {loading && [...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-1/3" />
                <div className="h-2.5 bg-gray-50 rounded w-1/2" />
              </div>
              <div className="h-5 bg-gray-100 rounded-full w-16" />
            </div>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="text-3xl">🔍</span>
              <p className="text-gray-500 text-sm font-medium">No leads found</p>
            </div>
          )}

          {!loading && filtered.map((lead, i) => {
            const q    = quality(score(lead));
            const pill = STAGE_PILL[lead.stage];
            const src  = autoSource(lead.notes ?? "");
            return (
              <Link key={lead.id} href={`/leads/${lead.id}`}
                className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 bg-white">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                  {initials(lead.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">{lead.name}</p>
                    {src && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: src.bg, color: src.text }}>
                        ⚡ {src.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {lead.phone}{lead.location ? ` · ${lead.location}` : ""}
                    {lead.budget_max ? ` · ${formatPrice(lead.budget_max)}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: pill.bg, color: pill.text }}>
                    {STAGE_LABEL[lead.stage] ?? lead.stage}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: Q_PILL[q].bg, color: Q_PILL[q].text }}>
                    {Q_PILL[q].label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      </div>{/* end right content */}
    </div>
  );
}

// ── Sortable column header ────────────────────────────────────────────────────

function SortTh({ label, sortKey: k, current, dir, onSort }: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void;
}) {
  const active = current === k;
  return (
    <th className="px-4 py-3 text-left">
      <button onClick={() => onSort(k)}
        className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide transition-colors"
        style={{ color: active ? "#1BC47D" : "#9CA3AF" }}>
        {label}
        {active
          ? (dir === "asc"
            ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
            : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>)
          : <svg className="w-3 h-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
        }
      </button>
    </th>
  );
}
