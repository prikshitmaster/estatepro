// lib/db/properties.ts
//
// 🧠 WHAT THIS FILE DOES (simple explanation):
//    This file has all the "talk to Supabase" functions for PROPERTIES.
//    Think of it like a menu for a properties filing cabinet:
//
//      getAllProperties()     → "bring me all my properties"
//      addProperty()         → "add this new property"
//      updateProperty()      → "change something about a property"
//      deleteProperty()      → "remove this property"
//
//    Every page that needs properties data imports from HERE.
//    We never write Supabase code directly inside pages — it stays here, clean and organised.

import { supabase } from "@/lib/supabase";
import { Property } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL PROPERTIES
// Returns all properties for the logged-in user, newest first
// ─────────────────────────────────────────────────────────────────────────────
export async function getAllProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from("properties")       // look in the "properties" table
    .select("*")              // get all columns
    .order("created_at", { ascending: false }); // newest first

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD A NEW PROPERTY
// Takes a property object (without id/created_at — Supabase makes those)
// Returns the saved property with its new id
// ─────────────────────────────────────────────────────────────────────────────
export async function addProperty(
  property: Omit<Property, "id" | "created_at">
): Promise<Property> {
  const { data, error } = await supabase
    .from("properties")
    .insert(property)   // add new row
    .select()           // return the row that was just inserted
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE A PROPERTY
// Takes the property id + which fields to change
// e.g. updateProperty("abc", { status: "sold" }) → marks it as sold
// ─────────────────────────────────────────────────────────────────────────────
export async function updateProperty(
  id: string,
  changes: Partial<Property>  // Partial = you can pass just SOME fields, not all
): Promise<Property> {
  const { data, error } = await supabase
    .from("properties")
    .update(changes)       // change the fields you passed
    .eq("id", id)          // only update the row where id matches
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE A PROPERTY
// Takes the property id and removes it permanently
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteProperty(id: string): Promise<void> {
  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id);  // only delete where id matches

  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD A SINGLE PROPERTY IMAGE (kept for backward compat)
// ─────────────────────────────────────────────────────────────────────────────
export async function uploadPropertyImage(file: File, userId: string): Promise<string> {
  return uploadPropertyMedia(file, userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD A PROPERTY MEDIA FILE (image OR video)
// Images: max 5MB  |  Videos: max 30MB
// Returns: public URL string
// ─────────────────────────────────────────────────────────────────────────────
export async function uploadPropertyMedia(file: File, userId: string): Promise<string> {
  const isVideo = file.type.startsWith("video/");

  // Images: 5 MB limit (they are already compressed by Canvas before reaching here)
  // Videos: no limit here — Supabase enforces its own bucket limit (default 50 MB).
  //         Originals can be large; background compression will shrink them after save.
  if (!isVideo && file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be smaller than 5 MB.");
  }
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    throw new Error("Please select an image or video file.");
  }

  const ext      = file.name.split(".").pop() ?? (isVideo ? "mp4" : "jpg");
  const folder   = isVideo ? "videos" : "photos";
  const filePath = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("property-images")
    .upload(filePath, file);

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage
    .from("property-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE A SINGLE MEDIA FILE FROM STORAGE
// Pass the full public URL — we extract the storage path from it automatically.
// Used after background video compression to remove the original large file.
// ─────────────────────────────────────────────────────────────────────────────
export async function deletePropertyMediaFile(publicUrl: string): Promise<void> {
  // Public URL format: https://xxx.supabase.co/storage/v1/object/public/property-images/PATH
  const match = publicUrl.match(/\/storage\/v1\/object\/public\/property-images\/(.+)/);
  if (!match) return; // not a Supabase Storage URL — skip
  const storagePath = decodeURIComponent(match[1]);
  await supabase.storage.from("property-images").remove([storagePath]);
}
