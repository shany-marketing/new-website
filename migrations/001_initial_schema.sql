-- UpStar: Initial Schema
-- Run this first before 002_pgvector.sql

-- Hotels (multi-tenant)
CREATE TABLE IF NOT EXISTS hotels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  booking_url   TEXT,
  plan          TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Raw reviews ingested from Apify
CREATE TABLE IF NOT EXISTS raw_reviews (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id         UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  external_id      TEXT UNIQUE NOT NULL,          -- Apify unique review ID
  check_in_date    DATE,
  check_out_date   DATE,
  liked_text       TEXT,
  disliked_text    TEXT,
  number_of_nights INTEGER,
  rating           NUMERIC(3,1),
  review_date      DATE,
  review_title     TEXT,
  room_info        TEXT,
  traveler_type    TEXT,
  user_location    TEXT,
  user_name_hash   TEXT,                          -- pseudonymized (GDPR)
  ingested_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_reviews_hotel_id      ON raw_reviews(hotel_id);
CREATE INDEX IF NOT EXISTS idx_raw_reviews_check_out     ON raw_reviews(check_out_date);
CREATE INDEX IF NOT EXISTS idx_raw_reviews_external_id   ON raw_reviews(external_id);

-- Atomic items produced by Stage 3 decomposition
CREATE TABLE IF NOT EXISTS atomic_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  raw_review_id   UUID NOT NULL REFERENCES raw_reviews(id) ON DELETE CASCADE,
  text            TEXT NOT NULL,
  sentiment       TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative')),
  check_out_date  DATE,                           -- denormalized for fast filtering
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atomic_hotel_id      ON atomic_items(hotel_id);
CREATE INDEX IF NOT EXISTS idx_atomic_check_out     ON atomic_items(check_out_date);
CREATE INDEX IF NOT EXISTS idx_atomic_sentiment     ON atomic_items(sentiment);

-- Consensus categories (Stage 4 output) — 20 per hotel per run
CREATE TABLE IF NOT EXISTS consensus_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  sentiment   TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative')),
  model_votes INTEGER NOT NULL DEFAULT 0,         -- how many of 4 models agreed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(hotel_id, label)
);

CREATE INDEX IF NOT EXISTS idx_consensus_hotel_id ON consensus_categories(hotel_id);

-- Semantic mappings (Stage 5) — atomic_item → category with confidence
CREATE TABLE IF NOT EXISTS category_mappings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  atomic_item_id  UUID NOT NULL REFERENCES atomic_items(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES consensus_categories(id) ON DELETE SET NULL,
  classification  TEXT NOT NULL CHECK (classification IN ('category', 'other', 'irrelevant')),
  confidence      NUMERIC(5,4),                   -- 0.0000 to 1.0000 (logprob-calibrated)
  check_out_date  DATE,                           -- denormalized for time-series queries
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mappings_hotel_id     ON category_mappings(hotel_id);
CREATE INDEX IF NOT EXISTS idx_mappings_category_id  ON category_mappings(category_id);
CREATE INDEX IF NOT EXISTS idx_mappings_check_out    ON category_mappings(check_out_date);

-- Pre-aggregated category statistics (Stage 6 — refreshed after each pipeline run)
CREATE TABLE IF NOT EXISTS category_stats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES consensus_categories(id) ON DELETE CASCADE,
  period_month    DATE NOT NULL,                  -- first day of the month
  item_count      INTEGER NOT NULL DEFAULT 0,
  total_items     INTEGER NOT NULL DEFAULT 0,
  share_pct       NUMERIC(5,2),                   -- percentage of total for sentiment
  avg_rating      NUMERIC(3,1),
  mom_delta       NUMERIC(6,2),                   -- month-over-month change in share_pct
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(hotel_id, category_id, period_month)
);

CREATE INDEX IF NOT EXISTS idx_stats_hotel_period ON category_stats(hotel_id, period_month);

-- Ingestion cursor — tracks last processed review per hotel for delta scraping
CREATE TABLE IF NOT EXISTS ingestion_cursors (
  hotel_id        UUID PRIMARY KEY REFERENCES hotels(id) ON DELETE CASCADE,
  last_review_id  TEXT,
  last_review_date DATE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
