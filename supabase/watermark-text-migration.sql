-- Add watermark_text column to secure_share_links
-- Run this once in Supabase Dashboard → SQL Editor

ALTER TABLE secure_share_links
  ADD COLUMN IF NOT EXISTS watermark_text TEXT DEFAULT 'PROTECTED · ESTATEPRO';
