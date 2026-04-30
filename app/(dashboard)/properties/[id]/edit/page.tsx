// app/(dashboard)/properties/[id]/edit/page.tsx — Edit an existing property
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { updateProperty, uploadPropertyMedia } from "@/lib/db/properties";
import { Property } from "@/lib/types";
import PropertyForm, { PropertyFormValues } from "@/app/_components/PropertyForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditPropertyPage({ params }: Props) {
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    async function fetchProperty() {
      const { id } = await params;
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single();
      if (!error && data) setProperty(data);
      setLoading(false);
    }
    fetchProperty();
  }, []);

  async function handleSubmit(values: PropertyFormValues) {
    if (!property) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Upload any new files; keptUrls already includes existing ones
      const newUrls = values.mediaFiles.length > 0
        ? await Promise.all(values.mediaFiles.map((f) => uploadPropertyMedia(f, user.id)))
        : [];
      const allUrls    = [...values.keptUrls, ...newUrls];
      const hasNewVideo = values.mediaFiles.some((f) => f.type.startsWith("video/"));

      await updateProperty(property.id, {
        title:            values.title,
        type:             values.type,
        location:         values.location,
        price:            values.price,
        status:           values.status,
        image_url:        allUrls[0] ?? property.image_url,
        media_urls:       allUrls,
        media_processing: hasNewVideo,
        area_sqft:        values.area_sqft,
        bedrooms:         values.bedrooms,
        bathrooms:        values.bathrooms,
        furnishing:       values.furnishing,
        parking:          values.parking,
        floor_no:         values.floor_no,
        total_floors:     values.total_floors,
        facing:           values.facing,
        possession:       values.possession,
        amenities:        values.amenities.length > 0 ? values.amenities : undefined,
        description:      values.description,
      });

      router.push(`/properties/${property.id}`);
    } catch (err) {
      setSaving(false);
      throw err;
    }
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
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
          <h1 className="text-xl font-bold" style={{ color: "#1A1D23" }}>Edit Property</h1>
          <p className="text-sm truncate" style={{ color: "#6B7280" }}>{property.title}</p>
        </div>
      </div>

      <PropertyForm
        initialData={property}
        onSubmit={handleSubmit}
        loading={saving}
        submitLabel="Save Changes"
      />

    </div>
  );
}

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}
