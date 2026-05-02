-- ============================================================
-- ESTATEPRO — COMPLETE DATABASE SETUP
-- Run this ONCE in Supabase SQL Editor to set up everything.
-- Safe to re-run: all statements use IF NOT EXISTS / IF EXISTS.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. LEADS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT        NOT NULL,
  phone               TEXT        NOT NULL DEFAULT '',
  email               TEXT,
  source              TEXT        NOT NULL DEFAULT 'other',
  budget_min          NUMERIC     DEFAULT 0,
  budget_max          NUMERIC     DEFAULT 0,
  location            TEXT,
  property_interest   TEXT,
  stage               TEXT        NOT NULL DEFAULT 'new'
                      CHECK (stage IN ('new','contacted','viewing','negotiating','closed','lost')),
  notes               TEXT        DEFAULT '',
  next_follow_up_at   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leads: users manage their own" ON leads;
CREATE POLICY "Leads: users manage their own"
  ON leads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- 2. PROPERTIES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  type            TEXT        NOT NULL DEFAULT 'apartment',
  location        TEXT        NOT NULL,
  price           NUMERIC     NOT NULL DEFAULT 0,
  status          TEXT        NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available','sold','rented','off-market')),
  image_url       TEXT,
  media_urls      TEXT[]      DEFAULT '{}',
  media_processing BOOLEAN    DEFAULT FALSE,
  area_sqft       INTEGER,
  bedrooms        TEXT,
  bathrooms       INTEGER,
  furnishing      TEXT,
  parking         INTEGER,
  floor_no        INTEGER,
  total_floors    INTEGER,
  facing          TEXT,
  possession      TEXT,
  amenities       TEXT[],
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Properties: users manage their own" ON properties;
CREATE POLICY "Properties: users manage their own"
  ON properties FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- 3. TASKS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id     UUID        REFERENCES leads(id) ON DELETE SET NULL,
  lead_name   TEXT        NOT NULL DEFAULT '',
  lead_phone  TEXT        NOT NULL DEFAULT '',
  type        TEXT        NOT NULL DEFAULT 'Call',
  priority    TEXT        NOT NULL DEFAULT 'medium'
              CHECK (priority IN ('high','medium','low')),
  due_date    TIMESTAMPTZ NOT NULL,
  completed   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tasks: users manage their own" ON tasks;
CREATE POLICY "Tasks: users manage their own"
  ON tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- 4. FOLLOW-UP LOGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follow_up_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           UUID        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES auth.users(id),
  type              TEXT        NOT NULL DEFAULT 'call',
  outcome           TEXT        NOT NULL DEFAULT 'called',
  note              TEXT        NOT NULL DEFAULT '',
  next_follow_up_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE follow_up_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own follow_up_logs" ON follow_up_logs;
CREATE POLICY "Users manage own follow_up_logs"
  ON follow_up_logs FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS follow_up_logs_lead_id_idx ON follow_up_logs(lead_id);
CREATE INDEX IF NOT EXISTS follow_up_logs_user_id_idx ON follow_up_logs(user_id);


-- ─────────────────────────────────────────────────────────────
-- 5. CLIENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  phone        TEXT        NOT NULL DEFAULT '',
  email        TEXT        NOT NULL DEFAULT '',
  type         TEXT        NOT NULL DEFAULT 'buyer'
               CHECK (type IN ('buyer','seller','both')),
  notes        TEXT        NOT NULL DEFAULT '',
  total_deals  INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Clients: users manage their own" ON clients;
CREATE POLICY "Clients: users manage their own"
  ON clients FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- 6. DEALS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id        UUID        REFERENCES leads(id) ON DELETE SET NULL,
  property_id    UUID        REFERENCES properties(id) ON DELETE SET NULL,
  lead_name      TEXT        NOT NULL DEFAULT '',
  property_title TEXT        DEFAULT '',
  sale_price     NUMERIC     NOT NULL DEFAULT 0,
  commission_pct NUMERIC     NOT NULL DEFAULT 2.0,
  commission_amt NUMERIC     NOT NULL DEFAULT 0,
  deal_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  notes          TEXT        DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own deals" ON deals;
CREATE POLICY "Users manage own deals"
  ON deals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- 7. SITE VISITS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_visits (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id        UUID        REFERENCES leads(id) ON DELETE SET NULL,
  property_id    UUID        REFERENCES properties(id) ON DELETE SET NULL,
  lead_name      TEXT        NOT NULL DEFAULT '',
  lead_phone     TEXT        DEFAULT '',
  property_title TEXT        DEFAULT '',
  scheduled_at   TIMESTAMPTZ NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'scheduled'
                 CHECK (status IN ('scheduled','completed','cancelled')),
  notes          TEXT        DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own visits" ON site_visits;
CREATE POLICY "Users manage own visits"
  ON site_visits FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- 8. PROFILES (subscription / plan tracking)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT,
  full_name           TEXT,
  plan                TEXT        NOT NULL DEFAULT 'trial',
  trial_ends_at       TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  subscription_id     TEXT,
  subscription_status TEXT,
  plan_started_at     TIMESTAMPTZ,
  plan_ends_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles: users manage their own" ON profiles;
CREATE POLICY "Profiles: users manage their own"
  ON profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

INSERT INTO profiles (id, email)
  SELECT id, email FROM auth.users
  ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);


-- ─────────────────────────────────────────────────────────────
-- 9. SECURE SHARE LINKS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS secure_share_links (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token            TEXT        NOT NULL UNIQUE,
  title            TEXT        NOT NULL,
  property_id      UUID        REFERENCES properties(id) ON DELETE SET NULL,
  property_title   TEXT,
  expires_at       TIMESTAMPTZ,
  max_views        INTEGER,
  view_count       INTEGER     NOT NULL DEFAULT 0,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  password_hash    TEXT,
  watermark_enabled BOOLEAN    NOT NULL DEFAULT true,
  watermark_text   TEXT        DEFAULT 'PROTECTED · ESTATEPRO',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS share_media (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id      UUID        NOT NULL REFERENCES secure_share_links(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT        NOT NULL,
  file_name    TEXT        NOT NULL,
  media_type   TEXT        NOT NULL CHECK (media_type IN ('image','pdf','word','excel','video')),
  file_size    INTEGER,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  external_url TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS share_views_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id    UUID        NOT NULL REFERENCES secure_share_links(id) ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  city       TEXT,
  country    TEXT
);

CREATE INDEX IF NOT EXISTS idx_ssl_token  ON secure_share_links(token);
CREATE INDEX IF NOT EXISTS idx_ssl_user   ON secure_share_links(user_id);
CREATE INDEX IF NOT EXISTS idx_sm_link    ON share_media(link_id);
CREATE INDEX IF NOT EXISTS idx_svl_link   ON share_views_log(link_id);

ALTER TABLE secure_share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_media        ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_views_log    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "broker_own_links"   ON secure_share_links;
DROP POLICY IF EXISTS "broker_own_media"   ON share_media;
DROP POLICY IF EXISTS "broker_read_views"  ON share_views_log;

CREATE POLICY "broker_own_links"  ON secure_share_links FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "broker_own_media"  ON share_media        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "broker_read_views" ON share_views_log    FOR SELECT
  USING (link_id IN (SELECT id FROM secure_share_links WHERE user_id = auth.uid()));


-- ─────────────────────────────────────────────────────────────
-- 10. AUTO LEAD CAPTURE — WEBHOOK INBOXES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_inboxes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unique_id  TEXT        UNIQUE NOT NULL DEFAULT REPLACE(gen_random_uuid()::TEXT, '-', ''),
  active     BOOLEAN     DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_inboxes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own inbox" ON user_inboxes;
CREATE POLICY "Users manage own inbox"
  ON user_inboxes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_inboxes_unique_id_idx ON user_inboxes(unique_id);


-- ─────────────────────────────────────────────────────────────
-- 11. GMAIL OAUTH CONNECTIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gmail_connections (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_email    TEXT        NOT NULL,
  access_token    TEXT,
  refresh_token   TEXT        NOT NULL DEFAULT '',
  token_expiry    TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  leads_captured  INTEGER     DEFAULT 0,
  active          BOOLEAN     DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already existed without them
ALTER TABLE gmail_connections ADD COLUMN IF NOT EXISTS leads_captured  INTEGER     DEFAULT 0;
ALTER TABLE gmail_connections ADD COLUMN IF NOT EXISTS active          BOOLEAN     DEFAULT true;
ALTER TABLE gmail_connections ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE gmail_connections ADD COLUMN IF NOT EXISTS token_expiry    TIMESTAMPTZ;
ALTER TABLE gmail_connections ADD COLUMN IF NOT EXISTS access_token    TEXT;

-- Add unique constraint (needed for upsert ON CONFLICT)
ALTER TABLE gmail_connections DROP CONSTRAINT IF EXISTS gmail_connections_user_id_key;
ALTER TABLE gmail_connections ADD CONSTRAINT gmail_connections_user_id_key UNIQUE (user_id);

ALTER TABLE gmail_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own gmail connection" ON gmail_connections;
CREATE POLICY "Users manage own gmail connection"
  ON gmail_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION increment_gmail_leads(connection_id UUID, amount INTEGER DEFAULT 1)
RETURNS void AS $$
  UPDATE gmail_connections
  SET leads_captured = COALESCE(leads_captured, 0) + amount
  WHERE id = connection_id;
$$ LANGUAGE sql SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────
-- 12. NEWSPAPER LEADS (owner/seller ads from newspapers)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newspaper_leads (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file_name TEXT        NOT NULL DEFAULT '',
  source_type      TEXT        NOT NULL DEFAULT 'json'
                   CHECK (source_type IN ('json','csv','pdf')),
  newspaper_name   TEXT        NOT NULL DEFAULT '',
  city             TEXT        NOT NULL DEFAULT '',
  area             TEXT        NOT NULL DEFAULT '',
  property_type    TEXT        NOT NULL DEFAULT '',
  bhk              TEXT        NOT NULL DEFAULT '',
  intent           TEXT        NOT NULL DEFAULT 'sale'
                   CHECK (intent IN ('sale','rent')),
  price            NUMERIC     NOT NULL DEFAULT 0,
  phone            TEXT        NOT NULL DEFAULT '',
  owner_type       TEXT        NOT NULL DEFAULT 'unknown'
                   CHECK (owner_type IN ('owner','broker','unknown')),
  description      TEXT        NOT NULL DEFAULT '',
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE newspaper_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read active newspaper leads" ON newspaper_leads;
CREATE POLICY "Anyone can read active newspaper leads"
  ON newspaper_leads FOR SELECT
  USING (is_active = true);

CREATE TABLE IF NOT EXISTS newspaper_lead_actions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  newspaper_lead_id  UUID        NOT NULL REFERENCES newspaper_leads(id) ON DELETE CASCADE,
  is_saved           BOOLEAN     NOT NULL DEFAULT false,
  is_contacted       BOOLEAN     NOT NULL DEFAULT false,
  is_converted       BOOLEAN     NOT NULL DEFAULT false,
  notes              TEXT        NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, newspaper_lead_id)
);

ALTER TABLE newspaper_lead_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own newspaper actions" ON newspaper_lead_actions;
CREATE POLICY "Users manage own newspaper actions"
  ON newspaper_lead_actions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS newspaper_uploads (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name   TEXT        NOT NULL,
  source_type TEXT        NOT NULL DEFAULT 'json',
  lead_count  INTEGER     NOT NULL DEFAULT 0,
  uploaded_by UUID        REFERENCES auth.users(id),
  notes       TEXT        NOT NULL DEFAULT '',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE newspaper_uploads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read uploads" ON newspaper_uploads;
CREATE POLICY "Authenticated users can read uploads"
  ON newspaper_uploads FOR SELECT
  USING (auth.uid() IS NOT NULL);


-- ─────────────────────────────────────────────────────────────
-- 13. STORAGE BUCKETS
-- ─────────────────────────────────────────────────────────────

-- Public bucket for property images
INSERT INTO storage.buckets (id, name, public)
  VALUES ('property-images', 'property-images', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Property images: upload" ON storage.objects;
DROP POLICY IF EXISTS "Property images: view"   ON storage.objects;
DROP POLICY IF EXISTS "Property images: delete" ON storage.objects;

CREATE POLICY "Property images: upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Property images: view" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'property-images');

CREATE POLICY "Property images: delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Private bucket for secure share media
INSERT INTO storage.buckets (id, name, public)
  VALUES ('secure-share-media', 'secure-share-media', false)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "broker_upload_media" ON storage.objects;
DROP POLICY IF EXISTS "broker_read_media"   ON storage.objects;
DROP POLICY IF EXISTS "broker_delete_media" ON storage.objects;

CREATE POLICY "broker_upload_media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'secure-share-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "broker_read_media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'secure-share-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "broker_delete_media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'secure-share-media' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ─────────────────────────────────────────────────────────────
-- DONE ✓
-- Tables created: leads, properties, tasks, follow_up_logs,
--   clients, deals, site_visits, profiles, secure_share_links,
--   share_media, share_views_log, user_inboxes, gmail_connections,
--   newspaper_leads, newspaper_lead_actions, newspaper_uploads
-- Storage: property-images (public), secure-share-media (private)
-- Functions: handle_new_user, increment_gmail_leads
-- ─────────────────────────────────────────────────────────────
