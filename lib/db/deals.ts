import { supabase } from "@/lib/supabase";
import { Deal } from "@/lib/types";

export async function getAllDeals(): Promise<Deal[]> {
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .order("deal_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addDeal(deal: Omit<Deal, "id" | "created_at">): Promise<Deal> {
  const { data, error } = await supabase
    .from("deals")
    .insert(deal)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDeal(id: string, updates: Partial<Omit<Deal, "id" | "user_id" | "created_at">>): Promise<Deal> {
  const { data, error } = await supabase
    .from("deals")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDeal(id: string): Promise<void> {
  const { error } = await supabase.from("deals").delete().eq("id", id);
  if (error) throw error;
}
