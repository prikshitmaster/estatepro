// capacitor.config.ts
//
// 🧠 WHAT THIS FILE DOES (plain English):
// This is the "settings card" for the RatePerFeet phone app.
// The phone app is a thin shell (a fullscreen browser with no address bar)
// that simply opens our live website https://rateperfeet.com.
//
// Because it loads the LIVE site, whenever we update the website (push to
// GitHub → Vercel redeploys), the phone app shows the new version on next
// open. We only rebuild the APK when the icon / name / these settings change.

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.rateperfeet.app",   // unique package name on the phone
  appName: "RatePerFeet",          // name shown under the app icon

  // Tiny local folder with an offline fallback page. The app normally ignores
  // this and loads server.url below; this only shows if there is no internet.
  webDir: "mobile-shell",

  server: {
    // The live website the app opens. This is the "update here → update there".
    url: "https://rateperfeet.com",
    // Serve over https inside the WebView (matches the live site).
    androidScheme: "https",
    // Do NOT allow plain-http content — keep everything secure.
    cleartext: false,
  },

  plugins: {
    // Allow Supabase OAuth to redirect back into the app via deep-link.
    // Google sends the user to com.rateperfeet.app://auth/callback after sign-in,
    // and Android routes that URL back here instead of opening a browser tab.
    CapacitorApp: {
      appUrlOpen: "com.rateperfeet.app://",
    },
  },

  android: {
    // Show a brief splash/background while the site loads.
    backgroundColor: "#1BC47D",
  },
};

export default config;
