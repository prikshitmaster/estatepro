-- Deals table — tracks closed deals and broker commission
-- Run this in Supabase SQL Editor

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

CREATE POLICY "Users manage own deals"
  ON deals FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
