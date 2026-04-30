"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAllProperties } from "@/lib/db/properties";
import {
  createSecureShareLink,
  uploadShareFile,
  addShareMediaBatch,
  getMediaType,
} from "@/lib/db/secure-share";
import { Property, ShareMediaType } from "@/lib/types";

const ACCENT = "#6366F1";

type ExpiryUnit = "minutes" | "hours" | "days";

function formatFileSize(bytes: number): string {
  if (bytes < 1024)    return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function calcExpiresAt(value: number, unit: ExpiryUnit): string {
  const ms =
    unit === "minutes" ? value * 60_000 :
    unit === "hours"   ? value * 3_600_000 :
                         value * 86_400_000;
  return new Date(Date.now() + ms).toISOString();
}

export default function CreateShareLinkPage() {
  const searchParams = useSearchParams();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [title,      setTitle]      = useState(searchParams?.get("title") ?? "");
  const [propertyId, setPropertyId] = useState(searchParams?.get("propertyId") ?? "");
  const [files,      setFiles]      = useState<File[]>([]);

  // Expiry
  const [expiryEnabled, setExpiryEnabled] = useState(false);
  const [expiryValue,   setExpiryValue]   = useState(30);
  const [expiryUnit,    setExpiryUnit]    = useState<ExpiryUnit>("minutes");

  // Max views
  const [maxViews, setMaxViews] = useState<number | null>(null);

  // Watermark
  const [watermark, setWatermark] = useState(true);

  // Property image inclusion
  const [includePropertyImage, setIncludePropertyImage] = useState(false);
  const [propertyImageUrl,     setPropertyImageUrl]     = useState<string | null>(null);

  // ── Data ───────────────────────────────────────────────────────────────────
  const [properties, setProperties] = useState<Property[]>([]);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [creating,      setCreating]      = useState(false);
  const [error,         setError]         = useState("");
  const [createdToken,  setCreatedToken]  = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [dragOver,      setDragOver]      = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // ── Load properties ─────────────────────────────────────────────────────
  useEffect(() => {
    getAllProperties().then(setProperties).catch(() => {});
  }, []);

  // ── When propertyId changes, detect if it has an existing photo ──────────
  useEffect(() => {
    if (!propertyId || !properties.length) {
      setPropertyImageUrl(null);
      setIncludePropertyImage(false);
      return;
    }
    const prop = properties.find((p) => p.id === propertyId);
    if (prop?.image_url) {
      setPropertyImageUrl(prop.image_url);
      setIncludePropertyImage(true); // auto-check
    } else {
      setPropertyImageUrl(null);
      setIncludePropertyImage(false);
    }
  }, [propertyId, properties]);

  // ── File handling ─────────────────────────────────────────────────────────
  function addFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming);
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...arr.filter((f) => !seen.has(f.name + f.size))];
    });
  }

  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Please enter a title."); return; }
    if (!files.length && !includePropertyImage) {
      setError("Please add at least one file, or include the property photo.");
      return;
    }

    setError("");
    setCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const selectedProp = properties.find((p) => p.id === propertyId);

      const link = await createSecureShareLink({
        title:             title.trim(),
        property_id:       selectedProp?.id,
        property_title:    selectedProp?.title,
        expires_at:        expiryEnabled ? calcExpiresAt(expiryValue, expiryUnit) : null,
        max_views:         maxViews,
        watermark_enabled: watermark,
      });

      const mediaToInsert: Array<{
        link_id: string; user_id: string; storage_path: string;
        external_url?: string; file_name: string; media_type: ShareMediaType;
        file_size: number; sort_order: number;
      }> = [];

      // Property photo goes first
      if (includePropertyImage && propertyImageUrl) {
        mediaToInsert.push({
          link_id:      link.id,
          user_id:      user.id,
          storage_path: "",
          external_url: propertyImageUrl,
          file_name:    `${selectedProp?.title ?? "Property"} — Photo`,
          media_type:   "image",
          file_size:    0,
          sort_order:   0,
        });
      }

      // Upload user files in parallel
      if (files.length) {
        const uploads = await Promise.all(
          files.map((f) => uploadShareFile(user.id, link.id, f))
        );
        uploads.forEach((u, i) => {
          mediaToInsert.push({
            link_id:      link.id,
            user_id:      user.id,
            storage_path: u.storage_path,
            file_name:    files[i].name,
            media_type:   getMediaType(files[i]),
            file_size:    files[i].size,
            sort_order:   mediaToInsert.length,
          });
        });
      }

      await addShareMediaBatch(mediaToInsert);
      setCreatedToken(link.token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  function copyLink() {
    const url = `${window.location.origin}/share/${createdToken}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (createdToken) {
    const url = `${window.location.origin}/share/${createdToken}`;
    return (
      <div className="p-4 sm:p-6 max-w-lg mx-auto pb-24 sm:pb-6">
        <div className="bg-white rounded-2xl p-8 text-center" style={{ border: '1px solid #EEF1F6', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style={{ background: `${ACCENT}12` }}>
            <svg width={30} height={30} fill="none" stroke={ACCENT} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: '#1A1D23' }}>Share link created!</h2>
          <p className="text-sm mb-6" style={{ color: '#6B7280' }}>Send this secure link to your lead.</p>

          <div className="flex items-center gap-2 p-3 rounded-xl mb-5" style={{ background: '#F5F7FA', border: '1px solid #EEF1F6' }}>
            <p className="flex-1 text-xs font-mono truncate" style={{ color: '#374151' }}>{url}</p>
            <button
              onClick={copyLink}
              className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
              style={{ background: copiedSuccess ? '#DCFCE7' : `${ACCENT}18`, color: copiedSuccess ? '#15803D' : ACCENT }}
            >
              {copiedSuccess ? "Copied!" : "Copy"}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={copyLink}
              className="w-full py-3 text-white text-sm font-semibold rounded-xl"
              style={{ background: ACCENT }}
            >
              {copiedSuccess ? "Link copied ✓" : "Copy & Share"}
            </button>
            <Link href="/secure-share" className="w-full py-3 text-sm font-medium rounded-xl border text-center block" style={{ borderColor: '#EEF1F6', color: '#6B7280' }}>
              View All Links
            </Link>
            <button
              onClick={() => { setCreatedToken(null); setTitle(""); setFiles([]); setPropertyId(""); }}
              className="w-full py-2.5 text-sm font-medium"
              style={{ color: ACCENT }}
            >
              Create another link
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Create form ───────────────────────────────────────────────────────────
  const totalItems = files.length + (includePropertyImage && propertyImageUrl ? 1 : 0);

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto pb-24 sm:pb-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/secure-share" className="text-gray-400 hover:text-gray-600 transition-colors">
          <BackIcon />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1A1D23' }}>Create Share Link</h1>
          <p className="text-sm" style={{ color: '#6B7280' }}>Upload files and generate a secure viewer link</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="space-y-4">

        {/* ── Link Details ─────────────────────────────────────────────── */}
        <Card>
          <SectionLabel>Link Details</SectionLabel>
          <div className="space-y-3 mt-3">
            <div>
              <Label>Link title <Red /></Label>
              <input
                type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 3BHK Apartment – Banjara Hills"
                className="w-full px-4 py-2.5 rounded-xl text-sm placeholder-gray-400 focus:outline-none"
                style={{ border: '1px solid #EEF1F6', color: '#1A1D23' }}
              />
            </div>
            <div>
              <Label>Link to property <Opt /></Label>
              <select
                value={propertyId} onChange={(e) => setPropertyId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none bg-white"
                style={{ border: '1px solid #EEF1F6', color: propertyId ? '#1A1D23' : '#9CA3AF' }}
              >
                <option value="">No property selected</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            {/* Auto-detected property photo */}
            {propertyImageUrl && (
              <div
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                style={{ background: includePropertyImage ? `${ACCENT}08` : '#F8F9FB', border: `1px solid ${includePropertyImage ? ACCENT + '40' : '#EEF1F6'}` }}
                onClick={() => setIncludePropertyImage((v) => !v)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={propertyImageUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold" style={{ color: '#374151' }}>Include property photo</p>
                  <p className="text-[11px]" style={{ color: '#9CA3AF' }}>Already uploaded — no re-upload needed</p>
                </div>
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: includePropertyImage ? ACCENT : '#E5E7EB' }}
                >
                  {includePropertyImage && (
                    <svg width={11} height={11} fill="none" stroke="white" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* ── Files ────────────────────────────────────────────────────── */}
        <Card>
          <SectionLabel>Media Files <Red /></SectionLabel>
          <p className="text-xs mt-0.5 mb-3" style={{ color: '#9CA3AF' }}>Images, videos, PDF, Word (.doc/.docx), Excel (.xls/.xlsx)</p>

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className="cursor-pointer rounded-xl flex flex-col items-center justify-center py-7 transition-colors"
            style={{
              border: `2px dashed ${dragOver ? ACCENT : '#D1D5DB'}`,
              background: dragOver ? `${ACCENT}08` : '#FAFAFA',
            }}
          >
            <UploadIcon color={dragOver ? ACCENT : '#9CA3AF'} />
            <p className="text-sm font-medium mt-2" style={{ color: dragOver ? ACCENT : '#374151' }}>
              {dragOver ? "Drop files here" : "Click to upload or drag & drop"}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Max 50 MB per file</p>
          </div>
          <input
            ref={inputRef} type="file" multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
          />

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: '#F8F9FB' }}>
                  <FileTypeIcon type={getMediaType(file)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: '#374151' }}>{file.name}</p>
                    <p className="text-[10px]" style={{ color: '#9CA3AF' }}>{formatFileSize(file.size)}</p>
                  </div>
                  <button type="button" onClick={() => removeFile(i)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                    <XIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Settings ─────────────────────────────────────────────────── */}
        <Card>
          <SectionLabel>Settings</SectionLabel>
          <div className="space-y-4 mt-3">

            {/* Expiry */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Link expires</Label>
                <Toggle on={expiryEnabled} onToggle={() => setExpiryEnabled((v) => !v)} />
              </div>
              {expiryEnabled && (
                <div className="flex gap-2 mt-1">
                  <input
                    type="number" min={1} max={9999}
                    value={expiryValue}
                    onChange={(e) => setExpiryValue(Math.max(1, Number(e.target.value)))}
                    className="w-24 px-3 py-2 rounded-xl text-sm text-center focus:outline-none"
                    style={{ border: `1px solid ${ACCENT}`, color: '#1A1D23', background: `${ACCENT}06` }}
                  />
                  <select
                    value={expiryUnit}
                    onChange={(e) => setExpiryUnit(e.target.value as ExpiryUnit)}
                    className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none bg-white"
                    style={{ border: `1px solid ${ACCENT}`, color: '#374151' }}
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              )}
              {expiryEnabled && (
                <p className="text-[11px] mt-1.5" style={{ color: '#9CA3AF' }}>
                  Link expires {expiryValue} {expiryUnit} after creation
                </p>
              )}
            </div>

            {/* Max views */}
            <div>
              <Label>Max views</Label>
              <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                {([null, 10, 25, 100] as Array<number | null>).map((v) => (
                  <button
                    key={String(v)} type="button" onClick={() => setMaxViews(v)}
                    className="py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: maxViews === v ? ACCENT : '#F5F7FA',
                      color:      maxViews === v ? '#fff'  : '#6B7280',
                      border:     `1px solid ${maxViews === v ? ACCENT : '#EEF1F6'}`,
                    }}
                  >
                    {v === null ? "Unlimited" : `${v} views`}
                  </button>
                ))}
              </div>
            </div>

            {/* Watermark */}
            <div className="flex items-center justify-between py-3 px-4 rounded-xl" style={{ background: '#F8F9FB', border: '1px solid #EEF1F6' }}>
              <div>
                <p className="text-xs font-semibold" style={{ color: '#374151' }}>Watermark overlay</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>
                  {watermark ? 'Tiled PROTECTED text shown on viewer' : 'Viewer sees clean images — no watermark'}
                </p>
              </div>
              <Toggle on={watermark} onToggle={() => setWatermark((v) => !v)} accent={ACCENT} />
            </div>

            {/* Password — coming soon */}
            <div className="flex items-center justify-between py-3 px-4 rounded-xl" style={{ background: '#F5F7FA', border: '1px solid #EEF1F6' }}>
              <div>
                <p className="text-xs font-medium" style={{ color: '#374151' }}>Password protection</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>Coming soon</p>
              </div>
              <div className="w-10 h-5 rounded-full relative" style={{ background: '#E5E7EB' }}>
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow" />
              </div>
            </div>
          </div>
        </Card>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">{error}</p>
        )}

        <button
          type="submit" disabled={creating}
          className="w-full py-3.5 text-white font-semibold rounded-xl transition-colors text-sm disabled:opacity-60"
          style={{ background: ACCENT }}
        >
          {creating ? (
            <span className="flex items-center justify-center gap-2">
              <SpinnerIcon />
              {files.length ? `Uploading ${files.length} file${files.length !== 1 ? "s" : ""}…` : "Creating link…"}
            </span>
          ) : (
            `Create Share Link${totalItems ? ` · ${totalItems} item${totalItems !== 1 ? "s" : ""}` : ""}`
          )}
        </button>
      </form>
    </div>
  );
}

// ── Reusable UI ───────────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #EEF1F6' }}>{children}</div>;
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>{children}</p>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium mb-1" style={{ color: '#374151' }}>{children}</p>;
}
function Red() { return <span style={{ color: '#EF4444' }}>*</span>; }
function Opt() { return <span style={{ color: '#9CA3AF', fontWeight: 400 }}> (optional)</span>; }

function Toggle({ on, onToggle, accent = "#1BC47D" }: { on: boolean; onToggle: () => void; accent?: string }) {
  return (
    <button
      type="button" onClick={onToggle}
      className="relative shrink-0 transition-colors"
      style={{ width: 40, height: 22, borderRadius: 99, background: on ? accent : '#D1D5DB' }}
    >
      <div
        className="absolute top-0.5 transition-all"
        style={{ width: 18, height: 18, borderRadius: 99, background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', left: on ? 20 : 2 }}
      />
    </button>
  );
}

function FileTypeIcon({ type }: { type: string }) {
  const map: Record<string, { label: string; color: string }> = {
    image: { label: "IMG", color: "#10B981" },
    video: { label: "VID", color: "#8B5CF6" },
    pdf:   { label: "PDF", color: "#EF4444" },
    word:  { label: "DOC", color: "#3B82F6" },
    excel: { label: "XLS", color: "#10B981" },
  };
  const { label, color } = map[type] ?? { label: "FILE", color: "#6B7280" };
  return (
    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[9px] font-bold"
      style={{ background: `${color}18`, color }}>
      {label}
    </div>
  );
}

function BackIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>;
}
function UploadIcon({ color }: { color: string }) {
  return <svg width={26} height={26} fill="none" stroke={color} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>;
}
function XIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
}
function SpinnerIcon() {
  return <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>;
}
