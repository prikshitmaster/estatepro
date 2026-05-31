-- Buyer requirements — a saved "what this client wants to buy" brief.
-- Created from a buyer lead; one lead can have several. Drives buy-side matching.
-- Run in Supabase SQL Editor (safe to re-run).

CREATE TABLE IF NOT EXISTS buyer_requirements (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id   uuid REFERENCES leads(id) ON DELETE SET NULL,   -- the buyer person
  label     text,
  budget_min bigint DEFAULT 0,
  budget_max bigint DEFAULT 0,
  location   text,
  property_interest text,        -- "2BHK", "Villa", "Plot"…
  status    text NOT NULL DEFAULT 'active'
            CHECK (status IN ('active','fulfilled','archived')),
  notes     text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS buyer_requirements_user_id_idx ON buyer_requirements(user_id);
CREATE INDEX IF NOT EXISTS buyer_requirements_lead_id_idx ON buyer_requirements(lead_id);

ALTER TABLE buyer_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyer_requirements_own" ON buyer_requirements;
CREATE POLICY "buyer_requirements_own" ON buyer_requirements
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
