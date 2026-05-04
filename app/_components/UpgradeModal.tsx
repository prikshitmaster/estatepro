"use client";

import { PLANS } from "@/lib/plans";
import type { Plan } from "@/lib/plans";

interface Props {
  currentPlan: Plan;
  resource:    "leads" | "properties" | "team";
  onClose:     () => void;
  onUpgrade:   (plan: Plan) => void; // called with chosen plan, navigate to billing from caller
}

const RESOURCE_LABEL = {
  leads:      "leads",
  properties: "properties",
  team:       "team members",
};

export default function UpgradeModal({ currentPlan, resource, onClose, onUpgrade }: Props) {
  const limit = PLANS[currentPlan][resource];
  const label = RESOURCE_LABEL[resource];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>

        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <h2 className="text-base font-bold text-gray-900 text-center mb-1">
          {limit === Infinity ? "Limit reached" : `${limit} ${label} limit reached`}
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          You&apos;ve used all {limit} {label} on the <strong>{PLANS[currentPlan].name}</strong> plan.
          Upgrade to add more.
        </p>

        {/* Plan cards */}
        <div className="space-y-3 mb-5">
          {currentPlan === "free" && (
            <PlanCard
              plan="starter"
              highlight={false}
              onUpgrade={onUpgrade}
            />
          )}
          <PlanCard
            plan="pro"
            highlight={currentPlan !== "free"}
            onUpgrade={onUpgrade}
          />
        </div>

        <button onClick={onClose}
          className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors py-1">
          Maybe later
        </button>
      </div>
    </div>
  );
}

function PlanCard({ plan, highlight, onUpgrade }: { plan: Plan; highlight: boolean; onUpgrade: (p: Plan) => void }) {
  const p = PLANS[plan];
  return (
    <button
      onClick={() => onUpgrade(plan)}
      className={`w-full rounded-xl p-4 text-left border-2 transition-all ${
        highlight
          ? "border-[#1BC47D] bg-[#F0FDF8]"
          : "border-gray-100 hover:border-gray-200 bg-gray-50"
      }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-gray-900">{p.name}</span>
        <span className="text-sm font-bold" style={{ color: "#1BC47D" }}>
          ₹{p.price}/mo
        </span>
      </div>
      <div className="flex gap-3 text-xs text-gray-500">
        <span>{p.leads === Infinity ? "Unlimited" : p.leads} leads</span>
        <span>·</span>
        <span>{p.properties === Infinity ? "Unlimited" : p.properties} properties</span>
        <span>·</span>
        <span>{p.team} member{p.team > 1 ? "s" : ""}</span>
      </div>
    </button>
  );
}
