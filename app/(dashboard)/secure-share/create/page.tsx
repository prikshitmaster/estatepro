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
import { Property } from "@/lib/types";

const ACCENT = "#6366F1";

const EXPIRY_OPTIONS = [
  { label: "Never",   value: null       },
  { label: "7 days",  value: 7          },
  { label: "30 days", value: 30         },
  { label: "90 days", value: 90         },
];
const MAX_VIEW_OPTIONS = [
  { label: "Unlimited", value: null },
  { label: "10 views",  value: 10   },
  { label: "25 views",  value: 25   },
  { label: "100 views", value: 100  },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function CreateShareLinkPage() {
  const searchParams = useSearchParams();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [title,      setTitle]      = useState(searchParams?.get("title") ?? "");
  const [propertyId, setPropertyId] = useState(searchParams?.get("propertyId") ?? "");
  const [files,      setFiles]      = useState<File[]>([]);
  const [expiryDays, setExpiryDays] = useState<number | null>(null);
  const [maxViews,   setMaxViews]   = useState<number | null>(null);

  // ── Data ────────────────────────────────────────────────────────────────────
  const [properties, setProperties] = useState<Property[]>([]);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [creating,    setCreating]    = useState(false);
  const [error,       setError]       = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [dragOver,    setDragOver]    = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAllProperties().then(setProperties).catch(() => {});
  }, []);

  // ── File handling ─────────────────────────────────────────────────────────
  function addFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming);
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...arr.filter((f) => !existing.has(f.name + f.size))];
    });
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim())    { setError("Please enter a title."); return; }
    if (!files.length)    { setError("Please add at least one file."); return; }

    setError("");
    setCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const selectedProp = properties.find((p) => p.id === propertyId);

      // Calculate expiry timestamp
      let expires_at: string | null = null;
      if (expiryDays) {
        const d = new Date();
        d.setDate(d.getDate() + expiryDays);
        expires_at = d.toISOString();
      }

      // Create the link record first — we need its id for storage paths
      const link = await createSecureShareLink({
        title: title.trim(),
        property_id:    selectedProp?.id ?? undefined,
        property_title: selectedProp?.title ?? undefined,
        expires_at,
        max_views: maxViews ?? undefined,
      });

      // Upload all files in parallel
      const uploads = await Promise.all(
        files.map((file) => uploadShareFile(user.id, link.id, file))
      );

      // Insert all media records in one batch
      await addShareMediaBatch(
        uploads.map((u, i) => ({
          link_id:      link.id,
          user_id:      user.id,
          storage_path: u.storage_path,
          file_name:    files[i].name,
          media_type:   getMediaType(files[i]),
          file_size:    files[i].size,
          sort_order:   i,
        }))
      );

      setCreatedToken(link.token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  function copyCreatedLink() {
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
            <svg width={32} height={32} fill="none" stroke={ACCENT} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: '#1A1D23' }}>Share link created!</h2>
          <p className="text-sm mb-6" style={{ color: '#6B7280' }}>Your secure link is ready to share with leads.</p>

          <div className="flex items-center gap-2 mb-6 p-3 rounded-xl" style={{ background: '#F5F7FA', border: '1px solid #EEF1F6' }}>
            <p className="flex-1 text-xs font-mono truncate" style={{ color: '#374151' }}>{url}</p>
            <button
              onClick={copyCreatedLink}
              className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
              style={{ background: copiedSuccess ? '#DCFCE7' : `${ACCENT}18`, color: copiedSuccess ? '#15803D' : ACCENT }}
            >
              {copiedSuccess ? "Copied!" : "Copy"}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={copyCreatedLink}
              className="w-full py-3 text-white text-sm font-semibold rounded-xl transition-colors"
              style={{ background: ACCENT }}
            >
              {copiedSuccess ? "Link copied to clipboard ✓" : "Copy & Share"}
            </button>
            <Link
              href="/secure-share"
              className="w-full py-3 text-sm font-medium rounded-xl border transition-colors"
              style={{ borderColor: '#EEF1F6', color: '#6B7280' }}
            >
              View All Links
            </Link>
            <button
              onClick={() => { setCreatedToken(null); setTitle(""); setFiles([]); setPropertyId(""); }}
              className="w-full py-2.5 text-sm font-medium rounded-xl transition-colors"
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

        {/* Title */}
        <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #EEF1F6' }}>
          <SectionLabel>Link Details</SectionLabel>
          <div className="space-y-3 mt-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#374151' }}>
                Link title <Required />
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 3BHK Apartment – Banjara Hills"
                className="w-full px-4 py-2.5 rounded-xl text-sm placeholder-gray-400 focus:outline-none"
                style={{ border: '1px solid #EEF1F6', color: '#1A1D23' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#374151' }}>
                Link to property <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional)</span>
              </label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none bg-white"
                style={{ border: '1px solid #EEF1F6', color: propertyId ? '#1A1D23' : '#9CA3AF' }}
              >
                <option value="">No property selected</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* File upload */}
        <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #EEF1F6' }}>
          <SectionLabel>Files <Required /></SectionLabel>
          <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>Images, PDF, Word (.doc/.docx), Excel (.xls/.xlsx)</p>

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className="cursor-pointer rounded-xl flex flex-col items-center justify-center py-8 transition-colors"
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
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
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
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                  >
                    <XIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #EEF1F6' }}>
          <SectionLabel>Settings</SectionLabel>
          <div className="space-y-3 mt-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#374151' }}>Link expires</label>
              <div className="grid grid-cols-4 gap-1.5">
                {EXPIRY_OPTIONS.map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setExpiryDays(opt.value)}
                    className="py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: expiryDays === opt.value ? ACCENT : '#F5F7FA',
                      color:      expiryDays === opt.value ? '#fff'  : '#6B7280',
                      border:     `1px solid ${expiryDays === opt.value ? ACCENT : '#EEF1F6'}`,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#374151' }}>Max views</label>
              <div className="grid grid-cols-4 gap-1.5">
                {MAX_VIEW_OPTIONS.map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setMaxViews(opt.value)}
                    className="py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: maxViews === opt.value ? ACCENT : '#F5F7FA',
                      color:      maxViews === opt.value ? '#fff'  : '#6B7280',
                      border:     `1px solid ${maxViews === opt.value ? ACCENT : '#EEF1F6'}`,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Password placeholder */}
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
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
        )}

        <button
          type="submit"
          disabled={creating}
          className="w-full py-3.5 text-white font-semibold rounded-xl transition-colors text-sm disabled:opacity-60"
          style={{ background: ACCENT }}
        >
          {creating ? (
            <span className="flex items-center justify-center gap-2">
              <SpinnerIcon />
              {files.length > 1 ? `Uploading ${files.length} files…` : "Creating link…"}
            </span>
          ) : (
            `Create Share Link${files.length ? ` · ${files.length} file${files.length !== 1 ? "s" : ""}` : ""}`
          )}
        </button>
      </form>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>{children}</p>;
}
function Required() {
  return <span style={{ color: '#EF4444' }}>*</span>;
}

function FileTypeIcon({ type }: { type: string }) {
  const colors: Record<string, string> = {
    image: '#10B981', pdf: '#EF4444', word: '#3B82F6', excel: '#10B981', video: '#8B5CF6',
  };
  const labels: Record<string, string> = {
    image: 'IMG', pdf: 'PDF', word: 'DOC', excel: 'XLS', video: 'VID',
  };
  return (
    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[9px] font-bold"
      style={{ background: `${colors[type] ?? '#6B7280'}18`, color: colors[type] ?? '#6B7280' }}>
      {labels[type] ?? 'FILE'}
    </div>
  );
}

function BackIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>;
}
function UploadIcon({ color }: { color: string }) {
  return <svg width={28} height={28} fill="none" stroke={color} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>;
}
function XIcon() {
  return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
}
function SpinnerIcon() {
  return <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>;
}
