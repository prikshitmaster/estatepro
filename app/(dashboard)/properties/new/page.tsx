// app/(dashboard)/properties/new/page.tsx — Add a new property
//
// 🧠 WHAT THIS PAGE DOES:
//    When a broker wants to list a new property (apartment, villa, etc.)
//    they fill in this form and click "Save Property".
//    The property gets saved to Supabase and shows up on the Properties page.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addProperty } from "@/lib/db/properties";
import { supabase } from "@/lib/supabase";
import { PropertyType, PropertyStatus } from "@/lib/types";

export default function NewPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [form, setForm] = useState({
    title:    "",
    type:     "apartment" as PropertyType,
    location: "",
    price:    "",
    status:   "available" as PropertyStatus,
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError("");
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      await addProperty({
        user_id:  user.id,
        title:    form.title,
        type:     form.type,
        location: form.location,
        price:    parseInt(form.price) || 0,
        status:   form.status,
      });

      router.push("/properties");

    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save property.");
      setLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 sm:pb-6">

      <div className="flex items-center gap-3 mb-6">
        <Link href="/properties" className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
          <BackIcon />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Add Property</h1>
          <p className="text-gray-400 text-sm">Fill in the property details below</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <Field label="Property Title *">
            <input
              required type="text" placeholder='e.g. "Sea-View 3BHK — Bandra West"'
              value={form.title} onChange={(e) => set("title", e.target.value)}
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Type">
              <select value={form.type} onChange={(e) => set("type", e.target.value)} className={inputCls}>
                <option value="apartment">Apartment</option>
                <option value="villa">Villa</option>
                <option value="plot">Plot</option>
                <option value="commercial">Commercial</option>
                <option value="office">Office</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
                <option value="available">Available</option>
                <option value="sold">Sold</option>
                <option value="rented">Rented</option>
                <option value="off-market">Off Market</option>
              </select>
            </Field>
          </div>

          <Field label="Location *">
            <input
              required type="text" placeholder="Bandra West, Mumbai"
              value={form.location} onChange={(e) => set("location", e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Price (₹) *">
            <input
              required type="number" placeholder="12500000"
              value={form.price} onChange={(e) => set("price", e.target.value)}
              className={inputCls}
            />
          </Field>

          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{saveError}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit" disabled={loading}
              className="flex-1 sm:flex-none sm:px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {loading ? "Saving..." : "Save Property"}
            </button>
            <Link
              href="/properties"
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white";

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}
