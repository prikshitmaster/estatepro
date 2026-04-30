// app/api/share/[token]/route.ts — Public endpoint for secure share viewer
// Validates the token, generates 15-min signed URLs, logs the view.
// Uses supabaseAdmin (service role) so it works for anonymous viewers.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // ── 1. Look up link ───────────────────────────────────────────────────────
  const { data: link, error: linkErr } = await supabaseAdmin
    .from("secure_share_links")
    .select("*")
    .eq("token", token)
    .single();

  if (linkErr || !link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  // ── 2. Validate ───────────────────────────────────────────────────────────
  if (!link.is_active) {
    return NextResponse.json({ error: "This link has been revoked." }, { status: 410 });
  }
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: "This link has expired." }, { status: 410 });
  }
  if (link.max_views != null && link.view_count >= link.max_views) {
    return NextResponse.json({ error: "View limit reached for this link." }, { status: 410 });
  }

  // ── 3. Load media ─────────────────────────────────────────────────────────
  const { data: media } = await supabaseAdmin
    .from("share_media")
    .select("*")
    .eq("link_id", link.id)
    .order("sort_order");

  // ── 4. Generate signed URLs (15 min = 900 sec) ────────────────────────────
  // External URLs (e.g. existing property images from public bucket) pass through directly.
  const signedMedia = await Promise.all(
    (media ?? []).map(async (m) => {
      if (m.external_url) {
        return {
          id:         m.id,
          file_name:  m.file_name,
          media_type: m.media_type,
          signed_url: m.external_url,
        };
      }
      const { data: signed } = await supabaseAdmin.storage
        .from("secure-share-media")
        .createSignedUrl(m.storage_path, 900);
      return {
        id:         m.id,
        file_name:  m.file_name,
        media_type: m.media_type,
        signed_url: signed?.signedUrl ?? null,
      };
    })
  );

  // ── 5. Log view + increment counter (fire and forget) ────────────────────
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null;
  const ua = req.headers.get("user-agent") ?? null;

  void supabaseAdmin.from("share_views_log").insert({
    link_id:    link.id,
    ip_address: ip,
    user_agent: ua,
  });
  void supabaseAdmin
    .from("secure_share_links")
    .update({ view_count: link.view_count + 1 })
    .eq("id", link.id);

  // ── 6. Return payload to viewer ───────────────────────────────────────────
  return NextResponse.json({
    title:             link.title,
    property_title:    link.property_title ?? null,
    watermark_enabled: link.watermark_enabled ?? true,
    media:             signedMedia,
  });
}
