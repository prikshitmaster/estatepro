// app/(dashboard)/properties/[id]/page.tsx — View a single property's details
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

const VIDEO_EXT = /\.(mp4|webm|mov|avi|mkv|ogv)(\?.*)?$/i;
function isVideoUrl(url: string) { return VIDEO_EXT.test(url); }

interface Props {
  params: Promise<{ id: string }>;
}

export default function PropertyDetailPage({ params }: Props) {
  const router = useRouter();
  const [property, setProperty]           = useState<Property | null>(null);
  const [loading, setLoading]             = useState(true);
  const [notFound, setNotFound]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

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

  // Build full media list: prefer media_urls array, fall back to single image_url
  const allMedia: string[] = property.media_urls?.length
    ? property.media_urls
    : property.image_url
      ? [property.image_url]
      : [];

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

      {/* Media carousel */}
      {allMedia.length > 0 && <MediaCarousel urls={allMedia} />}

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
          className="w-full py-3 text-center text-white text-sm font-semibold rounded-xl transition-colors"
          style={{ background: '#1BC47D' }}
        >
          Edit Property
        </Link>

        <Link
          href={`/secure-share/create?propertyId=${property.id}&title=${encodeURIComponent(property.title)}`}
          className="w-full py-3 text-center text-sm font-semibold rounded-xl transition-colors"
          style={{ background: '#6366F118', color: '#6366F1', border: '1px solid #6366F140' }}
        >
          🔗 Create Secure Share Link
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

// ── Media Carousel ────────────────────────────────────────────────────────────

function MediaCarousel({ urls }: { urls: string[] }) {
  const [index, setIndex]           = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);

  const current = urls[index];
  const total   = urls.length;

  function prev() { setIndex(i => (i === 0 ? total - 1 : i - 1)); }
  function next() { setIndex(i => (i === total - 1 ? 0 : i + 1)); }

  function onTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX);
  }
  function onTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 50)  next();
    if (diff < -50) prev();
  }

  return (
    <div
      className="mb-5 rounded-2xl overflow-hidden border border-gray-100 relative bg-black select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Media item */}
      {isVideoUrl(current) ? (
        <video
          key={current}
          src={current}
          controls
          playsInline
          className="w-full h-60 object-contain bg-black"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={current}
          src={current}
          alt=""
          className="w-full h-60 object-cover"
        />
      )}

      {/* Counter badge top-right */}
      {total > 1 && (
        <div className="absolute top-2.5 right-2.5 bg-black/55 text-white text-xs font-medium px-2 py-0.5 rounded-full">
          {index + 1} / {total}
        </div>
      )}

      {/* Video badge top-left */}
      {isVideoUrl(current) && (
        <div className="absolute top-2.5 left-2.5 bg-black/55 text-white text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Video
        </div>
      )}

      {/* Left / Right arrows (shown when multiple items) */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/45 hover:bg-black/65 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/45 hover:bg-black/65 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dot indicators */}
      {total > 1 && (
        <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`rounded-full transition-all ${
                i === index
                  ? "w-4 h-1.5 bg-white"
                  : "w-1.5 h-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Layout helpers ────────────────────────────────────────────────────────────

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
