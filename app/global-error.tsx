// app/global-error.tsx — Root-level crash page
//
// 🧠 WHAT THIS FILE DOES (simple explanation):
//    error.tsx catches crashes INSIDE pages.
//    global-error.tsx catches crashes in the ROOT layout itself (app/layout.tsx).
//    Think of it as the last safety net — if even the layout breaks, this shows.
//
//    This must include <html> and <body> tags because the normal layout is broken.
//
// "use client" is REQUIRED for all error pages
"use client";

import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalRootError({ error, reset }: Props) {
  useEffect(() => {
    console.error("Root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#f9fafb" }}>
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center",
          justifyContent: "center", padding: "24px"
        }}>
          <div style={{
            background: "white", borderRadius: "16px", border: "1px solid #fee2e2",
            padding: "32px", maxWidth: "400px", width: "100%", textAlign: "center"
          }}>
            <p style={{ fontSize: "48px", margin: "0 0 8px" }}>⚠️</p>
            <h1 style={{ fontSize: "18px", fontWeight: "700", color: "#111", margin: "0 0 8px" }}>
              App failed to load
            </h1>
            <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 20px" }}>
              A critical error occurred. Please try refreshing the page.
            </p>
            <div style={{
              background: "#f9fafb", border: "1px solid #e5e7eb",
              borderRadius: "12px", padding: "12px", marginBottom: "20px", textAlign: "left"
            }}>
              <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 4px", fontWeight: "600" }}>
                Error (share this with your developer):
              </p>
              <p style={{ fontSize: "11px", color: "#dc2626", fontFamily: "monospace", margin: 0, wordBreak: "break-all" }}>
                {error.message || "Unknown error"}
              </p>
            </div>
            <button
              onClick={reset}
              style={{
                width: "100%", padding: "10px", background: "#2563eb", color: "white",
                border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
