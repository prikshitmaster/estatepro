// lib/razorpay.ts — Razorpay server-side instance + plan config
import Razorpay from "razorpay";

// Lazy instance — only created when first used, so missing env vars don't crash the build
let _razorpay: Razorpay | null = null;
export function getRazorpay(): Razorpay {
  if (!_razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay keys not configured");
    }
    _razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}


// ⚠️  TESTING: both plans set to ₹9 (900 paise) for live payment test
// When ready to go real: change starter to 9900 (₹99), pro to 29900 (₹299)
export const PLANS = {
  starter: { amount: 900,   label: "Starter Plan", monthly: "₹99/mo" },
  pro:     { amount: 900,   label: "Pro Plan",      monthly: "₹299/mo" },
} as const;

export type PlanKey = keyof typeof PLANS;
