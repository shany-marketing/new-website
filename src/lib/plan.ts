import { queryOne, query } from "./db";

// ─── Tier Model ─────────────────────────────────────────────────
// free ($0)       → Statistics tab + Reviews demo
// ratings ($99/mo)  → Statistics + Ratings + Reviews demo
// premium ($999/mo) → Everything (Statistics + Ratings + Insights + Reviews full + Elaine)

export type Plan = "free" | "ratings" | "premium";

export type Feature =
  | "statistics"        // Tab 1 — always free
  | "ratings_tab"       // Tab 2 — ratings tier+
  | "insights_tab"      // Tab 3 — premium tier only
  | "reviews_demo"      // Tab 4 demo — always free
  | "reviews_full"      // Tab 4 full — premium tier, or ratings+addon
  | "elaine"            // Tab 5 — premium tier only
  | "pipeline"          // Pipeline execution — premium tier
  | "embeddings"        // Embedding generation — premium tier
  | "auto_respond"      // Auto-respond — premium tier
  | "email_digest"      // Email digest — premium tier
  | "benchmark"         // Benchmark — premium tier
  | "staff_actions"     // Staff actions — premium tier
  // Legacy features (mapped to new tiers for backward compat)
  | "insights"
  | "chat"
  | "since_upstar"
  | "unlimited_responses"
  | "response_refinement"
  | "response_analytics"
  | "custom_prompt";

export type AddonType = "platform_responses" | "elaine" | "analytics" | "reviews_full";
export type Platform = "booking" | "google" | "tripadvisor" | "expedia";

export const FREE_RESPONSE_LIMIT = 5;

// Legacy pricing constants (kept for backward compat)
export const PLATFORM_TIERS = [
  { id: "tier_1", maxReviews: 200, price: 19, label: "1–200 reviews" },
  { id: "tier_2", maxReviews: 500, price: 39, label: "201–500 reviews" },
  { id: "tier_3", maxReviews: 1000, price: 59, label: "501–1,000 reviews" },
  { id: "tier_4", maxReviews: Infinity, price: 89, label: "1,001+ reviews" },
] as const;
export const ELAINE_PRICE = 99;
export const ANALYTICS_PRICE = 49;

// ─── Tier Pricing ─────────────────────────────────────────────
export const RATINGS_PRICE = 99;
export const PREMIUM_PRICE = 999;
/** @deprecated Use PREMIUM_PRICE instead */
export const INSIGHT_PRICE = PREMIUM_PRICE;
export const REVIEWS_FULL_PRICE = 99; // add-on for ratings tier

// ─── Tier Hierarchy ─────────────────────────────────────────────

function tierLevel(plan: Plan): number {
  return { free: 0, ratings: 1, premium: 2 }[plan];
}

/** Public tier level helper for UI gating */
export function getTierLevel(plan: Plan): number {
  return tierLevel(normalizePlan(plan));
}

/** Normalize any plan value (including legacy "insight") to a valid Plan */
function normalizePlan(plan: string): Plan {
  if (plan === "insight" || plan === "premium") return "premium";
  if (plan === "ratings") return "ratings";
  return "free";
}

// Feature → minimum required tier
const FEATURE_TIER: Record<Feature, Plan> = {
  // Free tier
  statistics: "free",
  reviews_demo: "free",
  // Ratings tier ($99)
  ratings_tab: "ratings",
  // Premium tier ($999)
  insights_tab: "premium",
  elaine: "premium",
  pipeline: "premium",
  embeddings: "premium",
  auto_respond: "premium",
  email_digest: "premium",
  benchmark: "premium",
  staff_actions: "premium",
  // Special: ratings tier + addon, or premium tier
  reviews_full: "premium",
  // Legacy feature mappings
  insights: "premium",
  chat: "premium",
  since_upstar: "premium",
  unlimited_responses: "premium",
  response_refinement: "premium",
  response_analytics: "premium",
  custom_prompt: "premium",
};

// ─── Data Access ────────────────────────────────────────────────

export interface HotelAddon {
  id: string;
  addon_type: AddonType;
  platform: Platform | null;
  status: string;
  review_tier: string | null;
}

export async function getHotelPlan(hotelId: string): Promise<Plan> {
  const hotel = await queryOne<{ plan: string }>(
    "SELECT plan FROM hotels WHERE id = $1",
    [hotelId]
  );
  return normalizePlan(hotel?.plan ?? "free");
}

export async function getHotelAddons(hotelId: string): Promise<HotelAddon[]> {
  return query<HotelAddon>(
    "SELECT id, addon_type, platform, status, review_tier FROM hotel_addons WHERE hotel_id = $1 AND status = 'active'",
    [hotelId]
  );
}

export function hasAddon(addons: HotelAddon[], type: AddonType, platform?: Platform): boolean {
  return addons.some(
    (a) =>
      a.addon_type === type &&
      a.status === "active" &&
      (platform ? a.platform === platform : true)
  );
}

// ─── Access Control ─────────────────────────────────────────────

/**
 * Core access check with tier hierarchy + add-on support.
 * - Tier hierarchy: premium > ratings > free
 * - Special: reviews_full is accessible on ratings tier with reviews_full add-on
 */
export function canAccess(plan: Plan, feature: Feature, addons: HotelAddon[] = []): boolean {
  const p = normalizePlan(plan);
  const requiredTier = FEATURE_TIER[feature];

  // Tier hierarchy check
  if (tierLevel(p) >= tierLevel(requiredTier)) return true;

  // Special case: reviews_full can be unlocked by addon on ratings tier
  if (feature === "reviews_full" && p === "ratings" && hasAddon(addons, "reviews_full")) {
    return true;
  }

  // Legacy fallback: check old add-on types for backward compatibility
  if (hasAddon(addons, "analytics") && isAnalyticsFeature(feature)) return true;
  if (hasAddon(addons, "elaine") && (feature === "elaine" || feature === "chat")) return true;

  return false;
}

function isAnalyticsFeature(feature: Feature): boolean {
  const analyticsFeatures: Feature[] = [
    "pipeline", "insights", "insights_tab", "embeddings", "since_upstar",
    "staff_actions", "response_refinement", "response_analytics",
    "custom_prompt", "benchmark", "auto_respond", "email_digest",
  ];
  return analyticsFeatures.includes(feature);
}

/** Full access check: fetches plan + addons for a hotel */
export async function checkFeatureAccess(hotelId: string, feature: Feature): Promise<boolean> {
  const [plan, addons] = await Promise.all([getHotelPlan(hotelId), getHotelAddons(hotelId)]);
  return canAccess(plan, feature, addons);
}

/** Check if hotel can generate unlimited responses for a specific platform */
export async function canGenerateResponse(hotelId: string, platform: Platform): Promise<boolean> {
  const plan = await getHotelPlan(hotelId);
  if (plan === "premium") return true;
  const addons = await getHotelAddons(hotelId);
  if (hasAddon(addons, "platform_responses", platform)) return true;
  if (plan === "ratings" && hasAddon(addons, "reviews_full")) return true;
  return false;
}

/** Check if hotel can access Elaine chat — premium tier only */
export async function canAccessChat(hotelId: string): Promise<boolean> {
  return checkFeatureAccess(hotelId, "elaine");
}

/** Check if hotel can access analytics features — premium tier */
export async function canAccessAnalytics(hotelId: string): Promise<boolean> {
  return checkFeatureAccess(hotelId, "insights_tab");
}

/** Determine pricing tier for a platform based on review count (legacy) */
export function getTierForReviewCount(reviewCount: number): typeof PLATFORM_TIERS[number] {
  return PLATFORM_TIERS.find((t) => reviewCount <= t.maxReviews) || PLATFORM_TIERS[PLATFORM_TIERS.length - 1];
}

/** Get review count per platform for a hotel */
export async function getPlatformReviewCounts(hotelId: string): Promise<Record<Platform, number>> {
  const rows = await query<{ source: Platform; count: string }>(
    "SELECT source, COUNT(*)::text as count FROM raw_reviews WHERE hotel_id = $1 GROUP BY source",
    [hotelId]
  );
  const counts: Record<Platform, number> = { booking: 0, google: 0, tripadvisor: 0, expedia: 0 };
  for (const row of rows) {
    if (row.source in counts) {
      counts[row.source] = parseInt(row.count, 10);
    }
  }
  return counts;
}
