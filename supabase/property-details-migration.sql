-- supabase/property-details-migration.sql
-- Adds detailed property fields to the properties table.
-- All new columns are optional (nullable) — only Title, Location, Price stay required.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS area_sqft    INTEGER,        -- e.g. 1200
  ADD COLUMN IF NOT EXISTS bedrooms     TEXT,           -- "1 BHK", "2 BHK", "Studio" etc.
  ADD COLUMN IF NOT EXISTS bathrooms    INTEGER,        -- 1, 2, 3 etc.
  ADD COLUMN IF NOT EXISTS furnishing   TEXT,           -- "Unfurnished" / "Semi-Furnished" / "Fully Furnished"
  ADD COLUMN IF NOT EXISTS parking      INTEGER,        -- 0, 1, 2 etc.
  ADD COLUMN IF NOT EXISTS floor_no     INTEGER,        -- which floor the property is on
  ADD COLUMN IF NOT EXISTS total_floors INTEGER,        -- total floors in the building
  ADD COLUMN IF NOT EXISTS facing       TEXT,           -- "East", "North-East" etc.
  ADD COLUMN IF NOT EXISTS possession   TEXT,           -- "Ready to Move" / "Under Construction"
  ADD COLUMN IF NOT EXISTS amenities    TEXT[],         -- ["Gym", "Pool", ...]
  ADD COLUMN IF NOT EXISTS description  TEXT;           -- free-text description
