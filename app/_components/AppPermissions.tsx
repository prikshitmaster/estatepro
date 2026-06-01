"use client";

// app/_components/AppPermissions.tsx — request device permissions on first launch
//
// 🧠 WHAT THIS DOES (simple explanation):
//    When a broker opens the RatePerFeet Android app for the first time, the OS
//    needs to ask "Can this app use your notifications / contacts / photos?"
//    before the app can use those features.
//
//    This component runs silently in the background when the app opens. It:
//      1. Checks if running inside the Capacitor Android shell (not a browser)
//      2. Checks if permissions have already been asked (localStorage flag)
//      3. After a short delay (so the app feels settled), asks for each permission
//         one by one — Android shows the system popup for each
//
//    Permissions asked:
//      🔔  Notifications   — so we can remind the broker about follow-ups / tasks
//      📷  Gallery/Storage — so the broker can pick photos/videos for listings
//      👤  Contacts        — so the broker can import phone contacts as leads
//
//    Only shows inside the Capacitor app. Never shows in a desktop browser.

import { useEffect } from "react";

const ASKED_KEY = "rpf_permissions_asked_v1";

export default function AppPermissions() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only run inside the Capacitor WebView shell, not a normal browser
    const inCapacitor = !!(window as unknown as Record<string, unknown>).Capacitor;
    if (!inCapacitor) return;

    // Don't ask again once the user has already seen the prompts
    if (localStorage.getItem(ASKED_KEY)) return;

    // Small delay — let the login/dashboard fully render first
    const timer = setTimeout(async () => {
      try {
        // ── 1. Notifications ──────────────────────────────────────────────────
        // Standard Web Notifications API — works inside Android WebView.
        // On Android 13+ this triggers the system "Allow Notifications?" popup.
        if ("Notification" in window && Notification.permission === "default") {
          await Notification.requestPermission().catch(() => {});
        }

        // ── 2. Camera / Gallery / Storage ────────────────────────────────────
        // Accessing the camera via getUserMedia triggers the storage + camera
        // permission request. We just request the stream then immediately stop
        // it — we only need the OS popup to appear, not actually use the camera.
        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices
            .getUserMedia({ video: true })
            .catch(() => null); // user may deny — that's fine
          if (stream) stream.getTracks().forEach((t) => t.stop());
        }

        // ── 3. Contacts ───────────────────────────────────────────────────────
        // The Contacts Picker API is supported in Android WebView (Chrome 80+).
        // We call it with a tiny select to trigger the OS permission popup,
        // then immediately abort without picking anything.
        const contactsApi = (navigator as unknown as {
          contacts?: { select: (p: string[], o: object) => Promise<unknown> };
        }).contacts;
        if (contactsApi?.select) {
          await contactsApi.select(["name"], { multiple: false }).catch(() => {});
        }

      } catch {
        // Any failure here is non-critical — the app works fine without permissions
      }

      // Mark as asked so we don't show the popups on every open
      localStorage.setItem(ASKED_KEY, "1");
    }, 1500); // 1.5 s delay after app opens

    return () => clearTimeout(timer);
  }, []);

  // This component renders nothing — it only triggers the OS permission popups
  return null;
}
