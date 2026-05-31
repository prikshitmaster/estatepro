-- Owner / seller contact on properties
-- Lets a broker record WHO to call about a listing, so a buyer match is actionable.
-- Run this in Supabase SQL Editor (safe to re-run — uses IF NOT EXISTS).

ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_name  text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_phone text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS listed_by   text DEFAULT 'owner';

-- listed_by is one of: 'owner' | 'broker' | 'builder'
