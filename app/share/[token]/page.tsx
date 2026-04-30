"use client";

// app/share/[token]/page.tsx — Public secure viewer
// Swipeable carousel for images/videos, document section below.
// Anti-theft: optional watermark, right-click blocked, drag blocked, keyboard save blocked.

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

type MediaType = "image" | "pdf" | "word" | "excel" | "video";

type MediaItem = {
  id:         string;
  file_name:  string;
  media_type: MediaType;
  signed_url: string | null;
};

type ShareData = {
  title:             string;
  property_title:    string | null;
  watermark_enabled: boolean;
  media:             MediaItem[];
};

export default function ShareViewerPage() {
  const params = useParams();
  const token  = params?.token as string;

  const [data,    setData]    = useState<ShareData | null>(null);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(true);

  // Carousel state
  const [activeIdx, setActiveIdx] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
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

  // ── Anti-theft ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const noCtx  = (e: MouseEvent)    => e.preventDefault();
    const noDrag = (e: DragEvent)     => e.preventDefault();
    const noKeys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["s","u","p"].includes(k)) e.preventDefault();
      if (e.key === "F12") e.preventDefault();
      if (e.ctrlKey && e.shiftKey && ["i","j","c"].includes(k)) e.preventDefault();
    };
    document.addEventListener("contextmenu", noCtx);
    document.addEventListener("dragstart",   noDrag);
    document.addEventListener("keydown",     noKeys);
    return () => {
      document.removeEventListener("contextmenu", noCtx);
      document.removeEventListener("dragstart",   noDrag);
      document.removeEventListener("keydown",     noKeys);
    };
  }, []);

  // ── Carousel navigation ────────────────────────────────────────────────────
  function goTo(idx: number, items: MediaItem[]) {
    const clamped = Math.max(0, Math.min(idx, items.length - 1));
    setActiveIdx(clamped);
    const el = galleryRef.current;
    if (!el) return;
    isScrolling.current = true;
    el.scrollTo({ left: el.clientWidth * clamped, behavior: "smooth" });
    setTimeout(() => { isScrolling.current = false; }, 600);
  }

  function onGalleryScroll(items: MediaItem[]) {
    if (isScrolling.current) return;
    const el = galleryRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
    if (idx !== activeIdx) setActiveIdx(Math.max(0, Math.min(idx, items.length - 1)));
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F1117' }}>
      <div className="flex flex-col items-center gap-3">
        <svg className="w-8 h-8 animate-spin" style={{ color: '#6366F1' }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm" style={{ color: '#6B7280' }}>Loading secure content…</p>
      </div>
    </div>
  );

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0F1117' }}>
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style={{ background: '#1F2937' }}>
          <svg width={28} height={28} fill="none" stroke="#EF4444" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{error || "This link is no longer available."}</p>
        <p className="text-xs mt-6" style={{ color: '#374151' }}>Secured by EstatePro CRM</p>
      </div>
    </div>
  );

  // Split media into visual (image/video) and documents
  const visual = data.media.filter((m) => m.media_type === "image" || m.media_type === "video");
  const docs   = data.media.filter((m) => m.media_type !== "image" && m.media_type !== "video");
  const safeActive = Math.min(activeIdx, Math.max(visual.length - 1, 0));

  return (
    <div className="min-h-screen select-none" style={{ background: '#0F1117' }} onContextMenu={(e) => e.preventDefault()}>

      {/* ── Watermark ──────────────────────────────────────────────────────── */}
      {data.watermark_enabled && (
        <div
          aria-hidden
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            pointerEvents: 'none', overflow: 'hidden',
            display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start',
          }}
        >
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} style={{
              width: '33.333%', padding: '26px 0', textAlign: 'center',
              fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.04)',
              transform: 'rotate(-30deg)', userSelect: 'none', letterSpacing: 3, fontFamily: 'monospace',
            }}>
              PROTECTED
            </div>
          ))}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 flex items-center gap-3 px-4 sm:px-6 py-3"
        style={{ background: '#151820', borderBottom: '1px solid #1F2937' }}
      >
        <div className="flex items-end gap-0.5 shrink-0">
          <div style={{ width: 7, height: 16, borderRadius: 3, background: '#6366F1' }} />
          <div style={{ width: 7, height: 11, borderRadius: 3, background: '#6366F155' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white truncate">{data.title}</p>
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

      <main className="max-w-3xl mx-auto px-0 sm:px-6 py-4">

        {/* ── Image / Video Carousel ──────────────────────────────────────── */}
        {visual.length > 0 && (
          <div className="relative">

            {/* Carousel track */}
            <div
              ref={galleryRef}
              onScroll={() => onGalleryScroll(visual)}
              style={{
                display: 'flex',
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                borderRadius: 'clamp(0px, 2vw, 16px)',
                overflow: 'hidden',
              }}
              className="no-scrollbar"
            >
              {visual.map((item) => (
                <div
                  key={item.id}
                  style={{ flex: '0 0 100%', scrollSnapAlign: 'start', minWidth: '100%' }}
                >
                  {item.media_type === "image" && item.signed_url ? (
                    <div
                      style={{
                        background: '#151820',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        minHeight: 300,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.signed_url}
                        alt=""
                        draggable={false}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '72vh',
                          objectFit: 'contain',
                          display: 'block',
                          userSelect: 'none',
                          WebkitUserDrag: 'none',
                        } as React.CSSProperties}
                      />
                    </div>
                  ) : item.media_type === "video" && item.signed_url ? (
                    <div style={{ background: '#000' }}>
                      <video
                        src={item.signed_url}
                        controls
                        controlsList="nodownload nofullscreen"
                        disablePictureInPicture
                        playsInline
                        style={{ width: '100%', maxHeight: '72vh', display: 'block' }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-20" style={{ color: '#4B5563', fontSize: 14 }}>
                      File unavailable.
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── Arrow buttons (desktop) ─────────────────────────────── */}
            {visual.length > 1 && (
              <>
                {safeActive > 0 && (
                  <button
                    onClick={() => goTo(safeActive - 1, visual)}
                    className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-10 h-10 rounded-full transition-colors"
                    style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}
                  >
                    <svg width={20} height={20} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                {safeActive < visual.length - 1 && (
                  <button
                    onClick={() => goTo(safeActive + 1, visual)}
                    className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-10 h-10 rounded-full transition-colors"
                    style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}
                  >
                    <svg width={20} height={20} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </>
            )}

            {/* ── Counter badge (top right) ────────────────────────────── */}
            {visual.length > 1 && (
              <div
                className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(0,0,0,0.55)', color: 'white' }}
              >
                {safeActive + 1} / {visual.length}
              </div>
            )}

            {/* ── Dot indicators ────────────────────────────────────────── */}
            {visual.length > 1 && (
              <div className="flex justify-center gap-1.5 py-3">
                {visual.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i, visual)}
                    style={{
                      height: 6, borderRadius: 99,
                      width:      i === safeActive ? 20 : 6,
                      background: i === safeActive ? '#6366F1' : '#374151',
                      transition: 'all 0.25s',
                    }}
                  />
                ))}
              </div>
            )}

            {/* ── Thumbnail strip (shown when 3+ images) ───────────────── */}
            {visual.length >= 3 && (
              <div
                className="flex gap-2 px-4 sm:px-0 overflow-x-auto pb-1 no-scrollbar"
                style={{ scrollbarWidth: 'none' }}
              >
                {visual.map((item, i) => (
                  <button
                    key={item.id}
                    onClick={() => goTo(i, visual)}
                    className="shrink-0 rounded-xl overflow-hidden transition-all"
                    style={{
                      width: 64, height: 64,
                      opacity: i === safeActive ? 1 : 0.45,
                      border: `2px solid ${i === safeActive ? '#6366F1' : 'transparent'}`,
                    }}
                  >
                    {item.media_type === "image" && item.signed_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.signed_url}
                        alt=""
                        draggable={false}
                        className="w-full h-full object-cover"
                        style={{ userSelect: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: '#1F2937' }}>
                        <svg width={20} height={20} fill="none" stroke="#6366F1" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Documents section ────────────────────────────────────────────── */}
        {docs.length > 0 && (
          <div className={`px-4 sm:px-0 ${visual.length > 0 ? "mt-6" : ""}`}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#4B5563' }}>Documents</p>
            <div className="space-y-3">
              {docs.map((doc) => (
                <div key={doc.id} className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1F2937' }}>
                  {/* File header */}
                  <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#151820' }}>
                    <DocTypeTag type={doc.media_type} />
                    <p className="text-sm text-white truncate flex-1">{doc.file_name}</p>
                  </div>
                  {/* Viewer */}
                  {doc.signed_url && (
                    doc.media_type === "pdf" ? (
                      <iframe
                        src={doc.signed_url}
                        title={doc.file_name}
                        style={{ width: '100%', height: '80vh', border: 'none', display: 'block' }}
                        sandbox="allow-scripts allow-same-origin"
                      />
                    ) : (
                      <iframe
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(doc.signed_url)}&embedded=true`}
                        title={doc.file_name}
                        style={{ width: '100%', height: '80vh', border: 'none', display: 'block' }}
                      />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No media fallback */}
        {data.media.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24" style={{ color: '#4B5563' }}>
            <p className="text-sm">No files attached to this link.</p>
          </div>
        )}
      </main>

      <footer className="text-center py-8 px-4">
        <p className="text-[10px]" style={{ color: '#1F2937' }}>Protected by EstatePro CRM · Unauthorized distribution prohibited</p>
      </footer>
    </div>
  );
}

function DocTypeTag({ type }: { type: string }) {
  const map: Record<string, { label: string; color: string }> = {
    pdf:   { label: "PDF", color: "#EF4444" },
    word:  { label: "DOC", color: "#3B82F6" },
    excel: { label: "XLS", color: "#10B981" },
  };
  const { label, color } = map[type] ?? { label: "FILE", color: "#6B7280" };
  return (
    <span
      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0"
      style={{ background: `${color}22`, color }}
    >
      {label}
    </span>
  );
}
