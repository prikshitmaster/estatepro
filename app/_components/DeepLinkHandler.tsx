"use client";

// app/_components/DeepLinkHandler.tsx — catch OAuth deep-links inside the APK
//
// 🧠 THE PROBLEM (simple explanation):
//    When the broker taps "Sign in with Google" inside the app:
//    1. Google opens in a browser tab
//    2. After signing in, Google redirects to: com.rateperfeet.app://auth/callback?code=...
//    3. Android sees that URL and re-opens the RatePerFeet app
//    4. BUT the app's WebView just shows a blank black screen because it can't
//       render a "com.rateperfeet.app://" URL — it's not a real web page!
//
// 🧠 THE FIX:
//    The @capacitor/app plugin fires an "appUrlOpen" event when Android opens
//    the app via a deep link. We listen for that event, extract the auth code
//    from the URL, tell Supabase to exchange it for a real session, and then
//    navigate to the dashboard — all without the WebView ever trying to render
//    the weird URL.
//
// This component renders nothing — it just sets up the listener.
// It lives in the ROOT layout so it catches deep links even before login.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only runs inside the Capacitor Android shell
    const inApp = !!(window as unknown as Record<string, unknown>).Capacitor;
    if (!inApp) return;

    let removeListener: (() => void) | undefined;

    async function setup() {
      try {
        // Dynamically import so the browser build never breaks if the plugin
        // isn't installed (it's only available inside the Capacitor shell)
        const { App } = await import("@capacitor/app");

        const listener = await App.addListener("appUrlOpen", async ({ url }) => {
          // url looks like:
          //   com.rateperfeet.app://auth/callback?code=PKCE_CODE
          //   com.rateperfeet.app://auth/callback#access_token=...&refresh_token=...

          let parsed: URL;
          try {
            parsed = new URL(url);
          } catch {
            return; // not a valid URL — ignore
          }

          // ── PKCE flow (default in Supabase) — code in query params ──────────
          const code = parsed.searchParams.get("code");
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) {
              router.replace("/dashboard");
            }
            return;
          }

          // ── Implicit flow — tokens in URL fragment (#access_token=...) ──────
          const hash   = parsed.hash.replace("#", "");
          const params = new URLSearchParams(hash);
          const access  = params.get("access_token");
          const refresh = params.get("refresh_token");
          if (access && refresh) {
            const { error } = await supabase.auth.setSession({
              access_token:  access,
              refresh_token: refresh,
            });
            if (!error) {
              router.replace("/dashboard");
            }
          }
        });

        removeListener = () => listener.remove();
      } catch {
        // Plugin not available (e.g. running in a desktop browser) — ignore silently
      }
    }

    setup();
    return () => removeListener?.();
  }, [router]);

  return null; // renders nothing
}
