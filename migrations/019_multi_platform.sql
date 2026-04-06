-- UpStar: Multi-platform review support (Google, Expedia, TripAdvisor)

-- 1. Add source column to raw_reviews (default 'booking' for all existing rows)
ALTER TABLE raw_reviews ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'booking';

-- 2. Drop the old unique constraint on external_id alone, replace with compound unique
ALTER TABLE raw_reviews DROP CONSTRAINT IF EXISTS raw_reviews_external_id_key;
DROP INDEX IF EXISTS idx_raw_reviews_external_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_reviews_source_external_id ON raw_reviews(source, external_id);

-- 3. Index on source for filtered queries
CREATE INDEX IF NOT EXISTS idx_raw_reviews_source ON raw_reviews(source);

-- 4. Add platform URL columns to hotels table
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS google_url TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS expedia_url TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS tripadvisor_url TEXT;

-- 5. Update ingestion_cursors to be per-platform per-hotel
ALTER TABLE ingestion_cursors DROP CONSTRAINT IF EXISTS ingestion_cursors_pkey;
ALTER TABLE ingestion_cursors ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'booking';
ALTER TABLE ingestion_cursors ADD CONSTRAINT ingestion_cursors_pkey PRIMARY KEY (hotel_id, source);
