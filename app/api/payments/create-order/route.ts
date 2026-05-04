import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PLANS } from "@/lib/plans";
import type { Plan } from "@/lib/plans";

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json() as { plan: Plan };

    if (!plan || !["starter", "pro"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    // Get the calling user from the Authorization header (Supabase JWT)
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const amountPaise = PLANS[plan].price * 100; // Razorpay uses paise

    const order = await razorpay.orders.create({
      amount:   amountPaise,
      currency: "INR",
      receipt:  `ep_${user.id.slice(0, 8)}_${Date.now()}`,
      notes:    { user_id: user.id, plan },
    });

    return NextResponse.json({
      order_id: order.id,
      amount:   amountPaise,
      key:      process.env.RAZORPAY_KEY_ID,
      email:    user.email,
    });

  } catch (err) {
    console.error("create-order error:", err);
    return NextResponse.json({ error: "Failed to create order. Try again." }, { status: 500 });
  }
}
