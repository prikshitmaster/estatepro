// app/(dashboard)/properties/page.tsx — Properties listing
"use client";

import { useState } from "react";
import Link from "next/link";
import { mockProperties, formatPrice } from "../../../lib/mock-data";
import { Property, PropertyStatus } from "../../../lib/types";

const statusBadge: Record<PropertyStatus, string> = {
  available: "bg-green-100 text-green-700",
  sold: "bg-gray-100 text-gray-500",
  rented: "bg-blue-100 text-blue-700",
  "off-market": "bg-yellow-100 text-yellow-700",
};

const statusFilters: { label: string; value: PropertyStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Available", value: "available" },
  { label: "Sold", value: "sold" },
  { label: "Rented", value: "rented" },
  { label: "Off Market", value: "off-market" },
];

export default function PropertiesPage() {
  const [activeStatus, setActiveStatus] = useState<PropertyStatus | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = mockProperties.filter((p) => {
    const matchesStatus = activeStatus === "all" || p.status === activeStatus;
    const query = search.toLowerCase();
    const matchesSearch =
      !query || p.title.toLowerCase().includes(query) || p.location.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-500 text-sm mt-0.5">{mockProperties.length} total properties</p>
        </div>
        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
          <PlusIcon />
          Add Property
        </button>
      </div>

      {/* Search + status filter */}
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

      {/* Properties grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No properties found.</div>
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

function PropertyCard({ property }: { property: Property }) {
  const typeLabel: Record<Property["type"], string> = {
    apartment: "Apartment",
    villa: "Villa",
    plot: "Plot",
    commercial: "Commercial",
    office: "Office",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      {/* Type + status */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">
          {typeLabel[property.type]}
        </span>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusBadge[property.status]}`}>
          {property.status}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-gray-900 text-sm leading-snug">{property.title}</h3>

      {/* Location */}
      <div className="flex items-center gap-1.5 text-gray-500 text-xs">
        <PinIcon />
        {property.location}
      </div>

      {/* Price */}
      <p className="text-blue-600 font-bold text-base">{formatPrice(property.price)}</p>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button className="flex-1 py-2 text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
          Edit
        </button>
        <button className="flex-1 py-2 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors">
          View Details
        </button>
      </div>
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

function PinIcon() {
  return (
    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
