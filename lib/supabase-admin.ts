// lib/supabase-admin.ts — Supabase service-role client
// SERVER-SIDE ONLY — never import this from a client component.
// Used only in app/api/ route handlers.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
    "Add SUPABASE_SERVICE_ROLE_KEY to .env.local (no NEXT_PUBLIC_ prefix). " +
    "Get it from: Supabase Dashboard → Project Settings → API → service_role."
  );
}

export const supabaseAdmin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});
