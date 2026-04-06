-- UpStar: Response Quality Scoring — 12-criteria evaluation

CREATE TABLE IF NOT EXISTS response_quality (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id                    UUID NOT NULL REFERENCES raw_reviews(id) ON DELETE CASCADE,
  is_response                  BOOLEAN,
  is_right_lang                BOOLEAN,
  is_answered_positive         BOOLEAN,
  is_answered_negative         BOOLEAN,
  is_include_guest_name        BOOLEAN,
  is_include_hotelier_name     BOOLEAN,
  is_kind                      BOOLEAN,
  is_concise                   BOOLEAN,
  is_gratitude                 BOOLEAN,
  is_include_come_back_asking  BOOLEAN,
  is_syntax_right              BOOLEAN,
  is_personal_tone_not_generic BOOLEAN,
  quality_score                NUMERIC(5,2),
  evaluated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(review_id)
);

CREATE INDEX IF NOT EXISTS idx_response_quality_review ON response_quality(review_id);
