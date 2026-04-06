-- 021: Platform posting — direct response posting to Booking.com, Google, Expedia
-- Adds credential storage (encrypted), OAuth tokens, and post audit log

-- Encrypted credentials for Booking.com (Basic Auth) and Expedia (API Key)
CREATE TABLE platform_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL CHECK (platform IN ('booking', 'expedia')),
  credential_type TEXT NOT NULL DEFAULT 'api_key',
  encrypted_data  TEXT NOT NULL,
  iv              TEXT NOT NULL,
  auth_tag        TEXT NOT NULL,
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(hotel_id, platform)
);

CREATE INDEX idx_platform_credentials_hotel ON platform_credentials(hotel_id);

-- Google OAuth tokens (encrypted)
CREATE TABLE platform_oauth_tokens (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id                  UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  platform                  TEXT NOT NULL DEFAULT 'google',
  encrypted_access_token    TEXT NOT NULL,
  encrypted_refresh_token   TEXT,
  iv                        TEXT NOT NULL,
  auth_tag                  TEXT NOT NULL,
  token_expires_at          TIMESTAMPTZ,
  google_account_id         TEXT,
  google_location_id        TEXT,
  scope                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(hotel_id, platform)
);

CREATE INDEX idx_platform_oauth_hotel ON platform_oauth_tokens(hotel_id);

-- Audit log for every response post attempt
CREATE TABLE review_posts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id        UUID NOT NULL REFERENCES raw_reviews(id) ON DELETE CASCADE,
  hotel_id         UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  platform         TEXT NOT NULL CHECK (platform IN ('booking', 'google', 'expedia')),
  response_text    TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'posted', 'failed', 'in_moderation', 'rejected')),
  platform_post_id TEXT,
  error_message    TEXT,
  attempted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at     TIMESTAMPTZ,
  posted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(review_id, platform)
);

CREATE INDEX idx_review_posts_review ON review_posts(review_id);
CREATE INDEX idx_review_posts_hotel ON review_posts(hotel_id);
CREATE INDEX idx_review_posts_status ON review_posts(status);
