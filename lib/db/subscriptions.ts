import { supabase } from "@/lib/supabase";
import type { Plan } from "@/lib/plans";

// ── Free trial (pre-launch) ───────────────────────────────────────────────────
// 🧠 RIGHT NOW every broker gets the WHOLE app free on a 1-month trial.
//    Paid plans (Starter / Pro) are not being sold yet — they'll be switched on
//    later. Until then, anyone WITHOUT a paid subscription is treated as the top
//    tier ("pro" = full access), and no expiry is enforced.
//
// 🔧 HOW TO TURN ON REAL BILLING LATER (one line):
//    Set TRIAL_FULL_ACCESS = false. Then the time-boxed trial kicks in:
//      • accounts within TRIAL_DAYS of signup  → full access ("pro")
//      • older accounts with no paid plan       → "free" (limited)
//    A paid subscription always wins, both now and later.
const TRIAL_FULL_ACCESS = true;   // ← flip to false when you start charging
const TRIAL_DAYS        = 30;     // length of the trial once billing is on
const TRIAL_PLAN: Plan  = "pro";  // "full access" = the highest tier

export async function getUserPlan(): Promise<Plan> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "free";

  // A real (paid) subscription always wins — this is how billing works once you
  // start selling plans. maybeSingle() returns null (no error) when there's no row.
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const hasPaidPlan =
    !!data &&
    data.status === "active" &&
    (data.plan === "starter" || data.plan === "pro") &&
    (!data.expires_at || new Date(data.expires_at) >= new Date());

  if (hasPaidPlan) return data!.plan as Plan;

  // No paid plan → free trial.
  // Pre-launch: everyone gets full access, no expiry.
  if (TRIAL_FULL_ACCESS) return TRIAL_PLAN;

  // (Enabled later) time-boxed trial measured from the signup date.
  const daysOld = (Date.now() - new Date(user.created_at).getTime()) / 86400000;
  return daysOld <= TRIAL_DAYS ? TRIAL_PLAN : "free";
}
