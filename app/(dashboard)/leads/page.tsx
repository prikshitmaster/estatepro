"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { getAllLeads, updateLead } from "@/lib/db/leads";
import { formatPrice, initials, STAGE_LABEL } from "@/lib/mock-data";
import { Lead, LeadStage } from "@/lib/types";

// ── Lead quality scoring ──────────────────────────────────────────────────────

const PORTAL_KEYWORDS = ["magicbricks","99acres","housing","nobroker","proptiger",
  "squareyards","commonfloor","justdial","sulekha","olx","quikr"];

function computeScore(lead: Lead): number {
  let score = 0;
  const nameIsReal = lead.name &&
    !lead.name.includes("@") &&
    lead.name.toLowerCase() !== "unknown lead" &&
    !PORTAL_KEYWORDS.some(k => lead.name.toLowerCase().includes(k));
  const emailIsReal = lead.email &&
    !PORTAL_KEYWORDS.some(k => (lead.email ?? "").includes(k));

  if ((lead.phone ?? "").replace(/\D/g, "").length >= 10) score += 3;
  if (nameIsReal)                                           score += 2;
  if ((lead.budget_max ?? 0) > 0)                          score += 1;
  if (lead.location)                                        score += 1;
  if (emailIsReal)                                          score += 1;
  if (lead.property_interest)                              score += 1;
  if ((lead.notes ?? "").split("\n").length > 1)           score += 1;
  return score; // max 10
}

type Quality = "hot" | "warm" | "cold";

function getQuality(score: number): Quality {
  if (score >= 7) return "hot";
  if (score >= 4) return "warm";
  return "cold";
}

const QUALITY_LABEL: Record<Quality, string> = {
  hot:  "🔥 Hot",
  warm: "🌡️ Warm",
  cold: "❄️ Cold",
};
const QUALITY_BG: Record<Quality, string>   = { hot: "#FEF2F2", warm: "#FFFBEB", cold: "#EFF6FF" };
const QUALITY_TEXT: Record<Quality, string> = { hot: "#DC2626", warm: "#D97706", cold: "#3B82F6" };

// ── Auto-capture source badge ─────────────────────────────────────────────────

const PORTAL_DISPLAY: Record<string, { label: string; bg: string; text: string }> = {
  magicbricks: { label: "MagicBricks", bg: "#FFF0F6", text: "#C2185B" },
  "99acres":   { label: "99acres",     bg: "#FFF3E0", text: "#E65100" },
  housing:     { label: "Housing",     bg: "#E3F2FD", text: "#1565C0" },
  nobroker:    { label: "NoBroker",    bg: "#E8F5E9", text: "#2E7D32" },
  proptiger:   { label: "PropTiger",   bg: "#EDE7F6", text: "#512DA8" },
  squareyards: { label: "SquareYards", bg: "#E0F2F1", text: "#00695C" },
  commonfloor: { label: "CommonFloor", bg: "#FBE9E7", text: "#BF360C" },
  justdial:    { label: "JustDial",    bg: "#FFF8E1", text: "#F57F17" },
  sulekha:     { label: "Sulekha",     bg: "#F3E5F5", text: "#6A1B9A" },
  olx:         { label: "OLX",         bg: "#E8EAF6", text: "#283593" },
  facebook:    { label: "Facebook",    bg: "#E3F2FD", text: "#1877F2" },
  instagram:   { label: "Instagram",   bg: "#FCE4EC", text: "#C2185B" },
};

function getAutoSource(notes: string): string | null {
  const m = (notes ?? "").match(/Auto-captured from (\S+)/i);
  return m ? m[1].toLowerCase() : null;
}

// ── Stage styles ──────────────────────────────────────────────────────────────

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
  { label: "All",            value: "all"         },
  { label: "New Enquiry",    value: "new"         },
  { label: "Contacted",      value: "contacted"   },
  { label: "Site Visit",     value: "viewing"     },
  { label: "In Talks",       value: "negotiating" },
  { label: "Deal Done",      value: "closed"      },
  { label: "Not Interested", value: "lost"        },
];

const qualityFilters: { label: string; value: Quality | "all" }[] = [
  { label: "All Quality", value: "all"  },
  { label: "🔥 Hot",      value: "hot"  },
  { label: "🌡️ Warm",    value: "warm" },
  { label: "❄️ Cold",    value: "cold" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [leads, setLeads]               = useState<Lead[]>([]);
  const [loading, setLoading]           = useState(true);
  const [fetchError, setFetchError]     = useState("");
  const [search, setSearch]             = useState("");
  const [activeStage, setActiveStage]   = useState<LeadStage | "all">("all");
  const [activeQuality, setActiveQuality] = useState<Quality | "all">("all");

  useEffect(() => {
    getAllLeads()
      .then(setLeads)
      .catch(() => setFetchError("Could not load leads. Check your Supabase setup."))
      .finally(() => setLoading(false));
  }, []);

  const handleStageChange = useCallback(async (leadId: string, newStage: LeadStage) => {
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stage: newStage } : l));
    try {
      await updateLead(leadId, { stage: newStage });
    } catch {
      getAllLeads().then(setLeads);
    }
  }, []);

  const filtered = leads.filter((lead) => {
    const matchesStage = activeStage === "all" || lead.stage === activeStage;
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      lead.name.toLowerCase().includes(q) ||
      (lead.location ?? "").toLowerCase().includes(q) ||
      (lead.phone ?? "").includes(q);
    const quality = getQuality(computeScore(lead));
    const matchesQuality = activeQuality === "all" || quality === activeQuality;
    return matchesStage && matchesSearch && matchesQuality;
  });

  // Count by quality for filter labels
  const counts = { hot: 0, warm: 0, cold: 0 };
  leads.forEach(l => { counts[getQuality(computeScore(l))]++; });

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading ? "Loading..." : `${leads.length} total · `}
            {!loading && (
              <span>
                <span style={{ color: "#DC2626" }}>🔥{counts.hot}</span>
                {" · "}
                <span style={{ color: "#D97706" }}>🌡️{counts.warm}</span>
                {" · "}
                <span style={{ color: "#3B82F6" }}>❄️{counts.cold}</span>
              </span>
            )}
          </p>
        </div>
        <Link
          href="/leads/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl"
          style={{ background: "#1BC47D" }}
        >
          <PlusIcon /> Add Lead
        </Link>
      </div>

      {fetchError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {fetchError}
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-col gap-3 mb-5">
        <input
          type="text"
          placeholder="Search by name, location or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-sm px-4 py-2.5 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-white"
          style={{ border: "1px solid #EEF1F6" }}
        />

        {/* Stage filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {stageFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveStage(f.value)}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
              style={{
                background: activeStage === f.value ? "#1BC47D" : "#fff",
                color:      activeStage === f.value ? "#fff"    : "#6B7280",
                border:     activeStage === f.value ? "1px solid #1BC47D" : "1px solid #EEF1F6",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Quality filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {qualityFilters.map((f) => {
            const q = f.value as Quality;
            const isActive = activeQuality === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setActiveQuality(f.value)}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                style={{
                  background: isActive ? (f.value === "all" ? "#1BC47D" : QUALITY_BG[q]) : "#fff",
                  color:      isActive ? (f.value === "all" ? "#fff"    : QUALITY_TEXT[q]) : "#6B7280",
                  border:     isActive ? `1px solid ${f.value === "all" ? "#1BC47D" : QUALITY_TEXT[q]}` : "1px solid #EEF1F6",
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {f.label}{f.value !== "all" ? ` (${counts[q]})` : ""}
              </button>
            );
          })}
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

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          {leads.length === 0 ? "No leads yet. Add your first lead!" : "No leads match your filters."}
        </div>
      )}

      {/* Desktop table */}
      {!loading && filtered.length > 0 && (
        <>
          <div className="hidden md:block bg-white rounded-2xl overflow-visible" style={{ border: "1px solid #EEF1F6" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ borderBottom: "1px solid #F0F3F8" }}>
                  <th className="px-5 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Lead</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Location</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Budget</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Source</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F3F8]">
                {filtered.map((lead, i) => {
                  const score   = computeScore(lead);
                  const quality = getQuality(score);
                  const portal  = getAutoSource(lead.notes ?? "");
                  const portalInfo = portal ? PORTAL_DISPLAY[portal] : null;
                  return (
                    <tr key={lead.id} className="hover:bg-[#F8F9FB] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                            {initials(lead.name)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Link href={`/leads/${lead.id}`} className="font-semibold text-gray-900 hover:text-[#1BC47D] text-sm">
                                {lead.name}
                              </Link>
                              {/* Quality badge inline */}
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: QUALITY_BG[quality], color: QUALITY_TEXT[quality] }}
                              >
                                {QUALITY_LABEL[quality]}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">{lead.phone || lead.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{lead.location || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {lead.budget_max ? `${formatPrice(lead.budget_min)} – ${formatPrice(lead.budget_max)}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {portalInfo ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: portalInfo.bg, color: portalInfo.text }}
                          >
                            ⚡ {portalInfo.label}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500 capitalize">{lead.source}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StageBadge lead={lead} onStageChange={handleStageChange} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {filtered.map((lead, i) => {
              const score   = computeScore(lead);
              const quality = getQuality(score);
              const portal  = getAutoSource(lead.notes ?? "");
              const portalInfo = portal ? PORTAL_DISPLAY[portal] : null;
              return (
                <div key={lead.id} className="bg-white rounded-2xl p-4 flex items-start justify-between" style={{ border: "1px solid #EEF1F6" }}>
                  <Link href={`/leads/${lead.id}`} className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                      {initials(lead.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm truncate">{lead.name}</p>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ background: QUALITY_BG[quality], color: QUALITY_TEXT[quality] }}
                        >
                          {QUALITY_LABEL[quality]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{lead.phone || lead.email}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <p className="text-xs text-gray-400">{lead.location || ""}{lead.budget_max ? ` · ${formatPrice(lead.budget_max)}` : ""}</p>
                        {portalInfo && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: portalInfo.bg, color: portalInfo.text }}
                          >
                            ⚡ {portalInfo.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                  <StageBadge lead={lead} onStageChange={handleStageChange} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Stage badge with dropdown ─────────────────────────────────────────────────

function StageBadge({ lead, onStageChange }: { lead: Lead; onStageChange: (id: string, stage: LeadStage) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${STAGE_STYLE[lead.stage]}`}
      >
        {STAGE_LABEL[lead.stage] ?? lead.stage}
        <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg py-1 min-w-[130px]" style={{ border: "1px solid #EEF1F6" }}>
          {ALL_STAGES.map((stage) => (
            <button
              key={stage}
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); onStageChange(lead.id, stage); }}
              className="w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-[#F8F9FB]"
              style={{ color: lead.stage === stage ? "#1BC47D" : "#374151" }}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                stage === "new" ? "bg-blue-400" : stage === "contacted" ? "bg-amber-400" :
                stage === "viewing" ? "bg-violet-400" : stage === "negotiating" ? "bg-orange-400" :
                stage === "closed" ? "bg-green-400" : "bg-red-400"
              }`} />
              {STAGE_LABEL[stage] ?? stage}
              {lead.stage === stage && (
                <svg className="w-3 h-3 ml-auto" style={{ color: "#1BC47D" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
