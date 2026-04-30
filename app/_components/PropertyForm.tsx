// app/_components/PropertyForm.tsx — Shared form used by Add Property and Edit Property pages
//
// 🧠 WHAT THIS FILE DOES:
//    This is the big property form — photos, title, price, BHK, amenities etc.
//    It is used in TWO places:
//      1. /properties/new   → to create a new property
//      2. /properties/[id]/edit → to edit an existing one
//    Both pages just pass an onSubmit function and get the full form for free.
"use client";

import { useState } from "react";
import ImageUpload from "@/app/_components/ImageUpload";
import { PropertyType, PropertyStatus, Property } from "@/lib/types";
import { formatPriceDisplay } from "@/lib/format-price";

const GREEN = "#1BC47D";

// All values this form collects — passed to onSubmit
export interface PropertyFormValues {
  title:        string;
  type:         PropertyType;
  location:     string;
  price:        number;
  status:       PropertyStatus;
  area_sqft?:   number;
  bedrooms?:    string;
  bathrooms?:   number;
  furnishing?:  string;
  parking?:     number;
  floor_no?:    number;
  total_floors?: number;
  facing?:      string;
  possession?:  string;
  amenities:    string[];
  description?: string;
  mediaFiles:   File[];
  keptUrls:     string[];
}

interface Props {
  initialData?:  Property;           // pass for edit mode, omit for new
  onSubmit:      (values: PropertyFormValues) => Promise<void>;
  submitLabel?:  string;
  loading?:      boolean;
}

// ── Options ───────────────────────────────────────────────────────────────────
const BHK_OPTIONS      = ["Studio", "1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK+"];
const FURNISH_OPTIONS  = ["Unfurnished", "Semi-Furnished", "Fully Furnished"];
const FACING_OPTIONS   = ["East", "West", "North", "South", "North-East", "North-West", "South-East", "South-West"];
const POSSESSION_OPT   = ["Ready to Move", "Under Construction"];
const BATH_OPTIONS     = ["1", "2", "3", "4+"];
const PARK_OPTIONS     = ["0", "1", "2", "3+"];
const AMENITY_LIST     = [
  "Gym", "Swimming Pool", "Club House", "Garden / Park",
  "Lift / Elevator", "Security / CCTV", "Power Backup", "Covered Parking",
  "Gated Society", "24x7 Water", "Gas Pipeline", "Children's Play Area",
  "Intercom", "Visitor Parking",
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function PropertyForm({
  initialData,
  onSubmit,
  submitLabel = "Save Property",
  loading = false,
}: Props) {
  // Basic fields
  const [title,    setTitle]    = useState(initialData?.title    ?? "");
  const [type,     setType]     = useState<PropertyType>(initialData?.type ?? "apartment");
  const [location, setLocation] = useState(initialData?.location ?? "");
  const [price,    setPrice]    = useState(initialData?.price    ? String(initialData.price) : "");
  const [status,   setStatus]   = useState<PropertyStatus>(initialData?.status ?? "available");

  // Optional detail fields
  const [areaStr,      setAreaStr]      = useState(initialData?.area_sqft    ? String(initialData.area_sqft)    : "");
  const [bedrooms,     setBedrooms]     = useState(initialData?.bedrooms     ?? "");
  const [bathStr,      setBathStr]      = useState(initialData?.bathrooms    ? String(initialData.bathrooms)    : "");
  const [furnishing,   setFurnishing]   = useState(initialData?.furnishing   ?? "");
  const [parkStr,      setParkStr]      = useState(initialData?.parking      !== undefined ? String(initialData.parking) : "");
  const [floorStr,     setFloorStr]     = useState(initialData?.floor_no     ? String(initialData.floor_no)     : "");
  const [totalFlrStr,  setTotalFlrStr]  = useState(initialData?.total_floors ? String(initialData.total_floors) : "");
  const [facing,       setFacing]       = useState(initialData?.facing       ?? "");
  const [possession,   setPossession]   = useState(initialData?.possession   ?? "");
  const [amenities,    setAmenities]    = useState<string[]>(initialData?.amenities ?? []);
  const [description,  setDescription]  = useState(initialData?.description  ?? "");

  // Media
  const existingRaw = initialData
    ? [...new Set([initialData.image_url, ...(initialData.media_urls ?? [])].filter((u): u is string => !!u))]
    : [];
  const [keptUrls,   setKeptUrls]   = useState<string[]>(existingRaw);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  // Collapsible sections
  const [showMore,      setShowMore]      = useState(false);
  const [showAmenities, setShowAmenities] = useState(amenities.length > 0);

  const [saveError, setSaveError] = useState("");

  function toggleAmenity(name: string) {
    setAmenities((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError("");
    try {
      await onSubmit({
        title:        title.trim(),
        type,
        location:     location.trim(),
        price:        parseInt(price) || 0,
        status,
        area_sqft:    areaStr     ? parseInt(areaStr)     : undefined,
        bedrooms:     bedrooms    || undefined,
        bathrooms:    bathStr     ? parseInt(bathStr)     : undefined,
        furnishing:   furnishing  || undefined,
        parking:      parkStr     !== "" ? parseInt(parkStr)  : undefined,
        floor_no:     floorStr    ? parseInt(floorStr)    : undefined,
        total_floors: totalFlrStr ? parseInt(totalFlrStr) : undefined,
        facing:       facing      || undefined,
        possession:   possession  || undefined,
        amenities,
        description:  description.trim() || undefined,
        mediaFiles,
        keptUrls,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    }
  }

  const pricePreview = formatPriceDisplay(price);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* ── Photos & Videos ── */}
      <Card>
        <ImageUpload
          existingUrls={keptUrls}
          onFilesChange={setMediaFiles}
          onExistingRemove={(url) => setKeptUrls((p) => p.filter((u) => u !== url))}
        />
      </Card>

      {/* ── Basic Details ── */}
      <Card>
        <SectionLabel>Basic Details</SectionLabel>
        <div className="space-y-3 mt-3">
          <div>
            <Label>Property Title <Red /></Label>
            <input
              required type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g. "2BHK Sea-View Flat — Bandra West"'
              className={inp}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <select value={type} onChange={(e) => setType(e.target.value as PropertyType)} className={inp}>
                <option value="apartment">Apartment</option>
                <option value="villa">Villa</option>
                <option value="plot">Plot</option>
                <option value="commercial">Commercial</option>
                <option value="office">Office</option>
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select value={status} onChange={(e) => setStatus(e.target.value as PropertyStatus)} className={inp}>
                <option value="available">Available</option>
                <option value="sold">Sold</option>
                <option value="rented">Rented</option>
                <option value="off-market">Off Market</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Location <Red /></Label>
            <input
              required type="text" value={location} onChange={(e) => setLocation(e.target.value)}
              placeholder="Bandra West, Mumbai"
              className={inp}
            />
          </div>
        </div>
      </Card>

      {/* ── Price ── */}
      <Card>
        <Label>Price (₹) <Red /></Label>
        <input
          required type="number" value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="3500000"
          className={inp + " mt-1"}
        />
        {/* Live Indian format preview — updates as user types */}
        {pricePreview ? (
          <p className="mt-1.5 text-sm font-bold" style={{ color: GREEN }}>
            {pricePreview}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-gray-400">
            e.g. type 3500000 → shows ₹35,00,000 (35 Lakh)
          </p>
        )}
      </Card>

      {/* ── Property Details ── */}
      <Card>
        <SectionLabel>Property Details <Opt /></SectionLabel>
        <div className="space-y-4 mt-3">

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Area (sq ft)</Label>
              <input
                type="number" value={areaStr} onChange={(e) => setAreaStr(e.target.value)}
                placeholder="1200" className={inp}
              />
            </div>
            <div>
              <Label>BHK</Label>
              {/* Scrollable pill row */}
              <div className="flex gap-1.5 mt-1 overflow-x-auto pb-1 scrollbar-none">
                {BHK_OPTIONS.map((opt) => (
                  <Pill key={opt} label={opt} selected={bedrooms === opt}
                    onClick={() => setBedrooms(bedrooms === opt ? "" : opt)} />
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label>Furnishing</Label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {FURNISH_OPTIONS.map((opt) => (
                <Pill key={opt} label={opt} selected={furnishing === opt}
                  onClick={() => setFurnishing(furnishing === opt ? "" : opt)} />
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ── More Details (collapsible) ── */}
      <Card>
        <button
          type="button" onClick={() => setShowMore((v) => !v)}
          className="w-full flex items-center justify-between gap-2"
        >
          <SectionLabel>More Details <Opt /></SectionLabel>
          <ChevronIcon open={showMore} />
        </button>

        {showMore && (
          <div className="space-y-4 mt-4">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bathrooms</Label>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {BATH_OPTIONS.map((opt) => (
                    <Pill key={opt} label={opt} selected={bathStr === opt}
                      onClick={() => setBathStr(bathStr === opt ? "" : opt)} />
                  ))}
                </div>
              </div>
              <div>
                <Label>Parking</Label>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {PARK_OPTIONS.map((opt) => (
                    <Pill key={opt} label={opt} selected={parkStr === opt}
                      onClick={() => setParkStr(parkStr === opt ? "" : opt)} />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Floor No.</Label>
                <input type="number" value={floorStr} onChange={(e) => setFloorStr(e.target.value)}
                  placeholder="4" className={inp} />
              </div>
              <div>
                <Label>Total Floors</Label>
                <input type="number" value={totalFlrStr} onChange={(e) => setTotalFlrStr(e.target.value)}
                  placeholder="12" className={inp} />
              </div>
            </div>

            <div>
              <Label>Facing</Label>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {FACING_OPTIONS.map((opt) => (
                  <Pill key={opt} label={opt} selected={facing === opt}
                    onClick={() => setFacing(facing === opt ? "" : opt)} />
                ))}
              </div>
            </div>

            <div>
              <Label>Possession</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {POSSESSION_OPT.map((opt) => (
                  <Pill key={opt} label={opt} selected={possession === opt}
                    onClick={() => setPossession(possession === opt ? "" : opt)} />
                ))}
              </div>
            </div>

          </div>
        )}
      </Card>

      {/* ── Amenities (collapsible) ── */}
      <Card>
        <button
          type="button" onClick={() => setShowAmenities((v) => !v)}
          className="w-full flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <SectionLabel>Amenities <Opt /></SectionLabel>
            {amenities.length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                style={{ background: GREEN }}>
                {amenities.length} selected
              </span>
            )}
          </span>
          <ChevronIcon open={showAmenities} />
        </button>

        {showAmenities && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
            {AMENITY_LIST.map((name) => {
              const on = amenities.includes(name);
              return (
                <button
                  key={name} type="button" onClick={() => toggleAmenity(name)}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-left transition-all"
                  style={{
                    background: on ? `${GREEN}18` : "#F8F9FB",
                    border:     `1px solid ${on ? GREEN : "#EEF1F6"}`,
                    color:      on ? GREEN : "#6B7280",
                  }}
                >
                  {on && <span className="mr-1">✓</span>}{name}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Description ── */}
      <Card>
        <Label>Description <Opt /></Label>
        <textarea
          value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Highlights, nearby landmarks, special features..."
          rows={3}
          className={inp + " mt-1 resize-none"}
        />
      </Card>

      {saveError && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
          {saveError}
        </p>
      )}

      <button
        type="submit" disabled={loading}
        className="w-full py-3.5 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
        style={{ background: GREEN }}
      >
        {loading ? "Saving…" : submitLabel}
      </button>

    </form>
  );
}

// ── Reusable mini-components ──────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5" style={{ border: "1px solid #EEF1F6" }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#9CA3AF" }}>
      {children}
    </p>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-medium mb-1" style={{ color: "#374151" }}>{children}</p>
  );
}

function Red() { return <span style={{ color: "#EF4444" }}>*</span>; }
function Opt() {
  return <span className="normal-case font-normal" style={{ color: "#9CA3AF" }}> (optional)</span>;
}

function Pill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0"
      style={{
        background: selected ? GREEN       : "#F5F7FA",
        color:      selected ? "#fff"      : "#6B7280",
        border:     `1px solid ${selected ? GREEN : "#EEF1F6"}`,
      }}
    >
      {label}
    </button>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="w-4 h-4 transition-transform flex-shrink-0"
      style={{ color: "#9CA3AF", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

const inp =
  "w-full px-4 py-2.5 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 bg-white"
  + " focus:ring-[#1BC47D] focus:border-transparent"
  + " border border-[#EEF1F6] text-[#1A1D23]";
