-- 020: Add-on subscription model
-- Replaces binary free/premium with granular add-ons:
--   platform_responses (per-platform), elaine (chat), analytics

CREATE TABLE hotel_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  addon_type TEXT NOT NULL CHECK (addon_type IN ('platform_responses', 'elaine', 'analytics')),
  platform TEXT CHECK (platform IN ('booking', 'google', 'tripadvisor', 'expedia')),
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
  review_tier TEXT CHECK (review_tier IN ('tier_1', 'tier_2', 'tier_3', 'tier_4')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hotel_id, addon_type, platform)
);

CREATE INDEX idx_hotel_addons_hotel ON hotel_addons(hotel_id);
CREATE INDEX idx_hotel_addons_stripe_sub ON hotel_addons(stripe_subscription_id);

-- Ensure platform is set for platform_responses and NULL for others
ALTER TABLE hotel_addons ADD CONSTRAINT chk_platform_required
  CHECK (
    (addon_type = 'platform_responses' AND platform IS NOT NULL) OR
    (addon_type != 'platform_responses' AND platform IS NULL)
  );
