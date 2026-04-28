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
// UPLOAD A PROPERTY IMAGE
//
// 🧠 Simple explanation:
//    Think of Supabase Storage like a filing cabinet for photos.
//    This function takes a photo file, puts it in the cabinet,
//    and gives back the URL (web address) of that photo.
//    We then save that URL in the property's image_url field.
//
// Takes: the image File object + the user's id
// Returns: the public URL string (e.g. https://xyz.supabase.co/storage/v1/...)
// ─────────────────────────────────────────────────────────────────────────────
export async function uploadPropertyImage(file: File, userId: string): Promise<string> {
  // Validate file size — max 5MB
  // 5 * 1024 * 1024 = 5,242,880 bytes = 5MB
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be smaller than 5MB.");
  }

  // Validate file type — only allow image files
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file (JPG, PNG, WebP, etc.).");
  }

  // Build a unique file path: userId/timestamp.extension
  // e.g. "abc123/1714300000000.jpg"
  // Putting userId as the folder name matches our storage policy
  const ext      = file.name.split(".").pop() ?? "jpg";
  const filePath = `${userId}/${Date.now()}.${ext}`;

  // Upload the file to the "property-images" bucket in Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("property-images")
    .upload(filePath, file);

  if (uploadError) throw new Error(uploadError.message);

  // Get the public URL so the browser can display the image
  const { data } = supabase.storage
    .from("property-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}
