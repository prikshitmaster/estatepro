// app/(dashboard)/leads/page.tsx — Leads list with filter by stage
"use client";

import { useState } from "react";
import Link from "next/link";
import { mockLeads, formatPrice } from "../../../lib/mock-data";
import { Lead, LeadStage } from "../../../lib/types";

const stageBadge: Record<LeadStage, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  viewing: "bg-purple-100 text-purple-700",
  negotiating: "bg-orange-100 text-orange-700",
  closed: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

const stageFilters: { label: string; value: LeadStage | "all" }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Viewing", value: "viewing" },
  { label: "Negotiating", value: "negotiating" },
  { label: "Closed", value: "closed" },
  { label: "Lost", value: "lost" },
];

export default function LeadsPage() {
  const [activeStage, setActiveStage] = useState<LeadStage | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = mockLeads.filter((lead) => {
    const matchesStage = activeStage === "all" || lead.stage === activeStage;
    const query = search.toLowerCase();
    const matchesSearch =
      !query ||
      lead.name.toLowerCase().includes(query) ||
      lead.location.toLowerCase().includes(query) ||
      lead.phone.includes(query);
    return matchesStage && matchesSearch;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 text-sm mt-0.5">{mockLeads.length} total leads</p>
        </div>
        <Link
          href="/leads/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <PlusIcon />
          Add Lead
        </Link>
      </div>

      {/* Search + stage filters */}
      <div className="flex flex-col gap-3 mb-5">
        <input
          type="text"
          placeholder="Search by name, location or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-sm px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {/* Stage filter pills — horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {stageFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveStage(f.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeStage === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leads — table on desktop, cards on mobile */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No leads found.</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-3 font-medium">Lead</th>
                  <th className="px-6 py-3 font-medium">Location</th>
                  <th className="px-6 py-3 font-medium">Budget</th>
                  <th className="px-6 py-3 font-medium">Source</th>
                  <th className="px-6 py-3 font-medium">Stage</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/leads/${lead.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {lead.name}
                      </Link>
                      <div className="text-gray-400 text-xs">{lead.email}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{lead.location}</td>
                    <td className="px-6 py-4 text-gray-600 text-xs">
                      {formatPrice(lead.budget_min)} – {formatPrice(lead.budget_max)}
                    </td>
                    <td className="px-6 py-4 text-gray-600 capitalize">{lead.source}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${stageBadge[lead.stage]}`}>
                        {lead.stage}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {filtered.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Mobile card for a single lead
function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Link href={`/leads/${lead.id}`} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-start justify-between hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{lead.name}</p>
        <p className="text-gray-400 text-xs mt-0.5">{lead.phone}</p>
        <p className="text-gray-500 text-xs mt-1">{lead.location}</p>
        <p className="text-gray-500 text-xs">
          {formatPrice(lead.budget_min)} – {formatPrice(lead.budget_max)}
        </p>
      </div>
      <span className={`ml-3 px-2.5 py-1 rounded-full text-xs font-medium capitalize shrink-0 ${stageBadge[lead.stage]}`}>
        {lead.stage}
      </span>
    </Link>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
