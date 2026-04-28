// app/(dashboard)/clients/[id]/page.tsx — View one client's full details
//
// 🧠 WHAT THIS PAGE DOES (explain like I'm 5):
//    When you click "View" on the clients list, this page opens.
//    It shows everything about that one client:
//      - Their name, phone, email
//      - Type: buyer / seller / both
//      - How many deals done
//      - Any notes you wrote
//    Two buttons at the bottom:
//      1. "Edit Client" → go to /clients/[id]/edit
//      2. "Delete"      → ask "are you sure?" then permanently remove
//
//    [id] in the URL is the unique Supabase ID for this client, e.g.:
//    /clients/abc123  →  loads client with id "abc123"
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getClientById, deleteClient } from "@/lib/db/clients";
import { Client, ClientType } from "@/lib/types";

// ── Badge color for each client type ─────────────────────────────────────────
const TYPE_STYLE: Record<ClientType, string> = {
  buyer:  "bg-blue-50 text-blue-600",
  seller: "bg-green-50 text-green-700",
  both:   "bg-violet-50 text-violet-600",
};

// ── Props: Next.js passes { params } which holds the [id] from the URL ────────
// In Next.js App Router, params is a Promise — we must await it
interface Props {
  params: Promise<{ id: string }>;
}

export default function ClientDetailPage({ params }: Props) {
  const router = useRouter();

  const [client, setClient]             = useState<Client | null>(null);
  const [loading, setLoading]           = useState(true);
  const [notFound, setNotFound]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false); // show "are you sure?" box
  const [deleting, setDeleting]         = useState(false);

  // ── Fetch the client from Supabase when page opens ────────────────────────
  useEffect(() => {
    async function fetchClient() {
      const { id } = await params; // get the id from the URL
      const data = await getClientById(id);

      if (!data) {
        setNotFound(true);
      } else {
        setClient(data);
      }
      setLoading(false);
    }
    fetchClient();
  }, []); // [] = run once

  // ── Delete handler ────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!client) return;
    setDeleting(true);
    await deleteClient(client.id);
    router.push("/clients"); // go back to the list after deleting
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded w-full" />
          ))}
        </div>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (notFound || !client) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-20">
        <p className="text-gray-400 text-lg">Client not found.</p>
        <Link href="/clients" className="text-blue-600 text-sm mt-2 block hover:underline">
          ← Back to clients
        </Link>
      </div>
    );
  }

  // ── Main detail page ──────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 sm:pb-6">

      {/* Header: back button + name + type badge */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clients" className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
          <BackIcon />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{client.name}</h1>
          <p className="text-gray-400 text-sm">Client details</p>
        </div>
        {/* Type badge in the top-right corner */}
        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize shrink-0 ${TYPE_STYLE[client.type]}`}>
          {client.type}
        </span>
      </div>

      {/* ── Details card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">

        {/* Contact Info section */}
        <Section title="Contact Info">
          <Row label="Phone"  value={<a href={`tel:${client.phone}`} className="text-blue-600 font-medium">{client.phone}</a>} />
          <Row label="Email"  value={client.email
            ? <a href={`mailto:${client.email}`} className="text-blue-600 font-medium">{client.email}</a>
            : <span className="text-gray-400">—</span>}
          />
        </Section>

        {/* Client Info section */}
        <Section title="Client Info">
          <Row label="Type"       value={<span className="capitalize">{client.type}</span>} />
          <Row label="Deals Done" value={
            <span className="flex items-center gap-1 font-semibold">
              {client.total_deals >= 3 && <span className="text-amber-400">★</span>}
              {client.total_deals}
              {client.total_deals === 0 && <span className="text-gray-400 font-normal ml-1">(no deals yet)</span>}
            </span>
          } />
        </Section>

        {/* Notes section — only shown if there are notes */}
        {client.notes && (
          <Section title="Notes">
            <div className="px-5 py-3">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
            </div>
          </Section>
        )}

        {/* Date added */}
        {client.created_at && (
          <Section title="Info">
            <Row
              label="Added on"
              value={new Date(client.created_at).toLocaleDateString("en-IN", {
                day: "numeric", month: "long", year: "numeric"
              })}
            />
          </Section>
        )}

      </div>

      {/* ── Action buttons ── */}
      <div className="mt-5 flex flex-col gap-3">

        {/* Edit button */}
        <Link
          href={`/clients/${client.id}/edit`}
          className="w-full py-3 text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Edit Client
        </Link>

        {/* Delete button — first click shows confirmation, second click actually deletes */}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full py-3 border border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500 text-sm font-medium rounded-xl transition-colors"
          >
            Delete Client
          </button>
        ) : (
          // Confirmation box — shown after first "Delete" click
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700 font-medium mb-3">
              ⚠️ Are you sure? This will permanently delete <strong>{client.name}</strong>.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {deleting ? "Deleting..." : "Yes, delete"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Small layout helpers ───────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium px-5 pt-4 pb-1">
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 gap-4">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right">{value}</span>
    </div>
  );
}

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}
