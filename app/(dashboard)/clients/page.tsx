// app/(dashboard)/clients/page.tsx — Clients list
//
// 🧠 WHAT THIS PAGE DOES (explain like I'm 5):
//    Shows all your saved clients — people you've actually done deals with.
//    Different from Leads (people who just enquired):
//      Lead  = "Hi, I'm interested in buying a flat" (might not buy)
//      Client = "I bought 2 flats from you, I trust you" (already a customer)
//
//    This page lets you:
//      - See ALL your clients in a list
//      - Search by name, phone, or location
//      - Filter by type: Buyer / Seller / Both
//      - Click a client to see their full details
//      - Click "Add Client" to add a new one
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAllClients } from "@/lib/db/clients";
import { Client, ClientType } from "@/lib/types";

// ── Colors for the avatar circles (same pattern as leads page) ────────────────
const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-green-500",
  "bg-amber-500", "bg-rose-500",  "bg-cyan-500",
];

// ── Badge style for each client type ─────────────────────────────────────────
// buyer = blue, seller = green, both = purple
const TYPE_STYLE: Record<ClientType, string> = {
  buyer:  "bg-blue-50 text-blue-600",
  seller: "bg-green-50 text-green-700",
  both:   "bg-violet-50 text-violet-600",
};

// ── Filter tabs at the top ────────────────────────────────────────────────────
const typeFilters: { label: string; value: ClientType | "all" }[] = [
  { label: "All",    value: "all"    },
  { label: "Buyers", value: "buyer"  },
  { label: "Sellers",value: "seller" },
  { label: "Both",   value: "both"   },
];

// ── Helper: get initials from a name ─────────────────────────────────────────
// e.g. "Rohan Mehta" → "RM"
function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

export default function ClientsPage() {
  // clients = the list from Supabase (starts empty, fills after fetch)
  const [clients, setClients]         = useState<Client[]>([]);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState("");
  const [search, setSearch]           = useState("");
  const [activeType, setActiveType]   = useState<ClientType | "all">("all");

  // ── Load clients from Supabase when page opens ────────────────────────────
  useEffect(() => {
    async function fetchClients() {
      try {
        const data = await getAllClients();
        setClients(data);
      } catch (err) {
        setFetchError("Could not load clients. Check your Supabase setup.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchClients();
  }, []); // [] = run only once when the page first loads

  // ── Filter: combine search text + type tab ────────────────────────────────
  // Every time search or activeType changes, this recalculates
  const filtered = clients.filter((client) => {
    const matchesType   = activeType === "all" || client.type === activeType;
    const q             = search.toLowerCase();
    const matchesSearch = !q ||
      client.name.toLowerCase().includes(q)  ||
      client.phone.includes(q)               ||
      client.email.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24 sm:pb-6">

      {/* ── Header: title + Add Client button ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading ? "Loading..." : `${clients.length} total clients`}
          </p>
        </div>
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <PlusIcon />
          Add Client
        </Link>
      </div>

      {/* ── Error banner ── */}
      {fetchError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {fetchError}
        </div>
      )}

      {/* ── Search box + type filter tabs ── */}
      <div className="flex flex-col gap-3 mb-5">
        <input
          type="text"
          placeholder="Search by name, phone or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-sm px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {typeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveType(f.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeType === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading skeleton ── */}
      {/* While waiting for Supabase, show grey placeholder boxes */}
      {loading && (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/3" />
                <div className="h-2.5 bg-gray-100 rounded w-1/2" />
              </div>
              <div className="h-5 bg-gray-200 rounded-full w-16" />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          {clients.length === 0
            ? "No clients yet. Add your first client!"
            : "No clients match your search."}
        </div>
      )}

      {/* ── Desktop table ── */}
      {!loading && filtered.length > 0 && (
        <>
          {/* Table — shown on medium screens and above */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-left">
                  <th className="px-5 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Client</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Phone</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide">Deals Done</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((client, i) => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">

                    {/* Name + email */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                          {initials(client.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{client.name}</p>
                          <p className="text-xs text-gray-400">{client.email || "—"}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-500">{client.phone}</td>

                    {/* Type badge */}
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${TYPE_STYLE[client.type]}`}>
                        {client.type}
                      </span>
                    </td>

                    {/* Total deals — shows a trophy if they have 3+ deals */}
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                      {client.total_deals > 0 ? (
                        <span className="flex items-center gap-1">
                          {client.total_deals >= 3 && <span className="text-amber-400">★</span>}
                          {client.total_deals}
                        </span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>

                    {/* View button */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/clients/${client.id}`}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ── */}
          {/* On small screens, show cards instead of the table */}
          <div className="md:hidden flex flex-col gap-3">
            {filtered.map((client, i) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 hover:shadow-sm transition-shadow"
              >
                {/* Avatar circle */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                  {initials(client.name)}
                </div>

                {/* Name + phone */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{client.name}</p>
                  <p className="text-xs text-gray-400">{client.phone}</p>
                  {client.total_deals > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {client.total_deals >= 3 && "★ "}
                      {client.total_deals} deal{client.total_deals !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                {/* Type badge */}
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize shrink-0 ${TYPE_STYLE[client.type]}`}>
                  {client.type}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
