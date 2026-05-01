// lib/razorpay.ts — Razorpay server-side instance + plan config
import Razorpay from "razorpay";

export const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// ⚠️  TESTING: both plans set to ₹9 (900 paise) for live payment test
// When ready to go real: change starter to 9900 (₹99), pro to 29900 (₹299)
export const PLANS = {
  starter: { amount: 900,   label: "Starter Plan", monthly: "₹99/mo" },
  pro:     { amount: 900,   label: "Pro Plan",      monthly: "₹299/mo" },
} as const;

export type PlanKey = keyof typeof PLANS;
