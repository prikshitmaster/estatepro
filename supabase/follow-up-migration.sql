-- ── Follow-Up System Migration ────────────────────────────────────────────────
-- Run this in Supabase → SQL Editor → New Query → Run
--
-- What this does:
--   1. Adds next_follow_up_at column to leads (for snooze feature)
--   2. Creates follow_up_logs table (tracks every call/whatsapp/visit)
--   3. Adds RLS so each broker only sees their own logs

-- Step 1: Add snooze date column to existing leads table
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz;

-- Step 2: Create follow-up logs table
CREATE TABLE IF NOT EXISTS follow_up_logs (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id             uuid        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id             uuid        NOT NULL REFERENCES auth.users(id),
  type                text        NOT NULL DEFAULT 'call',    -- call | whatsapp | visit | note
  outcome             text        NOT NULL DEFAULT 'called',  -- called | no_answer | busy | callback | visited | note
  note                text        NOT NULL DEFAULT '',
  next_follow_up_at   timestamptz,
  created_at          timestamptz DEFAULT now()
);

-- Step 3: Row Level Security — each broker sees only their own logs
ALTER TABLE follow_up_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own follow_up_logs"
  ON follow_up_logs FOR ALL
  USING (auth.uid() = user_id);

-- Step 4: Index for fast per-lead queries
CREATE INDEX IF NOT EXISTS follow_up_logs_lead_id_idx ON follow_up_logs(lead_id);
CREATE INDEX IF NOT EXISTS follow_up_logs_user_id_idx ON follow_up_logs(user_id);
