-- Add description column to consensus_categories so Stage 5 mapping
-- can use meaningful descriptions instead of just labels.
ALTER TABLE consensus_categories ADD COLUMN IF NOT EXISTS description TEXT;
