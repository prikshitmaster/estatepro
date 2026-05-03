-- tags-migration.sql
-- Adds tag system: tags table + lead_tags junction
-- Safe to re-run (uses IF NOT EXISTS)

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

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS lead_tags_lead_id_idx ON lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS lead_tags_tag_id_idx  ON lead_tags(tag_id);
CREATE INDEX IF NOT EXISTS tags_user_id_idx      ON tags(user_id);

-- RLS
ALTER TABLE tags     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tags_own" ON tags;
CREATE POLICY "tags_own" ON tags
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "lead_tags_own" ON lead_tags;
CREATE POLICY "lead_tags_own" ON lead_tags
  USING (auth.uid() = user_id);

-- Activity logs table (for lead detail timeline)
CREATE TABLE IF NOT EXISTS activity_logs (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lead_id    uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  type       text NOT NULL, -- call | note | stage_change | visit | deal | whatsapp | tag | created
  content    text,
  metadata   jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_lead_id_idx ON activity_logs(lead_id);
CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON activity_logs(user_id);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_logs_own" ON activity_logs;
CREATE POLICY "activity_logs_own" ON activity_logs
  USING (auth.uid() = user_id);
