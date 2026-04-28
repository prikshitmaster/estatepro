// app/_components/ImageUpload.tsx — Reusable image upload field
//
// 🧠 WHAT THIS DOES (simple explanation):
//    Think of this like a photo frame that starts empty.
//    - If empty: shows a dotted box saying "Click to upload a photo"
//    - After picking a photo: shows a preview of the image
//    - Has an X button to remove the selected photo
//    - If the property already HAS a photo (edit form): shows the current photo first
//
//    This component is used in BOTH the Add Property and Edit Property forms.
//    It doesn't upload to Supabase by itself — the parent form does that on submit.
"use client";

import { useRef, useState } from "react";

interface Props {
  // currentUrl = existing image URL (only used in edit form — shows current photo)
  currentUrl?: string;
  // onFileChange = called whenever the user picks or removes a file
  // parent form reads this to know what to upload on submit
  onFileChange: (file: File | null) => void;
}

export default function ImageUpload({ currentUrl, onFileChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // preview = the local blob URL shown in the browser BEFORE uploading
  // starts as the currentUrl (if editing) or empty
  const [preview, setPreview] = useState<string>(currentUrl ?? "");

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a local preview URL so the user can see what they picked
    // This is just a temporary URL — it only works in this browser tab
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Tell the parent form about the selected file
    onFileChange(file);
  }

  function handleRemove() {
    setPreview("");
    onFileChange(null); // tell parent: no file selected anymore
    if (inputRef.current) inputRef.current.value = ""; // reset the file input
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Property Photo <span className="text-gray-400 font-normal">(optional · max 5MB)</span>
      </label>

      {preview ? (
        // ── Has an image selected — show preview + remove button ──────────────
        <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Property preview"
            className="w-full h-48 object-cover"
          />
          {/* X button to remove the photo */}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
            title="Remove photo"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* Click to change photo */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 px-3 py-1 bg-black/50 hover:bg-black/70 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Change photo
          </button>
        </div>
      ) : (
        // ── No image — show the upload area ────────────────────────────────────
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-36 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 bg-gray-50 hover:bg-blue-50 flex flex-col items-center justify-center gap-2 transition-colors group"
        >
          <div className="w-10 h-10 rounded-full bg-gray-200 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
            <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500 group-hover:text-blue-600 font-medium">Click to upload a photo</p>
            <p className="text-xs text-gray-400">JPG, PNG, WebP — max 5MB</p>
          </div>
        </button>
      )}

      {/* Hidden file input — triggered by the buttons above */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
