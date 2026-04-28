// app/(dashboard)/leads/[id]/page.tsx — View a single lead's full details
//
// 🧠 WHAT THIS PAGE DOES (simple explanation):
//    When you click a lead's name anywhere in the app, it opens THIS page.
//    The [id] in the folder name is a placeholder — it gets replaced with the
//    actual lead id from the URL. For example:
//       URL: /leads/abc123   →   id = "abc123"   →   fetch lead where id = "abc123"
//
//    This page also has two buttons:
//    1. "Edit Lead"  → goes to /leads/[id]/edit (a form pre-filled with this lead's data)
//    2. "Delete"     → asks "Are you sure?" then permanently removes the lead
//
// "use client" is needed because we use useState (for delete confirmation) and useEffect (to fetch data)
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getLeadById, deleteLead } from "@/lib/db/leads";
import { formatPrice } from "@/lib/mock-data";
import { Lead, LeadStage } from "@/lib/types";

// Colour for each stage badge (same as other pages — consistent look)
const STAGE_STYLE: Record<LeadStage, string> = {
  new:         "bg-blue-50 text-blue-600",
  contacted:   "bg-amber-50 text-amber-600",
  viewing:     "bg-violet-50 text-violet-600",
  negotiating: "bg-orange-50 text-orange-600",
  closed:      "bg-green-50 text-green-600",
  lost:        "bg-red-50 text-red-600",
};

// The page receives `params` — Next.js gives us the [id] from the URL
interface Props {
  params: Promise<{ id: string }>;
}

export default function LeadDetailPage({ params }: Props) {
  const router = useRouter();

  // The lead we fetched from Supabase — starts as null while loading
  const [lead, setLead]             = useState<Lead | null>(null);

  // loading = true while we're waiting for Supabase
  const [loading, setLoading]       = useState(true);

  // notFound = true if no lead exists with this id
  const [notFound, setNotFound]     = useState(false);

  // confirmDelete = false by default
  // When user clicks "Delete", it becomes true → shows the "Are you sure?" warning
  const [confirmDelete, setConfirmDelete] = useState(false);

  // deleting = true while we're waiting for Supabase to delete the lead
  const [deleting, setDeleting]     = useState(false);

  // When the page loads, get the id from the URL params, then fetch the lead
  useEffect(() => {
    async function fetchLead() {
      // params is a Promise in Next.js 16 — we must await it to get the id
      const { id } = await params;

      const data = await getLeadById(id); // ask Supabase for this specific lead

      if (!data) {
        setNotFound(true); // no lead found with this id
      } else {
        setLead(data); // save the lead so we can show it
      }
      setLoading(false);
    }
    fetchLead();
  }, []); // [] = run once when page loads

  // Called when the user confirms the delete
  async function handleDelete() {
    if (!lead) return;
    setDeleting(true);
    await deleteLead(lead.id); // permanently remove from Supabase
    router.push("/leads");     // go back to the leads list
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded w-full" />
          ))}
        </div>
      </div>
    );
  }

  // ── Not found state ──
  if (notFound || !lead) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-20">
        <p className="text-gray-400 text-lg">Lead not found.</p>
        <Link href="/leads" className="text-blue-600 text-sm mt-2 block hover:underline">← Back to leads</Link>
      </div>
    );
  }

  // ── Main view ──
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 sm:pb-6">

      {/* Header: back arrow + name + stage badge */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/leads" className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
          <BackIcon />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{lead.name}</h1>
          <p className="text-gray-400 text-sm">Lead details</p>
        </div>
        {/* Stage badge */}
        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize shrink-0 ${STAGE_STYLE[lead.stage]}`}>
          {lead.stage}
        </span>
      </div>

      {/* Details card */}
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">

        {/* Contact section */}
        <Section title="Contact">
          <Row label="Phone"  value={<a href={`tel:${lead.phone}`} className="text-blue-600">{lead.phone}</a>} />
          <Row label="Email"  value={lead.email ? <a href={`mailto:${lead.email}`} className="text-blue-600">{lead.email}</a> : "—"} />
        </Section>

        {/* What they are looking for */}
        <Section title="Requirements">
          <Row label="Location"        value={lead.location ?? "—"} />
          <Row label="Looking for"     value={lead.property_interest ?? "—"} />
          <Row label="Budget"          value={`${formatPrice(lead.budget_min)} – ${formatPrice(lead.budget_max)}`} />
          <Row label="Source"          value={<span className="capitalize">{lead.source}</span>} />
        </Section>

        {/* Notes */}
        <Section title="Notes">
          <p className="text-sm text-gray-700 leading-relaxed px-5 py-4">
            {lead.notes || <span className="text-gray-400 italic">No notes added.</span>}
          </p>
        </Section>

        {/* Meta info */}
        <Section title="Info">
          <Row label="Added on" value={new Date(lead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />
        </Section>
      </div>

      {/* ── Action buttons ── */}
      <div className="mt-5 flex flex-col gap-3">

        {/* Edit button — goes to the edit page */}
        <Link
          href={`/leads/${lead.id}/edit`}
          className="w-full py-3 text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Edit Lead
        </Link>

        {/* Delete section */}
        {!confirmDelete ? (
          // Step 1: Show the "Delete" button normally
          <button
            onClick={() => setConfirmDelete(true)} // clicking this shows the confirmation
            className="w-full py-3 border border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500 text-sm font-medium rounded-xl transition-colors"
          >
            Delete Lead
          </button>
        ) : (
          // Step 2: Show the "Are you sure?" confirmation box
          // This only appears AFTER the user clicks "Delete Lead"
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700 font-medium mb-3">
              ⚠️ Are you sure? This will permanently delete <strong>{lead.name}</strong> and cannot be undone.
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
                onClick={() => setConfirmDelete(false)} // cancel → go back to normal
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

// ── Small reusable helper components ─────────────────────────────────────────

// Section = a titled group of rows (like "Contact", "Requirements")
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

// Row = one label + value pair inside a section
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
