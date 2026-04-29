// app/(dashboard)/leads/page.tsx — Leads list with quick stage change
//
// 🧠 NEW in Day 8:
//    The stage badge (e.g. "New", "Contacted") is now CLICKABLE.
//    Clicking it opens a small dropdown — pick a new stage — it saves instantly.
//    No need to open the edit form just to move a lead forward in the pipeline.
//
//    How it works:
//      1. User clicks stage badge → openStageId is set to that lead's id
//      2. A dropdown appears with all 6 stage options
//      3. User picks a stage → updateLead() called → badge updates instantly
//      4. Clicking anywhere else closes the dropdown (useEffect + click listener)
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { getAllLeads, updateLead } from "@/lib/db/leads";
import { formatPrice, initials } from "@/lib/mock-data";
import { Lead, LeadStage } from "@/lib/types";

const STAGE_STYLE: Record<LeadStage, string> = {
  new:         "bg-blue-50 text-blue-600",
  contacted:   "bg-amber-50 text-amber-600",
  viewing:     "bg-violet-50 text-violet-600",
  negotiating: "bg-orange-50 text-orange-600",
  closed:      "bg-green-50 text-green-600",
  lost:        "bg-red-50 text-red-600",
};

const ALL_STAGES: LeadStage[] = ["new", "contacted", "viewing", "negotiating", "closed", "lost"];

const AVATAR_COLORS = [
  "bg-blue-500","bg-violet-500","bg-green-500",
  "bg-amber-500","bg-rose-500","bg-cyan-500",
];

const stageFilters: { label: string; value: LeadStage | "all" }[] = [
  { label: "All",         value: "all"         },
  { label: "New",         value: "new"         },
  { label: "Contacted",   value: "contacted"   },
  { label: "Viewing",     value: "viewing"     },
  { label: "Negotiating", value: "negotiating" },
  { label: "Closed",      value: "closed"      },
  { label: "Lost",        value: "lost"        },
];

export default function LeadsPage() {
  const [leads, setLeads]             = useState<Lead[]>([]);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState("");
  const [search, setSearch]           = useState("");
  const [activeStage, setActiveStage] = useState<LeadStage | "all">("all");

  useEffect(() => {
    async function fetchLeads() {
      try {
        const data = await getAllLeads();
        setLeads(data);
      } catch (err) {
        setFetchError("Could not load leads. Check your Supabase setup.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
  }, []);

  const handleStageChange = useCallback(async (leadId: string, newStage: LeadStage) => {
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stage: newStage } : l));
    try {
      await updateLead(leadId, { stage: newStage });
    } catch {
      const fresh = await getAllLeads();
      setLeads(fresh);
    }
  }, []);

  const filtered = leads.filter((lead) => {
    const matchesStage  = activeStage === "all" || lead.stage === activeStage;
    const q             = search.toLowerCase();
    const matchesSearch = !q ||
      lead.name.toLowerCase().includes(q)     ||
      (lead.location ?? "").toLowerCase().includes(q) ||
      lead.phone.includes(q);
    return matchesStage && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading ? "Loading..." : `${leads.length} total leads`}
          </p>
        </div>
        <Link
          href="/leads/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition-colors" style={{ background: '#1BC47D' }}
        >
          <PlusIcon />
          Add Lead
        </Link>
      </div>

      {fetchError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {fetchError}
        </div>
      )}

      {/* Search + filter */}
      <div className="flex flex-col gap-3 mb-5">
        <input
          type="text"
          placeholder="Search by name, location or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-sm px-4 py-2.5 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-white" style={{ border: '1px solid #EEF1F6' }}
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {stageFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveStage(f.value)}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
              style={{
                background: activeStage === f.value ? '#1BC47D' : '#fff',
                color: activeStage === f.value ? '#fff' : '#6B7280',
                border: activeStage === f.value ? '1px solid #1BC47D' : '1px solid #EEF1F6',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/3" />
                <div className="h-2.5 bg-gray-100 rounded w-1/2" />
              </div>
              <div className="h-5 bg-gray-200 rounded-full w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          {leads.length === 0 ? "No leads yet. Add your first lead!" : "No leads match your search."}
        </div>
      )}

      {/* Desktop table */}
      {!loading && filtered.length > 0 && (
        <>
          <div className="hidden md:block bg-white rounded-2xl overflow-visible" style={{ border: '1px solid #EEF1F6' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ borderBottom: '1px solid #F0F3F8' }}>
                  <th className="px-5 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Lead</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Location</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Budget</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Source</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F3F8]">
                {filtered.map((lead, i) => (
                  <tr key={lead.id} className="hover:bg-[#F8F9FB] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                          {initials(lead.name)}
                        </div>
                        <div>
                          <Link href={`/leads/${lead.id}`} className="font-semibold text-gray-900 hover:text-[#1BC47D] text-sm block">
                            {lead.name}
                          </Link>
                          <span className="text-xs text-gray-400">{lead.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{lead.location}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatPrice(lead.budget_min)} – {formatPrice(lead.budget_max)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">{lead.source}</td>
                    <td className="px-4 py-3">
                      <StageBadge lead={lead} onStageChange={handleStageChange} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {filtered.map((lead, i) => (
              <div key={lead.id} className="bg-white rounded-2xl p-4 flex items-start justify-between" style={{ border: '1px solid #EEF1F6' }}>
                <Link href={`/leads/${lead.id}`} className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                    {initials(lead.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{lead.name}</p>
                    <p className="text-xs text-gray-400">{lead.phone}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{lead.location} · {formatPrice(lead.budget_max)}</p>
                  </div>
                </Link>
                <StageBadge lead={lead} onStageChange={handleStageChange} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Stage badge with dropdown ─────────────────────────────────────────────────
// Each badge manages its own open/close state — no shared ref across rows
function StageBadge({
  lead,
  onStageChange,
}: {
  lead: Lead;
  onStageChange: (id: string, stage: LeadStage) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside this specific badge
  useEffect(() => {
    if (!isOpen) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen((v) => !v); }}
        className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize flex items-center gap-1 ${STAGE_STYLE[lead.stage]}`}
      >
        {lead.stage}
        <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg py-1 min-w-[130px]" style={{ border: '1px solid #EEF1F6' }}>
          {ALL_STAGES.map((stage) => (
            <button
              key={stage}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onStageChange(lead.id, stage);
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium capitalize flex items-center gap-2 hover:bg-[#F8F9FB] transition-colors"
              style={{ color: lead.stage === stage ? '#1BC47D' : '#374151' }}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                stage === "new" ? "bg-blue-400" :
                stage === "contacted" ? "bg-amber-400" :
                stage === "viewing" ? "bg-violet-400" :
                stage === "negotiating" ? "bg-orange-400" :
                stage === "closed" ? "bg-green-400" : "bg-red-400"
              }`} />
              {stage}
              {lead.stage === stage && (
                <svg className="w-3 h-3 ml-auto" style={{ color: '#1BC47D' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
