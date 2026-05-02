-- Gmail Connections: stores each broker's Gmail OAuth tokens
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS gmail_connections (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_email    TEXT        NOT NULL,
  access_token    TEXT,
  refresh_token   TEXT        NOT NULL,
  token_expiry    TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  leads_captured  INTEGER     DEFAULT 0,
  active          BOOLEAN     DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE gmail_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own gmail connection"
  ON gmail_connections FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Helper function to safely increment leads_captured (called by the cron job)
CREATE OR REPLACE FUNCTION increment_gmail_leads(connection_id UUID, amount INTEGER DEFAULT 1)
RETURNS void AS $$
  UPDATE gmail_connections
  SET leads_captured = COALESCE(leads_captured, 0) + amount
  WHERE id = connection_id;
$$ LANGUAGE sql SECURITY DEFINER;
