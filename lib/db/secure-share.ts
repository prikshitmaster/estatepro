// lib/db/secure-share.ts — Secure Share Links DB layer
// All functions are broker-authenticated (RLS-enforced via supabase client).
// Anonymous viewer access happens through the API route using supabaseAdmin.
import { supabase } from "@/lib/supabase";
import { SecureShareLink, ShareMedia, ShareViewLog, ShareMediaType } from "@/lib/types";

// ─── Token generation ─────────────────────────────────────────────────────────

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}

// ─── Media type detection ─────────────────────────────────────────────────────

export function getMediaType(file: File): ShareMediaType {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "heic"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["xls", "xlsx", "csv"].includes(ext)) return "excel";
  if (["mp4", "mov", "avi", "webm", "mkv"].includes(ext)) return "video";
  return "image";
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getSecureShareLinks(): Promise<SecureShareLink[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("secure_share_links")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getSecureShareLinkWithMedia(
  id: string
): Promise<{ link: SecureShareLink; media: ShareMedia[] } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [linkRes, mediaRes] = await Promise.all([
    supabase.from("secure_share_links").select("*").eq("id", id).eq("user_id", user.id).single(),
    supabase.from("share_media").select("*").eq("link_id", id).order("sort_order"),
  ]);
  if (linkRes.error || !linkRes.data) return null;
  return { link: linkRes.data, media: mediaRes.data ?? [] };
}

export async function getShareViewLogs(linkId: string): Promise<ShareViewLog[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("share_views_log")
    .select("*")
    .eq("link_id", linkId)
    .order("viewed_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createSecureShareLink(payload: {
  title: string;
  property_id?: string;
  property_title?: string;
  expires_at?: string | null;
  max_views?: number | null;
}): Promise<SecureShareLink> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("secure_share_links")
    .insert({ ...payload, user_id: user.id, token: generateToken() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function uploadShareFile(
  userId: string,
  linkId: string,
  file: File
): Promise<{ storage_path: string }> {
  const ext = file.name.split(".").pop() ?? "";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${linkId}/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage
    .from("secure-share-media")
    .upload(path, file, { upsert: false });
  if (error) throw error;
  return { storage_path: path };
}

export async function addShareMediaBatch(
  records: Array<{
    link_id: string;
    user_id: string;
    storage_path: string;
    file_name: string;
    media_type: ShareMediaType;
    file_size: number;
    sort_order: number;
  }>
): Promise<void> {
  if (!records.length) return;
  const { error } = await supabase.from("share_media").insert(records);
  if (error) throw error;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function toggleShareLinkActive(
  id: string,
  is_active: boolean
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("secure_share_links")
    .update({ is_active })
    .eq("id", id)
    .eq("user_id", user.id);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteSecureShareLink(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  // Remove storage files first, then let CASCADE handle DB rows
  const { data: media } = await supabase
    .from("share_media")
    .select("storage_path")
    .eq("link_id", id);
  if (media?.length) {
    await supabase.storage
      .from("secure-share-media")
      .remove(media.map((m) => m.storage_path));
  }
  await supabase
    .from("secure_share_links")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
}
