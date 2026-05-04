export type Plan = "free" | "starter" | "pro";

export const PLANS = {
  free: {
    name:       "Free",
    price:      0,
    leads:      25,
    properties: 10,
    team:       1,
  },
  starter: {
    name:       "Starter",
    price:      9,
    leads:      250,
    properties: 100,
    team:       3,
  },
  pro: {
    name:       "Pro",
    price:      29,
    leads:      Infinity,
    properties: Infinity,
    team:       10,
  },
} as const satisfies Record<Plan, { name: string; price: number; leads: number; properties: number; team: number }>;

export function getLimit(plan: Plan, resource: "leads" | "properties" | "team"): number {
  return PLANS[plan][resource];
}

export function isOverLimit(plan: Plan, resource: "leads" | "properties" | "team", currentCount: number): boolean {
  const limit = getLimit(plan, resource);
  return currentCount >= limit;
}

export function upgradeMessage(plan: Plan, resource: "leads" | "properties" | "team"): string {
  const limit = getLimit(plan, resource);
  const next  = plan === "free" ? "Starter (₹9/mo)" : "Pro (₹29/mo)";
  const label = resource === "leads" ? "leads" : resource === "properties" ? "properties" : "team members";
  return `You've used all ${limit === Infinity ? "unlimited" : limit} ${label} on the ${PLANS[plan].name} plan. Upgrade to ${next} to add more.`;
}
