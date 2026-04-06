-- Add aspect_key to atomic_items for richer Stage 5 classification signal.
-- Nullable so existing rows and downstream stages are unaffected.
ALTER TABLE atomic_items ADD COLUMN IF NOT EXISTS aspect_key TEXT;

CREATE INDEX IF NOT EXISTS idx_atomic_aspect_key ON atomic_items(aspect_key);
