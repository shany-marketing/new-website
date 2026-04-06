-- Speed up the NOT EXISTS query in mapping stage
CREATE INDEX IF NOT EXISTS idx_mappings_atomic_item_id
ON category_mappings(atomic_item_id);
