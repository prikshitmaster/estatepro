// app/(dashboard)/leads/new/page.tsx — Add Lead form, saves to Supabase
//
// 🧠 HOW THIS WORKS:
//    - User fills in the form fields
//    - Clicks "Save Lead"
//    - We send the data to Supabase (addLead function)
//    - Supabase saves it to the leads table
//    - We redirect to /leads to see the new lead in the list
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addLead, getAllLeads } from "@/lib/db/leads";
import { supabase } from "@/lib/supabase";
import { Lead, LeadSource, LeadStage } from "@/lib/types";

export default function NewLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [duplicate, setDuplicate] = useState<{ id: string; name: string; phone: string } | null>(null);

  // One state object holding ALL form fields
  // This is cleaner than having 9 separate useState calls
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

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "phone") setDuplicate(null);
  }

  async function checkDuplicate(phone: string) {
    if (phone.replace(/\D/g, "").length < 7) return;
    try {
      const leads = await getAllLeads();
      const norm = phone.replace(/\D/g, "");
      const match = leads.find((l) => l.phone.replace(/\D/g, "") === norm);
      setDuplicate(match ? { id: match.id, name: match.name, phone: match.phone } : null);
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError("");
    setLoading(true);

    try {
      // Get the currently logged-in user from Supabase
      // We need user_id to know WHOSE lead this is
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Not logged in — redirect to login
        router.push("/login");
        return;
      }

      // Build the lead object to save
      // Numbers: parseInt converts the string from the input to a real number
      await addLead({
        user_id:           user.id,
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

      // Saved successfully! Go back to the leads list
      router.push("/leads");

    } catch (err) {
      // Show the error if save failed
      setSaveError(err instanceof Error ? err.message : "Failed to save lead.");
      setLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 sm:pb-6">

      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/leads" className="text-gray-400 hover:text-gray-600 transition-colors">
          <BackIcon />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Add Lead</h1>
          <p className="text-gray-400 text-sm">Fill in the lead&apos;s details below</p>
        </div>
      </div>

      {/* Duplicate warning */}
      {duplicate && (
        <div className="mb-4 p-4 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-3">
          <span className="text-xl shrink-0">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Possible Duplicate</p>
            <p className="text-xs text-amber-700 mt-0.5">
              A lead with this phone already exists: <strong>{duplicate.name}</strong>
            </p>
          </div>
          <Link href={`/leads/${duplicate.id}`}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-700 text-white hover:bg-amber-800 transition-colors">
            View Lead
          </Link>
        </div>
      )}

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Row 1: Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name *">
              <input required type="text" placeholder="Rahul Sharma"
                value={form.name} onChange={(e) => set("name", e.target.value)}
                className={input} />
            </Field>
            <Field label="Phone *">
              <input required type="tel" placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                onBlur={(e) => checkDuplicate(e.target.value)}
                className={input} />
            </Field>
          </div>

          {/* Row 2: Email + Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email">
              <input type="email" placeholder="rahul@example.com"
                value={form.email} onChange={(e) => set("email", e.target.value)}
                className={input} />
            </Field>
            <Field label="Source">
              <select value={form.source} onChange={(e) => set("source", e.target.value)} className={input}>
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
              <input type="number" placeholder="3000000"
                value={form.budget_min} onChange={(e) => set("budget_min", e.target.value)}
                className={input} />
            </Field>
            <Field label="Budget Max (₹)">
              <input type="number" placeholder="8000000"
                value={form.budget_max} onChange={(e) => set("budget_max", e.target.value)}
                className={input} />
            </Field>
          </div>

          {/* Row 4: Location + Property interest */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Location *">
              <input required type="text" placeholder="Bandra, Mumbai"
                value={form.location} onChange={(e) => set("location", e.target.value)}
                className={input} />
            </Field>
            <Field label="Looking For">
              <select value={form.property_interest} onChange={(e) => set("property_interest", e.target.value)} className={input}>
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

          {/* Row 5: Stage */}
          <Field label="Stage">
            <select value={form.stage} onChange={(e) => set("stage", e.target.value)} className={input}>
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
            <textarea rows={3} placeholder="Extra details about this lead..."
              value={form.notes} onChange={(e) => set("notes", e.target.value)}
              className={`${input} resize-none`} />
          </Field>

          {/* Error */}
          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{saveError}</p>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 sm:flex-none sm:px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-colors">
              {loading ? "Saving..." : "Save Lead"}
            </button>
            <Link href="/leads"
              className="flex-1 sm:flex-none sm:px-8 py-3 text-center border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors">
              Cancel
            </Link>
          </div>

        </form>
      </div>
    </div>
  );
}

// Reusable label + input wrapper — keeps the form DRY (Don't Repeat Yourself)
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

// Shared input class string — one place to change the look of all inputs
const input =
  "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white";

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

