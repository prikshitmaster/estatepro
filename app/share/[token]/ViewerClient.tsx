"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

type MediaItem = {
  id: string;
  file_name: string;
  media_type: "image" | "pdf" | "video" | "word" | "excel";
  signed_url: string | null;
};

type ViewerData = {
  title: string;
  property_title: string | null;
  watermark_enabled: boolean;
  watermark_text: string;
  media: MediaItem[];
};

export default function ViewerClient() {
  const params = useParams();
  const token  = params?.token as string;

  const [data,    setData]    = useState<ViewerData | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [active,  setActive]  = useState(0);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/share/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load");
        setData(json);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  // Keyboard navigation
  const go = useCallback((dir: 1 | -1) => {
    if (!data) return;
    setActive((i) => (i + dir + data.media.length) % data.media.length);
  }, [data]);

  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft")  go(-1);
      if ((e.ctrlKey || e.metaKey) && ["s","u","p"].includes(e.key.toLowerCase())) e.preventDefault();
      if (e.key === "F12") e.preventDefault();
    };
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener("keydown",     keys);
    document.addEventListener("contextmenu", stop);
    document.addEventListener("dragstart",   stop);
    return () => {
      document.removeEventListener("keydown",     keys);
      document.removeEventListener("contextmenu", stop);
      document.removeEventListener("dragstart",   stop);
    };
  }, [go]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ position:"fixed", inset:0, background:"#0a0a0a", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:28, height:28, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.08)", borderTopColor:"rgba(255,255,255,0.5)", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !data) return (
    <div style={{ position:"fixed", inset:0, background:"#0a0a0a", display:"flex", alignItems:"center", justifyContent:"center", padding:24, textAlign:"center" }}>
      <div>
        <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
        <p style={{ color:"rgba(255,255,255,0.8)", fontWeight:600, marginBottom:6 }}>{error ?? "Link not found"}</p>
        <p style={{ color:"rgba(255,255,255,0.3)", fontSize:13 }}>This link may have expired or been revoked.</p>
      </div>
    </div>
  );

  const current  = data.media[active];
  const total    = data.media.length;
  const wText    = (data.watermark_text || "PROTECTED · ESTATEPRO").toUpperCase();

  // SVG watermark tile — CSS background-repeat covers entire screen evenly
  const svgTile = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="80">` +
    `<text x="10" y="52" font-family="Arial,sans-serif" font-size="11" font-weight="700" ` +
    `letter-spacing="2" fill="rgba(255,255,255,0.11)">${wText}</text></svg>`
  );

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow: hidden; background: #0a0a0a; }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
      `}</style>

      {/* ── ROOT: true fullscreen ── */}
      <div
        style={{
          position:   "fixed",
          inset:       0,
          background: "#0a0a0a",
          userSelect: "none",
          WebkitUserSelect: "none",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* ── WATERMARK — tiles perfectly across the entire screen ── */}
        {data.watermark_enabled && (
          <div
            aria-hidden
            style={{
              position:         "absolute",
              inset:            0,
              zIndex:           10,
              pointerEvents:    "none",
              overflow:         "hidden",
            }}
          >
            <div style={{
              position:        "absolute",
              top:             "-50%",
              left:            "-50%",
              width:           "200%",
              height:          "200%",
              transform:       "rotate(-28deg)",
              backgroundImage: `url("data:image/svg+xml,${svgTile}")`,
              backgroundRepeat:"repeat",
              backgroundSize:  "300px 80px",
            }} />
          </div>
        )}

        {/* ── MEDIA AREA — fills entire screen ── */}
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {current?.media_type === "image" && current.signed_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={current.id}
              src={current.signed_url}
              alt={current.file_name}
              draggable={false}
              style={{
                maxWidth:   "100%",
                maxHeight:  "100%",
                width:       "100%",
                height:      "100%",
                objectFit:  "contain",
                display:    "block",
                animation:  "fadeIn 0.3s ease",
              }}
            />
          )}

          {current?.media_type === "video" && current.signed_url && (
            <video
              key={current.id}
              src={current.signed_url}
              controls
              controlsList="nodownload"
              disablePictureInPicture
              autoPlay
              style={{ maxWidth:"100%", maxHeight:"100%", width:"100%", height:"100%", objectFit:"contain", background:"#000" }}
            />
          )}

          {current?.media_type === "pdf" && current.signed_url && (
            <iframe
              key={current.id}
              src={`${current.signed_url}#toolbar=0&navpanes=0`}
              style={{ width:"100%", height:"100%", border:"none" }}
              title={current.file_name}
            />
          )}

          {(current?.media_type === "word" || current?.media_type === "excel") && current.signed_url && (
            <iframe
              key={current.id}
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(current.signed_url)}&embedded=true`}
              style={{ width:"100%", height:"100%", border:"none", background:"#fff" }}
              title={current.file_name}
            />
          )}
        </div>

        {/* ── TOP GRADIENT + HEADER ── */}
        <div
          style={{
            position:   "absolute",
            top:        0,
            left:       0,
            right:      0,
            zIndex:     20,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 100%)",
            padding:    "16px 20px 48px",
          }}
        >
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
            {/* Title */}
            <div style={{ minWidth:0, flex:1 }}>
              <p style={{ color:"#fff", fontWeight:700, fontSize:15, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {data.title}
              </p>
              {data.property_title && (
                <p style={{ color:"rgba(255,255,255,0.5)", fontSize:12, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {data.property_title}
                </p>
              )}
            </div>
            {/* Badges */}
            <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
              {total > 1 && (
                <span style={{ color:"rgba(255,255,255,0.5)", fontSize:12, fontWeight:600 }}>
                  {active + 1} / {total}
                </span>
              )}
              <span style={{ background:"rgba(99,102,241,0.25)", color:"#c7d2fe", fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:20, border:"1px solid rgba(99,102,241,0.3)" }}>
                🔒 SECURED
              </span>
            </div>
          </div>
        </div>

        {/* ── LEFT / RIGHT NAV ARROWS (only for multiple files) ── */}
        {total > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              style={{
                position:  "absolute",
                left:      12,
                top:       "50%",
                transform: "translateY(-50%)",
                zIndex:    20,
                width:     44,
                height:    44,
                borderRadius: "50%",
                background:"rgba(0,0,0,0.45)",
                border:    "1px solid rgba(255,255,255,0.12)",
                color:     "#fff",
                fontSize:  20,
                cursor:    "pointer",
                display:   "flex",
                alignItems:"center",
                justifyContent:"center",
                backdropFilter:"blur(6px)",
              }}
            >
              ‹
            </button>
            <button
              onClick={() => go(1)}
              style={{
                position:  "absolute",
                right:     12,
                top:       "50%",
                transform: "translateY(-50%)",
                zIndex:    20,
                width:     44,
                height:    44,
                borderRadius:"50%",
                background:"rgba(0,0,0,0.45)",
                border:    "1px solid rgba(255,255,255,0.12)",
                color:     "#fff",
                fontSize:  20,
                cursor:    "pointer",
                display:   "flex",
                alignItems:"center",
                justifyContent:"center",
                backdropFilter:"blur(6px)",
              }}
            >
              ›
            </button>
          </>
        )}

        {/* ── BOTTOM GRADIENT + THUMBNAILS + FOOTER ── */}
        <div
          style={{
            position:   "absolute",
            bottom:     0,
            left:       0,
            right:      0,
            zIndex:     20,
            background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",
            paddingTop: 48,
          }}
        >
          {/* Thumbnail strip */}
          {total > 1 && (
            <div
              style={{
                display:        "flex",
                gap:            8,
                justifyContent: "center",
                padding:        "0 16px 12px",
                overflowX:      "auto",
                scrollbarWidth: "none",
              }}
            >
              {data.media.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setActive(i)}
                  style={{
                    flexShrink:  0,
                    width:       i === active ? 58 : 50,
                    height:      i === active ? 58 : 50,
                    borderRadius: 8,
                    overflow:    "hidden",
                    border:      i === active ? "2px solid #6366F1" : "2px solid rgba(255,255,255,0.12)",
                    opacity:     i === active ? 1 : 0.45,
                    transition:  "all 0.2s ease",
                    cursor:      "pointer",
                    background:  "rgba(255,255,255,0.06)",
                    padding:     0,
                  }}
                >
                  {m.media_type === "image" && m.signed_url
                    ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.signed_url} alt="" draggable={false} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                    ) : (
                      <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.4)", fontSize:9, fontWeight:700 }}>
                        {m.media_type.slice(0,3).toUpperCase()}
                      </div>
                    )
                  }
                </button>
              ))}
            </div>
          )}

          {/* Footer text */}
          <p style={{ textAlign:"center", color:"rgba(255,255,255,0.18)", fontSize:10, paddingBottom:10 }}>
            Secured by EstatePro CRM · Unauthorized sharing prohibited
          </p>
        </div>
      </div>
    </>
  );
}
