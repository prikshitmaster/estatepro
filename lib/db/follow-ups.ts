import { supabase } from "@/lib/supabase";
import { FollowUpLog } from "@/lib/types";

export async function getFollowUpLogs(userId: string): Promise<FollowUpLog[]> {
  const { data, error } = await supabase
    .from("follow_up_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return []; // table may not exist yet — return empty instead of crashing
  return data ?? [];
}

export async function logFollowUp(
  entry: Omit<FollowUpLog, "id" | "created_at">
): Promise<FollowUpLog> {
  const { data, error } = await supabase
    .from("follow_up_logs")
    .insert(entry)
    .select()
    .single();
  if (error) {
    // If table doesn't exist, return a fake log so UI still updates optimistically
    if (error.message.includes("does not exist") || error.message.includes("schema cache")) {
      return { id: crypto.randomUUID(), ...entry, created_at: new Date().toISOString() } as FollowUpLog;
    }
    throw new Error(error.message);
  }

  // After logging, update (or clear) the snooze date on the lead
  await supabase
    .from("leads")
    .update({ next_follow_up_at: entry.next_follow_up_at ?? null })
    .eq("id", entry.lead_id);

  return data;
}

export async function snoozeFollowUp(leadId: string, until: string): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .update({ next_follow_up_at: until })
    .eq("id", leadId);
  if (error) throw new Error(error.message);
}
