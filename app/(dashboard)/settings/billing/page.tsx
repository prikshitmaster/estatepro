"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getUserPlan } from "@/lib/db/subscriptions";
import { PLANS } from "@/lib/plans";
import type { Plan } from "@/lib/plans";
import { supabase } from "@/lib/supabase";


const PLAN_FEATURES: Record<Plan, string[]> = {
  free: [
    "1 user",
    "Up to 25 leads",
    "Up to 10 properties",
    "Lead tracking & pipeline",
    "WhatsApp links (wa.me)",
    "CSV export",
    "Basic dashboard",
  ],
  starter: [
    "Up to 3 users",
    "Up to 250 leads",
    "Up to 100 properties",
    "Everything in Free",
    "Activity timeline",
    "Tags & smart lists",
    "Secure property share links",
  ],
  pro: [
    "Up to 10 users",
    "Unlimited leads",
    "Unlimited properties",
    "Everything in Starter",
    "WhatsApp Business API",
    "Commission tracking",
    "Priority support",
  ],
};

const PLAN_COLOR: Record<Plan, string> = {
  free:    "#6B7280",
  starter: "#1BC47D",
  pro:     "#7C3AED",
};

const PLAN_CTA: Record<Plan, string> = {
  free:    "Current Plan",
  starter: "Upgrade to Starter",
  pro:     "Upgrade to Pro",
};

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<Plan>("free");
  const [paying,      setPaying]      = useState<Plan | null>(null);
  const [success,     setSuccess]     = useState("");
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    getUserPlan().then((p) => { setCurrentPlan(p); setLoading(false); });

    // Load Razorpay script
    if (!document.getElementById("razorpay-script")) {
      const s = document.createElement("script");
      s.id  = "razorpay-script";
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      document.body.appendChild(s);
    }
  }, []);

  async function handleUpgrade(plan: Plan) {
    if (plan === currentPlan || plan === "free") return;
    setPaying(plan);
    setError("");

    try {
      // Get auth token to pass to server
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";

      // 1. Create Razorpay order on server
      const res  = await fetch("/api/payments/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body:    JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create order."); setPaying(null); return; }

      // 2. Open Razorpay checkout
      const rzp = new window.Razorpay({
        key:         data.key,
        order_id:    data.order_id,
        amount:      data.amount,
        currency:    "INR",
        name:        "EstatePro",
        description: `${PLANS[plan].name} Plan – ₹${PLANS[plan].price}/mo`,
        prefill:     { email: data.email },
        theme:       { color: PLAN_COLOR[plan] },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          // 3. Verify payment on server + update subscription
          const vRes  = await fetch("/api/payments/verify", {
            method:  "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body:    JSON.stringify({ ...response, plan }),
          });
          const vData = await vRes.json();
          if (vRes.ok) {
            setCurrentPlan(plan);
            setSuccess(`You're now on the ${PLANS[plan].name} plan!`);
          } else {
            setError(vData.error ?? "Payment verified but upgrade failed. Contact support.");
          }
          setPaying(null);
        },
        modal: { ondismiss: () => setPaying(null) },
      });
      rzp.open();

    } catch {
      setError("Something went wrong. Try again.");
      setPaying(null);
    }
  }

  const plans: Plan[] = ["free", "starter", "pro"];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/settings"
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Plans & Billing</h1>
          <p className="text-sm text-gray-400">Choose the plan that fits your business</p>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div className="mb-6 flex items-center gap-2 bg-green-50 border border-green-100 rounded-2xl px-4 py-3 text-sm font-semibold text-green-700">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          {success}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Plans grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {plans.map((plan) => {
          const isCurrent = plan === currentPlan;
          const p         = PLANS[plan];
          const color     = PLAN_COLOR[plan];
          const isUpgrade = plans.indexOf(plan) > plans.indexOf(currentPlan);

          return (
            <div key={plan}
              className="relative bg-white rounded-2xl overflow-hidden transition-shadow hover:shadow-md"
              style={{ border: isCurrent ? `2px solid ${color}` : "1px solid #E5E7EB" }}>

              {isCurrent && (
                <div className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: color }}>
                  Current
                </div>
              )}
              {plan === "starter" && !isCurrent && (
                <div className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: "#1BC47D" }}>
                  Popular
                </div>
              )}

              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color }}>
                  {p.name}
                </p>

                {p.price === 0 ? (
                  <p className="text-3xl font-black text-gray-900 mb-0.5">Free</p>
                ) : (
                  <div className="flex items-end gap-0.5 mb-0.5">
                    <span className="text-lg font-semibold text-gray-500">₹</span>
                    <span className="text-3xl font-black text-gray-900">{p.price}</span>
                  </div>
                )}
                <p className="text-xs text-gray-400 mb-5">
                  {p.price === 0 ? "Free forever" : "per month · billed monthly"}
                </p>

                <button
                  disabled={isCurrent || !isUpgrade || paying !== null || loading}
                  onClick={() => handleUpgrade(plan)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all mb-5 flex items-center justify-center gap-2"
                  style={isCurrent || !isUpgrade
                    ? { background: "#F3F4F6", color: "#9CA3AF", cursor: "default" }
                    : { background: color, color: "#fff" }}>
                  {paying === plan ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Opening…
                    </>
                  ) : isCurrent ? "Current Plan" : !isUpgrade ? "Downgrade" : PLAN_CTA[plan]}
                </button>

                <ul className="space-y-2">
                  {PLAN_FEATURES[plan].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                      <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <p className="text-xs text-blue-600 mt-0.5">UPI, Credit/Debit cards, and Net Banking accepted. Cancel anytime.</p>
        </div>
      </div>

      {/* Current subscription info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Current Subscription</h2>
        <div className="space-y-2">
          <Row label="Plan"           value={loading ? "…" : PLANS[currentPlan].name} />
          <Row label="Status"         value="Active" valueColor="#1BC47D" />
          <Row label="Next Billing"   value={currentPlan === "free" ? "—" : "Monthly"} />
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
