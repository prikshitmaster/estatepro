import { supabase } from "@/lib/supabase";
import { SiteVisit } from "@/lib/types";

export async function getAllSiteVisits(): Promise<SiteVisit[]> {
  const { data, error } = await supabase
    .from("site_visits")
    .select("*")
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addSiteVisit(visit: Omit<SiteVisit, "id" | "created_at">): Promise<SiteVisit> {
  const { data, error } = await supabase
    .from("site_visits")
    .insert(visit)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSiteVisit(id: string, updates: Partial<Omit<SiteVisit, "id" | "user_id" | "created_at">>): Promise<SiteVisit> {
  const { data, error } = await supabase
    .from("site_visits")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
