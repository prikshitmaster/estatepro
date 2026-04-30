-- SECURE SHARE v2 — run this in Supabase SQL editor after secure-share-migration.sql
-- Adds watermark toggle + external_url support for existing property images

ALTER TABLE secure_share_links
  ADD COLUMN IF NOT EXISTS watermark_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE share_media
  ADD COLUMN IF NOT EXISTS external_url text;
