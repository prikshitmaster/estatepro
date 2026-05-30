# RatePerFeet — Android APK (Capacitor thin-shell, cloud-built)

**Date:** 2026-05-31
**Status:** Approved (brainstorm complete)
**Repo:** `prikshitmaster/estatepro` (the `estatepro` submodule)

## Goal

Ship an installable Android app for the EstatePro / RatePerFeet CRM that:
1. Mirrors the live website and **auto-updates** when the web app is updated ("update here → update there").
2. Is built **in the cloud (GitHub Actions)** — no Android Studio on the user's PC.
3. Produces a **sideloadable `app-debug.apk`** (no Play Store, no keystore secrets) for a client demo.

## Key decision: thin-shell, not bundled

The app is a **Next.js 16 server app on Vercel** (Server Components, API routes, live Supabase). It cannot be statically bundled into the APK without breaking the API/database. Therefore the APK is a **Capacitor WebView shell** whose `server.url` points at `https://rateperfeet.com`.

Consequence — exactly the requested behaviour:
- Push to GitHub → Vercel redeploys → the app shows the new version on next open. **No APK rebuild for feature/content changes.**
- Rebuild the APK **only** when the icon, name, or native config changes.

Trade-offs (accepted): app requires internet; it is effectively a branded browser (fine for sideloaded demo; Play Store would likely reject a pure wrapper — revisit later if native features are added).

## App identity

| Setting | Value |
|---|---|
| App name | **RatePerFeet** |
| Package ID | `com.rateperfeet.app` |
| Loads | `https://rateperfeet.com` |
| Icon | White house + ₹ on brand green `#1BC47D` |
| Brand green | `#1BC47D` |

## Components / files added (all in `estatepro/`)

1. **`capacitor.config.ts`** — appId `com.rateperfeet.app`, appName `RatePerFeet`, `webDir: "mobile-shell"`, `server.url: "https://rateperfeet.com"`, `server.androidScheme: "https"`.
2. **`mobile-shell/index.html`** — tiny offline-fallback page (shown only if the device has no internet / site unreachable). Branded "No connection — reconnect & reopen".
3. **`assets/`** — source icon + splash PNGs (`icon-only.png`, `icon-foreground.png`, `icon-background.png`, `splash.png`, `splash-dark.png`) generated from an SVG (house + ₹, green). Sliced into densities by `@capacitor/assets` in CI.
4. **`package.json`** — add devDeps: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/assets`. Add scripts: `cap:sync`, `cap:add:android`.
5. **`.github/workflows/build-apk.yml`** — CI build (see below).
6. **`app/layout.tsx` / `app/globals.css`** — minor WebView polish: safe-area padding (notch/gesture bar), prevent horizontal overscroll. (`viewportFit: "cover"` already present.)

The generated **`android/`** folder is **not committed** — CI runs `npx cap add android` fresh each build to keep the repo clean.

## CI build (GitHub Actions)

Trigger: `push` to main + manual `workflow_dispatch`.

Steps (ubuntu-latest):
1. Checkout
2. Setup Node 20, `npm install`
3. Setup Java (Temurin JDK 21)
4. Setup Android SDK (`android-actions/setup-android`)
5. `npx cap add android`
6. `npx @capacitor/assets generate --android` (icons + splash from `assets/`)
7. `npx cap sync android`
8. `cd android && ./gradlew assembleDebug`
9. `actions/upload-artifact` → `app-debug.apk` (from `android/app/build/outputs/apk/debug/`)

Output: downloadable artifact `app-debug.apk` on the Actions run page.

## WebView behaviour notes

- **Login persistence:** Supabase session lives in WebView localStorage/cookies → user logs in once.
- **External links:** `tel:`, `mailto:`, `sms:`, and `https://wa.me/...` must open in the system app, not inside the shell. Capacitor opens non-`server.url` URLs externally by default; verify `wa.me` (cross-origin https) opens externally — add `server.allowNavigation` excluding it / handle via `@capacitor/app` if needed.
- **Back button:** Android hardware back should navigate WebView history; default Capacitor behaviour is acceptable for the demo.

## Out of scope (later)

- Play Store release + signed release APK (keystore).
- Push notifications, native camera, biometric login.
- iOS build.
- Fixing the budget-range regex parse quirk and AI-parser Vercel env (tracked separately).

## Testing / acceptance

The APK is cloud-built, so acceptance = **a green GitHub Actions run producing `app-debug.apk`**, then installing it on a phone and confirming it opens `rateperfeet.com` full-screen and login works. CI may need 1–2 iterations; failures are watched via `gh run` and fixed.
