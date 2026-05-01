-- Site visits table — tracks scheduled property viewings
-- Run this in Supabase SQL Editor

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
                             CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes          TEXT        DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own visits"
  ON site_visits FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
