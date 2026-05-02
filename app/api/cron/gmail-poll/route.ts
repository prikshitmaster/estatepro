// app/api/cron/gmail-poll/route.ts
// Runs every 5 minutes (triggered by cron-job.org)
// Reads Gmail for every connected broker → parses portal emails → creates leads
//
// Protected by CRON_SECRET header. Set this in cron-job.org as:
//   Header: x-cron-secret: <your CRON_SECRET value>

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin }             from "@/lib/supabase-admin";
import { parseInboundEmail }         from "@/lib/email-parser";
import type { LeadSource, PropertyInterest } from "@/lib/types";

// Portal Gmail search query — matches all known Indian real estate portals
const GMAIL_QUERY = [
  "from:magicbricks.com", "from:99acres.com",   "from:housing.com",
  "from:nobroker.in",     "from:proptiger.com",  "from:squareyards.com",
  "from:commonfloor.com", "from:makaan.com",     "from:justdial.com",
  "from:sulekha.com",     "from:olx.in",         "from:quikr.com",
  "from:nestaway.com",    "from:anarock.com",     "from:zameen.com",
  "from:bayut.com",       "from:indiabulls.com",
  'subject:"new lead"',   'subject:"new enquiry"', 'subject:"buyer enquiry"',
  'subject:"lead alert"', 'subject:"property enquiry"',
].join(" OR ");

// ── Token helpers ─────────────────────────────────────────────────────────────

async function getValidToken(conn: {
  id: string; access_token: string | null; refresh_token: string; token_expiry: string | null;
}): Promise<string> {
  const expiry = conn.token_expiry ? new Date(conn.token_expiry) : new Date(0);
  const needsRefresh = expiry.getTime() - Date.now() < 5 * 60 * 1000; // refresh if < 5 min left

  if (!needsRefresh && conn.access_token) return conn.access_token;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: conn.refresh_token,
      grant_type:    "refresh_token",
    }),
  });

  const data = await res.json();
  if (!data.access_token) throw new Error("Token refresh failed");

  await supabaseAdmin
    .from("gmail_connections")
    .update({
      access_token: data.access_token,
      token_expiry: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    })
    .eq("id", conn.id);

  return data.access_token;
}

// ── Lead helpers (same as inbound-email route) ────────────────────────────────

function toLeadSource(source: string): LeadSource {
  const portals = ["99acres","magicbricks","housing","nobroker","proptiger",
                   "squareyards","commonfloor","makaan","justdial","sulekha",
                   "olx","quikr","nestaway","anarock","zameen","bayut"];
  if (portals.includes(source))                          return "ad";
  if (source === "facebook" || source === "instagram")   return "social";
  return "other";
}

function toPropertyInterest(raw: string): PropertyInterest | undefined {
  const k = raw.toLowerCase().replace(/\s+/g, "");
  if (k.includes("1bhk")) return "1BHK";
  if (k.includes("2bhk")) return "2BHK";
  if (k.includes("3bhk")) return "3BHK";
  if (k.includes("4bhk")) return "4BHK";
  if (k.includes("villa"))      return "Villa";
  if (k.includes("plot"))       return "Plot";
  if (k.includes("commercial")) return "Commercial";
  return undefined;
}

// ── Decode Gmail message body ─────────────────────────────────────────────────

function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  try { return Buffer.from(base64, "base64").toString("utf-8"); } catch { return ""; }
}

function extractBody(payload: Record<string, unknown>): { text: string; html: string } {
  let text = "", html = "";

  function walk(part: Record<string, unknown>) {
    const mimeType = part.mimeType as string ?? "";
    const body     = part.body as Record<string, unknown> ?? {};
    const data     = body.data as string ?? "";
    const parts    = part.parts as Record<string, unknown>[] ?? [];

    if (mimeType === "text/plain" && data) text = decodeBase64Url(data);
    if (mimeType === "text/html"  && data) html = decodeBase64Url(data);
    parts.forEach(walk);
  }

  walk(payload);
  return { text, html };
}

// ── Process one Gmail connection ──────────────────────────────────────────────

async function processConnection(conn: {
  id: string; user_id: string; google_email: string;
  access_token: string | null; refresh_token: string;
  token_expiry: string | null; last_checked_at: string;
}): Promise<{ processed: number; created: number; skipped: number }> {
  const token = await getValidToken(conn);
  const stats = { processed: 0, created: 0, skipped: 0 };

  // Search for portal emails newer than last check
  const afterUnix = Math.floor(new Date(conn.last_checked_at).getTime() / 1000);
  const query     = encodeURIComponent(`(${GMAIL_QUERY}) after:${afterUnix}`);

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listData = await listRes.json();

  if (!listData.messages?.length) return stats;

  // Update last_checked_at NOW so next poll doesn't re-fetch these
  await supabaseAdmin
    .from("gmail_connections")
    .update({ last_checked_at: new Date().toISOString() })
    .eq("id", conn.id);

  // Process each message
  for (const msg of listData.messages) {
    try {
      stats.processed++;

      // Get full message
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const msgData = await msgRes.json();

      // Extract headers
      const headers  = msgData.payload?.headers ?? [];
      const from     = headers.find((h: { name: string }) => h.name === "From")?.value   ?? "";
      const subject  = headers.find((h: { name: string }) => h.name === "Subject")?.value ?? "";
      const { text, html } = extractBody(msgData.payload ?? {});

      // Parse email → lead data
      const parsed = parseInboundEmail(from, subject, text, html);

      // Skip if no contact info
      if (!parsed.phone && !parsed.email && !parsed.name) { stats.skipped++; continue; }

      const userId = conn.user_id;

      // Deduplicate by phone
      if (parsed.phone) {
        const { data: dup } = await supabaseAdmin
          .from("leads").select("id")
          .eq("user_id", userId).eq("phone", parsed.phone).maybeSingle();
        if (dup) { stats.skipped++; continue; }
      } else if (parsed.email) {
        const { data: dup } = await supabaseAdmin
          .from("leads").select("id")
          .eq("user_id", userId).eq("email", parsed.email).maybeSingle();
        if (dup) { stats.skipped++; continue; }
      }

      // Insert lead
      const defaultName = parsed.name || parsed.email
        || `Lead via ${parsed.source} – ${new Date().toLocaleDateString("en-IN")}`;

      const { error: insertErr } = await supabaseAdmin
        .from("leads")
        .insert({
          user_id:           userId,
          name:              defaultName,
          phone:             parsed.phone  || null,
          email:             parsed.email  || null,
          source:            toLeadSource(parsed.source),
          budget_min:        parsed.budget_min || 0,
          budget_max:        parsed.budget_max || 0,
          location:          parsed.location   || null,
          stage:             "new",
          notes:             parsed.notes,
          property_interest: toPropertyInterest(parsed.property_interest),
        });

      if (!insertErr) {
        stats.created++;
      }
    } catch (err) {
      console.error(`[gmail-poll] message ${msg.id} error:`, err);
    }
  }

  // Bulk-increment leads_captured counter after processing
  if (stats.created > 0) {
    try {
      await supabaseAdmin.rpc("increment_gmail_leads", {
        connection_id: conn.id,
        amount:        stats.created,
      });
    } catch {
      // RPC doesn't exist yet — silently skip, counter stays at 0 until migration runs
    }
  }

  return stats;
}

// ── Cron endpoint ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Protect with secret so only cron-job.org can call this
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all active Gmail connections
    const { data: connections, error } = await supabaseAdmin
      .from("gmail_connections")
      .select("id, user_id, google_email, access_token, refresh_token, token_expiry, last_checked_at")
      .eq("active", true);

    if (error) throw error;
    if (!connections?.length) return NextResponse.json({ message: "No active connections", processed: 0 });

    // Process all connections (in parallel, max 5 at a time)
    const results = [];
    for (let i = 0; i < connections.length; i += 5) {
      const batch = connections.slice(i, i + 5);
      const batchResults = await Promise.allSettled(batch.map(processConnection));
      results.push(...batchResults);
    }

    const totals = results.reduce((acc, r) => {
      if (r.status === "fulfilled") {
        acc.created  += r.value.created;
        acc.skipped  += r.value.skipped;
        acc.processed += r.value.processed;
      }
      return acc;
    }, { processed: 0, created: 0, skipped: 0 });

    console.log(`[gmail-poll] Done: ${connections.length} accounts, ${totals.created} leads created`);
    return NextResponse.json({ ...totals, accounts: connections.length });

  } catch (err) {
    console.error("[gmail-poll] error:", err);
    return NextResponse.json({ error: "Poll failed" }, { status: 500 });
  }
}

// Allow GET for manual testing
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return POST(req);
}
