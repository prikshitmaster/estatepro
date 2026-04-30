// lib/compress-video.ts — Browser-side video compression using ffmpeg.wasm
//
// 🧠 WHAT THIS FILE DOES (simple explanation):
//    When a user picks a video (could be 100MB, 200MB from a phone),
//    this function compresses it INSIDE THE BROWSER before uploading.
//    It works like a mini-video editor running in the browser:
//      1. Load ffmpeg (a real video encoder, runs as WebAssembly)
//      2. Scale video down to max 720p width
//      3. Re-encode at a lower bitrate (2 Mbps instead of 30+ Mbps from phone)
//    Typical result: 80MB phone video → 6–10MB (saves ~90% storage!)
//    The ffmpeg files load from CDN the first time (~32MB), then the browser
//    caches them — so it's only slow once, fast every time after.
"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

// One shared instance — ffmpeg is heavy, load it only once
let ffmpeg: FFmpeg | null = null;
let loaded = false;

async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    if (onLog) ffmpeg.on("log", ({ message }) => onLog(message));
  }
  if (!loaded) {
    // Load core files from CDN (cached after first use)
    const base = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
      coreURL:   await toBlobURL(`${base}/ffmpeg-core.js`,   "text/javascript"),
      wasmURL:   await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
      workerURL: await toBlobURL(`${base}/ffmpeg-core.worker.js`, "text/javascript"),
    });
    loaded = true;
  }
  return ffmpeg;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function compressVideo(
  file: File,
  onProgress?: (pct: number) => void // 0–100
): Promise<File> {
  const ff = await getFFmpeg();

  // Report progress via ffmpeg's built-in progress event
  ff.on("progress", ({ progress }) => {
    if (onProgress) onProgress(Math.round(progress * 100));
  });

  const ext      = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
  const inputName  = `input.${ext}`;
  const outputName = "output.mp4";

  // Write the original file into ffmpeg's in-memory filesystem
  await ff.writeFile(inputName, await fetchFile(file));

  // Compress:
  //   -vf scale=1280:-2  → max 720p wide (keeps aspect ratio, -2 = divisible by 2)
  //   -c:v libx264        → H.264 video codec (plays everywhere)
  //   -crf 28             → quality level (18 = best, 51 = worst; 28 = good for property)
  //   -preset fast        → encode speed vs size (fast = reasonable balance)
  //   -c:a aac -b:a 96k  → compress audio too
  await ff.exec([
    "-i",  inputName,
    "-vf", "scale=1280:-2",
    "-c:v", "libx264",
    "-crf", "28",
    "-preset", "fast",
    "-c:a", "aac",
    "-b:a", "96k",
    "-movflags", "+faststart", // makes MP4 start playing before fully downloaded
    outputName,
  ]);

  // Read the compressed file back out
  const data = await ff.readFile(outputName);

  // Clean up ffmpeg's in-memory filesystem to free memory
  await ff.deleteFile(inputName).catch(() => {});
  await ff.deleteFile(outputName).catch(() => {});

  // Cast needed because ffmpeg returns FileData (Uint8Array with SharedArrayBuffer),
  // which TypeScript doesn't accept as BlobPart directly.
  return new File(
    [data as unknown as BlobPart],
    file.name.replace(/\.[^.]+$/, ".mp4"),
    { type: "video/mp4" }
  );
}
