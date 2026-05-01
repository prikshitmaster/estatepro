"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { formatPriceFull } from "@/lib/format-price";

type MediaItem = {
  id: string;
  file_name: string;
  media_type: "image" | "pdf" | "video" | "word" | "excel";
  signed_url: string | null;
};

type PropertyDetails = {
  price: number;
  location: string;
  type: string;
  bedrooms?: string;
  area_sqft?: number;
  furnishing?: string;
  bathrooms?: number;
  parking?: number;
  floor_no?: number;
  total_floors?: number;
  facing?: string;
  possession?: string;
  amenities?: string[];
  description?: string;
};

type ViewerData = {
  title: string;
  property_title: string | null;
  watermark_enabled: boolean;
  watermark_text: string;
  media: MediaItem[];
  property_details: PropertyDetails | null;
};

export default function ViewerClient() {
  const params = useParams();
  const token  = params?.token as string;

  const [data,         setData]        = useState<ViewerData | null>(null);
  const [error,        setError]       = useState<string | null>(null);
  const [loading,      setLoading]     = useState(true);
  const [active,       setActive]      = useState(0);
  const [focused,      setFocused]     = useState(true);
  const [detailsOpen,  setDetailsOpen] = useState(false);

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

  const go = useCallback((dir: 1 | -1) => {
    if (!data) return;
    setActive((i) => (i + dir + data.media.length) % data.media.length);
  }, [data]);

  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft")  go(-1);
      if (e.key === "Escape")     setDetailsOpen(false);
      if ((e.ctrlKey || e.metaKey) && ["s","u","p"].includes(e.key.toLowerCase())) e.preventDefault();
      if (e.key === "F12") e.preventDefault();
    };
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener("keydown",     keys);
    document.addEventListener("contextmenu", stop);
    document.addEventListener("dragstart",   stop);

    const hide      = () => setFocused(false);
    const show      = () => setFocused(true);
    const visChange = () => document.hidden ? setFocused(false) : setFocused(true);
    window.addEventListener("blur",              hide);
    window.addEventListener("focus",             show);
    document.addEventListener("visibilitychange", visChange);

    return () => {
      document.removeEventListener("keydown",           keys);
      document.removeEventListener("contextmenu",       stop);
      document.removeEventListener("dragstart",         stop);
      window.removeEventListener("blur",                hide);
      window.removeEventListener("focus",               show);
      document.removeEventListener("visibilitychange",  visChange);
    };
  }, [go]);

  if (loading) return (
    <div style={{ position:"fixed", inset:0, background:"#0a0a0a", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:28, height:28, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.08)", borderTopColor:"rgba(255,255,255,0.5)", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !data) return (
    <div style={{ position:"fixed", inset:0, background:"#0a0a0a", display:"flex", alignItems:"center", justifyContent:"center", padding:24, textAlign:"center" }}>
      <div>
        <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
        <p style={{ color:"rgba(255,255,255,0.8)", fontWeight:600, marginBottom:6 }}>{error ?? "Link not found"}</p>
        <p style={{ color:"rgba(255,255,255,0.3)", fontSize:13 }}>This link may have expired or been revoked.</p>
      </div>
    </div>
  );

  const current = data.media[active];
  const total   = data.media.length;
  const wText   = (data.watermark_text || "PROTECTED · ESTATEPRO").toUpperCase();
  const pd      = data.property_details;

  const svgTile = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="80">` +
    `<text x="10" y="52" font-family="Arial,sans-serif" font-size="11" font-weight="700" ` +
    `letter-spacing="2" fill="rgba(255,255,255,0.18)">${wText}</text></svg>`
  );

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow: hidden; background: #0a0a0a; }
        @keyframes fadeIn   { from { opacity:0 }            to { opacity:1 } }
        @keyframes slideUp  { from { transform:translateY(100%) } to { transform:translateY(0) } }
        @keyframes fadeBack { from { opacity:0 }            to { opacity:1 } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
      `}</style>

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

        {/* ── BLUR SHIELD ── */}
        {!focused && (
          <div style={{
            position:"absolute", inset:0, zIndex:30,
            backdropFilter:"blur(32px)", WebkitBackdropFilter:"blur(32px)",
            background:"rgba(0,0,0,0.72)",
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12,
          }}>
            <div style={{ fontSize:40 }}>🔒</div>
            <p style={{ color:"#fff", fontWeight:700, fontSize:16 }}>Content hidden</p>
            <p style={{ color:"rgba(255,255,255,0.45)", fontSize:13 }}>Click here to continue viewing</p>
          </div>
        )}

        {/* ── WATERMARK ── */}
        {data.watermark_enabled && (
          <div aria-hidden style={{ position:"absolute", inset:0, zIndex:10, pointerEvents:"none", overflow:"hidden" }}>
            <div style={{
              position:"absolute", top:"-50%", left:"-50%", width:"200%", height:"200%",
              transform:"rotate(-28deg)",
              backgroundImage:`url("data:image/svg+xml,${svgTile}")`,
              backgroundRepeat:"repeat", backgroundSize:"300px 80px",
            }} />
          </div>
        )}

        {/* ── AMBIENT BLURRED BACKGROUND ── */}
        {(current?.media_type === "image" || current?.media_type === "video") && current?.signed_url && (
          current.media_type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={"bg-"+current.id} src={current.signed_url} alt="" aria-hidden draggable={false}
              style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover",
                filter:"blur(28px) brightness(0.35) saturate(1.4)", transform:"scale(1.08)", pointerEvents:"none" }} />
          ) : (
            <video key={"bg-"+current.id} src={current.signed_url} aria-hidden muted playsInline
              style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover",
                filter:"blur(28px) brightness(0.3) saturate(1.3)", transform:"scale(1.08)", pointerEvents:"none" }} />
          )
        )}

        {/* ── MEDIA AREA ── */}
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {current?.media_type === "image" && current.signed_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={current.id} src={current.signed_url} alt={current.file_name} draggable={false}
              style={{ maxWidth:"100%", maxHeight:"100%", width:"100%", height:"100%",
                objectFit:"contain", display:"block", animation:"fadeIn 0.3s ease", position:"relative", zIndex:1 }} />
          )}
          {current?.media_type === "video" && current.signed_url && (
            <video key={current.id} src={current.signed_url} controls controlsList="nodownload"
              disablePictureInPicture autoPlay
              style={{ maxWidth:"100%", maxHeight:"100%", width:"100%", height:"100%",
                objectFit:"contain", background:"transparent", position:"relative", zIndex:1 }} />
          )}
          {current?.media_type === "pdf" && current.signed_url && (
            <iframe key={current.id} src={`${current.signed_url}#toolbar=0&navpanes=0`}
              style={{ width:"100%", height:"100%", border:"none" }} title={current.file_name} />
          )}
          {(current?.media_type === "word" || current?.media_type === "excel") && current.signed_url && (
            <iframe key={current.id}
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(current.signed_url)}&embedded=true`}
              style={{ width:"100%", height:"100%", border:"none", background:"#fff" }} title={current.file_name} />
          )}
        </div>

        {/* ── TOP GRADIENT + HEADER ── */}
        <div style={{
          position:"absolute", top:0, left:0, right:0, zIndex:20,
          background:"linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 100%)",
          padding:"16px 20px 48px",
        }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
            <div style={{ minWidth:0, flex:1 }}>
              <p style={{ color:"#fff", fontWeight:700, fontSize:15, lineHeight:1.3,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {data.title}
              </p>
              {data.property_title && (
                <p style={{ color:"rgba(255,255,255,0.5)", fontSize:12, marginTop:2,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {data.property_title}
                </p>
              )}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
              {total > 1 && (
                <span style={{ color:"rgba(255,255,255,0.5)", fontSize:12, fontWeight:600 }}>
                  {active + 1} / {total}
                </span>
              )}
              <span style={{ background:"rgba(99,102,241,0.25)", color:"#c7d2fe", fontSize:10,
                fontWeight:700, padding:"3px 8px", borderRadius:20,
                border:"1px solid rgba(99,102,241,0.3)" }}>
                🔒 SECURED
              </span>
            </div>
          </div>
        </div>

        {/* ── LEFT / RIGHT NAV ARROWS ── */}
        {total > 1 && (
          <>
            <button onClick={() => go(-1)} style={{
              position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", zIndex:20,
              width:44, height:44, borderRadius:"50%", background:"rgba(0,0,0,0.45)",
              border:"1px solid rgba(255,255,255,0.12)", color:"#fff", fontSize:20,
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
              backdropFilter:"blur(6px)",
            }}>‹</button>
            <button onClick={() => go(1)} style={{
              position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", zIndex:20,
              width:44, height:44, borderRadius:"50%", background:"rgba(0,0,0,0.45)",
              border:"1px solid rgba(255,255,255,0.12)", color:"#fff", fontSize:20,
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
              backdropFilter:"blur(6px)",
            }}>›</button>
          </>
        )}

        {/* ── BOTTOM GRADIENT + THUMBNAILS + PROPERTY STRIP + FOOTER ── */}
        <div style={{
          position:"absolute", bottom:0, left:0, right:0, zIndex:20,
          background:"linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)",
          paddingTop:48,
        }}>
          {/* Thumbnail strip */}
          {total > 1 && (
            <div style={{
              display:"flex", gap:8, justifyContent:"center",
              padding:"0 16px 12px", overflowX:"auto", scrollbarWidth:"none",
            }}>
              {data.media.map((m, i) => (
                <button key={m.id} onClick={() => setActive(i)} style={{
                  flexShrink:0,
                  width:  i === active ? 58 : 50,
                  height: i === active ? 58 : 50,
                  borderRadius:8, overflow:"hidden",
                  border: i === active ? "2px solid #6366F1" : "2px solid rgba(255,255,255,0.12)",
                  opacity: i === active ? 1 : 0.45,
                  transition:"all 0.2s ease", cursor:"pointer",
                  background:"rgba(255,255,255,0.06)", padding:0,
                }}>
                  {m.media_type === "image" && m.signed_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={m.signed_url} alt="" draggable={false} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                    : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.4)", fontSize:9, fontWeight:700 }}>
                        {m.media_type.slice(0,3).toUpperCase()}
                      </div>
                  }
                </button>
              ))}
            </div>
          )}

          {/* ── Property info strip (collapsed) ── */}
          {pd && (
            <div style={{
              display:"flex", alignItems:"center", padding:"4px 16px 12px", gap:12,
            }}>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ color:"#fff", fontWeight:800, fontSize:15, lineHeight:1.2 }}>
                  {formatPriceFull(pd.price)}
                </p>
                <p style={{
                  color:"rgba(255,255,255,0.45)", fontSize:12, marginTop:2,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                }}>
                  {[pd.bedrooms, pd.location].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button
                onClick={() => setDetailsOpen(true)}
                style={{
                  background:"rgba(99,102,241,0.22)",
                  border:"1px solid rgba(99,102,241,0.4)",
                  color:"#a5b4fc",
                  borderRadius:20,
                  padding:"7px 14px",
                  fontSize:12,
                  fontWeight:700,
                  cursor:"pointer",
                  flexShrink:0,
                  display:"flex",
                  alignItems:"center",
                  gap:5,
                  backdropFilter:"blur(6px)",
                }}
              >
                Details
                <span style={{ fontSize:10 }}>↑</span>
              </button>
            </div>
          )}

          {/* Footer */}
          <p style={{ textAlign:"center", color:"rgba(255,255,255,0.18)", fontSize:10, paddingBottom:10 }}>
            Secured by EstatePro CRM · Unauthorized sharing prohibited
          </p>
        </div>

        {/* ── PROPERTY DETAILS PANEL (slide-up) ── */}
        {detailsOpen && pd && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setDetailsOpen(false)}
              style={{
                position:"absolute", inset:0, zIndex:22,
                background:"rgba(0,0,0,0.4)",
                animation:"fadeBack 0.2s ease",
              }}
            />

            {/* Panel */}
            <div style={{
              position:       "absolute",
              bottom:          0,
              left:            0,
              right:           0,
              zIndex:          23,
              maxHeight:       "72vh",
              background:      "rgba(8,8,8,0.97)",
              backdropFilter:  "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
              borderRadius:    "22px 22px 0 0",
              border:          "1px solid rgba(255,255,255,0.07)",
              borderBottom:    "none",
              overflowY:       "auto",
              animation:       "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
            }}>
              {/* Handle + close */}
              <div style={{
                position:"sticky", top:0,
                background:"rgba(8,8,8,0.97)",
                backdropFilter:"blur(32px)",
                WebkitBackdropFilter:"blur(32px)",
                paddingTop:12, paddingBottom:12,
                borderBottom:"1px solid rgba(255,255,255,0.06)",
                zIndex:1,
              }}>
                <div style={{
                  width:36, height:4, borderRadius:2,
                  background:"rgba(255,255,255,0.15)",
                  margin:"0 auto 12px",
                }} />
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 20px" }}>
                  <p style={{ color:"#fff", fontWeight:700, fontSize:16 }}>Property Details</p>
                  <button
                    onClick={() => setDetailsOpen(false)}
                    style={{
                      width:30, height:30, borderRadius:"50%",
                      background:"rgba(255,255,255,0.08)",
                      border:"1px solid rgba(255,255,255,0.1)",
                      color:"rgba(255,255,255,0.6)",
                      fontSize:16, cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}
                  >
                    ↓
                  </button>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding:"20px 20px 40px" }}>

                {/* Price */}
                <div style={{
                  padding:"16px 18px", borderRadius:16, marginBottom:16,
                  background:"linear-gradient(135deg, rgba(27,196,125,0.12) 0%, rgba(27,196,125,0.06) 100%)",
                  border:"1px solid rgba(27,196,125,0.2)",
                }}>
                  <p style={{ color:"rgba(27,196,125,0.7)", fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:4 }}>Price</p>
                  <p style={{ color:"#4ade80", fontWeight:800, fontSize:24, letterSpacing:-0.5 }}>{formatPriceFull(pd.price)}</p>
                </div>

                {/* Location */}
                {pd.location && (
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
                    <span style={{ fontSize:16 }}>📍</span>
                    <p style={{ color:"rgba(255,255,255,0.7)", fontSize:14 }}>{pd.location}</p>
                  </div>
                )}

                {/* Specs grid */}
                {(pd.bedrooms || pd.area_sqft || pd.furnishing || pd.bathrooms ||
                  pd.parking !== undefined || pd.floor_no || pd.facing || pd.possession) && (
                  <div style={{ marginBottom:20 }}>
                    <p style={{ color:"rgba(255,255,255,0.3)", fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:12 }}>Specifications</p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      {pd.bedrooms && <SpecCard icon="🏠" label="Config"     value={pd.bedrooms} />}
                      {pd.area_sqft && <SpecCard icon="📐" label="Area"      value={`${pd.area_sqft.toLocaleString("en-IN")} sq ft`} />}
                      {pd.furnishing && <SpecCard icon="🛋️" label="Furnishing" value={pd.furnishing} />}
                      {pd.bathrooms && <SpecCard icon="🚿" label="Bathrooms"  value={String(pd.bathrooms)} />}
                      {pd.parking !== undefined && <SpecCard icon="🚗" label="Parking" value={pd.parking === 0 ? "None" : `${pd.parking} spot${pd.parking > 1 ? "s" : ""}`} />}
                      {(pd.floor_no || pd.total_floors) && (
                        <SpecCard icon="🏗️" label="Floor"
                          value={pd.floor_no && pd.total_floors ? `${pd.floor_no} / ${pd.total_floors}` : String(pd.floor_no ?? pd.total_floors)} />
                      )}
                      {pd.facing    && <SpecCard icon="🧭" label="Facing"     value={pd.facing} />}
                      {pd.possession && <SpecCard icon="🔑" label="Possession" value={pd.possession} />}
                    </div>
                  </div>
                )}

                {/* Amenities */}
                {pd.amenities && pd.amenities.length > 0 && (
                  <div style={{ marginBottom:20 }}>
                    <p style={{ color:"rgba(255,255,255,0.3)", fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:12 }}>
                      Amenities ({pd.amenities.length})
                    </p>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                      {pd.amenities.map((a) => (
                        <span key={a} style={{
                          padding:"6px 12px", borderRadius:20, fontSize:12, fontWeight:600,
                          background:"rgba(27,196,125,0.1)",
                          border:"1px solid rgba(27,196,125,0.2)",
                          color:"rgba(74,222,128,0.85)",
                        }}>
                          ✓ {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {pd.description && (
                  <div>
                    <p style={{ color:"rgba(255,255,255,0.3)", fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>About</p>
                    <p style={{ color:"rgba(255,255,255,0.65)", fontSize:13, lineHeight:1.65 }}>{pd.description}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </>
  );
}

function SpecCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{
      padding:"12px 14px", borderRadius:12,
      background:"rgba(255,255,255,0.04)",
      border:"1px solid rgba(255,255,255,0.07)",
    }}>
      <p style={{ color:"rgba(255,255,255,0.3)", fontSize:10, fontWeight:600, letterSpacing:0.5, textTransform:"uppercase", marginBottom:4 }}>
        {icon} {label}
      </p>
      <p style={{ color:"rgba(255,255,255,0.85)", fontSize:13, fontWeight:600 }}>{value}</p>
    </div>
  );
}
