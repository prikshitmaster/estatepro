// POST /api/mailgun/inbound
// Mailgun sends forwarded portal emails here via inbound route.
// Broker's unique address: capture-{uniqueId}@mg.rateperfeet.com

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin }             from "@/lib/supabase-admin";
import { verifyMailgunWebhook }      from "@/lib/mailgun-verify";
import { parseEmailWithAI }          from "@/lib/ai-email-parser";
import type { PropertyInterest, LeadSource } from "@/lib/types";

function toPropertyInterest(raw: string | null): PropertyInterest | undefined {
  if (!raw) return undefined;
  const k = raw.toLowerCase().replace(/\s+/g, "");
  if (k === "1bhk")                          return "1BHK";
  if (k === "2bhk")                          return "2BHK";
  if (k === "3bhk")                          return "3BHK";
  if (k === "4bhk")                          return "4BHK";
  if (k === "villa")                         return "Villa";
  if (k === "plot")                          return "Plot";
  if (k.includes("commercial") || k === "office") return "Commercial";
  return undefined;
}

function toLeadSource(source: string): LeadSource {
  const portals = ["99acres","magicbricks","housing","nobroker","proptiger",
                   "squareyards","commonfloor","makaan","justdial","sulekha",
                   "olx","quikr","nestaway","anarock","zameen","bayut"];
  if (portals.includes(source))                       return "ad";
  if (source === "facebook" || source === "instagram") return "social";
  if (source === "website")                            return "website";
  return "other";
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Parse multipart/form-data from Mailgun ─────────────────────────────
    const form = await req.formData();

    const timestamp = String(form.get("timestamp") ?? "");
    const token     = String(form.get("token")     ?? "");
    const signature = String(form.get("signature") ?? "");
    const recipient = String(form.get("recipient") ?? "");
    const from      = String(form.get("from")      ?? "");
    const subject   = String(form.get("subject")   ?? "");
    const body      = String(
      form.get("stripped-text") ?? form.get("body-plain") ?? form.get("body-html") ?? ""
    );

    // ── 2. Verify Mailgun signature (skip in dev if key not set) ──────────────
    const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY ?? "";
    if (signingKey && !verifyMailgunWebhook(signingKey, timestamp, token, signature)) {
      console.warn("[mailgun/inbound] bad signature, rejected");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // ── 3. Identify broker: capture-{uniqueId}@mg.rateperfeet.com ─────────────
    const match = recipient.match(/capture-([^@]+)@/i);
    if (!match) {
      // Not addressed to a broker inbox — ignore silently
      return NextResponse.json({ skipped: true, reason: "Not a capture address" });
    }
    const uniqueId = match[1];

    const { data: inbox } = await supabaseAdmin
      .from("user_inboxes")
      .select("user_id, active")
      .eq("unique_id", uniqueId)
      .single();

    if (!inbox)        return NextResponse.json({ error: "Unknown inbox" },   { status: 404 });
    if (!inbox.active) return NextResponse.json({ error: "Inbox disabled" },  { status: 403 });

    const userId = inbox.user_id as string;

    // ── 4. AI parse — handles any portal template dynamically ─────────────────
    let parsed;
    try {
      parsed = await parseEmailWithAI(from, subject, body);
    } catch (aiErr) {
      console.error("[mailgun/inbound] AI parse error:", aiErr);
      return NextResponse.json({ error: "AI parsing failed" }, { status: 500 });
    }

    if (!parsed) {
      return NextResponse.json({ skipped: true, reason: "Not a lead email" });
    }

    if (!parsed.phone && !parsed.email && !parsed.name) {
      return NextResponse.json({ skipped: true, reason: "No contact info found" });
    }

    // ── 5. Deduplicate by phone, then email ───────────────────────────────────
    if (parsed.phone) {
      const { data: dup } = await supabaseAdmin
        .from("leads").select("id")
        .eq("user_id", userId).eq("phone", parsed.phone).maybeSingle();
      if (dup) return NextResponse.json({ skipped: true, reason: "Duplicate phone", lead_id: dup.id });
    } else if (parsed.email) {
      const { data: dup } = await supabaseAdmin
        .from("leads").select("id")
        .eq("user_id", userId).eq("email", parsed.email).maybeSingle();
      if (dup) return NextResponse.json({ skipped: true, reason: "Duplicate email", lead_id: dup.id });
    }

    // ── 6. Insert lead ────────────────────────────────────────────────────────
    const defaultName = parsed.name
      || parsed.email
      || `Lead via ${parsed.source} – ${new Date().toLocaleDateString("en-IN")}`;

    const notes = [
      parsed.message ? `Message: ${parsed.message}` : null,
      `Source email: ${from}`,
    ].filter(Boolean).join("\n");

    const { data: lead, error: insertErr } = await supabaseAdmin
      .from("leads")
      .insert({
        user_id:           userId,
        name:              defaultName,
        phone:             parsed.phone  || null,
        email:             parsed.email  || null,
        source:            toLeadSource(parsed.source),
        budget_min:        parsed.budget_min  || 0,
        budget_max:        parsed.budget_max  || 0,
        location:          parsed.location    || null,
        stage:             "new",
        notes,
        property_interest: toPropertyInterest(parsed.property_interest),
      })
      .select()
      .single();

    if (insertErr) {
      console.error("[mailgun/inbound] insert error:", insertErr.message);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    console.log(`[mailgun/inbound] lead created: ${lead.id} for user ${userId} from ${parsed.source}`);
    return NextResponse.json({ success: true, lead_id: lead.id, name: lead.name }, { status: 201 });

  } catch (err) {
    console.error("[mailgun/inbound] unexpected error:", err);
    // Always return 200 to stop Mailgun retries on unexpected errors
    return NextResponse.json({ error: "Internal error" }, { status: 200 });
  }
}
