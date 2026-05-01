// app/(dashboard)/upgrade/page.tsx — Plan upgrade with Razorpay checkout
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: any) => { open(): void };
  }
}

const G = "#1BC47D";

const PLANS = {
  starter: {
    name:     "Starter",
    price:    "₹9",       // ← change to ₹99 when real
    tagline:  "Perfect for individual brokers",
    color:    "#F0FDF9",
    border:   "#BBF7D0",
    features: ["20 properties","20 leads","3 secure share links","Photo & video upload","WhatsApp share","Tasks & follow-ups"],
  },
  pro: {
    name:     "Pro",
    price:    "₹9",       // ← change to ₹299 when real
    tagline:  "For growing brokers & small teams",
    color:    "#F0FDF9",
    border:   G,
    badge:    "Most Popular",
    features: ["Unlimited properties","Unlimited leads","Unlimited secure share links","Newspaper lead import","Priority support","Everything in Starter"],
  },
} as const;

type PlanKey = keyof typeof PLANS;

export default function UpgradePage() {
  const router = useRouter();
  const [userId,    setUserId]    = useState("");
  const [userName,  setUserName]  = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loading,   setLoading]   = useState<PlanKey | null>(null);
  const [success,   setSuccess]   = useState<PlanKey | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  // Load Razorpay checkout.js
  useEffect(() => {
    if (document.getElementById("razorpay-script")) { setScriptReady(true); return; }
    const s = document.createElement("script");
    s.id  = "razorpay-script";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => setScriptReady(true);
    document.body.appendChild(s);
  }, []);

  // Get logged-in user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      setUserName(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "");
      setUserEmail(user.email ?? "");
    });
  }, [router]);

  async function handleUpgrade(plan: PlanKey) {
    if (!scriptReady || !userId) return;
    setLoading(plan);

    try {
      // 1. Create order on our server
      const orderRes = await fetch("/api/razorpay/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ plan, user_id: userId }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error ?? "Order creation failed");

      // 2. Open Razorpay checkout
      const rzp = new window.Razorpay({
        key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount:      order.amount,
        currency:    "INR",
        name:        "EstatePro CRM",
        description: PLANS[plan].name + " Plan",
        order_id:    order.order_id,
        prefill:     { name: userName, email: userEmail, contact: "" },
        theme:       { color: G },
        modal:       { ondismiss: () => setLoading(null) },

        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          // 3. Verify payment on our server
          const verifyRes = await fetch("/api/razorpay/verify", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_signature:  response.razorpay_signature,
              plan,
              user_id: userId,
            }),
          });
          const result = await verifyRes.json();
          if (verifyRes.ok && result.success) {
            setSuccess(plan);
            setLoading(null);
            setTimeout(() => router.push("/dashboard"), 2500);
          } else {
            alert("Payment verification failed. Contact support.");
            setLoading(null);
          }
        },
      });

      rzp.open();
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
      setLoading(null);
    }
  }

  if (success) {
    return (
      <div className="p-6 max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontWeight: 800, fontSize: 24, color: "#0F172A", marginBottom: 8 }}>
          You&apos;re on {PLANS[success].name}!
        </h2>
        <p style={{ color: "#64748B", fontSize: 15, marginBottom: 24 }}>
          Payment successful. Redirecting to your dashboard…
        </p>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: G, animation: "pulse 1s ease infinite" }} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 sm:pb-6">

      {/* Header */}
      <div className="mb-8 text-center">
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 20, padding: "5px 14px", marginBottom: 16 }}>
          <span style={{ fontSize: 14 }}>🎁</span>
          <span style={{ color: "#C2410C", fontSize: 12, fontWeight: 700 }}>Testing mode — ₹9 for both plans</span>
        </div>
        <h1 style={{ fontWeight: 800, fontSize: 26, color: "#0F172A", marginBottom: 6, letterSpacing: -0.5 }}>
          Upgrade Your Plan
        </h1>
        <p style={{ color: "#64748B", fontSize: 15 }}>Pay once, get 30 days of access. Cancel anytime.</p>
      </div>

      {/* Pricing cards */}
      <div className="flex flex-col gap-4">
        {(Object.entries(PLANS) as [PlanKey, typeof PLANS[PlanKey]][]).map(([key, plan]) => (
          <div key={key} style={{
            borderRadius: 20,
            padding: "24px 24px 20px",
            background: "badge" in plan ? "linear-gradient(160deg, #F0FDF9 0%, #fff 100%)" : "#fff",
            border: `${"badge" in plan ? "2px" : "1.5px"} solid ${"badge" in plan ? G : "#E2E8F0"}`,
            boxShadow: "badge" in plan ? "0 6px 32px rgba(27,196,125,0.13)" : "0 1px 8px rgba(0,0,0,0.04)",
            position: "relative",
          }}>
            {"badge" in plan && (
              <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: G, color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 14px", borderRadius: 20, whiteSpace: "nowrap" }}>
                {(plan as typeof PLANS["pro"]).badge}
              </div>
            )}

            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p style={{ fontWeight: 800, fontSize: 18, color: "#0F172A", marginBottom: 2 }}>{plan.name}</p>
                <p style={{ color: "#64748B", fontSize: 13 }}>{plan.tagline}</p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <span style={{ fontWeight: 800, fontSize: 32, color: "#0F172A", letterSpacing: -1 }}>{plan.price}</span>
                <span style={{ color: "#94A3B8", fontSize: 13 }}>/mo</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
              {plan.features.map(f => (
                <span key={f} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#475569", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "4px 10px" }}>
                  <span style={{ color: G, fontSize: 11 }}>✓</span> {f}
                </span>
              ))}
            </div>

            <button
              onClick={() => handleUpgrade(key)}
              disabled={loading !== null || !scriptReady}
              style={{
                width: "100%", padding: "13px 0", borderRadius: 12,
                background: "badge" in plan ? G : "#F8FAFC",
                color: "badge" in plan ? "#fff" : "#0F172A",
                border: "badge" in plan ? "none" : "1.5px solid #E2E8F0",
                fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
                opacity: loading !== null ? 0.6 : 1,
                boxShadow: "badge" in plan ? "0 4px 16px rgba(27,196,125,0.3)" : "none",
                transition: "opacity 0.2s",
              }}
            >
              {loading === key ? "Opening payment…" : `Pay ${plan.price} → Upgrade to ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      <p style={{ textAlign: "center", color: "#94A3B8", fontSize: 12, marginTop: 20 }}>
        Secured by Razorpay · GST extra · Cancel anytime
      </p>
    </div>
  );
}
