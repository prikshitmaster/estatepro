// app/test-compress/page.tsx — TEMPORARY TEST PAGE (delete after testing)
// Visit: http://localhost:3000/test-compress
// Pick any photo or video to see before vs after compression size
"use client";

import { useState } from "react";
import { compressImage } from "@/lib/compress-image";
import { compressVideo } from "@/lib/compress-video";

type Result = {
  name: string;
  type: "image" | "video";
  beforeBytes: number;
  afterBytes: number;
  beforeUrl: string;
  afterUrl: string;
};

function fmt(bytes: number) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1_048_576)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(2)} MB`;
}

export default function TestCompressPage() {
  const [results,     setResults]     = useState<Result[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [label,       setLabel]       = useState("");
  const [progress,    setProgress]    = useState(0);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setCompressing(true);
    setResults([]);

    const out: Result[] = [];
    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      setProgress(0);
      setLabel(isVideo ? `Compressing video: ${file.name}` : `Compressing photo: ${file.name}`);

      const compressed = isVideo
        ? await compressVideo(file, (pct) => setProgress(pct))
        : await compressImage(file);

      out.push({
        name:        file.name,
        type:        isVideo ? "video" : "image",
        beforeBytes: file.size,
        afterBytes:  compressed.size,
        beforeUrl:   URL.createObjectURL(file),
        afterUrl:    URL.createObjectURL(compressed),
      });
      setResults([...out]);
    }

    setCompressing(false);
    setLabel("");
    setProgress(0);
    e.target.value = "";
  }

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>🧪 Compression Test</h1>
      <p style={{ color: "#6B7280", marginBottom: 24, fontSize: 14 }}>
        Pick photos or videos — both are now auto-compressed. Delete this page when done.
      </p>

      {/* Picker */}
      <label style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        border: "2px dashed #D1D5DB", borderRadius: 16, padding: "28px 16px", cursor: "pointer",
        background: compressing ? "#EFF6FF" : "#FAFAFA", gap: 8, marginBottom: 24,
        borderColor: compressing ? "#93C5FD" : "#D1D5DB",
        transition: "all 0.2s",
      }}>
        <span style={{ fontSize: 32 }}>{compressing ? "⚙️" : "📁"}</span>
        <span style={{ fontWeight: 600, color: "#374151", fontSize: 15 }}>
          {compressing ? label : "Click to pick photos or videos"}
        </span>
        {compressing && progress > 0 && (
          <div style={{ width: "100%", maxWidth: 260, marginTop: 6 }}>
            <div style={{ height: 6, background: "#BFDBFE", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "#3B82F6", borderRadius: 99, transition: "width 0.3s" }} />
            </div>
            <p style={{ textAlign: "center", fontSize: 12, color: "#3B82F6", marginTop: 4, fontWeight: 700 }}>{progress}%</p>
          </div>
        )}
        {!compressing && (
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>Images and videos both supported</span>
        )}
        <input type="file" accept="image/*,video/*" multiple onChange={handleFiles} disabled={compressing} style={{ display: "none" }} />
      </label>

      {/* Results */}
      {results.map((r, i) => {
        const saved  = r.beforeBytes - r.afterBytes;
        const pct    = ((saved / r.beforeBytes) * 100).toFixed(1);
        const isGood = Number(pct) > 20;
        return (
          <div key={i} style={{ background: "#fff", border: "1px solid #EEF1F6", borderRadius: 16, marginBottom: 16, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", background: "#F8F9FB", borderBottom: "1px solid #EEF1F6", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>{r.type === "video" ? "🎬" : "📷"}</span>
              <p style={{ fontWeight: 600, fontSize: 13, color: "#1A1D23", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{r.name}</p>
            </div>

            {/* Size comparison */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", flexWrap: "wrap" }}>
              <Pill label="BEFORE" value={fmt(r.beforeBytes)} color="#EF4444" />
              <span style={{ fontSize: 20, color: "#9CA3AF" }}>→</span>
              <Pill label="AFTER"  value={fmt(r.afterBytes)}  color="#10B981" />
              <div style={{
                marginLeft: "auto",
                background: isGood ? "#DCFCE7" : "#FEF3C7",
                color: isGood ? "#15803D" : "#92400E",
                fontWeight: 700, fontSize: 14, padding: "6px 14px", borderRadius: 99,
              }}>
                {isGood ? `✅ −${pct}% saved` : `⚠️ −${pct}%`}
              </div>
            </div>

            {/* Preview compare */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid #EEF1F6" }}>
              {[{ url: r.beforeUrl, label: "BEFORE", color: "#EF4444" }, { url: r.afterUrl, label: "AFTER", color: "#10B981" }].map(({ url, label, color }, j) => (
                <div key={j} style={{ borderLeft: j === 1 ? "1px solid #EEF1F6" : undefined }}>
                  <p style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color, padding: "7px 0 3px", textTransform: "uppercase", letterSpacing: 1 }}>{label}</p>
                  {r.type === "video"
                    ? <video src={url} controls muted playsInline style={{ width: "100%", height: 140, objectFit: "cover", display: "block", background: "#000" }} />
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src={url} alt={label} style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                  }
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {results.length > 1 && (
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 16, padding: "16px 20px", textAlign: "center" }}>
          <p style={{ fontWeight: 700, color: "#15803D", fontSize: 16 }}>
            Total saved: {fmt(results.reduce((s, r) => s + (r.beforeBytes - r.afterBytes), 0))}
          </p>
          <p style={{ color: "#166534", fontSize: 13, marginTop: 4 }}>across {results.length} files</p>
        </div>
      )}
    </div>
  );
}

function Pill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: "#1A1D23" }}>{value}</span>
    </div>
  );
}
