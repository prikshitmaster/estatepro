// app/(dashboard)/clients/new/page.tsx — Add a new client
//
// 🧠 WHAT THIS PAGE DOES (explain like I'm 5):
//    This is the form you fill out when you want to save a new client.
//    You type in their name, phone, email, and pick their type (buyer/seller/both).
//    When you click "Save Client", it sends the data to Supabase and saves it.
//    Then it takes you straight to that client's detail page so you can see it saved.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addClient } from "@/lib/db/clients";
import { ClientType } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export default function NewClientPage() {
  const router = useRouter();

  // saving = true while we're waiting for Supabase to save
  const [saving, setSaving]       = useState(false);
  // saveError = any error message to show below the form
  const [saveError, setSaveError] = useState("");

  // form = all the fields the user types into
  // These are the starting (empty) values
  const [form, setForm] = useState({
    name:         "",
    phone:        "",
    email:        "",
    type:         "buyer" as ClientType,
    notes:        "",
    total_deals:  "0",
  });

  // Helper: update one field in the form
  // e.g. set("name", "Rohan") updates just the name field
  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Called when user clicks "Save Client"
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();  // stop the page from refreshing
    setSaveError("");    // clear any old errors
    setSaving(true);     // show "Saving..." on the button

    try {
      // Get the logged-in user's ID from Supabase
      // Every row in the database needs a user_id so each broker only sees their own clients
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in.");

      // Build the client object to save
      // We convert total_deals from a string (from the input) to a number
      const saved = await addClient({
        user_id:      user.id,
        name:         form.name.trim(),
        phone:        form.phone.trim(),
        email:        form.email.trim(),
        type:         form.type,
        notes:        form.notes.trim(),
        total_deals:  parseInt(form.total_deals) || 0,
      });

      // Go to the new client's detail page
      router.push(`/clients/${saved.id}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save client.");
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 sm:pb-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clients" className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
          <BackIcon />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Add Client</h1>
          <p className="text-gray-400 text-sm">Save a repeat buyer or seller</p>
        </div>
      </div>

      {/* ── Form card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Name — required */}
          <Field label="Full Name *">
            <input
              required
              type="text"
              placeholder="e.g. Rohan Mehta"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inp}
            />
          </Field>

          {/* Phone + Email side by side on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone *">
              <input
                required
                type="tel"
                placeholder="e.g. 9876543210"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inp}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                placeholder="e.g. rohan@email.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inp}
              />
            </Field>
          </div>

          {/* Type + Total Deals side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Client Type *">
              {/* Dropdown: buyer / seller / both */}
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className={inp}
              >
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="both">Both (Buys & Sells)</option>
              </select>
            </Field>
            <Field label="Deals Done So Far">
              {/* How many deals have you already done with this person? */}
              <input
                type="number"
                min="0"
                value={form.total_deals}
                onChange={(e) => set("total_deals", e.target.value)}
                className={inp}
              />
            </Field>
          </div>

          {/* Notes — optional */}
          <Field label="Notes">
            <textarea
              rows={3}
              placeholder="e.g. Prefers 3BHK in South Mumbai, budget 1.5–2Cr, very prompt with payments..."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className={`${inp} resize-none`}
            />
          </Field>

          {/* Error message — only shown if save failed */}
          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{saveError}</p>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 sm:flex-none sm:px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {saving ? "Saving..." : "Save Client"}
            </button>
            <Link
              href="/clients"
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

// Field wraps a label + its input together
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

// inp = shared CSS for all inputs/selects/textareas so they look the same
const inp = "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white";

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}
