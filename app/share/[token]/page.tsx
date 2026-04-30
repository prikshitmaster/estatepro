"use client";

// app/share/[token]/page.tsx — Public secure viewer
// No auth required. Fetches signed URLs from /api/share/[token].
// Anti-theft: watermark overlay, right-click blocked, drag blocked, Ctrl+S/U blocked.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type MediaItem = {
  id:         string;
  file_name:  string;
  media_type: "image" | "pdf" | "word" | "excel" | "video";
  signed_url: string | null;
};

type ShareData = {
  title:          string;
  property_title: string | null;
  media:          MediaItem[];
};

export default function ShareViewerPage() {
  const params = useParams();
  const token  = params?.token as string;

  const [data,    setData]    = useState<ShareData | null>(null);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(true);
  const [active,  setActive]  = useState(0); // selected media index

  // ── Fetch share data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    fetch(`/api/share/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) { setError(json.error ?? "Unable to load this link."); return; }
        setData(json);
      })
      .catch(() => setError("Network error. Please try again."))
      .finally(() => setLoading(false));
  }, [token]);

  // ── Anti-theft ────────────────────────────────────────────────────────────
  useEffect(() => {
    const noContext = (e: MouseEvent)   => e.preventDefault();
    const noDrag    = (e: DragEvent)    => e.preventDefault();
    const noKeys    = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      // Block Ctrl/Cmd + S, U, P, Shift+I (dev tools)
      if ((e.ctrlKey || e.metaKey) && ["s", "u", "p"].includes(k)) e.preventDefault();
      if (e.key === "F12") e.preventDefault();
      if (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(k)) e.preventDefault();
    };
    document.addEventListener("contextmenu", noContext);
    document.addEventListener("dragstart",   noDrag);
    document.addEventListener("keydown",     noKeys);
    return () => {
      document.removeEventListener("contextmenu", noContext);
      document.removeEventListener("dragstart",   noDrag);
      document.removeEventListener("keydown",     noKeys);
    };
  }, []);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F1117' }}>
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-[#6366F1]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-400">Loading secure content…</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0F1117' }}>
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style={{ background: '#1F2937' }}>
            <svg width={28} height={28} fill="none" stroke="#EF4444" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-sm text-gray-400 leading-relaxed">{error || "This link is no longer available."}</p>
          <p className="text-xs text-gray-600 mt-6">Secured by EstatePro CRM</p>
        </div>
      </div>
    );
  }

  const current = data.media[active] ?? null;
  const images  = data.media.filter((m) => m.media_type === "image");
  const docs    = data.media.filter((m) => m.media_type !== "image");

  return (
    <div
      className="min-h-screen select-none"
      style={{ background: '#0F1117' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ── Watermark overlay ──────────────────────────────────────────────── */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          pointerEvents: 'none', overflow: 'hidden',
          display: 'flex', flexWrap: 'wrap',
          alignContent: 'flex-start',
          gap: 0,
        }}
      >
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '33.333%',
              padding: '28px 0',
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.04)',
              transform: 'rotate(-30deg)',
              userSelect: 'none',
              letterSpacing: 3,
              fontFamily: 'monospace',
            }}
          >
            PROTECTED
          </div>
        ))}
      </div>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4 sm:px-6 py-3" style={{ background: '#151820', borderBottom: '1px solid #1F2937' }}>
        {/* EstatePro branding */}
        <div className="flex items-end gap-0.5 shrink-0">
          <div style={{ width: 7, height: 16, borderRadius: 3, background: '#6366F1' }} />
          <div style={{ width: 7, height: 11, borderRadius: 3, background: '#6366F155' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate text-white">{data.title}</p>
          {data.property_title && (
            <p className="text-xs truncate" style={{ color: '#6B7280' }}>{data.property_title}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0" style={{ background: '#1F2937' }}>
          <svg width={11} height={11} fill="none" stroke="#6366F1" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-[10px] font-semibold" style={{ color: '#6366F1' }}>Secured</span>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5">

        {/* File tabs — shown when there are multiple files */}
        {data.media.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {data.media.map((m, i) => (
              <button
                key={m.id}
                onClick={() => setActive(i)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0"
                style={{
                  background: active === i ? '#6366F1' : '#1F2937',
                  color:      active === i ? '#fff'    : '#9CA3AF',
                  border:     `1px solid ${active === i ? '#6366F1' : '#374151'}`,
                }}
              >
                <FileTypeTag type={m.media_type} />
                <span className="max-w-[100px] truncate">{m.file_name}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Single active viewer ────────────────────────────────────────── */}
        {current && (
          <div className="rounded-2xl overflow-hidden" style={{ background: '#151820', border: '1px solid #1F2937' }}>
            {current.media_type === "image" && current.signed_url && (
              <div className="flex items-center justify-center min-h-[50vh] p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.signed_url}
                  alt=""
                  draggable={false}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '75vh',
                    objectFit: 'contain',
                    borderRadius: 12,
                    userSelect: 'none',
                    WebkitUserDrag: 'none',
                  } as React.CSSProperties}
                />
              </div>
            )}

            {current.media_type === "pdf" && current.signed_url && (
              <iframe
                src={current.signed_url}
                title={current.file_name}
                style={{ width: '100%', height: '80vh', border: 'none' }}
                sandbox="allow-scripts allow-same-origin"
              />
            )}

            {(current.media_type === "word" || current.media_type === "excel") && current.signed_url && (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(current.signed_url)}&embedded=true`}
                title={current.file_name}
                style={{ width: '100%', height: '80vh', border: 'none' }}
              />
            )}

            {current.media_type === "video" && current.signed_url && (
              <video
                src={current.signed_url}
                controls
                controlsList="nodownload"
                disablePictureInPicture
                style={{ width: '100%', maxHeight: '80vh', display: 'block' }}
              />
            )}

            {!current.signed_url && (
              <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
                File unavailable.
              </div>
            )}
          </div>
        )}

        {/* ── Image grid — shown below viewer if multiple images ────────────── */}
        {images.length > 1 && (
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
            {images.map((img, i) => {
              const idx = data.media.indexOf(img);
              return (
                <button
                  key={img.id}
                  onClick={() => setActive(idx)}
                  className="rounded-xl overflow-hidden aspect-square transition-all"
                  style={{
                    opacity: active === idx ? 1 : 0.5,
                    border: `2px solid ${active === idx ? '#6366F1' : 'transparent'}`,
                  }}
                >
                  {img.signed_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.signed_url}
                      alt=""
                      draggable={false}
                      className="w-full h-full object-cover"
                      style={{ userSelect: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Documents list ── */}
        {docs.length > 0 && images.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Documents</p>
            <div className="space-y-1.5">
              {docs.map((doc) => {
                const idx = data.media.indexOf(doc);
                return (
                  <button
                    key={doc.id}
                    onClick={() => setActive(idx)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-colors"
                    style={{
                      background: active === idx ? '#6366F118' : '#1F2937',
                      border: `1px solid ${active === idx ? '#6366F1' : 'transparent'}`,
                    }}
                  >
                    <FileTypeTag type={doc.media_type} large />
                    <span className="text-sm text-gray-300 truncate">{doc.file_name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="text-center py-6">
        <p className="text-[10px]" style={{ color: '#374151' }}>Protected by EstatePro CRM · Unauthorized distribution prohibited</p>
      </footer>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function FileTypeTag({ type, large }: { type: string; large?: boolean }) {
  const map: Record<string, { label: string; color: string }> = {
    image: { label: "IMG", color: "#10B981" },
    pdf:   { label: "PDF", color: "#EF4444" },
    word:  { label: "DOC", color: "#3B82F6" },
    excel: { label: "XLS", color: "#10B981" },
    video: { label: "VID", color: "#8B5CF6" },
  };
  const { label, color } = map[type] ?? { label: "FILE", color: "#6B7280" };
  const size = large ? "w-8 h-8 text-[10px]" : "w-5 h-5 text-[8px]";
  return (
    <span
      className={`${size} rounded flex items-center justify-center font-bold shrink-0`}
      style={{ background: `${color}22`, color }}
    >
      {label}
    </span>
  );
}
