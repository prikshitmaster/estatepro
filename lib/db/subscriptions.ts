import { supabase } from "@/lib/supabase";
import type { Plan } from "@/lib/plans";

export async function getUserPlan(): Promise<Plan> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "free";

  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, expires_at")
    .eq("user_id", user.id)
    .single();

  if (!data) return "free";

  // Treat expired paid plans as free
  if (data.expires_at && new Date(data.expires_at) < new Date()) return "free";
  if (data.status !== "active") return "free";

  return (data.plan as Plan) ?? "free";
}
