import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These two headers are required for ffmpeg.wasm to work in the browser.
  // ffmpeg.wasm uses SharedArrayBuffer (for parallel video processing),
  // and browsers only allow that when these security headers are present.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy",   value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy",  value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
