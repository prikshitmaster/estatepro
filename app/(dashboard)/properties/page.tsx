// app/(dashboard)/properties/page.tsx — Properties listing
//
// 🧠 WHAT THIS PAGE DOES (simple explanation):
//    Shows all your properties — apartments, villas, plots, etc.
//    Before this update, it was showing FAKE data from mock-data.ts.
//    NOW it shows REAL data from Supabase (your actual database).
//
//    When the page opens:
//      1. "loading" starts as true — we show a skeleton (grey boxes)
//      2. We ask Supabase: "give me all properties for this user"
//      3. Supabase sends back the real list
//      4. We display them as cards
//
//    You can also:
//      - Search by title or location
//      - Filter by status: available / sold / rented / off-market
//      - Click "Add Property" to add a new one
//
// "use client" is needed because we use useState and useEffect
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllProperties } from "@/lib/db/properties"; // real Supabase function
import { formatPrice } from "@/lib/mock-data";          // just the helper, no mock data
import { Property, PropertyStatus } from "@/lib/types";

// ── Badge colours for each status ────────────────────────────────────────────
const statusBadge: Record<PropertyStatus, string> = {
  available:    "bg-green-100 text-green-700",
  sold:         "bg-gray-100 text-gray-500",
  rented:       "bg-blue-100 text-blue-700",
  "off-market": "bg-yellow-100 text-yellow-700",
};

// ── Filter buttons at the top ─────────────────────────────────────────────────
const statusFilters: { label: string; value: PropertyStatus | "all" }[] = [
  { label: "All",        value: "all" },
  { label: "Available",  value: "available" },
  { label: "Sold",       value: "sold" },
  { label: "Rented",     value: "rented" },
  { label: "Off Market", value: "off-market" },
];

export default function PropertiesPage() {
  // ── State ──────────────────────────────────────────────────────────────────

  // properties = the real list we get from Supabase
  // Starts as empty [] — gets filled after Supabase responds
  const [properties, setProperties] = useState<Property[]>([]);

  // loading = true while waiting for Supabase
  const [loading, setLoading] = useState(true);

  // error = any error message from Supabase
  const [error, setError] = useState("");

  // search = what the user typed in the search box
  const [search, setSearch] = useState("");

  // activeStatus = which filter tab is selected
  const [activeStatus, setActiveStatus] = useState<PropertyStatus | "all">("all");

  // ── Fetch from Supabase on page load ──────────────────────────────────────
  useEffect(() => {
    async function fetchProperties() {
      try {
        // Ask Supabase for all properties — this replaces mockProperties
        const data = await getAllProperties();
        setProperties(data);
      } catch (err) {
        // Something went wrong — save the error message to show the user
        setError(err instanceof Error ? err.message : "Failed to load properties.");
      } finally {
        // Whether it worked or not, stop showing the loading skeleton
        setLoading(false);
      }
    }
    fetchProperties();
  }, []); // [] = run once when the page first loads

  // ── Filter the list based on search + status tab ──────────────────────────
  // This runs every time `properties`, `search`, or `activeStatus` changes
  const filtered = properties.filter((p) => {
    const matchesStatus = activeStatus === "all" || p.status === activeStatus;
    const query = search.toLowerCase();
    const matchesSearch =
      !query ||
      p.title.toLowerCase().includes(query) ||
      p.location.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  // ── Loading skeleton ──────────────────────────────────────────────────────
  // Shows grey animated boxes while waiting for Supabase
  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="space-y-2 animate-pulse">
            <div className="h-7 bg-gray-200 rounded w-32" />
            <div className="h-4 bg-gray-100 rounded w-24" />
          </div>
          <div className="h-10 bg-gray-200 rounded-xl w-36 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="h-5 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
              <div className="h-6 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-red-700 font-medium">Could not load properties</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // ── Main page ─────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24 sm:pb-6">

      {/* Header row: title + "Add Property" button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          {/* Shows real count from Supabase, not a hardcoded number */}
          <p className="text-gray-500 text-sm mt-0.5">{properties.length} total properties</p>
        </div>
        {/* Link to Add Property page — we'll build this next */}
        <Link
          href="/properties/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <PlusIcon />
          Add Property
        </Link>
      </div>

      {/* Search input + status filter tabs */}
      <div className="flex flex-col gap-3 mb-5">
        <input
          type="text"
          placeholder="Search by title or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-sm px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveStatus(f.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeStatus === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Properties grid — cards or empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {properties.length === 0
            ? "No properties yet. Click \"Add Property\" to add your first one."
            : "No properties match your search."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Property card component ───────────────────────────────────────────────────
// One card = one property. Shows type, status badge, title, location, price.
function PropertyCard({ property }: { property: Property }) {
  const typeLabel: Record<Property["type"], string> = {
    apartment: "Apartment",
    villa:     "Villa",
    plot:      "Plot",
    commercial:"Commercial",
    office:    "Office",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">

      {/* Type label + status badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">
          {typeLabel[property.type]}
        </span>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusBadge[property.status]}`}>
          {property.status}
        </span>
      </div>

      {/* Property title */}
      <h3 className="font-semibold text-gray-900 text-sm leading-snug">{property.title}</h3>

      {/* Location with pin icon */}
      <div className="flex items-center gap-1.5 text-gray-500 text-xs">
        <PinIcon />
        {property.location}
      </div>

      {/* Price in INR shorthand e.g. ₹1.2Cr */}
      <p className="text-blue-600 font-bold text-base">{formatPrice(property.price)}</p>

      {/* Action buttons — coming in next update, shown as disabled so nothing breaks */}
      <div className="flex gap-2 pt-1">
        <button
          disabled
          title="Edit — coming soon"
          className="flex-1 py-2 text-xs font-medium border border-gray-100 text-gray-300 rounded-xl cursor-not-allowed"
        >
          Edit
        </button>
        <button
          disabled
          title="View Details — coming soon"
          className="flex-1 py-2 text-xs font-medium bg-gray-50 text-gray-300 rounded-xl cursor-not-allowed"
        >
          View Details
        </button>
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
