// app/api/razorpay/create-order/route.ts
// Creates a Razorpay order and returns the order_id to the frontend
import { NextResponse } from "next/server";
import { razorpay, PLANS, PlanKey } from "@/lib/razorpay";

export async function POST(req: Request) {
  try {
    const { plan, user_id } = await req.json();

    if (!plan || !PLANS[plan as PlanKey]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (!user_id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { amount, label } = PLANS[plan as PlanKey];

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt:  `ep_${user_id.slice(0, 8)}_${Date.now()}`,
      notes:    { user_id, plan },
    });

    return NextResponse.json({
      order_id: order.id,
      amount,
      currency: "INR",
      label,
    });
  } catch (err) {
    console.error("Razorpay create-order error:", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
