"use client";

import { useState } from "react";
import Link from "next/link";

interface Plan {
  id: string;
  name: string;
  price: number | null;
  period: string;
  color: string;
  badge?: string;
  features: string[];
  cta: string;
  highlight: boolean;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    period: "Free forever",
    color: "#6B7280",
    features: [
      "1 user",
      "Up to 300 leads",
      "Lead tracking & pipeline",
      "WhatsApp links (wa.me)",
      "CSV import & export",
      "Basic dashboard",
      "Tasks & follow-ups",
    ],
    cta: "Current Plan",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 999,
    period: "per month",
    color: "#1BC47D",
    badge: "Most Popular",
    features: [
      "1 user",
      "Unlimited leads",
      "Everything in Starter",
      "WhatsApp Business API",
      "Activity timeline",
      "Smart lists & filters",
      "Property secure share links",
      "Commission tracking",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
  },
  {
    id: "team",
    name: "Team",
    price: 2499,
    period: "per month",
    color: "#7C3AED",
    features: [
      "Up to 10 users",
      "Unlimited leads",
      "Everything in Pro",
      "Team management",
      "Lead assignment",
      "Action plans & sequences",
      "Team analytics",
      "Dedicated onboarding",
    ],
    cta: "Upgrade to Team",
    highlight: false,
  },
];

export default function BillingPage() {
  const [annual, setAnnual] = useState(false);
  const [current] = useState("starter"); // read from Supabase in production

  function finalPrice(plan: Plan) {
    if (!plan.price) return 0;
    return annual ? Math.round(plan.price * 0.8) : plan.price; // 20% off annual
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/settings" className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Plans & Billing</h1>
          <p className="text-sm text-gray-400">Choose the plan that fits your business</p>
        </div>
      </div>

      {/* Annual toggle */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <span className={`text-sm font-medium ${!annual ? "text-gray-900" : "text-gray-400"}`}>Monthly</span>
        <button
          onClick={() => setAnnual((v) => !v)}
          className="relative w-11 h-6 rounded-full transition-colors"
          style={{ background: annual ? "#1BC47D" : "#D1D5DB" }}>
          <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
            style={{ transform: annual ? "translateX(20px)" : "translateX(0)" }} />
        </button>
        <span className={`text-sm font-medium ${annual ? "text-gray-900" : "text-gray-400"}`}>
          Annual <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full ml-1" style={{ background: "#D1FAE5", color: "#065F46" }}>Save 20%</span>
        </span>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === current;
          return (
            <div key={plan.id}
              className="relative bg-white rounded-2xl overflow-hidden transition-shadow hover:shadow-md"
              style={{ border: plan.highlight ? `2px solid ${plan.color}` : "1px solid #E5E7EB" }}>

              {plan.badge && (
                <div className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: plan.color }}>
                  {plan.badge}
                </div>
              )}

              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: plan.color }}>{plan.name}</p>
                {plan.price === 0 ? (
                  <p className="text-3xl font-black text-gray-900 mb-0.5">Free</p>
                ) : (
                  <div className="flex items-end gap-1 mb-0.5">
                    <span className="text-lg font-semibold text-gray-500">₹</span>
                    <span className="text-3xl font-black text-gray-900">{finalPrice(plan).toLocaleString("en-IN")}</span>
                  </div>
                )}
                <p className="text-xs text-gray-400 mb-5">{plan.price === 0 ? plan.period : plan.period + (annual ? " · billed annually" : " · billed monthly")}</p>

                <button
                  disabled={isCurrent}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all mb-5"
                  style={isCurrent
                    ? { background: "#F3F4F6", color: "#9CA3AF", cursor: "default" }
                    : { background: plan.color, color: "#fff" }}>
                  {isCurrent ? "Current Plan" : plan.cta}
                </button>

                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                      <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: plan.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Razorpay note */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-blue-800">Payments powered by Razorpay</p>
          <p className="text-xs text-blue-600 mt-0.5">All plans include a 7-day free trial. Cancel anytime. UPI, Credit/Debit cards, and Net Banking accepted.</p>
        </div>
      </div>

      {/* Current plan info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Current Subscription</h2>
        <div className="space-y-2">
          <Row label="Plan" value="Starter (Free)" />
          <Row label="Status" value="Active" valueColor="#1BC47D" />
          <Row label="Next Billing" value="—" />
          <Row label="Payment Method" value="—" />
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Questions about billing? Contact us at{" "}
          <a href="mailto:support@rateperfeet.com" className="text-blue-600 hover:underline">support@rateperfeet.com</a>
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-medium" style={{ color: valueColor ?? "#111827" }}>{value}</span>
    </div>
  );
}
