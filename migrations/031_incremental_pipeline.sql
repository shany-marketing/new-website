-- 031: Add columns for incremental pipeline scheduling
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS needs_full_pipeline BOOLEAN DEFAULT FALSE;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS last_incremental_at TIMESTAMPTZ;
