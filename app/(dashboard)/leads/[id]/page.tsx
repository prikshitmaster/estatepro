"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getLeadById, updateLead, deleteLead } from "@/lib/db/leads";
import { getAllProperties } from "@/lib/db/properties";
import { formatPrice } from "@/lib/mock-data";
import { Lead, LeadStage, LeadSource, Property } from "@/lib/types";
import { matchPropertiesToLead, budgetDiff, MatchResult } from "@/lib/match-utils";
import { logActivity, getLeadActivity, ActivityLog, ActivityType, ACTIVITY_ICON, ACTIVITY_COLOR } from "@/lib/db/activity-logs";
import { getLeadTags, getAllTags, addTagToLead, removeTagFromLead, createTag, Tag, TAG_COLORS } from "@/lib/db/tags";

interface Props { params: Promise<{ id: string }> }

const STAGES: { value: LeadStage; label: string; color: string; bg: string }[] = [
  { value: "new",         label: "New Enquiry",    color: "#3B82F6", bg: "#EFF6FF" },
  { value: "contacted",   label: "Contacted",      color: "#F59E0B", bg: "#FFFBEB" },
  { value: "viewing",     label: "Site Visit",     color: "#8B5CF6", bg: "#F5F3FF" },
  { value: "negotiating", label: "In Talks",       color: "#F97316", bg: "#FFF7ED" },
  { value: "closed",      label: "Deal Done",      color: "#1BC47D", bg: "#F0FDF9" },
  { value: "lost",        label: "Not Interested", color: "#EF4444", bg: "#FEF2F2" },
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
  { label: "₹3Cr+",  value: 30000000 },
];

const SOURCES: LeadSource[] = ["website", "referral", "social", "walk-in", "ad", "other"];

const LOG_TYPES: { type: ActivityType; label: string; icon: React.ReactNode; placeholder: string }[] = [
  { type: "note",     label: "Note",     placeholder: "Add a note about this lead…",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> },
  { type: "call",     label: "Call",     placeholder: "How did the call go?",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> },
  { type: "whatsapp", label: "WhatsApp", placeholder: "WhatsApp message sent/received…",
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg> },
  { type: "email",    label: "Email",    placeholder: "Email details…",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
  { type: "visit",    label: "Visit",    placeholder: "Visit details…",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
];

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

function fmtDate(dateStr: string): string {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return "Today " + new Date(dateStr).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  if (d === 1) return "Yesterday";
  if (d < 7)  return `${d} days ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function InlineText({ value, placeholder, onSave, type = "text" }: {
  value: string; placeholder: string; onSave: (v: string) => void; type?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setDraft(value); }, [value]);

  function commit() {
    setEditing(false);
    if (draft.trim() !== value) onSave(draft.trim());
  }

  if (editing) return (
    <input
      ref={inputRef} type={type} value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") { setDraft(value); setEditing(false); }
      }}
      className="w-full px-2 py-1 text-sm border-2 border-[#1BC47D] rounded-lg focus:outline-none bg-white"
    />
  );

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true); }}
      className="w-full text-left text-sm rounded-lg hover:bg-gray-50 transition-colors group flex items-center justify-between gap-2 py-0.5"
    >
      <span className={value ? "text-gray-900" : "text-gray-400 italic"}>{value || placeholder}</span>
      <svg className="w-3 h-3 text-gray-300 group-hover:text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
  );
}

export default function LeadDetailPage({ params }: Props) {
  const router = useRouter();
  const leadIdRef = useRef<string>("");

  const [lead,               setLead]               = useState<Lead | null>(null);
  const [loading,            setLoading]            = useState(true);
  const [notFound,           setNotFound]           = useState(false);
  const [saveStatus,         setSaveStatus]         = useState<"idle" | "saving" | "saved">("idle");
  const [confirmDel,         setConfirmDel]         = useState(false);
  const [deleting,           setDeleting]           = useState(false);
  const [notes,              setNotes]              = useState("");
  const [matchedProperties,  setMatchedProperties]  = useState<MatchResult<Property>>({ perfect: [], close: [] });
  const [allProperties,      setAllProperties]      = useState<Property[]>([]);
  const [stageOpen,          setStageOpen]          = useState(false);
  const [sourceOpen,         setSourceOpen]         = useState(false);

  // Activity log state
  const [activities,   setActivities]   = useState<ActivityLog[]>([]);
  const [logType,      setLogType]      = useState<ActivityType>("note");
  const [logContent,   setLogContent]   = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [logError,     setLogError]     = useState("");

  // Tags state
  const [leadTags,     setLeadTags]     = useState<Tag[]>([]);
  const [allTags,      setAllTags]      = useState<Tag[]>([]);
  const [tagsOpen,     setTagsOpen]     = useState(false);
  const [newTagName,   setNewTagName]   = useState("");
  const [newTagColor,  setNewTagColor]  = useState("#1BC47D");
  const [creatingTag,  setCreatingTag]  = useState(false);
  const tagsRef = useRef<HTMLDivElement>(null);

  // Action Plan state
  const [actionPlans,      setActionPlans]      = useState<{ id: string; name: string }[]>([]);
  const [assignedPlan,     setAssignedPlan]     = useState<string>("");  // plan id
  const [planPickerOpen,   setPlanPickerOpen]   = useState(false);

  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      const { id } = await params;
      leadIdRef.current = id;
      const data = await getLeadById(id);
      if (!data) { setNotFound(true); setLoading(false); return; }
      setLead(data);
      setNotes(data.notes ?? "");
      setLoading(false);

      // Load activity logs
      getLeadActivity(id).then(setActivities).catch(() => {});

      // Load tags
      getLeadTags(id).then(setLeadTags).catch(() => {});
      getAllTags().then(setAllTags).catch(() => {});

      // Load action plans from user_metadata
      import("@/lib/supabase").then(({ supabase }) =>
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (!user) return;
          const plans = (user.user_metadata?.action_plans ?? []) as { id: string; name: string }[];
          setActionPlans(plans.map((p) => ({ id: p.id, name: p.name })));
          const assigned = (user.user_metadata?.lead_plans ?? {}) as Record<string, string>;
          setAssignedPlan(assigned[id] ?? "");
        })
      );

      // Load matched properties
      getAllProperties().then((props) => {
        setAllProperties(props);
        setMatchedProperties(matchPropertiesToLead(data, props));
      }).catch(() => {});
    }
    load();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (lead && allProperties.length > 0) {
      setMatchedProperties(matchPropertiesToLead(lead, allProperties));
    }
  }, [lead?.budget_min, lead?.budget_max, lead?.location, lead?.property_interest]); // eslint-disable-line

  // Close tags dropdown on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (tagsRef.current && !tagsRef.current.contains(e.target as Node)) setTagsOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  async function assignPlan(planId: string) {
    const { supabase } = await import("@/lib/supabase");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const existing = (user.user_metadata?.lead_plans ?? {}) as Record<string, string>;
    const updated = { ...existing };
    if (planId) updated[leadIdRef.current] = planId;
    else delete updated[leadIdRef.current];
    await supabase.auth.updateUser({ data: { lead_plans: updated } });
    setAssignedPlan(planId);
    setPlanPickerOpen(false);
  }

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

  async function handleSubmitLog() {
    if (!logContent.trim() || !lead) return;
    setSubmitting(true);
    setLogError("");
    try {
      const newLog = await logActivity({ lead_id: lead.id, type: logType, content: logContent.trim() });
      setActivities((prev) => [newLog, ...prev]);
      setLogContent("");
    } catch {
      setLogError("Could not save. Run COMPLETE-SETUP-V2.sql in Supabase first.");
    }
    setSubmitting(false);
  }

  async function handleDelete() {
    if (!lead) return;
    setDeleting(true);
    await deleteLead(lead.id);
    router.push("/leads");
  }

  async function handleAddTag(tag: Tag) {
    if (!lead) return;
    if (leadTags.find((t) => t.id === tag.id)) return;
    await addTagToLead(lead.id, tag.id).catch(() => {});
    setLeadTags((prev) => [...prev, tag]);
    setTagsOpen(false);
  }

  async function handleCreateAndAddTag() {
    if (!newTagName.trim() || !lead) return;
    setCreatingTag(true);
    try {
      const tag = await createTag(newTagName.trim(), newTagColor);
      setAllTags((prev) => [...prev, tag]);
      await addTagToLead(lead.id, tag.id).catch(() => {});
      setLeadTags((prev) => [...prev, tag]);
      setNewTagName("");
      setTagsOpen(false);
    } catch {}
    setCreatingTag(false);
  }

  async function handleRemoveTag(tagId: string) {
    if (!lead) return;
    await removeTagFromLead(lead.id, tagId).catch(() => {});
    setLeadTags((prev) => prev.filter((t) => t.id !== tagId));
  }

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-pulse space-y-4">
      <div className="h-14 bg-gray-200 rounded-xl" />
      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <div className="h-32 bg-gray-100 rounded-xl" />
          <div className="h-48 bg-gray-100 rounded-xl" />
        </div>
        <div className="w-80 hidden md:block space-y-4">
          <div className="h-48 bg-gray-100 rounded-xl" />
          <div className="h-32 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );

  if (notFound || !lead) return (
    <div className="p-6 text-center py-20">
      <p className="text-gray-400 text-sm">Lead not found.</p>
      <Link href="/leads" className="text-[#1BC47D] text-sm mt-2 block">← Back to Leads</Link>
    </div>
  );

  const currentStage = STAGES.find((s) => s.value === lead.stage) ?? STAGES[0];
  const initials = lead.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  const availableTags = allTags.filter((t) => !leadTags.find((lt) => lt.id === t.id));
  const currentLogType = LOG_TYPES.find((l) => l.type === logType) ?? LOG_TYPES[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 pb-24 md:pb-6">

      {/* ── Page Header ── */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/leads"
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors shrink-0">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>

        {/* Avatar + Name */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: "#1BC47D" }}>
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 leading-tight truncate">{lead.name}</h1>
            <p className="text-xs text-gray-400">
              Added {fmtDate(lead.created_at)} · {lead.source}
            </p>
          </div>
        </div>

        {/* Stage badge */}
        <div className="relative shrink-0" >
          <button
            onClick={() => setStageOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
            style={{ color: currentStage.color, background: currentStage.bg, borderColor: currentStage.color + "33" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: currentStage.color }} />
            {currentStage.label}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {stageOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl z-50 py-1 w-44 border border-gray-100">
              {STAGES.map((s) => (
                <button key={s.value} onClick={() => { save({ stage: s.value }); setStageOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                  style={{ color: lead.stage === s.value ? s.color : "#374151", fontWeight: lead.stage === s.value ? 600 : 400 }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                  {s.label}
                  {lead.stage === s.value && <span className="ml-auto text-[10px]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Save status */}
        <span className={`text-[11px] font-semibold shrink-0 transition-all ${
          saveStatus === "saved"  ? "text-[#1BC47D]" :
          saveStatus === "saving" ? "text-amber-500 animate-pulse" : "text-transparent"
        }`}>
          {saveStatus === "saved" ? "✓ Saved" : "Saving…"}
        </span>
      </div>

      {/* ── Action Buttons Row ── */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <a href={`tel:${lead.phone}`}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: "#F0FDF9", color: "#1BC47D", border: "1px solid #A7F3D0" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          Call
        </a>

        <a href={`https://wa.me/91${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: "#25D366", color: "#fff" }}>
          <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          WhatsApp
        </a>

        {lead.email && (
          <a href={`mailto:${lead.email}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: "#F0F9FF", color: "#0284C7", border: "1px solid #BAE6FD" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email
          </a>
        )}

        <Link href={`/visits?leadName=${encodeURIComponent(lead.name)}&phone=${encodeURIComponent(lead.phone)}`}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: "#F5F3FF", color: "#7C3AED", border: "1px solid #DDD6FE" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Schedule Visit
        </Link>

        <Link href={`/deals?leadName=${encodeURIComponent(lead.name)}`}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Add Deal
        </Link>
      </div>

      {/* ── Two-Column Body ── */}
      <div className="flex flex-col md:flex-row gap-5 items-start">

        {/* ══ LEFT: Activity Feed ══ */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Log Activity Input */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Type selector tabs */}
            <div className="flex border-b border-gray-100">
              {LOG_TYPES.map((lt) => (
                <button key={lt.type} onClick={() => setLogType(lt.type)}
                  className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors flex-1 justify-center"
                  style={{
                    color: logType === lt.type ? "#1BC47D" : "#6B7280",
                    borderBottom: logType === lt.type ? "2px solid #1BC47D" : "2px solid transparent",
                    background: "transparent"
                  }}>
                  {lt.icon}
                  <span className="hidden sm:inline">{lt.label}</span>
                </button>
              ))}
            </div>
            {/* Text input */}
            <div className="p-4">
              <textarea
                value={logContent}
                onChange={(e) => setLogContent(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmitLog(); }}
                placeholder={currentLogType.placeholder}
                rows={3}
                className="w-full text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none leading-relaxed"
              />
              {logError && (
                <p className="text-xs text-red-500 mt-2 mb-1">{logError}</p>
              )}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <p className="text-[11px] text-gray-400">Cmd+Enter to save</p>
                <button onClick={handleSubmitLog} disabled={!logContent.trim() || submitting}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40"
                  style={{ background: "#1BC47D" }}>
                  {submitting ? "Saving…" : `Log ${currentLogType.label}`}
                </button>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Activity</h3>
              <span className="text-xs text-gray-400">{activities.length} events</span>
            </div>
            <div className="relative">
              {/* FUB-style vertical connector line */}
              {(activities.length > 0) && (
                <div className="absolute left-[1.9rem] top-4 bottom-4 w-px bg-gray-100 z-0" />
              )}

              {activities.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <svg className="w-8 h-8 text-gray-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-sm text-gray-500 font-medium">No activity yet</p>
                  <p className="text-xs text-gray-400 mt-1">Log a call, note, or message above</p>
                </div>
              )}

              {activities.map((act, i) => (
                <div key={act.id} className={`flex gap-3 px-4 py-3 relative ${i < activities.length - 1 ? "border-b border-gray-50" : ""}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm z-10"
                    style={{ background: ACTIVITY_COLOR[act.type as ActivityType] + "18", border: `1.5px solid ${ACTIVITY_COLOR[act.type as ActivityType]}30` }}>
                    {ACTIVITY_ICON[act.type as ActivityType] ?? "📌"}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold capitalize" style={{ color: ACTIVITY_COLOR[act.type as ActivityType] }}>
                        {act.type.replace("_", " ")}
                      </p>
                      <span className="text-[10px] text-gray-400">{fmtDate(act.created_at)}</span>
                    </div>
                    {act.content && (
                      <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{act.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Lead created — always at bottom */}
              <div className="flex gap-3 px-4 py-3 border-t border-gray-50 relative">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm z-10 bg-gray-50 border border-gray-100">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-xs font-semibold text-gray-400">Lead created</p>
                  <p className="text-[11px] text-gray-400">{fmtDate(lead.created_at)} · via {lead.source}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Matched Properties */}
          {(matchedProperties.perfect.length > 0 || matchedProperties.close.length > 0) && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Matched Properties</h3>
              </div>
              <div className="p-4 space-y-3">
                {matchedProperties.perfect.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[#1BC47D] mb-2">✅ Perfect Match ({matchedProperties.perfect.length})</p>
                    <div className="space-y-2">
                      {matchedProperties.perfect.map((prop) => (
                        <PropertyMatchCard key={prop.id} prop={prop} lead={lead} tier="perfect" />
                      ))}
                    </div>
                  </div>
                )}
                {matchedProperties.close.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-600 mb-2">🟡 Close Match ({matchedProperties.close.length})</p>
                    <div className="space-y-2">
                      {matchedProperties.close.map((prop) => (
                        <PropertyMatchCard key={prop.id} prop={prop} lead={lead} tier="close"
                          diff={budgetDiff(prop.price, lead.budget_min ?? 0, lead.budget_max ?? 0)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ══ RIGHT: Contact Info Panel ══ */}
        <div className="w-full md:w-72 lg:w-80 shrink-0 space-y-4">

          {/* Contact Info */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Contact Info</h3>
            </div>
            <div className="px-4 py-3 space-y-3">
              {/* Phone */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Phone</p>
                <InlineText value={lead.phone} placeholder="Phone number" onSave={(v) => save({ phone: v })} type="tel" />
              </div>
              {/* Email */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Email</p>
                <InlineText value={lead.email ?? ""} placeholder="Email (optional)" onSave={(v) => save({ email: v })} type="email" />
              </div>
              {/* Name */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Full Name</p>
                <InlineText value={lead.name} placeholder="Full name" onSave={(v) => save({ name: v })} />
              </div>
              {/* Location */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Location</p>
                <InlineText value={lead.location ?? ""} placeholder="Area, City" onSave={(v) => save({ location: v })} />
              </div>
              {/* Source */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Source</p>
                <div className="relative">
                  <button onClick={() => setSourceOpen((v) => !v)}
                    className="w-full text-left text-sm capitalize px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between">
                    <span className="text-gray-900">{lead.source}</span>
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {sourceOpen && (
                    <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 w-full py-1">
                      {SOURCES.map((s) => (
                        <button key={s} onClick={() => { save({ source: s }); setSourceOpen(false); }}
                          className="w-full text-left px-3 py-2 text-sm capitalize hover:bg-gray-50 transition-colors"
                          style={{ color: lead.source === s ? "#1BC47D" : "#374151", fontWeight: lead.source === s ? 600 : 400 }}>
                          {s}
                          {lead.source === s && <span className="float-right">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Tags</h3>
              <div ref={tagsRef} className="relative">
                <button onClick={() => setTagsOpen((v) => !v)}
                  className="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
                  style={{ color: "#1BC47D" }}>
                  + Add
                </button>
                {tagsOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 w-52">
                    {/* Existing tags */}
                    {availableTags.length > 0 && (
                      <div className="py-1 border-b border-gray-100">
                        {availableTags.map((tag) => (
                          <button key={tag.id} onClick={() => handleAddTag(tag)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tag.color }} />
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {availableTags.length === 0 && leadTags.length > 0 && (
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-xs text-gray-400">All tags added</p>
                      </div>
                    )}
                    {/* Create new tag inline */}
                    <div className="px-3 py-2.5">
                      <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide mb-2">New tag</p>
                      <div className="flex gap-1.5">
                        <input
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleCreateAndAddTag(); }}
                          placeholder="Tag name…"
                          className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1BC47D]"
                          autoFocus
                        />
                        <button onClick={handleCreateAndAddTag} disabled={!newTagName.trim() || creatingTag}
                          className="px-2.5 py-1.5 text-xs font-bold text-white rounded-lg disabled:opacity-40 transition-opacity"
                          style={{ background: newTagColor }}>
                          {creatingTag ? "…" : "+"}
                        </button>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {TAG_COLORS.map((c) => (
                          <button key={c} onClick={() => setNewTagColor(c)}
                            className="w-4 h-4 rounded-full shrink-0 transition-transform hover:scale-110"
                            style={{
                              background: c,
                              outline: newTagColor === c ? `2px solid ${c}` : "none",
                              outlineOffset: "2px",
                            }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="px-4 py-3">
              {leadTags.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No tags yet — click + Add to create one</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {leadTags.map((tag) => (
                    <span key={tag.id}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ background: tag.color + "20", color: tag.color }}>
                      {tag.name}
                      <button onClick={() => handleRemoveTag(tag.id)}
                        className="hover:opacity-70 transition-opacity ml-0.5 leading-none">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Requirements</h3>
            </div>
            <div className="px-4 py-3 space-y-4">
              {/* Property type */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Property Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {PROPERTY_TYPES.map((t) => (
                    <button key={t} onClick={() => save({ property_interest: t as Lead["property_interest"] })}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all"
                      style={{
                        background: lead.property_interest === t ? "#1BC47D" : "#F9FAFB",
                        color: lead.property_interest === t ? "#fff" : "#6B7280",
                        borderColor: lead.property_interest === t ? "#1BC47D" : "#E5E7EB"
                      }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget Max */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Max Budget <span className="text-gray-600 font-bold normal-case">{formatPrice(lead.budget_max)}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {BUDGET_PRESETS.map((p) => (
                    <button key={p.label} onClick={() => save({ budget_max: p.value })}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all"
                      style={{
                        background: lead.budget_max === p.value ? "#1BC47D" : "#F9FAFB",
                        color: lead.budget_max === p.value ? "#fff" : "#6B7280",
                        borderColor: lead.budget_max === p.value ? "#1BC47D" : "#E5E7EB"
                      }}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <CustomBudgetInput onSave={(v) => save({ budget_max: v })} />
              </div>

              {/* Budget Min */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Min Budget <span className="text-gray-600 font-bold normal-case">{formatPrice(lead.budget_min)}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {BUDGET_PRESETS.map((p) => (
                    <button key={p.label} onClick={() => save({ budget_min: p.value })}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all"
                      style={{
                        background: lead.budget_min === p.value ? "#6366F1" : "#F9FAFB",
                        color: lead.budget_min === p.value ? "#fff" : "#6B7280",
                        borderColor: lead.budget_min === p.value ? "#6366F1" : "#E5E7EB"
                      }}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <CustomBudgetInput onSave={(v) => save({ budget_min: v })} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Notes</h3>
              {saveStatus === "saved" && <span className="text-[10px] text-[#1BC47D] font-semibold">✓ Saved</span>}
            </div>
            <div className="p-4">
              <textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Add notes about this lead…"
                rows={4}
                className="w-full text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* Action Plan */}
          {actionPlans.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Action Plan</h3>
                <button onClick={() => setPlanPickerOpen((v) => !v)}
                  className="text-xs text-[#1BC47D] font-semibold hover:opacity-80">
                  {assignedPlan ? "Change" : "Assign"}
                </button>
              </div>
              {planPickerOpen ? (
                <div className="p-3 flex flex-col gap-1.5">
                  <button onClick={() => assignPlan("")}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-400 hover:bg-gray-50 transition-colors">
                    — No plan
                  </button>
                  {actionPlans.map((p) => (
                    <button key={p.id} onClick={() => assignPlan(p.id)}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        background: assignedPlan === p.id ? "#F0FDF9" : "transparent",
                        color: assignedPlan === p.id ? "#1BC47D" : "#374151",
                      }}>
                      {assignedPlan === p.id && <span className="mr-1.5">✓</span>}
                      {p.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3">
                  {assignedPlan ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#1BC47D]" />
                      <p className="text-sm font-medium text-gray-800">
                        {actionPlans.find((p) => p.id === assignedPlan)?.name ?? "Unknown plan"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No plan assigned — click Assign to add one</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Share Property Link */}
          <Link
            href={`/secure-share/create?title=${encodeURIComponent(lead.name + " — Property Share")}`}
            className="flex items-center justify-between px-4 py-3 rounded-xl border transition-all hover:opacity-90 bg-white"
            style={{ borderColor: "#BBF7D0" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#DCFCE7" }}>
                <svg className="w-4 h-4 fill-[#16A34A]" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-700">Share on WhatsApp</p>
                <p className="text-xs text-green-600">Create a secure property link</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* Delete */}
          <div>
            {!confirmDel ? (
              <button onClick={() => setConfirmDel(true)}
                className="w-full py-2.5 border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500 text-sm font-medium rounded-xl transition-colors">
                Delete Lead
              </button>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700 font-medium mb-3">
                  Permanently delete <strong>{lead.name}</strong>? Cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button onClick={handleDelete} disabled={deleting}
                    className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-60">
                    {deleting ? "Deleting…" : "Delete"}
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
      </div>
    </div>
  );
}

// ── CustomBudgetInput ──────────────────────────────────────────────────────────

function CustomBudgetInput({ onSave }: { onSave: (v: number) => void }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);

  function commit() {
    if (!val.trim()) return;
    const parsed = parseBudget(val);
    if (!parsed || parsed <= 0) { setErr(true); return; }
    setErr(false); onSave(parsed); setVal("");
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <input type="text" value={val}
        onChange={(e) => { setVal(e.target.value); setErr(false); }}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
        placeholder="e.g. 35L or 1.2Cr"
        className={`flex-1 px-2.5 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#1BC47D] ${
          err ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"
        }`}
      />
      <button onMouseDown={(e) => { e.preventDefault(); commit(); }}
        className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg shrink-0"
        style={{ background: "#1BC47D" }}>
        Set
      </button>
    </div>
  );
}

// ── PropertyMatchCard ─────────────────────────────────────────────────────────

function PropertyMatchCard({ prop, lead, tier, diff = 0 }: {
  prop: Property; lead: Lead; tier: "perfect" | "close"; diff?: number;
}) {
  const thumb = prop.image_url ?? prop.media_urls?.[0] ?? null;
  const waMsg = encodeURIComponent(
    `Hi ${lead.name}! 👋\n\nI found a property matching your requirement:\n\n🏢 *${prop.title}*\n📍 ${prop.location}\n💰 *${formatPrice(prop.price)}*\n\nWould you like to schedule a visit?`
  );
  const diffLabel = diff > 0 ? `+${formatPrice(diff)} above` : diff < 0 ? `${formatPrice(Math.abs(diff))} below` : "";

  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: tier === "perfect" ? "#A7F3D0" : "#FDE68A" }}>
      <div className="flex gap-3 p-3">
        <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-xl"
          style={{ background: tier === "perfect" ? "#ECFDF5" : "#FFFBEB" }}>
          {thumb
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={thumb} alt="" className="w-full h-full object-cover" />
            : "🏢"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{prop.title}</p>
          <p className="text-xs text-gray-400">📍 {prop.location}</p>
          <p className="text-sm font-bold" style={{ color: "#1BC47D" }}>{formatPrice(prop.price)}</p>
          {diffLabel && <p className="text-[10px] text-amber-600">{diffLabel} budget</p>}
        </div>
      </div>
      <div className="flex border-t" style={{ borderColor: tier === "perfect" ? "#A7F3D0" : "#FDE68A" }}>
        <Link href={`/properties/${prop.id}`}
          className="flex-1 py-2 text-center text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-100">
          View
        </Link>
        <a href={`https://wa.me/91${lead.phone.replace(/\D/g, "")}?text=${waMsg}`}
          target="_blank" rel="noopener noreferrer"
          className="flex-1 py-2 text-center text-xs font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ background: "#25D366" }}>
          Send on WhatsApp
        </a>
      </div>
    </div>
  );
}
