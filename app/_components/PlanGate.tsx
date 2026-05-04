"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserPlan } from "@/lib/db/subscriptions";
import { PLANS } from "@/lib/plans";
import type { Plan } from "@/lib/plans";

const PLAN_ORDER: Plan[] = ["free", "starter", "pro"];

function planMeets(userPlan: Plan, required: Plan): boolean {
  return PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(required);
}

interface Props {
  requires: Plan;
  feature:  string; // e.g. "Commission Tracking"
  children: React.ReactNode;
}

export default function PlanGate({ requires, feature, children }: Props) {
  const router   = useRouter();
  const [plan,   setPlan]   = useState<Plan | null>(null);

  useEffect(() => { getUserPlan().then(setPlan); }, []);

  if (plan === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (planMeets(plan, requires)) return <>{children}</>;

  const requiredName = PLANS[requires].name;
  const price        = PLANS[requires].price;
  const nextPlan     = requires;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-2">{feature}</h2>
      <p className="text-sm text-gray-500 mb-1">
        This feature is available on the <strong>{requiredName}</strong> plan and above.
      </p>
      <p className="text-sm text-gray-400 mb-8">
        You are currently on the <strong>{PLANS[plan].name}</strong> plan.
      </p>

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <button
          onClick={() => router.push("/settings/billing")}
          className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: "#1BC47D" }}>
          Upgrade to {requiredName} — ₹{price}/mo
        </button>
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          Go back
        </button>
      </div>

      {/* What you get */}
      <div className="mt-8 bg-gray-50 rounded-2xl p-5 text-left w-full max-w-xs">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
          {requiredName} plan includes
        </p>
        <ul className="space-y-2">
          {planFeatures(nextPlan).map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-[#1BC47D] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function planFeatures(plan: Plan): string[] {
  const f: Record<Plan, string[]> = {
    free:    [],
    starter: ["Secure property share links", "Newspaper lead import", "Site visit tracking", "Message templates", "Up to 250 leads"],
    pro:     ["Commission & deals tracking", "Reports & analytics", "WhatsApp Business API", "Unlimited leads & properties", "Everything in Starter"],
  };
  return f[plan];
}
