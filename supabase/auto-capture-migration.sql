-- Auto Lead Capture: user_inboxes table
-- Each user gets a unique token → used as their webhook URL
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_inboxes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unique_id   TEXT        UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  active      BOOLEAN     DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_inboxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own inbox"
  ON user_inboxes FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast token lookup in the API route
CREATE INDEX IF NOT EXISTS user_inboxes_unique_id_idx ON user_inboxes(unique_id);
