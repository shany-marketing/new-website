-- UpStar: Pipeline execution tracking
-- Run after 002_pgvector.sql

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  current_stage TEXT CHECK (current_stage IN (
                  'ingestion', 'baseline_stats', 'decomposition',
                  'consensus', 'mapping', 'aggregation', 'insights'
                )),
  reviews_count INTEGER DEFAULT 0,                  -- how many new reviews in this run
  items_count   INTEGER DEFAULT 0,                  -- atomic items produced
  error_message TEXT,                               -- null if no error
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  duration_ms   INTEGER GENERATED ALWAYS AS (
                  EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
                ) STORED
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_hotel   ON pipeline_runs(hotel_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status  ON pipeline_runs(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_started ON pipeline_runs(started_at DESC);
