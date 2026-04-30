// app/(dashboard)/properties/[id]/edit/page.tsx — Edit an existing property
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { updateProperty, uploadPropertyMedia } from "@/lib/db/properties";
import { Property, PropertyType, PropertyStatus } from "@/lib/types";
import ImageUpload from "@/app/_components/ImageUpload";

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditPropertyPage({ params }: Props) {
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState("");

  // New files the user picked in this session
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  // Existing URLs still kept (user may remove some)
  const [keptUrls, setKeptUrls] = useState<string[]>([]);

  const [form, setForm] = useState({
    title:    "",
    type:     "apartment" as PropertyType,
    location: "",
    price:    "",
    status:   "available" as PropertyStatus,
  });

  useEffect(() => {
    async function fetchProperty() {
      const { id } = await params;
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        setProperty(data);
        setForm({
          title:    data.title,
          type:     data.type,
          location: data.location,
          price:    String(data.price),
          status:   data.status,
        });
        // Build the existing media list (deduplicated)
        const existing = [
          data.image_url,
          ...(data.media_urls ?? []),
        ].filter((u): u is string => !!u);
        setKeptUrls([...new Set(existing)]);
      }
      setLoading(false);
    }
    fetchProperty();
  }, []);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function removeExisting(url: string) {
    setKeptUrls((prev) => prev.filter((u) => u !== url));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!property) return;
    setSaveError("");
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Upload any new files
      const newUrls = mediaFiles.length > 0
        ? await Promise.all(mediaFiles.map((f) => uploadPropertyMedia(f, user.id)))
        : [];

      const allUrls = [...keptUrls, ...newUrls];

      await updateProperty(property.id, {
        title:      form.title,
        type:       form.type,
        location:   form.location,
        price:      parseInt(form.price) || 0,
        status:     form.status,
        image_url:  allUrls[0] ?? property.image_url,
        media_urls: allUrls,
      });
      router.push(`/properties/${property.id}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-20">
        <p className="text-gray-400">Property not found.</p>
        <Link href="/properties" className="text-blue-600 text-sm mt-2 block hover:underline">← Back</Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 sm:pb-6">

      <div className="flex items-center gap-3 mb-6">
        <Link href={`/properties/${property.id}`} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
          <BackIcon />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900">Edit Property</h1>
          <p className="text-gray-400 text-sm truncate">{property.title}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <ImageUpload
            existingUrls={keptUrls}
            onFilesChange={setMediaFiles}
            onExistingRemove={removeExisting}
          />

          <Field label="Property Title *">
            <input required type="text" value={form.title} onChange={(e) => set("title", e.target.value)} className={inp} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Type">
              <select value={form.type} onChange={(e) => set("type", e.target.value)} className={inp}>
                <option value="apartment">Apartment</option>
                <option value="villa">Villa</option>
                <option value="plot">Plot</option>
                <option value="commercial">Commercial</option>
                <option value="office">Office</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inp}>
                <option value="available">Available</option>
                <option value="sold">Sold</option>
                <option value="rented">Rented</option>
                <option value="off-market">Off Market</option>
              </select>
            </Field>
          </div>

          <Field label="Location *">
            <input required type="text" value={form.location} onChange={(e) => set("location", e.target.value)} className={inp} />
          </Field>

          <Field label="Price (₹) *">
            <input required type="number" value={form.price} onChange={(e) => set("price", e.target.value)} className={inp} />
          </Field>

          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{saveError}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 sm:flex-none sm:px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-colors">
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <Link href={`/properties/${property.id}`}
              className="flex-1 sm:flex-none sm:px-8 py-3 text-center border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors">
              Cancel
            </Link>
          </div>

        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inp = "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white";

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}
