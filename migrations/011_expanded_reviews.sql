-- Expand raw_reviews to capture all Apify fields
ALTER TABLE raw_reviews ADD COLUMN IF NOT EXISTS review_language TEXT;
ALTER TABLE raw_reviews ADD COLUMN IF NOT EXISTS helpful_votes INTEGER DEFAULT 0;
ALTER TABLE raw_reviews ADD COLUMN IF NOT EXISTS property_response TEXT;
ALTER TABLE raw_reviews ADD COLUMN IF NOT EXISTS stay_room_id INTEGER;

-- Hotel-level metadata (same across reviews, but stored per-review for time-series tracking)
ALTER TABLE raw_reviews ADD COLUMN IF NOT EXISTS hotel_rating NUMERIC(4,2);
ALTER TABLE raw_reviews ADD COLUMN IF NOT EXISTS hotel_rating_label TEXT;
ALTER TABLE raw_reviews ADD COLUMN IF NOT EXISTS hotel_reviews_count INTEGER;
ALTER TABLE raw_reviews ADD COLUMN IF NOT EXISTS hotel_rating_scores JSONB;

-- Add external hotel ID from Booking.com
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS external_hotel_id INTEGER;
