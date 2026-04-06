-- Prevent duplicate hotels with the same Booking.com URL
CREATE UNIQUE INDEX IF NOT EXISTS idx_hotels_booking_url ON hotels(booking_url) WHERE booking_url IS NOT NULL;
