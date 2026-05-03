// lib/db/activity-logs.ts — Log and fetch lead activity timeline
import { supabase } from "@/lib/supabase";

export type ActivityType = "call" | "note" | "stage_change" | "visit" | "deal" | "whatsapp" | "tag" | "created" | "email";

export interface ActivityLog {
  id:         string;
  user_id:    string;
  lead_id:    string;
  type:       ActivityType;
  content:    string | null;
  metadata:   Record<string, unknown> | null;
  created_at: string;
}

export const ACTIVITY_ICON: Record<ActivityType, string> = {
  call:         "📞",
  note:         "📝",
  stage_change: "🔄",
  visit:        "🏠",
  deal:         "💰",
  whatsapp:     "💬",
  tag:          "🏷️",
  created:      "✨",
  email:        "📧",
};

export const ACTIVITY_COLOR: Record<ActivityType, string> = {
  call:         "#1BC47D",
  note:         "#6366F1",
  stage_change: "#F59E0B",
  visit:        "#0EA5E9",
  deal:         "#10B981",
  whatsapp:     "#25D366",
  tag:          "#8B5CF6",
  created:      "#9CA3AF",
  email:        "#F97316",
};

export async function logActivity(params: {
  lead_id:  string;
  type:     ActivityType;
  content?: string;
  metadata?: Record<string, unknown>;
}): Promise<ActivityLog> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("activity_logs")
    .insert({
      lead_id:  params.lead_id,
      user_id:  user.id,
      type:     params.type,
      content:  params.content ?? null,
      metadata: params.metadata ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getLeadActivity(leadId: string): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
