import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Plan } from "@/lib/plans";

export async function POST(req: NextRequest) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan } =
      await req.json() as {
        razorpay_payment_id: string;
        razorpay_order_id:   string;
        razorpay_signature:  string;
        plan: Plan;
      };

    // Verify Razorpay signature
    const body      = razorpay_order_id + "|" + razorpay_payment_id;
    const expected  = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 });
    }

    // Get user from Authorization header
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    // Update subscription in Supabase
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month from now

    const { error: dbErr } = await supabaseAdmin
      .from("subscriptions")
      .upsert({
        user_id:      user.id,
        plan,
        status:       "active",
        razorpay_id:  razorpay_payment_id,
        started_at:   new Date().toISOString(),
        expires_at:   expiresAt.toISOString(),
        updated_at:   new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (dbErr) {
      console.error("subscription update error:", dbErr);
      return NextResponse.json({ error: "Payment received but plan update failed. Contact support." }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan });

  } catch (err) {
    console.error("verify error:", err);
    return NextResponse.json({ error: "Verification failed. Try again." }, { status: 500 });
  }
}
