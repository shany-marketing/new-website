-- UpStar: Free tier response usage tracking

CREATE TABLE IF NOT EXISTS response_usage (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id          UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  month             TEXT NOT NULL,           -- YYYY-MM format
  generation_count  INTEGER NOT NULL DEFAULT 0,
  UNIQUE(hotel_id, month)
);

CREATE INDEX IF NOT EXISTS idx_response_usage_hotel_month ON response_usage(hotel_id, month);
