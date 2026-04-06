import Stripe from "stripe";

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured. Set it in your environment variables.");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Lazy initialization — only throws when actually used
let _stripe: Stripe | null = null;
export function getStripeClient(): Stripe {
  if (!_stripe) {
    _stripe = getStripe();
  }
  return _stripe;
}

// For convenience, also export as a getter
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripeClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Legacy price IDs (for existing premium subscribers)
export const PREMIUM_MONTHLY_PRICE_ID = process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || process.env.STRIPE_PREMIUM_PRICE_ID || "";
export const PREMIUM_ANNUAL_PRICE_ID = process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID || "";
export const PREMIUM_PRICE_ID = PREMIUM_MONTHLY_PRICE_ID;

// Add-on price IDs — Per-platform response tiers
export const PLATFORM_TIER_PRICE_IDS: Record<string, string> = {
  tier_1: process.env.STRIPE_PLATFORM_TIER1_PRICE_ID || "",
  tier_2: process.env.STRIPE_PLATFORM_TIER2_PRICE_ID || "",
  tier_3: process.env.STRIPE_PLATFORM_TIER3_PRICE_ID || "",
  tier_4: process.env.STRIPE_PLATFORM_TIER4_PRICE_ID || "",
};

// Elaine AI Chat — $99/mo
export const ELAINE_PRICE_ID = process.env.STRIPE_ELAINE_PRICE_ID || "";

// Analytics add-on — $49/mo
export const ANALYTICS_PRICE_ID = process.env.STRIPE_ANALYTICS_PRICE_ID || "";
