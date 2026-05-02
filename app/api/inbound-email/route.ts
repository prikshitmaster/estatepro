// app/api/inbound-email/route.ts
// Webhook: POST /api/inbound-email?id=TOKEN
// Called by Google Apps Script every 5 min with portal lead emails.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin }             from "@/lib/supabase-admin";
import { parseInboundEmail }         from "@/lib/email-parser";
import type { LeadSource, PropertyInterest } from "@/lib/types";

function toLeadSource(source: string): LeadSource {
  const portalSources = ["99acres","magicbricks","housing","nobroker","proptiger",
                         "squareyards","commonfloor","makaan","justdial","sulekha",
                         "olx","quikr","nestaway","anarock","zameen","bayut"];
  if (portalSources.includes(source)) return "ad";
  if (source === "facebook" || source === "instagram") return "social";
  if (source === "website")  return "website";
  return "other";
}

function toPropertyInterest(raw: string): PropertyInterest | undefined {
  const key = raw.toLowerCase().replace(/\s+/g, "");
  if (key.includes("1bhk") || key === "1") return "1BHK";
  if (key.includes("2bhk") || key === "2") return "2BHK";
  if (key.includes("3bhk") || key === "3") return "3BHK";
  if (key.includes("4bhk") || key === "4") return "4BHK";
  if (key.includes("villa"))               return "Villa";
  if (key.includes("plot"))                return "Plot";
  if (key.includes("commercial") || key.includes("office")) return "Commercial";
  return undefined;
}

// Check if lead may have enquired on a sold/rented property and find alternatives
async function checkSoldProperty(userId: string, parsed: ReturnType<typeof parseInboundEmail>) {
  try {
    const { data: inactive } = await supabaseAdmin
      .from("properties")
      .select("id, title, location, type, price, status, bedrooms")
      .eq("user_id", userId)
      .in("status", ["sold", "rented", "off-market"]);

    if (!inactive?.length) return null;

    const loc = (parsed.location ?? "").toLowerCase();
    const bhk = (parsed.property_interest ?? "").toLowerCase();
    const budget = parsed.budget_max ?? 0;

    const matched = inactive.find(p => {
      const pLoc = (p.location ?? "").toLowerCase();
      const pBhk = (p.bedrooms ?? p.type ?? "").toLowerCase();
      const pPrice = p.price ?? 0;

      const locMatch = loc && pLoc && (pLoc.includes(loc) || loc.includes(pLoc));
      const bhkMatch = bhk && pBhk && (pBhk.includes(bhk.replace("bhk", "")) || bhk.includes(pBhk));
      const budgetMatch = budget > 0 && pPrice > 0 &&
        Math.abs(pPrice - budget) / Math.max(pPrice, budget) < 0.35;

      // Need at least 2 signals to avoid false positives
      return [locMatch, bhkMatch, budgetMatch].filter(Boolean).length >= 2;
    });

    if (!matched) return null;

    // Find active alternatives
    const { data: alternatives } = await supabaseAdmin
      .from("properties")
      .select("title, location, price")
      .eq("user_id", userId)
      .eq("status", "available")
      .limit(3);

    return { matched, alternatives: alternatives ?? [] };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Validate token ────────────────────────────────────────────────────
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

    // ── 2. Parse request body ────────────────────────────────────────────────
    let from = "", subject = "", text = "", html = "";
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      from    = body.from    ?? "";
      subject = body.subject ?? "";
      text    = body.text    ?? "";
      html    = body.html    ?? "";
    } else if (contentType.includes("multipart/form-data")) {
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

    // ── 3. Parse email → lead data ───────────────────────────────────────────
    const parsed = parseInboundEmail(from, subject, text, html);

    const debugParsed = {
      name:              parsed.name              || null,
      phone:             parsed.phone             || null,
      email:             parsed.email             || null,
      location:          parsed.location          || null,
      budget_min:        parsed.budget_min        || null,
      budget_max:        parsed.budget_max        || null,
      property_interest: parsed.property_interest || null,
      source:            parsed.source,
      message:           parsed.raw_message       || null,
    };

    // Skip if zero contact info — not a real lead email
    if (!parsed.phone && !parsed.email && !parsed.name) {
      return NextResponse.json({ skipped: true, reason: "No contact info found", parsed: debugParsed });
    }

    // ── 4. Deduplicate — phone first, then email ─────────────────────────────
    if (parsed.phone) {
      const { data: dup } = await supabaseAdmin
        .from("leads").select("id")
        .eq("user_id", userId).eq("phone", parsed.phone).maybeSingle();
      if (dup) return NextResponse.json({ skipped: true, reason: "Duplicate phone", lead_id: dup.id, parsed: debugParsed });
    } else if (parsed.email) {
      const { data: dup } = await supabaseAdmin
        .from("leads").select("id")
        .eq("user_id", userId).eq("email", parsed.email).maybeSingle();
      if (dup) return NextResponse.json({ skipped: true, reason: "Duplicate email", lead_id: dup.id, parsed: debugParsed });
    }

    // ── 5. Check sold property + find alternatives ───────────────────────────
    const soldCheck  = await checkSoldProperty(userId, parsed);
    let finalNotes   = parsed.notes;

    if (soldCheck) {
      const { matched, alternatives } = soldCheck;
      finalNotes += `\n\n⚠️ May have enquired on ${matched.status} property: "${matched.title}"`;
      if (alternatives.length) {
        finalNotes += `\n💡 Suggest these active listings:\n` +
          alternatives.map(a => `• ${a.title} — ${a.location}`).join("\n");
      }
    }

    // ── 6. Insert lead ───────────────────────────────────────────────────────
    const defaultName = parsed.name || parsed.email
      || `Lead via ${parsed.source} – ${new Date().toLocaleDateString("en-IN")}`;

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
        notes:             finalNotes,
        property_interest: toPropertyInterest(parsed.property_interest),
      })
      .select()
      .single();

    if (insertErr) {
      console.error("[inbound-email] insert error:", insertErr.message);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success:      true,
      lead_id:      lead.id,
      name:         lead.name,
      sold_warning: soldCheck ? `May have enquired on ${soldCheck.matched.status} property` : null,
      parsed:       debugParsed,
    }, { status: 201 });

  } catch (err) {
    console.error("[inbound-email] unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ status: "PropOS Inbound Email API v2" });

  const { data: inbox } = await supabaseAdmin
    .from("user_inboxes")
    .select("active, created_at")
    .eq("unique_id", id)
    .single();

  if (!inbox) return NextResponse.json({ valid: false }, { status: 404 });
  return NextResponse.json({ valid: true, active: inbox.active });
}
