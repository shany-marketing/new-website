import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { query, queryOne } from "@/lib/db";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const hotelId = session.metadata?.hotelId;
      const addonType = session.metadata?.addon_type;

      if (!hotelId || !session.subscription) break;

      if (addonType) {
        // New add-on subscription
        const platform = session.metadata?.platform || null;
        const reviewTier = session.metadata?.review_tier || null;

        await query(
          `INSERT INTO hotel_addons (hotel_id, addon_type, platform, stripe_subscription_id, stripe_price_id, status, review_tier)
           VALUES ($1, $2, $3, $4, $5, 'active', $6)
           ON CONFLICT (hotel_id, addon_type, platform)
           DO UPDATE SET stripe_subscription_id = $4, stripe_price_id = $5, status = 'active', review_tier = $6, updated_at = NOW()`,
          [
            hotelId,
            addonType,
            platform,
            session.subscription as string,
            session.metadata?.stripe_price_id || null,
            reviewTier,
          ]
        );
      } else {
        // Legacy premium subscription
        await query(
          `UPDATE hotels
           SET plan = 'premium',
               stripe_subscription_id = $1,
               subscription_status = 'active'
           WHERE id = $2`,
          [session.subscription as string, hotelId]
        );
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const status = subscription.status;
      const isActive = status === "active" || status === "trialing";

      // Check if this is an add-on subscription
      const addonExists = await queryOne<{ id: string }>(
        "SELECT id FROM hotel_addons WHERE stripe_subscription_id = $1",
        [subscription.id]
      );

      if (addonExists) {
        await query(
          `UPDATE hotel_addons
           SET status = $1, updated_at = NOW()
           WHERE stripe_subscription_id = $2`,
          [isActive ? "active" : "past_due", subscription.id]
        );
      } else {
        // Legacy hotels table
        await query(
          `UPDATE hotels
           SET plan = $1,
               subscription_status = $2
           WHERE stripe_subscription_id = $3`,
          [isActive ? "premium" : "free", status, subscription.id]
        );
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      // Check if this is an add-on subscription
      const addonExists = await queryOne<{ id: string }>(
        "SELECT id FROM hotel_addons WHERE stripe_subscription_id = $1",
        [subscription.id]
      );

      if (addonExists) {
        await query(
          `UPDATE hotel_addons
           SET status = 'canceled', updated_at = NOW()
           WHERE stripe_subscription_id = $1`,
          [subscription.id]
        );
      } else {
        // Legacy hotels table
        await query(
          `UPDATE hotels
           SET plan = 'free',
               subscription_status = 'canceled',
               stripe_subscription_id = NULL
           WHERE stripe_subscription_id = $1`,
          [subscription.id]
        );
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
