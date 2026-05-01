// app/(dashboard)/properties/[id]/page.tsx — View a single property's details
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { deleteProperty, uploadPropertyMedia, deletePropertyMediaFile, updateProperty } from "@/lib/db/properties";
import { compressVideo } from "@/lib/compress-video";
import { formatPriceFull } from "@/lib/format-price";
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

// ── Video compression progress ────────────────────────────────────────────────
type CompressState = { pct: number; label: string } | null;

export default function PropertyDetailPage({ params }: Props) {
  const router = useRouter();
  const [property, setProperty]           = useState<Property | null>(null);
  const [loading, setLoading]             = useState(true);
  const [notFound, setNotFound]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [compressState, setCompressState] = useState<CompressState>(null); // null = not running

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

  // ── Background video compression ────────────────────────────────────────────
  // Runs automatically when property.media_processing === true.
  // Flow: fetch original → compress → re-upload → delete original → update DB → clear flag
  useEffect(() => {
    if (!property?.media_processing) return;

    async function processVideos() {
      if (!property) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const urls        = property.media_urls ?? [];
      const updatedUrls = [...urls];
      const videoIdxs   = urls.map((u, i) => isVideoUrl(u) ? i : -1).filter((i) => i >= 0);

      for (let n = 0; n < videoIdxs.length; n++) {
        const idx = videoIdxs[n];
        const originalUrl = urls[idx];
        const label = `Optimising video ${videoIdxs.length > 1 ? `${n + 1}/${videoIdxs.length}` : ""}…`;

        try {
          setCompressState({ pct: 0, label });

          // 1. Fetch the original video from Supabase Storage
          const resp = await fetch(originalUrl);
          if (!resp.ok) throw new Error("Could not fetch original video");
          const blob = await resp.blob();
          const file = new File([blob], `video-${idx}.mp4`, { type: blob.type || "video/mp4" });

          // 2. Compress with ffmpeg.wasm — shows progress bar
          const compressed = await compressVideo(file, (pct) =>
            setCompressState({ pct, label })
          );

          // 3. Upload the compressed version to Supabase Storage
          const newUrl = await uploadPropertyMedia(compressed, user.id);

          // 4. Replace the old URL in our array
          updatedUrls[idx] = newUrl;

          // 5. Delete the original large file from storage
          await deletePropertyMediaFile(originalUrl);

        } catch (err) {
          // If one video fails, skip it and continue with others
          console.error("Video compression failed for", originalUrl, err);
        }
      }

      // 6. Save updated URLs + clear the processing flag
      const finalUrls = updatedUrls;
      await updateProperty(property.id, {
        media_urls:       finalUrls,
        image_url:        finalUrls[0] ?? property.image_url,
        media_processing: false,
      });

      // 7. Update local state so UI refreshes without a page reload
      setProperty((p) => p ? { ...p, media_urls: finalUrls, image_url: finalUrls[0] ?? p.image_url, media_processing: false } : p);
      setCompressState(null);
    }

    processVideos();
  }, [property?.id, property?.media_processing]);

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

      {/* ── Video optimisation banner — shows while background compression runs ── */}
      {(property.media_processing || compressState) && (
        <div className="mb-4 rounded-2xl overflow-hidden" style={{ border: '1px solid #BFDBFE', background: '#EFF6FF' }}>
          <div className="px-4 py-3 flex items-center gap-3">
            <svg className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-700">
                {compressState?.label ?? "Loading video optimiser…"}
              </p>
              <p className="text-xs text-blue-500 mt-0.5">
                {compressState?.pct
                  ? `${compressState.pct}% — keep this page open`
                  : "Preparing ffmpeg — first time takes ~10 seconds"}
              </p>
            </div>
            {compressState?.pct != null && compressState.pct > 0 && (
              <span className="text-sm font-bold text-blue-600 flex-shrink-0">{compressState.pct}%</span>
            )}
          </div>
          {compressState?.pct != null && compressState.pct > 0 && (
            <div className="h-1 bg-blue-100">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${compressState.pct}%` }}
              />
            </div>
          )}
        </div>
      )}

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

      {/* ── Price highlight ── */}
      <div className="mb-4 px-5 py-4 rounded-2xl" style={{ background: "#F0FDF9", border: "1px solid #BBF7D0" }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#15803D" }}>Price</p>
        <p className="text-2xl font-bold" style={{ color: "#166534" }}>{formatPriceFull(property.price)}</p>
      </div>

      {/* ── Details card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">

        {/* Basic info */}
        <Section title="Property Info">
          <Row label="Type"     value={typeLabel[property.type]} />
          <Row label="Location" value={property.location} />
          <Row label="Status"   value={<span className="capitalize">{property.status.replace("-", " ")}</span>} />
        </Section>

        {/* Specifications — only render if at least one spec exists */}
        {(property.area_sqft || property.bedrooms || property.bathrooms || property.furnishing || property.parking !== undefined || property.floor_no || property.facing || property.possession) && (
          <Section title="Specifications">
            {property.bedrooms    && <Row label="Configuration" value={property.bedrooms} />}
            {property.area_sqft   && <Row label="Area"          value={`${property.area_sqft.toLocaleString("en-IN")} sq ft`} />}
            {property.furnishing  && <Row label="Furnishing"    value={property.furnishing} />}
            {property.bathrooms   && <Row label="Bathrooms"     value={String(property.bathrooms)} />}
            {property.parking !== undefined && <Row label="Parking" value={property.parking === 0 ? "No parking" : `${property.parking} spot${property.parking > 1 ? "s" : ""}`} />}
            {(property.floor_no || property.total_floors) && (
              <Row label="Floor" value={
                property.floor_no && property.total_floors
                  ? `${property.floor_no} of ${property.total_floors}`
                  : property.floor_no ? String(property.floor_no)
                  : `of ${property.total_floors}`
              } />
            )}
            {property.facing     && <Row label="Facing"     value={property.facing} />}
            {property.possession && <Row label="Possession" value={property.possession} />}
          </Section>
        )}

        {/* Amenities */}
        {property.amenities && property.amenities.length > 0 && (
          <Section title={`Amenities (${property.amenities.length})`}>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {property.amenities.map((a) => (
                <span key={a} className="px-2.5 py-1 rounded-lg text-xs font-medium"
                  style={{ background: "#F0FDF9", color: "#15803D", border: "1px solid #BBF7D0" }}>
                  ✓ {a}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Description */}
        {property.description && (
          <Section title="Description">
            <p className="text-sm leading-relaxed pt-1" style={{ color: "#374151" }}>{property.description}</p>
          </Section>
        )}

        {/* Meta */}
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

        <a
          href={`https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage(property))}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 text-center text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
          style={{ background: '#25D366' }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white flex-shrink-0">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.534 5.856L.057 23.882a.5.5 0 0 0 .612.612l6.074-1.485A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.694-.504-5.24-1.385l-.373-.214-3.862.945.963-3.79-.234-.38A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
          Share on WhatsApp
        </a>

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

function buildWhatsAppMessage(p: Property): string {
  const lines: string[] = [];

  lines.push(`🏢 *${p.title}*`);
  lines.push(`📍 ${p.location}`);
  lines.push(`💰 *${formatPriceFull(p.price)}*`);
  lines.push("");

  const specs: string[] = [];
  if (p.bedrooms)                 specs.push(`🏠 ${p.bedrooms}`);
  if (p.area_sqft)                specs.push(`📐 ${p.area_sqft.toLocaleString("en-IN")} sq ft`);
  if (p.furnishing)               specs.push(`🛋️ ${p.furnishing}`);
  if (p.bathrooms)                specs.push(`🚿 ${p.bathrooms} Bathroom${p.bathrooms > 1 ? "s" : ""}`);
  if (p.parking !== undefined)    specs.push(`🚗 ${p.parking === 0 ? "No Parking" : `${p.parking} Parking Spot${p.parking > 1 ? "s" : ""}`}`);
  if (p.floor_no && p.total_floors) specs.push(`🏗️ Floor ${p.floor_no} of ${p.total_floors}`);
  else if (p.floor_no)            specs.push(`🏗️ Floor ${p.floor_no}`);
  if (p.facing)                   specs.push(`🧭 ${p.facing} Facing`);
  if (p.possession)               specs.push(`🔑 ${p.possession}`);

  if (specs.length > 0) {
    lines.push("📋 *Property Details*");
    specs.forEach((s) => lines.push(s));
    lines.push("");
  }

  if (p.amenities && p.amenities.length > 0) {
    lines.push("✅ *Amenities*");
    lines.push(p.amenities.join(" · "));
    lines.push("");
  }

  if (p.description) {
    lines.push("📝 *About*");
    lines.push(p.description);
    lines.push("");
  }

  lines.push("_Sent via EstatePro CRM_");
  return lines.join("\n");
}
