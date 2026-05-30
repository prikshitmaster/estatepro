# RatePerFeet Android App — how it works

This repo can produce an **Android app** (a `.apk` you install on a phone)
without you needing Android Studio. The app is a **thin shell**: a fullscreen
browser with no address bar that simply opens the live site
`https://rateperfeet.com`.

**Key idea:** update the website (push → Vercel redeploys) and the phone app
shows the new version on next open. You only rebuild the APK when the **icon,
name, or app settings** change — not for normal website updates.

## The pieces

| File | What it is |
|------|-----------|
| `capacitor.config.ts` | App settings: name, package id, the URL it opens, splash color. |
| `mobile-shell/index.html` | The "you're offline" screen (only shown with no internet). |
| `assets/` | The source icon/splash pictures. Regenerate with `node scripts/make-icon.mjs`. |
| `scripts/make-icon.mjs` | Draws the green-house icon into `assets/`. |
| `.github/workflows/android.yml` | The cloud robot that builds the APK. |
| `android/` | Auto-generated native project — **not committed**, rebuilt every time. |

## How to get an APK (no computer setup needed)

1. Go to the repo on GitHub → **Actions** tab.
2. Open **Build Android APK** → click **Run workflow**.
3. Wait ~3–5 minutes for the green check.
4. Open the finished run → scroll to **Artifacts** → download
   **RatePerFeet-debug-apk**.
5. Unzip it → you get `app-debug.apk`. Copy to an Android phone and tap to
   install (allow "install from unknown sources" once).

It also rebuilds automatically when you change the icon, name, or settings on
`main`.

## To change the icon

Edit `scripts/make-icon.mjs` (or drop your own square PNGs into `assets/`),
then commit. The next build picks them up.

## Building on your own computer (optional)

You have Java 17 but no Android SDK, so cloud builds are easiest. If you ever
want local builds, install Android Studio, then run:

```
npm install
npx cap add android
npx capacitor-assets generate --android
npx cap sync android
cd android && ./gradlew assembleDebug
```

The APK lands at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Notes

- This produces a **debug** APK — fine for installing yourself and testing.
  Publishing to the Google Play Store later needs a **signed release** build
  (extra step we can add when you're ready).
- The app needs internet to load the CRM; offline it shows the Retry screen.
