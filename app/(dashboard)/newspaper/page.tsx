// app/(dashboard)/newspaper/page.tsx — Newspaper Leads dashboard (broker view)
//
// 🧠 WHAT THIS PAGE DOES:
//    Shows all newspaper leads uploaded by admin.
//    Every broker sees the SAME leads — it's shared content.
//    Each broker has their OWN private actions:
//      - Mark as Contacted (only they see it)
//      - Save / Bookmark (personal list)
//      - Convert to CRM Lead (pulls into their own pipeline)
//
//    Admin sees an extra "Upload" button (top right).
//    Regular brokers never see the upload button.
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { NewspaperLead, NewspaperLeadAction } from "@/lib/types";
import {
  getAllNewspaperLeads,
  getUserActions,
  upsertUserAction,
  convertToCRMLead,
} from "@/lib/db/newspaper-leads";
import { formatPrice } from "@/lib/mock-data";

const ADMIN_EMAIL = "prikshitcorp@gmail.com";

// ─── helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

function toLocalDateStr(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(dateStr: string): string {
  const today = toLocalDateStr(new Date().toISOString());
  const yest  = toLocalDateStr(new Date(Date.now() - 86400000).toISOString());
  if (dateStr === today) return "Today";
  if (dateStr === yest)  return "Yesterday";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function whatsappText(lead: NewspaperLead): string {
  const ownerLabel = lead.owner_type === "owner" ? "🔑 Owner Direct" : lead.owner_type === "broker" ? "Via Broker" : "";
  return `🏠 *${lead.bhk} ${lead.property_type}* — ${lead.area}, ${lead.city}
💰 ${formatPrice(lead.price)} | ${lead.intent === "sale" ? "For Sale" : "For Rent"}${ownerLabel ? `\n👤 ${ownerLabel}` : ""}
📞 ${lead.phone}${lead.description ? `\n📝 ${lead.description}` : ""}

_Shared via EstatePro CRM_`;
}

// ─── City Distribution Chart ─────────────────────────────────────────────────

function CityChart({ leads }: { leads: NewspaperLead[] }) {
  const breakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => { if (l.city) counts[l.city] = (counts[l.city] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 7);
  }, [leads]);

  const max = breakdown[0]?.[1] || 1;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Leads by City</h3>
        <span className="text-[11px] text-gray-400">{breakdown.length} cities</span>
      </div>
      <div className="flex flex-col gap-3">
        {breakdown.map(([city, count]) => (
          <div key={city} className="flex items-center gap-3">
            <p className="text-[12px] font-semibold text-gray-600 w-24 shrink-0 truncate">{city}</p>
            <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-700"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-gray-700 shrink-0 w-6 text-right">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col gap-1">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}

// ─── Owner badge ──────────────────────────────────────────────────────────────

function OwnerBadge({ type }: { type: NewspaperLead["owner_type"] }) {
  if (type === "owner") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 whitespace-nowrap">
      🔑 Owner
    </span>
  );
  if (type === "broker") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 whitespace-nowrap">
      Broker
    </span>
  );
  return <span className="text-[11px] text-gray-400">—</span>;
}

// ─── Intent badge ─────────────────────────────────────────────────────────────

function IntentBadge({ intent }: { intent: NewspaperLead["intent"] }) {
  return intent === "sale"
    ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">SALE</span>
    : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">RENT</span>;
}

// ─── Drawer (right-side panel for a selected lead) ────────────────────────────

function LeadDrawer({
  lead,
  action,
  onClose,
  onAction,
  onConvert,
}: {
  lead: NewspaperLead;
  action?: NewspaperLeadAction;
  onClose: () => void;
  onAction: (updates: Partial<Pick<NewspaperLeadAction, "is_saved" | "is_contacted" | "is_converted">>) => void;
  onConvert: () => void;
}) {
  const [converting, setConverting] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleConvert() {
    setConverting(true);
    await onConvert();
    setConverting(false);
  }

  function copyWhatsApp() {
    navigator.clipboard.writeText(whatsappText(lead));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      {/* Semi-transparent overlay — click to close */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer panel — slides in from right */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-wide mb-0.5">
              {lead.owner_type === "owner" ? "🔑 Owner Direct" : lead.newspaper_name || "Newspaper Lead"}
            </p>
            <h2 className="text-base font-bold text-gray-900">
              {lead.bhk} {lead.property_type} — {lead.area}
            </h2>
            <p className="text-sm text-gray-500">{lead.city}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

          {/* Key details grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Price",       value: formatPrice(lead.price) },
              { label: "Intent",      value: lead.intent === "sale" ? "For Sale" : "For Rent" },
              { label: "BHK",         value: lead.bhk },
              { label: "Type",        value: lead.property_type },
              { label: "Area",        value: lead.area },
              { label: "City",        value: lead.city },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Owner type */}
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500 font-medium">Owner Type:</p>
            <OwnerBadge type={lead.owner_type} />
          </div>

          {/* Phone */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Phone</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{lead.phone}</p>
            </div>
            <a
              href={`tel:${lead.phone}`}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call
            </a>
          </div>

          {/* Description */}
          {lead.description && (
            <div>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1.5">Description</p>
              <p className="text-sm text-gray-700 leading-relaxed">{lead.description}</p>
            </div>
          )}

          {/* Source info */}
          <div className="text-[11px] text-gray-400 border-t border-gray-100 pt-3">
            Source: {lead.source_file_name} · {timeAgo(lead.uploaded_at)}
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-5 py-4 border-t border-gray-100 flex flex-col gap-2.5">

          {/* Contacted + Saved row */}
          <div className="flex gap-2">
            <button
              onClick={() => onAction({ is_contacted: !action?.is_contacted })}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                action?.is_contacted
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {action?.is_contacted ? "Contacted ✓" : "Mark Contacted"}
            </button>

            <button
              onClick={() => onAction({ is_saved: !action?.is_saved })}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                action?.is_saved
                  ? "bg-amber-100 text-amber-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill={action?.is_saved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {action?.is_saved ? "Saved ✓" : "Save"}
            </button>
          </div>

          {/* WhatsApp share */}
          <button
            onClick={copyWhatsApp}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {copied ? "Copied!" : "Copy for WhatsApp"}
          </button>

          {/* Convert to CRM */}
          <button
            onClick={handleConvert}
            disabled={converting || action?.is_converted}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              action?.is_converted
                ? "bg-blue-50 text-blue-500 cursor-default"
                : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            }`}
          >
            {action?.is_converted ? (
              "✓ Already in CRM"
            ) : converting ? (
              "Converting…"
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Convert to CRM Lead
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function NewspaperPage() {
  const router = useRouter();

  const [leads,        setLeads]        = useState<NewspaperLead[]>([]);
  const [actions,      setActions]      = useState<Record<string, NewspaperLeadAction>>({});
  const [userId,       setUserId]       = useState("");
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [selectedLead, setSelectedLead] = useState<NewspaperLead | null>(null);

  // Filters
  const [search,      setSearch]      = useState("");
  const [dateFilter,  setDateFilter]  = useState(() => toLocalDateStr(new Date().toISOString())); // default today
  const [cityFilter,  setCityFilter]  = useState("all");
  const [intentFilter,setIntentFilter]= useState("all");
  const [bhkFilter,   setBhkFilter]   = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [viewMode,     setViewMode]    = useState<"table" | "card">("table");
  const [savedOnly,    setSavedOnly]   = useState(false);
  const [convertingId, setConvertingId]= useState<string | null>(null);

  // Load everything on mount
  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace("/login"); return; }

        setUserId(user.id);
        setIsAdmin(user.email === ADMIN_EMAIL);

        const [leadsData, actionsData] = await Promise.all([
          getAllNewspaperLeads(),
          getUserActions(user.id),
        ]);

        setLeads(leadsData);
        setActions(actionsData);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load leads");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  // Unique cities from data (for city pill filters)
  const cities = useMemo(() => {
    const set = new Set(leads.map((l) => l.city).filter(Boolean));
    return Array.from(set).sort();
  }, [leads]);

  // Available upload dates — newest first, with per-date lead count
  const availableDates = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l) => {
      const key = toLocalDateStr(l.uploaded_at);
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [leads]);

  // KPI computations
  const totalLeads  = leads.length;
  const ownerLeads  = leads.filter((l) => l.owner_type === "owner").length;
  const todayLeads  = leads.filter((l) => isToday(l.uploaded_at)).length;
  const citiesCount = cities.length;
  const myConverted = Object.values(actions).filter((a) => a.is_converted).length;

  // Apply all filters
  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (dateFilter !== "all" && toLocalDateStr(l.uploaded_at) !== dateFilter) return false;
      if (savedOnly && !actions[l.id]?.is_saved) return false;
      if (cityFilter !== "all" && l.city !== cityFilter) return false;
      if (intentFilter !== "all" && l.intent !== intentFilter) return false;
      if (bhkFilter !== "all" && l.bhk !== bhkFilter) return false;
      if (ownerFilter !== "all" && l.owner_type !== ownerFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          l.area.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.phone.includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.property_type.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [leads, actions, search, dateFilter, cityFilter, intentFilter, bhkFilter, ownerFilter, savedOnly]);

  // Handle user action on a lead (contacted / saved)
  async function handleAction(
    lead: NewspaperLead,
    updates: Partial<Pick<NewspaperLeadAction, "is_saved" | "is_contacted" | "is_converted">>
  ) {
    // Optimistic update — update UI immediately
    setActions((prev) => ({
      ...prev,
      [lead.id]: { ...prev[lead.id], ...updates } as NewspaperLeadAction,
    }));
    await upsertUserAction(userId, lead.id, updates);
  }

  // Handle convert to CRM (used by drawer)
  async function handleConvert(lead: NewspaperLead) {
    await convertToCRMLead(lead, userId);
    setActions((prev) => ({
      ...prev,
      [lead.id]: { ...prev[lead.id], is_converted: true } as NewspaperLeadAction,
    }));
  }

  // Quick one-click convert directly from the table row (no drawer needed)
  async function handleQuickConvert(lead: NewspaperLead, e: React.MouseEvent) {
    e.stopPropagation(); // don't open the drawer
    if (actions[lead.id]?.is_converted || convertingId) return;
    setConvertingId(lead.id);
    try {
      await convertToCRMLead(lead, userId);
      setActions((prev) => ({
        ...prev,
        [lead.id]: { ...prev[lead.id], is_converted: true } as NewspaperLeadAction,
      }));
    } finally {
      setConvertingId(null);
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className="p-6 pb-24 sm:pb-6">
      <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="h-96 bg-gray-200 rounded-2xl animate-pulse" />
    </div>
  );

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) return (
    <div className="p-6 pb-24 sm:pb-6">
      <p className="text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm">{error}</p>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 pb-24 sm:pb-6 max-w-7xl mx-auto">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Find Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fresh property leads sourced daily</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Saved toggle */}
          <button
            onClick={() => setSavedOnly((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              savedOnly ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill={savedOnly ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            Saved
          </button>

          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === "table" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}
            >
              ☰ Table
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === "card" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}
            >
              ⊞ Cards
            </button>
          </div>

          {/* Admin-only upload button */}
          {isAdmin && (
            <Link
              href="/admin/newspaper"
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-xl hover:bg-purple-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Admin Upload
            </Link>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Total Leads"   value={totalLeads}  />
        <KpiCard label="Owner Direct"  value={ownerLeads}  accent="text-purple-700" sub="No middleman" />
        <KpiCard label="Today Added"   value={todayLeads}  accent="text-emerald-600" sub={todayLeads > 0 ? "Fresh today" : "Check tomorrow"} />
        <KpiCard label="Cities"        value={citiesCount} sub="Covered" />
        <KpiCard label="My Converted"  value={myConverted} accent="text-blue-600" sub="In your CRM" />
      </div>

      {/* ── City Distribution Chart ── */}
      {leads.length > 0 && <CityChart leads={leads} />}

      {/* ── Filter bar ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-col gap-3">

        {/* Date pills — one per upload batch, newest first */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mr-1">Date</span>
          <button
            onClick={() => setDateFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              dateFilter === "all" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All Dates
          </button>
          {availableDates.map(([date, count]) => (
            <button
              key={date}
              onClick={() => setDateFilter(date)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                dateFilter === date ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {formatDateLabel(date)}
              <span className={`text-[10px] font-bold rounded-full px-1 ${
                dateFilter === date ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {count}
              </span>
            </button>
          ))}
          {/* Manual date picker for any specific date */}
          <input
            type="date"
            value={dateFilter === "all" ? "" : dateFilter}
            onChange={(e) => e.target.value ? setDateFilter(e.target.value) : setDateFilter("all")}
            className="ml-auto px-3 py-1 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white text-gray-600"
          />
        </div>

        {/* Search + dropdowns */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search area, phone, description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <select
            value={intentFilter}
            onChange={(e) => setIntentFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white text-gray-700"
          >
            <option value="all">All Intent</option>
            <option value="sale">Sale</option>
            <option value="rent">Rent</option>
          </select>

          <select
            value={bhkFilter}
            onChange={(e) => setBhkFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white text-gray-700"
          >
            <option value="all">All BHK</option>
            {["1", "2", "3", "4", "Villa", "Plot", "Commercial"].map((b) => (
              <option key={b} value={b}>{b} BHK</option>
            ))}
          </select>

          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white text-gray-700"
          >
            <option value="all">All Types</option>
            <option value="owner">Owner Direct</option>
            <option value="broker">Broker</option>
          </select>
        </div>

        {/* City pills */}
        {cities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCityFilter("all")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${cityFilter === "all" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              All Cities
            </button>
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => setCityFilter(city === cityFilter ? "all" : city)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${cityFilter === city ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {city}
              </button>
            ))}
          </div>
        )}

        {/* Result count */}
        <p className="text-xs text-gray-400">
          Showing <span className="font-semibold text-gray-700">{filtered.length}</span> of {totalLeads} leads
        </p>
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
          <p className="text-4xl mb-3">📰</p>
          <p className="text-gray-700 font-semibold">No leads found</p>
          <p className="text-gray-400 text-sm mt-1">
            {leads.length === 0 ? "No newspaper leads uploaded yet. Check back tomorrow." : "Try adjusting your filters."}
          </p>
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {viewMode === "table" && filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="overflow-x-auto rounded-2xl">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Area", "Type", "BHK", "Intent", "Price", "Phone", "Owner", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((lead) => {
                  const action = actions[lead.id];
                  const isOwner = lead.owner_type === "owner";
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={`cursor-pointer hover:bg-purple-50/40 transition-colors ${isOwner ? "bg-purple-50/20" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{lead.area}</p>
                        <p className="text-[11px] text-gray-400">{lead.city} · {timeAgo(lead.uploaded_at)}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{lead.property_type}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{lead.bhk}</td>
                      <td className="px-4 py-3"><IntentBadge intent={lead.intent} /></td>
                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatPrice(lead.price)}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{lead.phone}</td>
                      <td className="px-4 py-3"><OwnerBadge type={lead.owner_type} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {action?.is_contacted && <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded-full">Called</span>}
                          {action?.is_saved     && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-full">Saved</span>}
                          {action?.is_converted && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded-full">In CRM</span>}
                          {!action?.is_contacted && !action?.is_saved && !action?.is_converted && (
                            <span className="text-[10px] text-gray-400">New</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {/* Call */}
                          <a href={`tel:${lead.phone}`} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Call">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          </a>
                          {/* View (open drawer) */}
                          <button onClick={() => setSelectedLead(lead)} className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors" title="View details">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          {/* Quick Add to CRM — one click, no drawer */}
                          <button
                            onClick={(e) => handleQuickConvert(lead, e)}
                            disabled={!!convertingId || action?.is_converted}
                            title={action?.is_converted ? "Already in your CRM" : "Add to my CRM"}
                            className={`p-1.5 rounded-lg transition-colors ${
                              action?.is_converted
                                ? "bg-blue-50 text-blue-500 cursor-default"
                                : "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                            }`}
                          >
                            {convertingId === lead.id ? (
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                            ) : action?.is_converted ? (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CARD VIEW ── */}
      {viewMode === "card" && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((lead) => {
            const action = actions[lead.id];
            return (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`bg-white rounded-2xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow flex flex-col gap-3 ${
                  lead.owner_type === "owner" ? "border-purple-200" : "border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{lead.area}, {lead.city}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(lead.uploaded_at)}</p>
                  </div>
                  <OwnerBadge type={lead.owner_type} />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">{lead.bhk} {lead.property_type}</span>
                  <IntentBadge intent={lead.intent} />
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-gray-900">{formatPrice(lead.price)}</p>
                  <a
                    href={`tel:${lead.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    Call
                  </a>
                </div>

                {/* User's action tags */}
                {(action?.is_contacted || action?.is_saved || action?.is_converted) && (
                  <div className="flex gap-1 flex-wrap pt-1 border-t border-gray-50">
                    {action?.is_contacted && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded-full">Called</span>}
                    {action?.is_saved     && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-full">Saved</span>}
                    {action?.is_converted && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded-full">In CRM</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Lead Drawer ── */}
      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          action={actions[selectedLead.id]}
          onClose={() => setSelectedLead(null)}
          onAction={(updates) => handleAction(selectedLead, updates)}
          onConvert={() => handleConvert(selectedLead)}
        />
      )}
    </div>
  );
}
