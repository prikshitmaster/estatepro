// lib/compress-image.ts — Browser-side image compression (no external library needed)
//
// 🧠 WHAT THIS FILE DOES (simple explanation):
//    When a user picks a photo, it's often huge (3–10 MB from a phone camera).
//    This function shrinks it BEFORE we send it to Supabase Storage.
//    It works like a mini photo editor inside the browser:
//      1. Draw the image on a hidden Canvas element
//      2. Resize it so the width is max 1920px
//      3. Save it back as JPEG at 82% quality
//    Typical result: 5 MB photo → ~350 KB (saves ~93% storage space!)
//    Videos are NOT touched — we can't compress video in a browser without a library.
"use client";

export async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img     = new Image();
    const blobUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);

      const MAX_W = 1920;
      let { width, height } = img;

      // Only resize if wider than 1920px
      if (width > MAX_W) {
        height = Math.round(height * (MAX_W / width));
        width  = MAX_W;
      }

      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; } // fallback: use original if canvas fails

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          // New file with .jpg extension, same display name
          const compressed = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".jpg"),
            { type: "image/jpeg" }
          );
          resolve(compressed);
        },
        "image/jpeg",
        0.82 // 82% quality — good balance of size vs sharpness
      );
    };

    img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(file); };
    img.src = blobUrl;
  });
}
