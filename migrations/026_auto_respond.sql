-- Auto-respond settings per hotel
CREATE TABLE auto_respond_settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id             UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE UNIQUE,
  enabled              BOOLEAN NOT NULL DEFAULT FALSE,
  min_rating           NUMERIC(3,1) DEFAULT 8.0,
  skip_with_complaints BOOLEAN NOT NULL DEFAULT TRUE,
  auto_post            BOOLEAN NOT NULL DEFAULT FALSE,
  platforms            TEXT[] DEFAULT ARRAY['booking'],
  max_per_run          INTEGER DEFAULT 10,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Log of auto-respond actions
CREATE TABLE auto_respond_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  review_id     UUID NOT NULL REFERENCES raw_reviews(id) ON DELETE CASCADE,
  action        TEXT NOT NULL CHECK (action IN ('generated','posted','skipped','failed')),
  skip_reason   TEXT,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_auto_respond_log_hotel ON auto_respond_log(hotel_id, created_at);
