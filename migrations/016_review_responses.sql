-- UpStar: Review Response Feature — columns on raw_reviews + hotels

-- AI response fields on raw_reviews
ALTER TABLE raw_reviews
  ADD COLUMN IF NOT EXISTS reviewer_display_name TEXT,
  ADD COLUMN IF NOT EXISTS ai_response TEXT,
  ADD COLUMN IF NOT EXISTS ai_response_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_response_edited BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sent_to_booking BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sent_to_booking_at TIMESTAMPTZ;

-- Hotel-level response settings
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS custom_response_prompt TEXT,
  ADD COLUMN IF NOT EXISTS hotelier_name TEXT,
  ADD COLUMN IF NOT EXISTS hotelier_role TEXT DEFAULT 'Hotel Manager';
