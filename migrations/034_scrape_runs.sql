-- 034: Scrape run tracking for multi-platform coordination and live progress

CREATE TABLE IF NOT EXISTS scrape_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id         UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  batch_id         UUID NOT NULL,
  source           TEXT NOT NULL,
  apify_run_id     TEXT NOT NULL,
  dataset_id       TEXT,
  status           TEXT NOT NULL DEFAULT 'running',
  reviews_found    INTEGER NOT NULL DEFAULT 0,
  reviews_inserted INTEGER NOT NULL DEFAULT 0,
  error_message    TEXT,
  status_message   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scrape_runs_hotel ON scrape_runs(hotel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_runs_batch ON scrape_runs(batch_id);
