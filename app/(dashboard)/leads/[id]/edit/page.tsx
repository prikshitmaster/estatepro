// app/(dashboard)/leads/[id]/edit/page.tsx — Edit an existing lead
//
// 🧠 WHAT THIS PAGE DOES (simple explanation):
//    Imagine you wrote someone's phone number in a notebook.
//    Later you want to correct it. You don't throw the notebook away —
//    you just erase that number and write the new one.
//
//    That's exactly what THIS page does:
//      1. Opens with all the lead's current info already filled in
//      2. You change whatever you want (name, budget, stage...)
//      3. Click "Save Changes"
//      4. Supabase UPDATES that row in the database (erase + rewrite)
//      5. Page goes back to the lead's detail view
//
//    In database language: this is called an UPDATE (not INSERT).
//    INSERT = add a brand new row  (the "Add Lead" form does this)
//    UPDATE = change an existing row  (THIS page does this)
//
// "use client" is required because we use useState and useEffect
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getLeadById, updateLead } from "@/lib/db/leads";
import { Lead, LeadSource, LeadStage } from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────
// Next.js 16 gives us params as a Promise — we MUST await it to read the id
interface Props {
  params: Promise<{ id: string }>;
}

export default function EditLeadPage({ params }: Props) {
  const router = useRouter();

  // The lead we fetched — needed so we can pre-fill the form
  const [lead, setLead] = useState<Lead | null>(null);

  // true while loading from Supabase
  const [loading, setLoading] = useState(true);

  // true if lead wasn't found in the DB
  const [notFound, setNotFound] = useState(false);

  // true while saving changes to Supabase
  const [saving, setSaving] = useState(false);

  // Any error message to show the user
  const [saveError, setSaveError] = useState("");

  // ── Form state ──────────────────────────────────────────────────────────────
  // One object holding ALL the form fields.
  // Starts empty — we fill it in once the lead is fetched.
  const [form, setForm] = useState({
    name:              "",
    phone:             "",
    email:             "",
    source:            "website" as LeadSource,
    budget_min:        "",
    budget_max:        "",
    location:          "",
    property_interest: "",
    stage:             "new" as LeadStage,
    notes:             "",
  });

  // ── Fetch the lead on page load ──────────────────────────────────────────────
  useEffect(() => {
    async function fetchLead() {
      // params is a Promise in Next.js 16 — must await it to get the id
      const { id } = await params;

      const data = await getLeadById(id);

      if (!data) {
        setNotFound(true);
      } else {
        setLead(data);

        // Pre-fill the form with the lead's CURRENT values
        // This is why the form shows existing data instead of blank fields
        setForm({
          name:              data.name,
          phone:             data.phone,
          email:             data.email ?? "",
          source:            data.source,
          budget_min:        String(data.budget_min ?? ""),
          budget_max:        String(data.budget_max ?? ""),
          location:          data.location ?? "",
          property_interest: data.property_interest ?? "",
          stage:             data.stage,
          notes:             data.notes ?? "",
        });
      }
      setLoading(false);
    }
    fetchLead();
  }, []); // [] = run once when page first loads

  // ── Helper: update one field without wiping the others ───────────────────────
  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ── Handle form submit (save changes) ────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // stop the browser from reloading the page
    if (!lead) return;

    setSaveError("");
    setSaving(true);

    try {
      // Call updateLead — this sends the changes to Supabase
      // updateLead(id, changes) = "find the lead with this id, apply these changes"
      await updateLead(lead.id, {
        name:              form.name,
        phone:             form.phone,
        email:             form.email,
        source:            form.source,
        budget_min:        parseInt(form.budget_min) || 0,
        budget_max:        parseInt(form.budget_max) || 0,
        location:          form.location,
        property_interest: form.property_interest as Lead["property_interest"],
        stage:             form.stage,
        notes:             form.notes,
      });

      // Done! Go back to the lead's detail page to see the updated info
      router.push(`/leads/${lead.id}`);

    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes.");
      setSaving(false);
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-xl w-full" />
          ))}
        </div>
      </div>
    );
  }

  // ── Not found state ───────────────────────────────────────────────────────────
  if (notFound || !lead) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-20">
        <p className="text-gray-400 text-lg">Lead not found.</p>
        <Link href="/leads" className="text-blue-600 text-sm mt-2 block hover:underline">← Back to leads</Link>
      </div>
    );
  }

  // ── Main edit form ─────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 sm:pb-6">

      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/leads/${lead.id}`} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
          <BackIcon />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">Edit Lead</h1>
          <p className="text-gray-400 text-sm truncate">{lead.name}</p>
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Row 1: Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name *">
              <input
                required type="text" placeholder="Rahul Sharma"
                value={form.name} onChange={(e) => set("name", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Phone *">
              <input
                required type="tel" placeholder="+91 98765 43210"
                value={form.phone} onChange={(e) => set("phone", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {/* Row 2: Email + Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email">
              <input
                type="email" placeholder="rahul@example.com"
                value={form.email} onChange={(e) => set("email", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Source">
              <select value={form.source} onChange={(e) => set("source", e.target.value)} className={inputCls}>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="social">Social Media</option>
                <option value="walk-in">Walk-in</option>
                <option value="ad">Ad</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>

          {/* Row 3: Budget min + max */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Budget Min (₹)">
              <input
                type="number" placeholder="3000000"
                value={form.budget_min} onChange={(e) => set("budget_min", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Budget Max (₹)">
              <input
                type="number" placeholder="8000000"
                value={form.budget_max} onChange={(e) => set("budget_max", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {/* Row 4: Location + Property interest */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Location *">
              <input
                required type="text" placeholder="Bandra, Mumbai"
                value={form.location} onChange={(e) => set("location", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Looking For">
              <select value={form.property_interest} onChange={(e) => set("property_interest", e.target.value)} className={inputCls}>
                <option value="">Select type</option>
                <option value="1BHK">1 BHK</option>
                <option value="2BHK">2 BHK</option>
                <option value="3BHK">3 BHK</option>
                <option value="4BHK">4 BHK</option>
                <option value="Villa">Villa</option>
                <option value="Plot">Plot</option>
                <option value="Commercial">Commercial</option>
              </select>
            </Field>
          </div>

          {/* Stage — this is the most common thing a broker updates */}
          <Field label="Stage">
            <select value={form.stage} onChange={(e) => set("stage", e.target.value)} className={inputCls}>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="viewing">Viewing</option>
              <option value="negotiating">Negotiating</option>
              <option value="closed">Closed</option>
              <option value="lost">Lost</option>
            </select>
          </Field>

          {/* Notes */}
          <Field label="Notes">
            <textarea
              rows={3} placeholder="Extra details about this lead..."
              value={form.notes} onChange={(e) => set("notes", e.target.value)}
              className={`${inputCls} resize-none`}
            />
          </Field>

          {/* Error message (only shown if save fails) */}
          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{saveError}</p>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit" disabled={saving}
              className="flex-1 sm:flex-none sm:px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <Link
              href={`/leads/${lead.id}`}
              className="flex-1 sm:flex-none sm:px-8 py-3 text-center border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors"
            >
              Cancel
            </Link>
          </div>

        </form>
      </div>
    </div>
  );
}

// ── Small helper components ────────────────────────────────────────────────────

// Field = a label + input wrapper — keeps the form tidy
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

// Shared input/select/textarea style — one place to change the look of every field
const inputCls =
  "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white";

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}
