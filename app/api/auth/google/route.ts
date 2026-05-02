// app/api/auth/google/route.ts
// Step 1 of OAuth: redirect user to Google's consent screen
// Called with: GET /api/auth/google?user_id=UUID

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

  const clientId   = process.env.GOOGLE_CLIENT_ID;
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL;
  if (!clientId || !appUrl) return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 });

  const redirectUri = `${appUrl}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: "code",
    scope:         "https://www.googleapis.com/auth/gmail.readonly",
    access_type:   "offline",
    prompt:        "consent",   // always show consent → guarantees refresh_token
    state:         userId,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
