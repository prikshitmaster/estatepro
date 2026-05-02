// app/api/inbound-email/route.ts
//
// This is the webhook endpoint that receives lead emails and auto-creates leads.
//
// Called by: Google Apps Script running in the agent's Gmail (every 5 min)
// URL format: POST /api/inbound-email?id=UNIQUE_TOKEN
//
// Payload (JSON):
//   { from, subject, text, html }
//
// Also handles SendGrid Inbound Parse (multipart) for future upgrade.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin }             from "@/lib/supabase-admin";
import { parseInboundEmail }         from "@/lib/email-parser";
import type { LeadSource, PropertyInterest } from "@/lib/types";

// Map parsed source name → valid LeadSource enum value
function toLeadSource(source: string): LeadSource {
  if (["99acres", "magicbricks", "housing", "nobroker", "proptiger", "squareyards"].includes(source)) return "ad";
  if (source === "facebook") return "social";
  if (source === "website")  return "website";
  return "other";
}

// Map parsed property interest → valid PropertyInterest enum value
function toPropertyInterest(raw: string): PropertyInterest | undefined {
  const map: Record<string, PropertyInterest> = {
    "1bhk": "1BHK", "1BHK": "1BHK",
    "2bhk": "2BHK", "2BHK": "2BHK",
    "3bhk": "3BHK", "3BHK": "3BHK",
    "4bhk": "4BHK", "4BHK": "4BHK",
    "villa": "Villa",
    "plot": "Plot",
    "commercial": "Commercial",
  };
  const key = raw.toLowerCase().replace(/\s+/g, "");
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k.toLowerCase())) return v;
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Validate token ─────────────────────────────────────────────────────
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { data: inbox, error: inboxErr } = await supabaseAdmin
      .from("user_inboxes")
      .select("user_id, active")
      .eq("unique_id", id)
      .single();

    if (inboxErr || !inbox) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    if (!inbox.active)      return NextResponse.json({ error: "Inbox disabled" }, { status: 403 });

    const userId = inbox.user_id as string;

    // ── 2. Parse request body ─────────────────────────────────────────────────
    let from = "", subject = "", text = "", html = "";

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      from    = body.from    ?? "";
      subject = body.subject ?? "";
      text    = body.text    ?? "";
      html    = body.html    ?? "";
    } else if (contentType.includes("multipart/form-data")) {
      // SendGrid Inbound Parse format (upgrade path)
      const form = await req.formData();
      from    = String(form.get("from")    ?? "");
      subject = String(form.get("subject") ?? "");
      text    = String(form.get("text")    ?? "");
      html    = String(form.get("html")    ?? "");
    } else {
      return NextResponse.json({ error: "Unsupported content type" }, { status: 415 });
    }

    if (!from && !text && !html) {
      return NextResponse.json({ error: "Empty payload" }, { status: 400 });
    }

    // ── 3. Parse email → extract lead data ────────────────────────────────────
    const parsed = parseInboundEmail(from, subject, text, html);

    // Skip if we couldn't extract a phone number (not a real lead email)
    if (!parsed.phone && !parsed.email && !parsed.name) {
      return NextResponse.json({ skipped: true, reason: "No contact info found" }, { status: 200 });
    }

    // ── 4. Deduplicate by phone, then by email ───────────────────────────────
    if (parsed.phone) {
      const { data: existing } = await supabaseAdmin
        .from("leads")
        .select("id")
        .eq("user_id", userId)
        .eq("phone", parsed.phone)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ skipped: true, reason: "Duplicate phone", lead_id: existing.id }, { status: 200 });
      }
    } else if (parsed.email) {
      // No phone — fall back to email dedup
      const { data: existing } = await supabaseAdmin
        .from("leads")
        .select("id")
        .eq("user_id", userId)
        .eq("email", parsed.email)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ skipped: true, reason: "Duplicate email", lead_id: existing.id }, { status: 200 });
      }
    }

    // ── 5. Insert lead ────────────────────────────────────────────────────────
    const { data: lead, error: insertErr } = await supabaseAdmin
      .from("leads")
      .insert({
        user_id:           userId,
        name:              parsed.name  || parsed.email || "Unknown Lead",
        phone:             parsed.phone,
        email:             parsed.email,
        source:            toLeadSource(parsed.source),
        budget_min:        parsed.budget_min  || 0,
        budget_max:        parsed.budget_max  || 0,
        location:          parsed.location,
        stage:             "new",
        notes:             parsed.notes,
        property_interest: toPropertyInterest(parsed.property_interest),
      })
      .select()
      .single();

    if (insertErr) {
      console.error("[inbound-email] insert error:", insertErr.message);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead_id: lead.id, name: lead.name }, { status: 201 });

  } catch (err) {
    console.error("[inbound-email] unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Health check — GET /api/inbound-email?id=TOKEN returns status
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ status: "PropOS Inbound Email API" }, { status: 200 });

  const { data: inbox } = await supabaseAdmin
    .from("user_inboxes")
    .select("active, created_at")
    .eq("unique_id", id)
    .single();

  if (!inbox) return NextResponse.json({ valid: false }, { status: 404 });
  return NextResponse.json({ valid: true, active: inbox.active });
}
