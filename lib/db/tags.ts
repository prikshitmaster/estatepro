// lib/db/tags.ts — Tag CRUD + lead-tag association
import { supabase } from "@/lib/supabase";

export interface Tag {
  id:         string;
  user_id:    string;
  name:       string;
  color:      string;
  created_at: string;
}

// Preset tag colors
export const TAG_COLORS = [
  "#EF4444", // red
  "#F59E0B", // amber
  "#1BC47D", // green
  "#3B82F6", // blue
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#14B8A6", // teal
  "#F97316", // orange
];

export const DEFAULT_TAGS = [
  { name: "Hot",        color: "#EF4444" },
  { name: "Investor",   color: "#8B5CF6" },
  { name: "NRI",        color: "#3B82F6" },
  { name: "Resale",     color: "#F59E0B" },
  { name: "New Launch", color: "#1BC47D" },
  { name: "Urgent",     color: "#F97316" },
];

export async function getAllTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createTag(name: string, color: string): Promise<Tag> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("tags")
    .insert({ name: name.trim(), color, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTag(tagId: string): Promise<void> {
  const { error } = await supabase.from("tags").delete().eq("id", tagId);
  if (error) throw error;
}

export async function getLeadTags(leadId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("lead_tags")
    .select("tags(*)")
    .eq("lead_id", leadId);
  if (error) throw error;
  return (data ?? []).map((r: { tags: Tag | Tag[] }) => Array.isArray(r.tags) ? r.tags[0] : r.tags).filter(Boolean);
}

export async function addTagToLead(leadId: string, tagId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("lead_tags")
    .insert({ lead_id: leadId, tag_id: tagId, user_id: user.id });
  if (error && error.code !== "23505") throw error; // ignore duplicate
}

export async function removeTagFromLead(leadId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from("lead_tags")
    .delete()
    .eq("lead_id", leadId)
    .eq("tag_id", tagId);
  if (error) throw error;
}
