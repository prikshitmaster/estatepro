// app/_components/BuyerRequirements.tsx — buy-side requirements + matches on a lead
//
// 🧠 WHAT THIS DOES (simple explanation):
//    A buyer lead can have one or more "requirements" (what they want to buy).
//    For each active requirement we show CALLABLE property matches — from the
//    broker's own listings AND the newspaper market pool — with a Call/WhatsApp
//    owner button. Requirements are saved in the DB (buyer_requirements table).
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Lead, Property, NewspaperLead, BuyerRequirement } from "@/lib/types";
import {
  getRequirementsForLead, addRequirement, updateRequirement, deleteRequirement,
} from "@/lib/db/buyer-requirements";
import { getBuyerMatches, PropertyMatch } from "@/lib/buyer-matches";
import { formatPrice } from "@/lib/mock-data";

const GREEN = "#1BC47D";
const INTEREST_OPTIONS = ["1BHK", "2BHK", "3BHK", "4BHK", "Villa", "Plot", "Commercial"];

interface Props {
  lead:           Lead;
  userId:         string;
  properties:     Property[];
  newspaperLeads: NewspaperLead[];
}

export default function BuyerRequirements({ lead, userId, properties, newspaperLeads }: Props) {
  const [reqs,    setReqs]    = useState<BuyerRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BuyerRequirement | "new" | null>(null);
  const [busy,    setBusy]    = useState(false);

  const load = useCallback(async () => {
    try { setReqs(await getRequirementsForLead(lead.id)); } catch { /* table maybe missing */ }
    setLoading(false);
  }, [lead.id]);

  useEffect(() => { load(); }, [load]);

  async function save(values: Partial<BuyerRequirement>) {
    setBusy(true);
    try {
      if (editing && editing !== "new") {
        const updated = await updateRequirement(editing.id, values);
        setReqs((prev) => prev.map((r) => r.id === updated.id ? updated : r));
      } else {
        const created = await addRequirement({
          user_id:           userId,
          lead_id:           lead.id,
          status:            "active",
          budget_min:        0,
          budget_max:        0,
          ...values,
        } as Omit<BuyerRequirement, "id" | "created_at">);
        setReqs((prev) => [created, ...prev]);
      }
      setEditing(null);
    } catch { /* ignore */ }
    setBusy(false);
  }

  async function setStatus(r: BuyerRequirement, status: BuyerRequirement["status"]) {
    const updated = await updateRequirement(r.id, { status });
    setReqs((prev) => prev.map((x) => x.id === updated.id ? updated : x));
  }

  async function remove(id: string) {
    await deleteRequirement(id);
    setReqs((prev) => prev.filter((r) => r.id !== id));
  }

  if (editing) {
    return (
      <RequirementForm
        lead={lead}
        initial={editing === "new" ? null : editing}
        busy={busy}
        onSave={save}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Buyer Requirements</h3>
        <button onClick={() => setEditing("new")}
          className="text-xs font-semibold hover:opacity-80" style={{ color: GREEN }}>
          + Add
        </button>
      </div>

      {loading ? (
        <div className="px-4 py-5 text-xs text-gray-400">Loading…</div>
      ) : reqs.length === 0 ? (
        <div className="px-4 py-4">
          <p className="text-xs text-gray-400 italic">
            No requirements yet. Add what this client wants to buy and we&apos;ll find matching properties to call about.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {reqs.map((r) => (
            <RequirementCard
              key={r.id} req={r}
              properties={properties} newspaperLeads={newspaperLeads}
              onEdit={() => setEditing(r)}
              onStatus={(s) => setStatus(r, s)}
              onDelete={() => remove(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── One requirement + its matches ─────────────────────────────────────────────
function RequirementCard({ req, properties, newspaperLeads, onEdit, onStatus, onDelete }: {
  req: BuyerRequirement;
  properties: Property[];
  newspaperLeads: NewspaperLead[];
  onEdit: () => void;
  onStatus: (s: BuyerRequirement["status"]) => void;
  onDelete: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const isActive = req.status === "active";
  const { perfect, close } = getBuyerMatches(req, properties, newspaperLeads);
  const matches = [...perfect, ...close];

  const budgetLabel = req.budget_min || req.budget_max
    ? `${formatPrice(req.budget_min)} – ${formatPrice(req.budget_max)}`
    : "Any budget";

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">
              {req.label || req.property_interest || "Requirement"}
            </p>
            {!isActive && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">
                {req.status}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {budgetLabel}
            {req.property_interest ? ` · ${req.property_interest}` : ""}
            {req.location ? ` · ${req.location}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="text-[11px] font-medium text-gray-500 hover:text-gray-800 px-2 py-1">Edit</button>
          {confirmDel ? (
            <button onClick={onDelete} className="text-[11px] font-semibold text-red-600 px-2 py-1">Sure?</button>
          ) : (
            <button onClick={() => setConfirmDel(true)} className="text-[11px] text-gray-300 hover:text-red-400 px-1 py-1">✕</button>
          )}
        </div>
      </div>

      {/* Status toggle */}
      <div className="mt-1.5">
        {isActive ? (
          <button onClick={() => onStatus("fulfilled")}
            className="text-[11px] font-medium text-gray-400 hover:text-green-600">
            ✓ Mark fulfilled
          </button>
        ) : (
          <button onClick={() => onStatus("active")}
            className="text-[11px] font-medium hover:opacity-80" style={{ color: GREEN }}>
            ↻ Reopen
          </button>
        )}
      </div>

      {/* Matches (only for active requirements) */}
      {isActive && (
        <div className="mt-2">
          {matches.length === 0 ? (
            <p className="text-[11px] text-gray-300 italic">No matching properties right now.</p>
          ) : (
            <div className="rounded-lg border border-gray-100 overflow-hidden">
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400 bg-gray-50">
                {matches.length} match{matches.length !== 1 ? "es" : ""} to call
              </p>
              <div className="px-3">
                {matches.slice(0, 8).map((m) => <MatchRow key={`${m.source}-${m.id}`} m={m} />)}
              </div>
              {matches.length > 8 && (
                <p className="px-3 py-1.5 text-[10px] text-gray-400">+{matches.length - 8} more</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── One match row with Call / WhatsApp owner ──────────────────────────────────
function MatchRow({ m }: { m: PropertyMatch }) {
  const phone = (m.contactPhone ?? "").replace(/\D/g, "");
  return (
    <div className="flex items-start gap-2 py-2 border-t border-gray-50 first:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-medium text-gray-900 truncate">{m.title}</p>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={m.source === "mine"
              ? { background: "#F0FDF9", color: "#15803D" }
              : { background: "#EEF2FF", color: "#4338CA" }}>
            {m.source === "mine" ? "Your listing" : "Market"}
          </span>
          {m.tier === "close" && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">close</span>
          )}
        </div>
        <p className="text-xs text-gray-400 truncate">
          {formatPrice(m.price)}
          {m.location ? ` · ${m.location}` : ""}
          {m.contactName ? ` · ${m.contactName}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {phone ? (
          <>
            <a href={`tel:${m.contactPhone}`}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold text-white" style={{ background: GREEN }}>
              Call
            </a>
            <a href={`https://wa.me/91${phone}`} target="_blank" rel="noreferrer"
              className="px-2 py-1 rounded-lg text-[11px] font-semibold text-white" style={{ background: "#25D366" }}>
              WA
            </a>
          </>
        ) : m.href ? (
          <Link href={m.href} className="px-2 py-1 rounded-lg text-[11px] font-semibold text-gray-600 bg-gray-100">View</Link>
        ) : (
          <span className="text-[10px] text-gray-300 italic">no phone</span>
        )}
      </div>
    </div>
  );
}

// ── Add / edit form ───────────────────────────────────────────────────────────
function RequirementForm({ lead, initial, busy, onSave, onCancel }: {
  lead: Lead;
  initial: BuyerRequirement | null;
  busy: boolean;
  onSave: (v: Partial<BuyerRequirement>) => void;
  onCancel: () => void;
}) {
  // Prefill a NEW requirement from the lead's own budget/location/interest
  const [label,    setLabel]    = useState(initial?.label ?? "");
  const [budgetMin, setBudgetMin] = useState(String(initial?.budget_min ?? lead.budget_min ?? ""));
  const [budgetMax, setBudgetMax] = useState(String(initial?.budget_max ?? lead.budget_max ?? ""));
  const [location, setLocation] = useState(initial?.location ?? lead.location ?? "");
  const [interest, setInterest] = useState(initial?.property_interest ?? lead.property_interest ?? "");
  const [notes,    setNotes]    = useState(initial?.notes ?? "");

  function submit() {
    onSave({
      label:             label.trim() || undefined,
      budget_min:        parseInt(budgetMin) || 0,
      budget_max:        parseInt(budgetMax) || 0,
      location:          location.trim() || undefined,
      property_interest: interest || undefined,
      notes:             notes.trim() || undefined,
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{initial ? "Edit requirement" : "New requirement"}</h3>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div>
          <Lbl>Label</Lbl>
          <input value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. 2BHK to live in" className={inp} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Lbl>Budget min (₹)</Lbl>
            <input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)}
              placeholder="5000000" className={inp} />
            {parseInt(budgetMin) > 0 && <p className="text-[11px] mt-1 font-semibold" style={{ color: GREEN }}>{formatPrice(parseInt(budgetMin))}</p>}
          </div>
          <div>
            <Lbl>Budget max (₹)</Lbl>
            <input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)}
              placeholder="10000000" className={inp} />
            {parseInt(budgetMax) > 0 && <p className="text-[11px] mt-1 font-semibold" style={{ color: GREEN }}>{formatPrice(parseInt(budgetMax))}</p>}
          </div>
        </div>
        <div>
          <Lbl>Location</Lbl>
          <input value={location} onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Andheri West" className={inp} />
        </div>
        <div>
          <Lbl>Property type</Lbl>
          <div className="flex gap-1.5 flex-wrap mt-1">
            {INTEREST_OPTIONS.map((opt) => (
              <button key={opt} type="button" onClick={() => setInterest(interest === opt ? "" : opt)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                style={interest === opt
                  ? { background: GREEN, color: "#fff", border: `1px solid ${GREEN}` }
                  : { background: "#F5F7FA", color: "#6B7280", border: "1px solid #EEF1F6" }}>
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Lbl>Notes</Lbl>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Anything specific…" className={`${inp} resize-none`} />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={submit} disabled={busy}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
            style={{ background: GREEN }}>
            {busy ? "Saving…" : "Save requirement"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-gray-500 mb-1">{children}</p>;
}

const inp = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1BC47D] bg-white";
