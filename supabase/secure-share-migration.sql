-- ============================================================
-- SECURE SHARE LINKS — Migration
-- Run this in your Supabase SQL editor
--
-- SETUP CHECKLIST (do these before running):
--   1. The SQL below creates the storage bucket automatically.
--      If it fails, create it manually:
--      Supabase Dashboard → Storage → New bucket
--      Name: secure-share-media  |  Public: OFF (private)
--   2. Add this to estatepro/.env.local:
--      SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
--      (Supabase Dashboard → Project Settings → API → service_role key)
--   3. Add the same key to Vercel env vars so production works.
-- ============================================================

-- ─── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS secure_share_links (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token          text        NOT NULL UNIQUE,
  title          text        NOT NULL,
  property_id    uuid        REFERENCES properties(id) ON DELETE SET NULL,
  property_title text,
  expires_at     timestamptz,
  max_views      integer,
  view_count     integer     NOT NULL DEFAULT 0,
  is_active      boolean     NOT NULL DEFAULT true,
  password_hash  text,       -- reserved for future password protection feature
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS share_media (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id      uuid        NOT NULL REFERENCES secure_share_links(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text        NOT NULL,
  file_name    text        NOT NULL,
  media_type   text        NOT NULL CHECK (media_type IN ('image','pdf','word','excel','video')),
  file_size    integer,
  sort_order   integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS share_views_log (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id    uuid        NOT NULL REFERENCES secure_share_links(id) ON DELETE CASCADE,
  viewed_at  timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  city       text,
  country    text
);

-- Indexes for fast token lookups and joins
CREATE INDEX IF NOT EXISTS idx_ssl_token   ON secure_share_links(token);
CREATE INDEX IF NOT EXISTS idx_ssl_user    ON secure_share_links(user_id);
CREATE INDEX IF NOT EXISTS idx_sm_link    ON share_media(link_id);
CREATE INDEX IF NOT EXISTS idx_svl_link   ON share_views_log(link_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE secure_share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_media        ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_views_log    ENABLE ROW LEVEL SECURITY;

-- Broker owns their links
DROP POLICY IF EXISTS "broker_own_links" ON secure_share_links;
CREATE POLICY "broker_own_links" ON secure_share_links
  FOR ALL USING (auth.uid() = user_id);

-- Broker owns their media records
DROP POLICY IF EXISTS "broker_own_media" ON share_media;
CREATE POLICY "broker_own_media" ON share_media
  FOR ALL USING (auth.uid() = user_id);

-- Broker reads view logs for their links only
DROP POLICY IF EXISTS "broker_read_views" ON share_views_log;
CREATE POLICY "broker_read_views" ON share_views_log
  FOR SELECT USING (
    link_id IN (SELECT id FROM secure_share_links WHERE user_id = auth.uid())
  );
-- Anonymous view inserts are done server-side via service role key (bypasses RLS)

-- ─── Storage Bucket + Policies ───────────────────────────────────────────────

-- Create the private bucket (no-op if it already exists)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('secure-share-media', 'secure-share-media', false)
  ON CONFLICT (id) DO NOTHING;

-- Broker can upload to their own folder: secure-share-media/{userId}/...
DROP POLICY IF EXISTS "broker_upload_media" ON storage.objects;
CREATE POLICY "broker_upload_media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'secure-share-media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Broker can read their own files (for the create page file list)
DROP POLICY IF EXISTS "broker_read_media" ON storage.objects;
CREATE POLICY "broker_read_media" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'secure-share-media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Broker can delete their own files
DROP POLICY IF EXISTS "broker_delete_media" ON storage.objects;
CREATE POLICY "broker_delete_media" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'secure-share-media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
