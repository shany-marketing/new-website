-- Email digest settings per hotel
CREATE TABLE email_digest_settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE UNIQUE,
  enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  email_address TEXT NOT NULL,
  frequency     TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('weekly','daily')),
  day_of_week   INTEGER DEFAULT 1 CHECK (day_of_week BETWEEN 0 AND 6),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Log of sent digests
CREATE TABLE email_digest_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_address TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('sent','failed')),
  error_message TEXT
);
CREATE INDEX idx_email_digest_log_hotel ON email_digest_log(hotel_id, sent_at);
