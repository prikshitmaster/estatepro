// app/(dashboard)/properties/new/page.tsx — Add a new property
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { addProperty, uploadPropertyMedia } from "@/lib/db/properties";
import PropertyForm, { PropertyFormValues } from "@/app/_components/PropertyForm";

export default function NewPropertyPage() {
  const router   = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: PropertyFormValues) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Upload media — images already compressed by ImageUpload, videos at original size
      const mediaUrls = values.mediaFiles.length > 0
        ? await Promise.all(values.mediaFiles.map((f) => uploadPropertyMedia(f, user.id)))
        : [];
      const hasVideo = values.mediaFiles.some((f) => f.type.startsWith("video/"));

      const saved = await addProperty({
        user_id:          user.id,
        title:            values.title,
        type:             values.type,
        location:         values.location,
        price:            values.price,
        status:           values.status,
        image_url:        mediaUrls[0],
        media_urls:       mediaUrls,
        media_processing: hasVideo,
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

      // Go to detail page so background video compression can start
      router.push(`/properties/${saved.id}`);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 sm:pb-6">

      <div className="flex items-center gap-3 mb-6">
        <Link href="/properties" className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
          <BackIcon />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#1A1D23" }}>Add Property</h1>
          <p className="text-sm" style={{ color: "#6B7280" }}>Fill in the details below</p>
        </div>
      </div>

      <PropertyForm onSubmit={handleSubmit} loading={loading} submitLabel="Save Property" />

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
