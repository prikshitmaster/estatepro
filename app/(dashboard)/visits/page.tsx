"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SiteVisit, SiteVisitStatus } from "@/lib/types";
import { getAllSiteVisits, addSiteVisit, updateSiteVisit } from "@/lib/db/site-visits";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtVisitDate(iso: string): { date: string; time: string; isToday: boolean; isTomorrow: boolean } {
  const d    = new Date(iso);
  const now  = new Date();
  const diff = Math.floor((d.setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
  const date = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff === -1 ? "Yesterday"
    : new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const time = new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  return { date, time, isToday: diff === 0, isTomorrow: diff === 1 };
}

const STATUS_STYLE: Record<SiteVisitStatus, { bg: string; text: string; label: string }> = {
  scheduled:  { bg: "bg-blue-50",    text: "text-blue-600",   label: "Scheduled"  },
  completed:  { bg: "bg-emerald-50", text: "text-emerald-700",label: "Completed"  },
  cancelled:  { bg: "bg-red-50",     text: "text-red-500",    label: "Cancelled"  },
};

const BLANK = {
  leadName:      "",
  leadPhone:     "",
  propertyTitle: "",
  visitDate:     new Date().toISOString().slice(0, 10),
  visitTime:     "10:00",
  notes:         "",
};

type Tab = "upcoming" | "completed" | "all";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VisitsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [visits,    setVisits]    = useState<SiteVisit[]>([]);
  const [userId,    setUserId]    = useState("");
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");
  const [form,      setForm]      = useState({ ...BLANK });

  // Load user + visits
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);
      try { setVisits(await getAllSiteVisits()); } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [router]);

  // Pre-fill form if opened from lead page via ?leadName=...&phone=...
  useEffect(() => {
    const ln = searchParams.get("leadName");
    const ph = searchParams.get("phone");
    if (ln) {
      setForm((f) => ({ ...f, leadName: ln, leadPhone: ph ?? "" }));
      setShowForm(true);
    }
  }, [searchParams]);

  // ── Filtered tabs ─────────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const upcoming  = useMemo(() => visits.filter((v) => v.status === "scheduled" && v.scheduled_at >= now), [visits]);
  const completed = useMemo(() => visits.filter((v) => v.status === "completed"), [visits]);

  const displayed = activeTab === "upcoming" ? upcoming
    : activeTab === "completed" ? completed
    : visits;

  // ── Open add form ─────────────────────────────────────────────────────────
  function openAdd() {
    setEditingId(null);
    setForm({ ...BLANK });
    setShowForm(true);
  }

  // ── Open edit form ────────────────────────────────────────────────────────
  function openEdit(v: SiteVisit) {
    setEditingId(v.id);
    const d = new Date(v.scheduled_at);
    setForm({
      leadName:      v.lead_name,
      leadPhone:     v.lead_phone ?? "",
      propertyTitle: v.property_title ?? "",
      visitDate:     d.toISOString().slice(0, 10),
      visitTime:     d.toTimeString().slice(0, 5),
      notes:         v.notes ?? "",
    });
    setShowForm(true);
    setTimeout(() => document.getElementById("visit-form")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  // ── Save (add or update) ─────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!form.leadName.trim() || !form.visitDate) return;
    setSaving(true);
    try {
      const scheduled_at = new Date(`${form.visitDate}T${form.visitTime || "10:00"}:00`).toISOString();
      const payload = {
        user_id:        userId,
        lead_name:      form.leadName.trim(),
        lead_phone:     form.leadPhone.trim(),
        property_title: form.propertyTitle.trim(),
        scheduled_at,
        status:         "scheduled" as SiteVisitStatus,
        notes:          form.notes.trim(),
      };

      if (editingId) {
        const updated = await updateSiteVisit(editingId, { ...payload, status: undefined });
        setVisits((prev) => prev.map((v) => v.id === editingId ? { ...v, ...updated } : v));
      } else {
        const created = await addSiteVisit(payload);
        setVisits((prev) => [...prev, created].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)));
      }
      setShowForm(false);
      setEditingId(null);
      setActiveTab("upcoming");
    } catch (err) { console.error(err); }
    setSaving(false);
  }, [form, editingId, userId]);

  // ── Mark complete / cancel ─────────────────────────────────────────────────
  async function changeStatus(id: string, status: SiteVisitStatus) {
    const updated = await updateSiteVisit(id, { status });
    setVisits((prev) => prev.map((v) => v.id === id ? { ...v, ...updated } : v));
  }

  // ── WhatsApp reminder link ─────────────────────────────────────────────────
  function waLink(v: SiteVisit): string {
    const { date, time } = fmtVisitDate(v.scheduled_at);
    const prop = v.property_title ? ` for ${v.property_title}` : "";
    const msg  = `Hi ${v.lead_name}, your site visit${prop} is scheduled for ${date} at ${time}. Please confirm your availability. Thank you!`;
    const phone = v.lead_phone?.replace(/\D/g, "") ?? "";
    const num   = phone.startsWith("91") ? phone : `91${phone}`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="p-6 flex flex-col gap-3 animate-pulse max-w-2xl mx-auto">
      <div className="h-6 w-40 bg-gray-100 rounded" />
      {[0,1,2].map((i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 pb-28 sm:pb-10 max-w-2xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Site Visits</h1>
          <p className="text-xs text-gray-400 mt-0.5">{upcoming.length} upcoming · {completed.length} completed</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 text-sm font-bold text-white rounded-xl"
          style={{ background: "#1BC47D" }}
        >
          + Schedule
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-5">
        {([
          { key: "upcoming"  as Tab, label: "Upcoming",  count: upcoming.length  },
          { key: "completed" as Tab, label: "Completed", count: completed.length },
          { key: "all"       as Tab, label: "All",       count: visits.length    },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === tab.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.key ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-500"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Add / Edit Form ── */}
      {showForm && (
        <div id="visit-form" className="bg-white border border-blue-200 rounded-2xl p-5 mb-5 shadow-sm">
          <p className="text-sm font-bold text-gray-800 mb-4">
            {editingId ? "Edit Visit" : "Schedule Site Visit"}
          </p>

          <div className="flex flex-col gap-3">
            {/* Lead name + phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Lead Name *</label>
                <input
                  autoFocus
                  value={form.leadName}
                  onChange={(e) => setForm((f) => ({ ...f, leadName: e.target.value }))}
                  placeholder="Rahul Sharma"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Phone</label>
                <input
                  type="tel"
                  value={form.leadPhone}
                  onChange={(e) => setForm((f) => ({ ...f, leadPhone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>

            {/* Property */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Property (optional)</label>
              <input
                value={form.propertyTitle}
                onChange={(e) => setForm((f) => ({ ...f, propertyTitle: e.target.value }))}
                placeholder="e.g. Sea View Apartments, Andheri"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            {/* Date + time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Date *</label>
                <input
                  type="date"
                  value={form.visitDate}
                  onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Time *</label>
                <input
                  type="time"
                  value={form.visitTime}
                  onChange={(e) => setForm((f) => ({ ...f, visitTime: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Wants east facing, bring floor plan…"
                rows={2}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving || !form.leadName.trim()}
                className="flex-1 py-3 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-50 active:scale-95"
                style={{ background: "#1BC47D" }}
              >
                {saving ? "Saving…" : editingId ? "Update Visit" : "Schedule Visit"}
              </button>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="px-5 py-3 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Visit List ── */}
      {displayed.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📅</div>
          <h2 className="text-lg font-bold text-gray-700">
            {activeTab === "upcoming" ? "No upcoming visits" : activeTab === "completed" ? "No completed visits" : "No visits yet"}
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            {activeTab === "upcoming" ? "Schedule a property visit with your lead." : "Visits you mark as complete will appear here."}
          </p>
          {activeTab === "upcoming" && (
            <button onClick={openAdd}
              className="inline-block mt-6 px-6 py-3 text-white text-sm font-bold rounded-2xl"
              style={{ background: "#1BC47D" }}>
              + Schedule Visit
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {displayed.map((visit) => {
            const { date, time, isToday, isTomorrow } = fmtVisitDate(visit.scheduled_at);
            const st = STATUS_STYLE[visit.status];
            return (
              <div key={visit.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">

                {/* Date + time + status */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className={`text-base font-bold ${isToday ? "text-emerald-600" : isTomorrow ? "text-blue-600" : "text-gray-800"}`}>
                      {isToday && "🔥 "}{date}
                    </p>
                    <p className="text-sm font-semibold text-gray-500">{time}</p>
                  </div>
                  <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${st.bg} ${st.text}`}>
                    {st.label}
                  </span>
                </div>

                {/* Lead info */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👤</span>
                    <p className="text-sm font-semibold text-gray-800">{visit.lead_name}</p>
                  </div>
                  {visit.lead_phone && (
                    <a href={`tel:${visit.lead_phone}`} className="flex items-center gap-2 group">
                      <span className="text-base">📞</span>
                      <p className="text-sm text-gray-600 group-hover:text-emerald-600 transition-colors">{visit.lead_phone}</p>
                    </a>
                  )}
                  {visit.property_title && (
                    <div className="flex items-center gap-2">
                      <span className="text-base">🏠</span>
                      <p className="text-sm text-gray-600">{visit.property_title}</p>
                    </div>
                  )}
                  {visit.notes && (
                    <div className="flex items-start gap-2">
                      <span className="text-base">📝</span>
                      <p className="text-xs text-gray-500 italic">&quot;{visit.notes}&quot;</p>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  {visit.lead_phone && (
                    <a
                      href={waLink(visit)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white rounded-xl transition-colors"
                      style={{ background: "#25D366" }}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WA Reminder
                    </a>
                  )}
                  {visit.status === "scheduled" && (
                    <>
                      <button onClick={() => changeStatus(visit.id, "completed")}
                        className="px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors">
                        ✅ Done
                      </button>
                      <button onClick={() => changeStatus(visit.id, "cancelled")}
                        className="px-3 py-2 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                        ✕ Cancel
                      </button>
                      <button onClick={() => openEdit(visit)}
                        className="px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors">
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
