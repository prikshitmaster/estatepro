// app/(dashboard)/properties/new/page.tsx — Add a new property
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { addProperty, uploadPropertyMedia, getAllProperties } from "@/lib/db/properties";
import PropertyForm, { PropertyFormValues } from "@/app/_components/PropertyForm";
import { getUserPlan } from "@/lib/db/subscriptions";
import { PLANS, isOverLimit } from "@/lib/plans";
import type { Plan } from "@/lib/plans";
import UpgradeModal from "@/app/_components/UpgradeModal";

export default function NewPropertyPage() {
  const router   = useRouter();
  const [loading,       setLoading]       = useState(false);
  const [userPlan,      setUserPlan]      = useState<Plan>("free");
  const [propCount,     setPropCount]     = useState(0);
  const [showUpgrade,   setShowUpgrade]   = useState(false);
  const [limitChecked,  setLimitChecked]  = useState(false);

  useEffect(() => {
    (async () => {
      const [plan, props] = await Promise.all([getUserPlan(), getAllProperties()]);
      setUserPlan(plan);
      setPropCount(props.length);
      if (isOverLimit(plan, "properties", props.length)) setShowUpgrade(true);
      setLimitChecked(true);
    })();
  }, []);

  async function handleSubmit(values: PropertyFormValues) {
    if (isOverLimit(userPlan, "properties", propCount)) { setShowUpgrade(true); return; }
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

  const limit    = PLANS[userPlan].properties;
  const pct      = limit === Infinity ? 0 : Math.min((propCount / limit) * 100, 100);
  const nearLimit = limit !== Infinity && propCount >= limit * 0.8;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 sm:pb-6">

      {showUpgrade && (
        <UpgradeModal
          currentPlan={userPlan}
          resource="properties"
          onClose={() => setShowUpgrade(false)}
          onUpgrade={(_plan) => { setShowUpgrade(false); router.push("/settings/billing"); }}
        />
      )}

      <div className="flex items-center gap-3 mb-6">
        <Link href="/properties" className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
          <BackIcon />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#1A1D23" }}>Add Property</h1>
          <p className="text-sm" style={{ color: "#6B7280" }}>Fill in the details below</p>
        </div>
      </div>

      {limitChecked && limit !== Infinity && (
        <div className={`mb-4 p-3.5 rounded-xl border ${nearLimit ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-gray-50"}`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-600">Properties used: {propCount} / {limit}</span>
            {nearLimit && (
              <button onClick={() => setShowUpgrade(true)} className="text-xs font-semibold text-amber-700 hover:underline">
                Upgrade →
              </button>
            )}
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: pct >= 100 ? "#EF4444" : pct >= 80 ? "#F59E0B" : "#1BC47D" }} />
          </div>
        </div>
      )}

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
