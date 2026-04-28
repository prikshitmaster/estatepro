// app/(dashboard)/clients/[id]/edit/page.tsx — Edit an existing client
//
// 🧠 WHAT THIS PAGE DOES (explain like I'm 5):
//    When you click "Edit Client" on the detail page, this page opens.
//    It loads the client's CURRENT data and pre-fills the form.
//    You change whatever you want, then click "Save Changes".
//    It updates the record in Supabase and takes you back to the detail page.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getClientById, updateClient } from "@/lib/db/clients";
import { Client, ClientType } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditClientPage({ params }: Props) {
  const router = useRouter();

  const [client, setClient]       = useState<Client | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");

  // form = the fields shown in the input boxes
  // Starts empty, gets filled once we load the client from Supabase
  const [form, setForm] = useState({
    name:        "",
    phone:       "",
    email:       "",
    type:        "buyer" as ClientType,
    notes:       "",
    total_deals: "0",
  });

  // ── Load the client from Supabase and pre-fill the form ──────────────────
  useEffect(() => {
    async function fetchClient() {
      const { id } = await params;
      const data = await getClientById(id);

      if (data) {
        setClient(data);
        // Pre-fill every field with the current saved values
        setForm({
          name:        data.name,
          phone:       data.phone,
          email:       data.email,
          type:        data.type,
          notes:       data.notes,
          total_deals: String(data.total_deals),
        });
      }
      setLoading(false);
    }
    fetchClient();
  }, []);

  // Helper: update one field in the form object
  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Called when user clicks "Save Changes"
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return;
    setSaveError("");
    setSaving(true);

    try {
      await updateClient(client.id, {
        name:        form.name.trim(),
        phone:       form.phone.trim(),
        email:       form.email.trim(),
        type:        form.type,
        notes:       form.notes.trim(),
        total_deals: parseInt(form.total_deals) || 0,
      });
      // Go back to the detail page after saving
      router.push(`/clients/${client.id}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes.");
      setSaving(false);
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!client) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-20">
        <p className="text-gray-400">Client not found.</p>
        <Link href="/clients" className="text-blue-600 text-sm mt-2 block hover:underline">
          ← Back
        </Link>
      </div>
    );
  }

  // ── Edit form ─────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 sm:pb-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/clients/${client.id}`} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
          <BackIcon />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900">Edit Client</h1>
          <p className="text-gray-400 text-sm truncate">{client.name}</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <Field label="Full Name *">
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inp}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone *">
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inp}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inp}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Client Type *">
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
              <input
                type="number"
                min="0"
                value={form.total_deals}
                onChange={(e) => set("total_deals", e.target.value)}
                className={inp}
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className={`${inp} resize-none`}
            />
          </Field>

          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{saveError}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 sm:flex-none sm:px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <Link
              href={`/clients/${client.id}`}
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

const inp = "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white";

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}
