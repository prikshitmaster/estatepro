"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PlanGate from "@/app/_components/PlanGate";
import { Deal } from "@/lib/types";
import { getAllDeals, addDeal, updateDeal, deleteDeal } from "@/lib/db/deals";
import { formatPrice } from "@/lib/mock-data";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePriceInput(s: string): number | null {
  const m = s.trim().toLowerCase().match(/^(\d+\.?\d*)\s*(l|lakh|lac|cr|crore)?$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = m[2] ?? "";
  if (unit.startsWith("cr")) return Math.round(n * 1e7);
  if (unit.startsWith("l") || unit.startsWith("lac")) return Math.round(n * 1e5);
  return Math.round(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const THIS_MONTH = new Date().toISOString().slice(0, 7); // "2026-05"
const THIS_YEAR  = new Date().getFullYear().toString();

// ── Blank form ────────────────────────────────────────────────────────────────

const BLANK = {
  leadName:      "",
  propertyTitle: "",
  salePriceStr:  "",
  commissionPct: "",
  dealDate:      new Date().toISOString().slice(0, 10),
  notes:         "",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DealsPage() {
  return <PlanGate requires="pro" feature="Commission Tracking"><DealsPageInner /></PlanGate>;
}

function DealsPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [deals,      setDeals]      = useState<Deal[]>([]);
  const [userId,     setUserId]     = useState("");
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [delId,      setDelId]      = useState<string | null>(null);
  const [defaultPct, setDefaultPct] = useState("2.0");
  const [form,       setForm]       = useState({ ...BLANK });

  // Read default commission % from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ep_commission_pct");
    if (saved) setDefaultPct(saved);
  }, []);

  // Load user + deals
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);
      try { setDeals(await getAllDeals()); } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [router]);

  // Pre-fill form if opened from lead detail page via ?leadName=...
  useEffect(() => {
    const ln = searchParams.get("leadName");
    if (ln) {
      setForm((f) => ({ ...f, leadName: ln, commissionPct: defaultPct }));
      setShowForm(true);
    }
  }, [searchParams, defaultPct]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let monthAmt = 0, monthCount = 0, yearAmt = 0, yearCount = 0;
    deals.forEach((d) => {
      if (d.deal_date.startsWith(THIS_MONTH)) { monthAmt += d.commission_amt; monthCount++; }
      if (d.deal_date.startsWith(THIS_YEAR))  { yearAmt  += d.commission_amt; yearCount++;  }
    });
    const avg = yearCount > 0 ? Math.round(yearAmt / yearCount) : 0;
    return { monthAmt, monthCount, yearAmt, yearCount, avg };
  }, [deals]);

  // ── Computed commission preview ────────────────────────────────────────────
  const saleParsed   = parsePriceInput(form.salePriceStr) ?? 0;
  const pct          = parseFloat(form.commissionPct) || 0;
  const commPreview  = Math.round(saleParsed * pct / 100);

  // ── Open blank add form ────────────────────────────────────────────────────
  function openAdd() {
    setEditingId(null);
    setForm({ ...BLANK, commissionPct: defaultPct });
    setShowForm(true);
  }

  // ── Open edit form pre-filled ─────────────────────────────────────────────
  function openEdit(deal: Deal) {
    setEditingId(deal.id);
    setForm({
      leadName:      deal.lead_name,
      propertyTitle: deal.property_title ?? "",
      salePriceStr:  deal.sale_price > 0 ? String(deal.sale_price) : "",
      commissionPct: String(deal.commission_pct),
      dealDate:      deal.deal_date,
      notes:         deal.notes ?? "",
    });
    setShowForm(true);
    setTimeout(() => document.getElementById("deal-form")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  // ── Save (add or update) ──────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!form.leadName.trim()) return;
    const sp = parsePriceInput(form.salePriceStr);
    if (!sp || sp <= 0) return;
    const cpct = parseFloat(form.commissionPct) || parseFloat(defaultPct) || 2;
    const camt = Math.round(sp * cpct / 100);

    setSaving(true);
    try {
      const payload = {
        user_id:        userId,
        lead_name:      form.leadName.trim(),
        property_title: form.propertyTitle.trim(),
        sale_price:     sp,
        commission_pct: cpct,
        commission_amt: camt,
        deal_date:      form.dealDate,
        notes:          form.notes.trim(),
      };

      if (editingId) {
        const updated = await updateDeal(editingId, payload);
        setDeals((prev) => prev.map((d) => d.id === editingId ? updated : d));
      } else {
        const created = await addDeal(payload);
        setDeals((prev) => [created, ...prev]);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ ...BLANK, commissionPct: defaultPct });
    } catch (err) { console.error(err); }
    setSaving(false);
  }, [form, editingId, userId, defaultPct]);

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    await deleteDeal(id);
    setDeals((prev) => prev.filter((d) => d.id !== id));
    setDelId(null);
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="p-6 flex flex-col gap-3 animate-pulse max-w-2xl mx-auto">
      <div className="h-6 w-40 bg-gray-100 rounded" />
      <div className="grid grid-cols-3 gap-3">
        {[0,1,2].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl" />)}
      </div>
      <div className="h-32 bg-gray-100 rounded-2xl" />
      <div className="h-24 bg-gray-100 rounded-2xl" />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 pb-28 sm:pb-10 max-w-2xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Commission Tracker</h1>
          <p className="text-xs text-gray-400 mt-0.5">{deals.length} deal{deals.length !== 1 ? "s" : ""} recorded</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors"
          style={{ background: "#1BC47D" }}
        >
          + Add Deal
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white border border-gray-100 rounded-2xl p-3 text-center">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">This Month</p>
          <p className="text-base font-bold text-emerald-600">{formatPrice(stats.monthAmt)}</p>
          <p className="text-[11px] text-gray-400">{stats.monthCount} deal{stats.monthCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-3 text-center">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">This Year</p>
          <p className="text-base font-bold text-indigo-600">{formatPrice(stats.yearAmt)}</p>
          <p className="text-[11px] text-gray-400">{stats.yearCount} deal{stats.yearCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-3 text-center">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Avg / Deal</p>
          <p className="text-base font-bold text-amber-600">{stats.avg > 0 ? formatPrice(stats.avg) : "—"}</p>
          <p className="text-[11px] text-gray-400">commission</p>
        </div>
      </div>

      {/* ── Default commission setting ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-2xl mb-5">
        <span className="text-sm text-gray-600 font-medium">Default commission:</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0" max="100" step="0.1"
            value={defaultPct}
            onChange={(e) => {
              setDefaultPct(e.target.value);
              localStorage.setItem("ep_commission_pct", e.target.value);
            }}
            className="w-14 text-center text-sm font-bold border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
          <span className="text-sm font-medium text-gray-600">%</span>
        </div>
        <span className="text-xs text-gray-400 ml-auto">editable per deal</span>
      </div>

      {/* ── Add / Edit Form ── */}
      {showForm && (
        <div id="deal-form" className="bg-white border border-emerald-200 rounded-2xl p-5 mb-5 shadow-sm">
          <p className="text-sm font-bold text-gray-800 mb-4">
            {editingId ? "Edit Deal" : "Record New Deal"}
          </p>

          <div className="flex flex-col gap-3">
            {/* Lead name */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Lead / Client Name *</label>
              <input
                autoFocus
                value={form.leadName}
                onChange={(e) => setForm((f) => ({ ...f, leadName: e.target.value }))}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            {/* Property title */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Property (optional)</label>
              <input
                value={form.propertyTitle}
                onChange={(e) => setForm((f) => ({ ...f, propertyTitle: e.target.value }))}
                placeholder="e.g. DLF Heights, Sector 62"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            {/* Sale price + commission row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Sale Price *</label>
                <input
                  value={form.salePriceStr}
                  onChange={(e) => setForm((f) => ({ ...f, salePriceStr: e.target.value }))}
                  placeholder="e.g. 85L or 1.2Cr"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
                {saleParsed > 0 && (
                  <p className="text-[11px] text-emerald-600 mt-1 font-semibold">{formatPrice(saleParsed)}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Commission %</label>
                <input
                  type="number"
                  min="0" max="100" step="0.1"
                  value={form.commissionPct}
                  onChange={(e) => setForm((f) => ({ ...f, commissionPct: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
                {commPreview > 0 && (
                  <p className="text-[11px] text-emerald-600 mt-1 font-semibold">= {formatPrice(commPreview)}</p>
                )}
              </div>
            </div>

            {/* Deal date */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Deal Date</label>
              <input
                type="date"
                value={form.dealDate}
                onChange={(e) => setForm((f) => ({ ...f, dealDate: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Any extra details about this deal…"
                rows={2}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving || !form.leadName.trim() || !parsePriceInput(form.salePriceStr)}
                className="flex-1 py-3 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-50 active:scale-95"
                style={{ background: "#1BC47D" }}
              >
                {saving ? "Saving…" : editingId ? "Update Deal" : "Save Deal"}
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

      {/* ── Deal List ── */}
      {deals.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">💰</div>
          <h2 className="text-lg font-bold text-gray-700">No deals yet</h2>
          <p className="text-sm text-gray-400 mt-2">Record your first closed deal to start tracking commission.</p>
          <button onClick={openAdd}
            className="inline-block mt-6 px-6 py-3 text-white text-sm font-bold rounded-2xl"
            style={{ background: "#1BC47D" }}>
            + Add First Deal
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {deals.map((deal) => (
            <div key={deal.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">

              {/* Top row */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{deal.lead_name}</p>
                  {deal.property_title && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{deal.property_title}</p>
                  )}
                </div>
                <span className="shrink-0 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full">
                  Deal Done ✅
                </span>
              </div>

              {/* Commission highlight */}
              <div className="flex items-center gap-3 px-3 py-2.5 bg-emerald-50 rounded-xl mb-3">
                <div className="flex-1">
                  <p className="text-[11px] text-emerald-600 font-semibold">Sale Price</p>
                  <p className="text-sm font-bold text-gray-800">{formatPrice(deal.sale_price)}</p>
                </div>
                <div className="w-px h-8 bg-emerald-200" />
                <div className="flex-1 text-right">
                  <p className="text-[11px] text-emerald-600 font-semibold">Commission ({deal.commission_pct}%)</p>
                  <p className="text-sm font-bold text-emerald-700">{formatPrice(deal.commission_amt)}</p>
                </div>
              </div>

              {/* Date + notes */}
              <p className="text-xs text-gray-400 mb-1">📅 {fmtDate(deal.deal_date)}</p>
              {deal.notes && <p className="text-xs text-gray-500 italic mb-2">&quot;{deal.notes}&quot;</p>}

              {/* Actions */}
              {delId === deal.id ? (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleDelete(deal.id)}
                    className="flex-1 py-2 bg-red-600 text-white text-xs font-bold rounded-xl">
                    Yes, Delete
                  </button>
                  <button onClick={() => setDelId(null)}
                    className="flex-1 py-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-xl">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => openEdit(deal)}
                    className="px-4 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors">
                    Edit
                  </button>
                  <button onClick={() => setDelId(deal.id)}
                    className="px-4 py-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
