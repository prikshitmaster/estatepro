// app/(dashboard)/properties/[id]/page.tsx — View a single property's details
//
// 🧠 WHAT THIS PAGE DOES:
//    When you click "View Details" on a property card, this page opens.
//    It shows everything about that property — title, type, location, price, status.
//    Two buttons:
//      1. "Edit Property" → go to /properties/[id]/edit
//      2. "Delete"        → confirm then permanently remove
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { deleteProperty } from "@/lib/db/properties";
import { formatPrice } from "@/lib/mock-data";
import { Property, PropertyStatus } from "@/lib/types";

const STATUS_STYLE: Record<PropertyStatus, string> = {
  available:    "bg-green-50 text-green-700",
  sold:         "bg-gray-100 text-gray-500",
  rented:       "bg-blue-50 text-blue-700",
  "off-market": "bg-yellow-50 text-yellow-700",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default function PropertyDetailPage({ params }: Props) {
  const router = useRouter();
  const [property, setProperty]         = useState<Property | null>(null);
  const [loading, setLoading]           = useState(true);
  const [notFound, setNotFound]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]         = useState(false);

  useEffect(() => {
    async function fetchProperty() {
      const { id } = await params;
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setProperty(data);
      }
      setLoading(false);
    }
    fetchProperty();
  }, []);

  async function handleDelete() {
    if (!property) return;
    setDeleting(true);
    await deleteProperty(property.id);
    router.push("/properties");
  }

  const typeLabel: Record<Property["type"], string> = {
    apartment: "Apartment", villa: "Villa", plot: "Plot",
    commercial: "Commercial", office: "Office",
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-gray-100 rounded w-full" />)}
        </div>
      </div>
    );
  }

  if (notFound || !property) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-20">
        <p className="text-gray-400 text-lg">Property not found.</p>
        <Link href="/properties" className="text-blue-600 text-sm mt-2 block hover:underline">← Back to properties</Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 sm:pb-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/properties" className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
          <BackIcon />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{property.title}</h1>
          <p className="text-gray-400 text-sm">Property details</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize shrink-0 ${STATUS_STYLE[property.status]}`}>
          {property.status}
        </span>
      </div>

      {/* Property photo — shown only if one was uploaded */}
      {property.image_url && (
        <div className="mb-5 rounded-2xl overflow-hidden border border-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={property.image_url}
            alt={property.title}
            className="w-full h-56 object-cover"
          />
        </div>
      )}

      {/* Details card */}
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
        <Section title="Property Info">
          <Row label="Type"     value={typeLabel[property.type]} />
          <Row label="Location" value={property.location} />
          <Row label="Price"    value={<span className="text-blue-600 font-bold">{formatPrice(property.price)}</span>} />
          <Row label="Status"   value={<span className="capitalize">{property.status}</span>} />
        </Section>
        {property.created_at && (
          <Section title="Info">
            <Row label="Added on" value={new Date(property.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />
          </Section>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-5 flex flex-col gap-3">
        <Link
          href={`/properties/${property.id}/edit`}
          className="w-full py-3 text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Edit Property
        </Link>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full py-3 border border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500 text-sm font-medium rounded-xl transition-colors"
          >
            Delete Property
          </button>
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700 font-medium mb-3">
              ⚠️ Are you sure? This will permanently delete <strong>{property.title}</strong>.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete} disabled={deleting}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium px-5 pt-4 pb-1">{title}</p>
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
