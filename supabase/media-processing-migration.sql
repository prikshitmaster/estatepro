-- supabase/media-processing-migration.sql
-- Adds media_processing flag to properties table.
-- When TRUE it means a video was just uploaded and is being compressed in the background.
-- The property detail page reads this flag and triggers compression automatically.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS media_processing BOOLEAN DEFAULT FALSE;
