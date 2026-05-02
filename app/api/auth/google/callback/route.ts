// app/api/auth/google/callback/route.ts
// Step 2 of OAuth: Google redirects here with a code → exchange for tokens → save to DB

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const code   = req.nextUrl.searchParams.get("code");
  const userId = req.nextUrl.searchParams.get("state"); // we passed user_id as state
  const error  = req.nextUrl.searchParams.get("error");

  if (error || !code || !userId) {
    return NextResponse.redirect(`${appUrl}/auto-capture?gmail_error=denied`);
  }

  try {
    // ── 1. Exchange code for access + refresh tokens ──────────────────────────
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri:  `${appUrl}/api/auth/google/callback`,
        grant_type:    "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokens.refresh_token) {
      // No refresh token = user already approved before without revoking.
      // They need to go to myaccount.google.com/permissions and remove EstatePro, then reconnect.
      return NextResponse.redirect(`${appUrl}/auto-capture?gmail_error=no_refresh_token`);
    }

    // ── 2. Get their Gmail address ────────────────────────────────────────────
    const profileRes  = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();

    // ── 3. Save connection to DB ──────────────────────────────────────────────
    const { error: dbErr } = await supabaseAdmin
      .from("gmail_connections")
      .upsert({
        user_id:        userId,
        google_email:   profile.emailAddress,
        access_token:   tokens.access_token,
        refresh_token:  tokens.refresh_token,
        token_expiry:   new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        last_checked_at: new Date().toISOString(),
        active:         true,
      }, { onConflict: "user_id" });

    if (dbErr) throw new Error(dbErr.message);

    return NextResponse.redirect(`${appUrl}/auto-capture?gmail_connected=true`);

  } catch (err) {
    console.error("[google/callback] error:", err);
    return NextResponse.redirect(`${appUrl}/auto-capture?gmail_error=failed`);
  }
}
