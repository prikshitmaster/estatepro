// app/_components/ImageUpload.tsx — Multi-photo + video upload with compression
"use client";

import { useRef, useState } from "react";
import { compressImage } from "@/lib/compress-image";
import { compressVideo } from "@/lib/compress-video";

// ── Helpers ───────────────────────────────────────────────────────────────────
const VIDEO_EXT = /\.(mp4|webm|mov|avi|mkv|ogv)(\?.*)?$/i;
function isVideoUrl(url: string)  { return VIDEO_EXT.test(url); }
function isVideoFile(file: File)  { return file.type.startsWith("video/"); }

interface NewItem {
  key:        string;
  previewUrl: string;
  isVideo:    boolean;
  file:       File;
}

interface Props {
  existingUrls?:     string[];
  onFilesChange:     (files: File[]) => void;
  onExistingRemove?: (url: string) => void;
  maxTotal?:         number;
}

export default function ImageUpload({
  existingUrls = [],
  onFilesChange,
  onExistingRemove,
  maxTotal = 8,
}: Props) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef  = useRef<HTMLInputElement>(null);
  const videoRef   = useRef<HTMLInputElement>(null);

  const [newItems,       setNewItems]       = useState<NewItem[]>([]);
  const [compressing,    setCompressing]    = useState(false);
  const [compressLabel,  setCompressLabel]  = useState(""); // shown inside the spinner
  const [videoProgress,  setVideoProgress]  = useState(0);  // 0-100 for video encoding

  const totalCount = existingUrls.length + newItems.length;
  const canAdd     = totalCount < maxTotal;

  async function handleFilePick(files: FileList | null) {
    if (!files) return;
    const slots = maxTotal - totalCount;
    const raw   = Array.from(files).slice(0, slots);
    if (raw.length === 0) return;

    setCompressing(true);
    setVideoProgress(0);
    try {
      const processed: File[] = [];

      for (const f of raw) {
        if (isVideoFile(f)) {
          // Videos: compress with ffmpeg.wasm — show loading + progress bar
          setCompressLabel(`Compressing video${raw.length > 1 ? "" : ""}…`);
          setVideoProgress(0);
          const compressed = await compressVideo(f, (pct) => setVideoProgress(pct));
          processed.push(compressed);
        } else {
          // Images: quick Canvas compression
          setCompressLabel("Compressing photo…");
          const compressed = await compressImage(f);
          processed.push(compressed);
        }
      }

      const added: NewItem[] = processed.map((file) => ({
        key:        `new-${Date.now()}-${Math.random()}`,
        previewUrl: URL.createObjectURL(file),
        isVideo:    isVideoFile(file),
        file,
      }));
      const updated = [...newItems, ...added];
      setNewItems(updated);
      onFilesChange(updated.map((i) => i.file));
    } finally {
      setCompressing(false);
      setCompressLabel("");
      setVideoProgress(0);
    }
  }

  function removeNew(key: string) {
    const updated = newItems.filter((i) => i.key !== key);
    setNewItems(updated);
    onFilesChange(updated.map((i) => i.file));
  }

  const hasMedia = totalCount > 0;

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          Photos & Videos <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <span className="text-xs text-gray-400">{totalCount} / {maxTotal}</span>
      </div>

      {/* Thumbnail grid */}
      {hasMedia && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {existingUrls.map((url) => (
            <Thumb
              key={url}
              src={url}
              isVideo={isVideoUrl(url)}
              onRemove={onExistingRemove ? () => onExistingRemove(url) : undefined}
            />
          ))}
          {newItems.map((item) => (
            <Thumb
              key={item.key}
              src={item.previewUrl}
              isVideo={item.isVideo}
              onRemove={() => removeNew(item.key)}
            />
          ))}
        </div>
      )}

      {/* Compression indicator — image: simple spinner | video: progress bar */}
      {compressing && (
        <div className="mb-3 rounded-xl overflow-hidden border border-blue-100 bg-blue-50 px-4 py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <svg className="w-3.5 h-3.5 text-blue-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-xs font-medium text-blue-600">{compressLabel || "Compressing…"}</p>
            {videoProgress > 0 && (
              <span className="ml-auto text-xs font-bold text-blue-500">{videoProgress}%</span>
            )}
          </div>
          {/* Progress bar — only shown during video compression */}
          {videoProgress > 0 && (
            <div className="h-1.5 rounded-full bg-blue-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${videoProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {canAdd && !compressing ? (
        <div className="grid grid-cols-3 gap-2">
          <ActionBtn onClick={() => galleryRef.current?.click()} icon={<PhotoIcon />} label="Photos" />
          <ActionBtn onClick={() => cameraRef.current?.click()} icon={<CameraIcon />} label="Camera" />
          <ActionBtn onClick={() => videoRef.current?.click()}  icon={<VideoIcon />}  label="Video" />
        </div>
      ) : !compressing ? (
        <p className="text-center text-xs text-gray-400 py-2">Max {maxTotal} items reached</p>
      ) : null}

      {/* Info tip */}
      <p className="text-[11px] text-gray-400 mt-1.5 text-center">
        Photos &amp; videos auto-compressed before upload
      </p>

      {/* Hidden file inputs */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => { handleFilePick(e.target.files); e.target.value = ""; }}
        className="hidden"
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => { handleFilePick(e.target.files); e.target.value = ""; }}
        className="hidden"
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        multiple
        onChange={(e) => { handleFilePick(e.target.files); e.target.value = ""; }}
        className="hidden"
      />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Thumb({ src, isVideo, onRemove }: { src: string; isVideo: boolean; onRemove?: () => void }) {
  return (
    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
      {isVideo ? (
        <video src={src} className="w-full h-full object-cover" muted playsInline />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="w-full h-full object-cover" />
      )}
      {isVideo && (
        <div className="absolute bottom-1 left-1 bg-black/60 rounded px-1 py-0.5">
          <VideoIcon size={10} />
        </div>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function ActionBtn({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors text-xs font-medium"
    >
      {icon}
      {label}
    </button>
  );
}

function PhotoIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function VideoIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
    </svg>
  );
}
