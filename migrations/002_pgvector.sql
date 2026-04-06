-- UpStar: pgvector extension + embedding column
-- Run after 001_initial_schema.sql
-- Requires pgvector to be installed on the RDS instance

CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to atomic_items for semantic similarity search
ALTER TABLE atomic_items
  ADD COLUMN IF NOT EXISTS embedding vector(1536);  -- OpenAI/Anthropic embedding dim

-- HNSW index for fast approximate nearest-neighbor search
CREATE INDEX IF NOT EXISTS idx_atomic_embedding_hnsw
  ON atomic_items
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Helper view: mapping with full context for UI queries
CREATE OR REPLACE VIEW v_mapped_items AS
SELECT
  cm.id,
  cm.hotel_id,
  cm.check_out_date,
  cm.confidence,
  cm.classification,
  ai.text            AS item_text,
  ai.sentiment,
  cc.label           AS category_label,
  rr.rating,
  rr.traveler_type,
  rr.room_info
FROM category_mappings cm
JOIN atomic_items          ai ON ai.id = cm.atomic_item_id
LEFT JOIN consensus_categories cc ON cc.id = cm.category_id
JOIN raw_reviews           rr ON rr.id = ai.raw_review_id;
