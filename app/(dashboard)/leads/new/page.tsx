// app/(dashboard)/leads/new/page.tsx — Add new lead form
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LeadSource, LeadStage } from "../../../../lib/types";

export default function NewLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    source: "website" as LeadSource,
    budget_min: "",
    budget_max: "",
    location: "",
    stage: "new" as LeadStage,
    notes: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // TODO: save to Supabase leads table
    await new Promise((r) => setTimeout(r, 500));
    // Mock success — go back to leads list
    router.push("/leads");
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/leads" className="text-gray-400 hover:text-gray-600 transition-colors">
          <BackIcon />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Lead</h1>
          <p className="text-gray-500 text-sm">Fill in the lead&apos;s details</p>
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name *">
              <input
                required
                type="text"
                placeholder="Rahul Sharma"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Phone *">
              <input
                required
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          {/* Email + Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email">
              <input
                type="email"
                placeholder="rahul@example.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Source">
              <select value={form.source} onChange={(e) => set("source", e.target.value)} className={inputClass}>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="social">Social Media</option>
                <option value="walk-in">Walk-in</option>
                <option value="ad">Ad</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>

          {/* Budget min + max */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Budget Min (₹)">
              <input
                type="number"
                placeholder="3000000"
                value={form.budget_min}
                onChange={(e) => set("budget_min", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Budget Max (₹)">
              <input
                type="number"
                placeholder="8000000"
                value={form.budget_max}
                onChange={(e) => set("budget_max", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          {/* Location + Stage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Location *">
              <input
                required
                type="text"
                placeholder="Bandra, Mumbai"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Stage">
              <select value={form.stage} onChange={(e) => set("stage", e.target.value)} className={inputClass}>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="viewing">Viewing</option>
                <option value="negotiating">Negotiating</option>
                <option value="closed">Closed</option>
                <option value="lost">Lost</option>
              </select>
            </Field>
          </div>

          {/* Notes */}
          <Field label="Notes">
            <textarea
              rows={3}
              placeholder="Any extra details about this lead..."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </Field>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-none sm:px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {loading ? "Saving..." : "Save Lead"}
            </button>
            <Link
              href="/leads"
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

// Reusable form field wrapper
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white";

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}
