import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { email, role } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!["admin", "agent", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      data: { role, invited: true },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already been registered")) {
        return NextResponse.json(
          { error: "This email already has an EstatePro account. Ask them to log in directly." },
          { status: 400 }
        );
      }
      if (error.message.toLowerCase().includes("rate limit")) {
        return NextResponse.json(
          { error: "Too many invites sent. Please wait a few minutes and try again." },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to send invite. Try again." }, { status: 500 });
  }
}
