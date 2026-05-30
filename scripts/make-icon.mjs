// scripts/make-icon.mjs
//
// 🧠 WHAT THIS FILE DOES (plain English):
// Draws the RatePerFeet app icon (a white house on our brand green) and saves
// the picture files that the icon generator needs. Run it once; it writes PNGs
// into the assets/ folder. You normally never touch this again unless you want
// a different icon.
//
// Run with:  node scripts/make-icon.mjs

import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const GREEN = "#1BC47D";

// A clean, bold white house drawn as an SVG path. `scale` shrinks it toward the
// center so it fits inside Android's "safe zone" for adaptive icons.
function house(scale = 1) {
  const s = scale;
  // Centered around 512,512 in a 1024 box.
  const cx = 512;
  const cy = 512;
  // Base geometry (unscaled half-sizes).
  const roofTopY = cy - 250 * s;
  const eaveY = cy - 40 * s;
  const halfRoof = 300 * s;
  const bodyHalf = 215 * s;
  const bodyBottom = cy + 250 * s;
  const doorHalf = 70 * s;
  const doorTop = cy + 70 * s;
  return `
    <g fill="#ffffff">
      <polygon points="${cx},${roofTopY} ${cx - halfRoof},${eaveY} ${cx + halfRoof},${eaveY}" />
      <rect x="${cx - bodyHalf}" y="${cy - 30 * s}" width="${bodyHalf * 2}" height="${bodyBottom - (cy - 30 * s)}" rx="${20 * s}" />
      <rect x="${cx - doorHalf}" y="${doorTop}" width="${doorHalf * 2}" height="${bodyBottom - doorTop}" rx="${14 * s}" fill="${GREEN}" />
    </g>`;
}

function svg(size, bg, scale) {
  const inner = house(scale);
  const bgRect = bg ? `<rect width="${size}" height="${size}" fill="${bg}" />` : "";
  // Scale the 1024-designed house group to whatever output size we render.
  const k = size / 1024;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bgRect}
    <g transform="scale(${k})">${inner}</g>
  </svg>`;
}

async function render(file, markup) {
  await sharp(Buffer.from(markup)).png().toFile(file);
  console.log("wrote", file);
}

await mkdir("assets", { recursive: true });

// Adaptive icon pieces (Android 8+): a solid green background plus a white
// house foreground kept small so the system mask never clips it.
await render("assets/icon-background.png", svg(1024, GREEN, 1));
await render("assets/icon-foreground.png", svg(1024, null, 0.62));
// Legacy / round icon: green background + house baked together.
await render("assets/icon-only.png", svg(1024, GREEN, 0.78));
// Splash screens (light + dark are identical here): big centered logo.
await render("assets/splash.png", svg(2732, GREEN, 0.32));
await render("assets/splash-dark.png", svg(2732, GREEN, 0.32));

console.log("done");
