import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  stripe,
  PREMIUM_MONTHLY_PRICE_ID,
  PREMIUM_ANNUAL_PRICE_ID,
  PLATFORM_TIER_PRICE_IDS,
  ELAINE_PRICE_ID,
  ANALYTICS_PRICE_ID,
} from "@/lib/stripe";
import { queryOne, query } from "@/lib/db";
import { getTierForReviewCount, type Platform } from "@/lib/plan";

type AddonCheckout = {
  addon: "platform_responses" | "elaine" | "analytics";
  platform?: Platform;
};

type LegacyCheckout = {
  interval?: "monthly" | "annual";
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.hotelId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hotelId = session.user.hotelId;

  let body: AddonCheckout | LegacyCheckout = {};
  try {
    body = await req.json();
  } catch {
    // No body — treated as legacy monthly
  }

  let priceId: string;
  let metadata: Record<string, string> = { hotelId };

  if ("addon" in body && body.addon) {
    // New add-on checkout flow
    const { addon, platform } = body as AddonCheckout;
    metadata.addon_type = addon;

    switch (addon) {
      case "platform_responses": {
        if (!platform) {
          return NextResponse.json({ error: "Platform required" }, { status: 400 });
        }
        metadata.platform = platform;

        // Determine tier from review count
        const countResult = await queryOne<{ count: string }>(
          "SELECT COUNT(*)::text as count FROM raw_reviews WHERE hotel_id = $1 AND source = $2",
          [hotelId, platform]
        );
        const reviewCount = parseInt(countResult?.count || "0", 10);
        const tier = getTierForReviewCount(reviewCount);
        metadata.review_tier = tier.id;

        priceId = PLATFORM_TIER_PRICE_IDS[tier.id];
        if (!priceId) {
          return NextResponse.json({ url: null, error: "Stripe price not configured for this tier" }, { status: 503 });
        }
        break;
      }
      case "elaine": {
        priceId = ELAINE_PRICE_ID;
        if (!priceId) {
          return NextResponse.json({ url: null, error: "Stripe price not configured for Elaine" }, { status: 503 });
        }
        break;
      }
      case "analytics": {
        priceId = ANALYTICS_PRICE_ID;
        if (!priceId) {
          return NextResponse.json({ url: null, error: "Stripe price not configured for Analytics" }, { status: 503 });
        }
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid addon type" }, { status: 400 });
    }
  } else {
    // Legacy premium checkout
    const interval = (body as LegacyCheckout).interval === "annual" ? "annual" : "monthly";
    priceId = interval === "annual" ? PREMIUM_ANNUAL_PRICE_ID : PREMIUM_MONTHLY_PRICE_ID;
    metadata.interval = interval;

    if (!priceId) {
      return NextResponse.json({ url: null, error: "Stripe price not configured" }, { status: 503 });
    }
  }

  // Get or create Stripe customer
  const hotel = await queryOne<{ id: string; name: string; stripe_customer_id: string | null }>(
    "SELECT id, name, stripe_customer_id FROM hotels WHERE id = $1",
    [hotelId]
  );

  if (!hotel) {
    return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  }

  let customerId = hotel.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      metadata: { hotelId, hotelName: hotel.name },
    });
    customerId = customer.id;

    await queryOne(
      "UPDATE hotels SET stripe_customer_id = $1 WHERE id = $2 RETURNING id",
      [customerId, hotelId]
    );
  }

  // Check if addon already active
  if ("addon" in body && body.addon) {
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM hotel_addons
       WHERE hotel_id = $1 AND addon_type = $2 AND ($3::text IS NULL OR platform = $3) AND status = 'active'`,
      [hotelId, body.addon, (body as AddonCheckout).platform || null]
    );
    if (existing) {
      return NextResponse.json({ error: "Add-on already active" }, { status: 409 });
    }
  }

  const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const isElaine = "addon" in body && body.addon === "elaine";

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard/${hotelId}?upgraded=true`,
    cancel_url: `${origin}/pricing`,
    metadata,
    allow_promotion_codes: !isElaine,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
