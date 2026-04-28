// app/(dashboard)/leads/[id]/page.tsx — Lead detail view
// Shows all info about a single lead

import Link from "next/link";
import { notFound } from "next/navigation";
import { mockLeads, formatPrice } from "../../../../lib/mock-data";
import { Lead, LeadStage } from "../../../../lib/types";

const stageBadge: Record<LeadStage, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  viewing: "bg-purple-100 text-purple-700",
  negotiating: "bg-orange-100 text-orange-700",
  closed: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  // TODO: fetch from Supabase by id
  const lead = mockLeads.find((l) => l.id === id);

  if (!lead) notFound();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/leads" className="text-gray-400 hover:text-gray-600 transition-colors">
          <BackIcon />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
          <p className="text-gray-500 text-sm">Lead details</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize ${stageBadge[lead.stage]}`}>
          {lead.stage}
        </span>
      </div>

      {/* Detail card */}
      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        <Section title="Contact">
          <Row label="Phone" value={lead.phone} />
          <Row label="Email" value={lead.email || "—"} />
        </Section>

        <Section title="Requirements">
          <Row label="Location" value={lead.location} />
          <Row
            label="Budget"
            value={`${formatPrice(lead.budget_min)} – ${formatPrice(lead.budget_max)}`}
          />
          <Row label="Source" value={<span className="capitalize">{lead.source}</span>} />
        </Section>

        <Section title="Notes">
          <p className="text-sm text-gray-700 leading-relaxed px-6 py-4">
            {lead.notes || "No notes added."}
          </p>
        </Section>

        <Section title="Meta">
          <Row label="Added on" value={new Date(lead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />
          <Row label="Lead ID" value={`#${lead.id}`} />
        </Section>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button className="flex-1 sm:flex-none sm:px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
          Edit Lead
        </button>
        <button className="flex-1 sm:flex-none sm:px-8 py-3 border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium rounded-xl transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wider font-medium px-6 pt-4 pb-1">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-6 py-3">
      <span className="text-sm text-gray-500">{label}</span>
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
