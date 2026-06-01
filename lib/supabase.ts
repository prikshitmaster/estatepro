// lib/supabase.ts
//
// 🧠 WHAT THIS FILE DOES (simple explanation):
//    Creates ONE connection to the Supabase cloud (auth + database) that every
//    page reuses.
//
// 🔐 WHY THE CUSTOM STORAGE (the "logout when I close the app" fix):
//    By default Supabase keeps your login session in the browser's localStorage.
//    Inside the Android app (a Capacitor WebView) that localStorage can get
//    wiped when the app fully closes — so you'd be logged out every time.
//    To fix that, inside the app we store the session in NATIVE storage
//    (@capacitor/preferences), which survives app restarts. In a normal
//    browser we just use localStorage as usual. On the server we no-op.

import { createClient, type SupportedStorage } from "@supabase/supabase-js";

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const isBrowser   = typeof window !== "undefined";
const isCapacitor = isBrowser && !!(window as unknown as Record<string, unknown>).Capacitor;

// Session storage that persists across app restarts inside the Capacitor app,
// and falls back to localStorage in a normal browser.
//
// We write to BOTH native storage and localStorage, and read native first.
// This is resilient: a newer APK uses native storage (survives app close); an
// older APK without the native plugin (or a browser) silently uses localStorage.
async function nativePrefs() {
  // Only available inside the app AND only if the native plugin is present.
  try {
    const { Preferences } = await import("@capacitor/preferences");
    return Preferences;
  } catch {
    return null;
  }
}

const persistentStorage: SupportedStorage = {
  async getItem(key) {
    if (!isBrowser) return null;
    if (isCapacitor) {
      try {
        const prefs = await nativePrefs();
        if (prefs) {
          const { value } = await prefs.get({ key });
          if (value != null) return value;
        }
      } catch { /* native unavailable — fall back below */ }
    }
    try { return window.localStorage.getItem(key); } catch { return null; }
  },
  async setItem(key, value) {
    if (!isBrowser) return;
    if (isCapacitor) {
      try {
        const prefs = await nativePrefs();
        if (prefs) await prefs.set({ key, value });
      } catch { /* ignore */ }
    }
    try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
  },
  async removeItem(key) {
    if (!isBrowser) return;
    if (isCapacitor) {
      try {
        const prefs = await nativePrefs();
        if (prefs) await prefs.remove({ key });
      } catch { /* ignore */ }
    }
    try { window.localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage:            persistentStorage,
    persistSession:     true,   // keep me logged in across restarts
    autoRefreshToken:   true,   // silently refresh the token before it expires
    detectSessionInUrl: true,   // handle the OAuth code in the callback URL (web)
    flowType:           "pkce", // matches the deep-link exchangeCodeForSession flow
  },
});
