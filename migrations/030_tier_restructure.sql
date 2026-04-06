-- 030: Tier restructure — replace binary free/premium with 3-tier model
-- New plan values: 'free', 'ratings', 'insight' (keep 'premium' as legacy alias)
-- New addon type: 'reviews_full' for ratings-tier users wanting full review management

-- Step 1: Drop old plan CHECK constraint and add new one supporting tiers
ALTER TABLE hotels DROP CONSTRAINT IF EXISTS hotels_plan_check;
ALTER TABLE hotels ADD CONSTRAINT hotels_plan_check
  CHECK (plan IN ('free', 'ratings', 'insight', 'premium'));

-- Step 2: Expand addon_type to include 'reviews_full'
ALTER TABLE hotel_addons DROP CONSTRAINT IF EXISTS hotel_addons_addon_type_check;
ALTER TABLE hotel_addons ADD CONSTRAINT hotel_addons_addon_type_check
  CHECK (addon_type IN ('platform_responses', 'elaine', 'analytics', 'reviews_full'));

-- Step 3: Update platform constraint — reviews_full doesn't need a platform
ALTER TABLE hotel_addons DROP CONSTRAINT IF EXISTS chk_platform_required;
ALTER TABLE hotel_addons ADD CONSTRAINT chk_platform_required
  CHECK (
    (addon_type = 'platform_responses' AND platform IS NOT NULL) OR
    (addon_type NOT IN ('platform_responses') AND platform IS NULL)
  );
