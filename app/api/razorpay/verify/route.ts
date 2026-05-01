// app/api/razorpay/verify/route.ts
// Verifies Razorpay payment signature and upgrades the user's plan in Supabase
import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan, user_id } = await req.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !plan || !user_id) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Verify HMAC-SHA256 signature — proves payment is genuine and not tampered
    const body     = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    // Upgrade user plan in Supabase
    const now      = new Date();
    const monthEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        plan,
        subscription_status: "active",
        subscription_id:     razorpay_payment_id,
        plan_started_at:     now.toISOString(),
        plan_ends_at:        monthEnd.toISOString(),
        trial_ends_at:       null,
      })
      .eq("id", user_id);

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json({ error: "Failed to activate plan" }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan });
  } catch (err) {
    console.error("Razorpay verify error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
