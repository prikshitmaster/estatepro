"use client";

// app/_components/AppUpdateBanner.tsx — In-app APK update notification
//
// 🧠 WHAT THIS DOES (simple explanation):
//    When a broker opens the RatePerFeet Android app, this checks if a newer
//    APK version is available by fetching /apk-version.json from our server.
//
//    It compares that against the version the user last installed (stored in
//    localStorage under "rpf_apk_version").
//
//    If a newer version exists, a green banner slides in at the top with:
//      "New version available — Download & Install"
//
//    Tapping it opens the APK download URL. Tapping ✕ dismisses until next open.
//
//    It ONLY shows when running inside the Capacitor Android app shell
//    (detected via window.Capacitor). Never shows in a normal browser.
//
// 🔧 HOW TO PUSH AN UPDATE:
//    1. Build a new APK (push to main → GitHub Actions → download artifact)
//    2. Upload the APK somewhere public (e.g. a GitHub Release)
//    3. Edit public/apk-version.json:
//         { "version": 2, "notes": "Bug fixes", "download_url": "https://..." }
//    4. git commit & push → Vercel redeploys → all installed apps will see the
//       banner within minutes.

import { useEffect, useState } from "react";

const STORAGE_KEY = "rpf_apk_version"; // localStorage key for installed version

interface ApkInfo {
  version:      number;
  notes:        string;
  download_url: string;
}

export default function AppUpdateBanner() {
  const [info,    setInfo]    = useState<ApkInfo | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only run inside the Capacitor Android/iOS shell, never in a browser tab
    if (typeof window === "undefined") return;
    const inApp = !!(window as unknown as Record<string, unknown>).Capacitor;
    if (!inApp) return;

    // Fetch the latest version from our server (no cache)
    fetch("/apk-version.json?_=" + Date.now())
      .then((r) => r.json())
      .then((latest: ApkInfo) => {
        if (!latest?.version || !latest?.download_url) return;

        // The version the user currently has installed (saved after they tap Update)
        const installedStr = localStorage.getItem(STORAGE_KEY);
        const installed    = installedStr ? parseInt(installedStr, 10) : 0;

        if (latest.version > installed) {
          setInfo(latest);
          setVisible(true);
        }
      })
      .catch(() => {}); // silently ignore — banner is non-critical
  }, []);

  // Mark this version as "seen/installing" so the banner doesn't reappear
  function handleUpdate() {
    if (!info) return;
    localStorage.setItem(STORAGE_KEY, String(info.version));
    window.open(info.download_url, "_blank");
    setVisible(false);
  }

  function handleDismiss() {
    setVisible(false);
    // Do NOT save to localStorage on dismiss — reappear on next open until installed
  }

  if (!visible || !info) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[999] flex items-center gap-3 px-4 py-3 shadow-lg"
      style={{ background: "#0F172A", borderBottom: "2px solid #1BC47D" }}
    >
      {/* Icon */}
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "#1BC47D22" }}>
        <svg className="w-4 h-4" style={{ color: "#1BC47D" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold leading-tight">
          App update available
        </p>
        {info.notes && (
          <p className="text-gray-400 text-xs truncate mt-0.5">{info.notes}</p>
        )}
      </div>

      {/* Update button */}
      <button
        onClick={handleUpdate}
        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90 active:scale-95"
        style={{ background: "#1BC47D" }}
      >
        Update
      </button>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-300 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
