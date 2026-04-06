-- 025: Competitor benchmarking — track competitor hotels and their aggregate metrics

CREATE TABLE competitor_hotels (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id            UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  platform            TEXT NOT NULL CHECK (platform IN ('booking','google','expedia','tripadvisor')),
  platform_url        TEXT NOT NULL,
  total_reviews       INTEGER,
  avg_rating          NUMERIC(4,2),
  response_rate       NUMERIC(5,2),
  rating_distribution JSONB,
  monthly_data        JSONB,
  last_scraped_at     TIMESTAMPTZ,
  scrape_status       TEXT DEFAULT 'pending' CHECK (scrape_status IN ('pending','scraping','completed','failed')),
  scrape_error        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(hotel_id, platform_url)
);

CREATE INDEX idx_competitor_hotels_hotel ON competitor_hotels(hotel_id);

-- Competitor guest reviews (stored for Elaine to analyze)
CREATE TABLE IF NOT EXISTS competitor_reviews (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id         UUID NOT NULL REFERENCES competitor_hotels(id) ON DELETE CASCADE,
  hotel_id              UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  liked_text            TEXT,
  disliked_text         TEXT,
  rating                NUMERIC(4,2),
  review_date           DATE,
  review_title          TEXT,
  traveler_type         TEXT,
  room_info             TEXT,
  user_location         TEXT,
  review_language       TEXT,
  property_response     TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_competitor_reviews_competitor ON competitor_reviews(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_reviews_hotel ON competitor_reviews(hotel_id);
