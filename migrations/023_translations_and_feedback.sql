-- 023: Review translations cache + response feedback/annotations + read tracking

-- Translation cache (one row per review, English only)
CREATE TABLE IF NOT EXISTS review_translations (
  review_id UUID PRIMARY KEY REFERENCES raw_reviews(id) ON DELETE CASCADE,
  title_en TEXT,
  liked_text_en TEXT,
  disliked_text_en TEXT,
  response_en TEXT,
  translated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feedback & inline annotations on AI responses
CREATE TABLE IF NOT EXISTS response_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES raw_reviews(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  user_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  -- For inline annotations (all NULL = general comment)
  selected_text TEXT,
  start_offset INT,
  end_offset INT,
  -- Threading: NULL = top-level, non-null = reply
  parent_id UUID REFERENCES response_feedback(id) ON DELETE CASCADE,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_review ON response_feedback(review_id, created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_parent ON response_feedback(parent_id);

-- Unread tracking per user per review
CREATE TABLE IF NOT EXISTS feedback_read_status (
  user_id UUID NOT NULL REFERENCES users(id),
  review_id UUID NOT NULL REFERENCES raw_reviews(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, review_id)
);
