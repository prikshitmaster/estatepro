import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No COOP/COEP headers needed — ffmpeg.wasm runs in single-threaded mode
  // (no workerURL = no SharedArrayBuffer = no special headers required).
  // Removing them fixes cross-origin image loading from Supabase Storage.
};

export default nextConfig;
