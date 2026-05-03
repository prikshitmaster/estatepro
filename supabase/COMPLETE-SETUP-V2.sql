-- ============================================================
-- COMPLETE-SETUP-V2.sql — EstatePro CRM full DB setup
-- Run this ONCE in Supabase SQL editor to enable all features.
-- Safe to re-run (all statements use IF NOT EXISTS / DROP IF EXISTS).
-- ============================================================

-- ── 1. TAGS ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tags (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       text NOT NULL,
  color      text NOT NULL DEFAULT '#6366F1',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_tags (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id    uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  tag_id     uuid REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, tag_id)
);

CREATE INDEX IF NOT EXISTS lead_tags_lead_id_idx ON lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS lead_tags_tag_id_idx  ON lead_tags(tag_id);
CREATE INDEX IF NOT EXISTS tags_user_id_idx      ON tags(user_id);

ALTER TABLE tags      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tags_own"      ON tags;
DROP POLICY IF EXISTS "lead_tags_own" ON lead_tags;

CREATE POLICY "tags_own"      ON tags      USING (auth.uid() = user_id);
CREATE POLICY "lead_tags_own" ON lead_tags USING (auth.uid() = user_id);


-- ── 2. ACTIVITY LOGS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_logs (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lead_id    uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  type       text NOT NULL, -- call | note | whatsapp | email | visit | stage_change | deal | tag | created
  content    text,
  metadata   jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_lead_id_idx ON activity_logs(lead_id);
CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_idx ON activity_logs(created_at DESC);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_logs_own" ON activity_logs;
CREATE POLICY "activity_logs_own" ON activity_logs USING (auth.uid() = user_id);


-- ── 3. NOTIFICATIONS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type       text NOT NULL DEFAULT 'info', -- info | alert | lead | task
  title      text NOT NULL,
  body       text,
  lead_id    uuid REFERENCES leads(id) ON DELETE SET NULL,
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx  ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_idx  ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx   ON notifications(user_id, read) WHERE read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_own" ON notifications;
CREATE POLICY "notifications_own" ON notifications USING (auth.uid() = user_id);


-- ── 4. SMART LISTS (saved filter views) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS smart_lists (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       text NOT NULL,
  filters    jsonb NOT NULL DEFAULT '{}',
  is_shared  boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS smart_lists_user_id_idx ON smart_lists(user_id);

ALTER TABLE smart_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "smart_lists_own" ON smart_lists;
CREATE POLICY "smart_lists_own" ON smart_lists USING (auth.uid() = user_id);


-- ── 5. WHATSAPP CONNECTIONS (per-user API config) ────────────────────────────

CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  phone_number_id text NOT NULL,
  access_token    text NOT NULL,
  business_name   text,
  is_connected    boolean NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wa_connections_user_id_idx ON whatsapp_connections(user_id);

ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_connections_own" ON whatsapp_connections;
CREATE POLICY "wa_connections_own" ON whatsapp_connections USING (auth.uid() = user_id);


-- ── 6. WHATSAPP TEMPLATES ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       text NOT NULL,
  category   text NOT NULL DEFAULT 'UTILITY', -- UTILITY | MARKETING | AUTHENTICATION
  language   text NOT NULL DEFAULT 'en',
  body       text NOT NULL,
  variables  jsonb,
  status     text NOT NULL DEFAULT 'draft', -- draft | pending | approved | rejected
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wa_templates_user_id_idx ON whatsapp_templates(user_id);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_templates_own" ON whatsapp_templates;
CREATE POLICY "wa_templates_own" ON whatsapp_templates USING (auth.uid() = user_id);


-- ── 7. AUTO-CAPTURE: USER INBOXES ────────────────────────────────────────────
-- Already in auto-capture-migration.sql — included here for completeness

CREATE TABLE IF NOT EXISTS user_inboxes (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  unique_id text UNIQUE DEFAULT substr(gen_random_uuid()::text, 1, 8),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_inboxes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_inboxes_own" ON user_inboxes;
CREATE POLICY "user_inboxes_own" ON user_inboxes USING (auth.uid() = user_id);


-- ── 8. AUTO-CAPTURE: GMAIL CONNECTIONS ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS gmail_connections (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  google_email    text NOT NULL,
  refresh_token   text NOT NULL,
  access_token    text,
  expires_at      timestamptz,
  last_checked_at timestamptz,
  leads_captured  integer DEFAULT 0,
  active          boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE gmail_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gmail_connections_own" ON gmail_connections;
CREATE POLICY "gmail_connections_own" ON gmail_connections USING (auth.uid() = user_id);


-- ── 9. LEADS — add next_follow_up_at if missing ──────────────────────────────

ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz;


-- ── DONE ──────────────────────────────────────────────────────────────────────
-- All tables created. RLS enabled on all tables.
-- You can now use: tags, activity_logs, notifications, smart_lists,
--                  whatsapp_connections, whatsapp_templates, user_inboxes,
--                  gmail_connections
-- ─────────────────────────────────────────────────────────────────────────────
