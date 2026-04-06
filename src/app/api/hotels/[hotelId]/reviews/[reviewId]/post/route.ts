import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db";
import { requireHotelAccess, auth } from "@/lib/auth";
import { postResponseToPlatform } from "@/lib/platform-poster";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string; reviewId: string }> }
) {
  try {
    const { hotelId, reviewId } = await params;

    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const body = await req.json();
    const platform = body.platform as "booking" | "google" | "expedia";

    if (!["booking", "google", "expedia"].includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    // Fetch the review
    const review = await queryOne<{
      id: string;
      external_id: string;
      ai_response: string | null;
      source: string;
    }>(
      `SELECT id, external_id, ai_response, COALESCE(source, 'booking') as source
       FROM raw_reviews WHERE id = $1 AND hotel_id = $2`,
      [reviewId, hotelId]
    );

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (!review.ai_response) {
      return NextResponse.json({ error: "No AI response to post" }, { status: 400 });
    }

    if (review.source !== platform) {
      return NextResponse.json(
        { error: `Review is from ${review.source}, cannot post to ${platform}` },
        { status: 400 }
      );
    }

    // Check for existing successful post
    const existingPost = await queryOne<{ status: string }>(
      "SELECT status FROM review_posts WHERE review_id = $1 AND platform = $2 AND status IN ('posted', 'in_moderation')",
      [reviewId, platform]
    );

    if (existingPost) {
      return NextResponse.json(
        { error: `Response already ${existingPost.status === "posted" ? "posted" : "in moderation"}` },
        { status: 409 }
      );
    }

    // Get hotel external ID for Booking.com
    const hotel = await queryOne<{ external_hotel_id: number | null }>(
      "SELECT external_hotel_id FROM hotels WHERE id = $1",
      [hotelId]
    );

    // Get current user ID
    const session = await auth();
    const userId = session?.user?.id || null;

    // Create a pending post record
    await query(
      `INSERT INTO review_posts (review_id, hotel_id, platform, response_text, status, posted_by_user_id)
       VALUES ($1, $2, $3, $4, 'pending', $5)
       ON CONFLICT (review_id, platform)
       DO UPDATE SET response_text = $4, status = 'pending', error_message = NULL, attempted_at = NOW(), posted_by_user_id = $5`,
      [reviewId, hotelId, platform, review.ai_response, userId]
    );

    // Post to the platform
    const result = await postResponseToPlatform(
      platform,
      hotelId,
      {
        id: review.id,
        externalId: review.external_id,
        externalHotelId: hotel?.external_hotel_id ?? undefined,
      },
      review.ai_response
    );

    // Update the post record
    await query(
      `UPDATE review_posts
       SET status = $1, platform_post_id = $2, error_message = $3,
           confirmed_at = CASE WHEN $1 = 'posted' THEN NOW() ELSE NULL END
       WHERE review_id = $4 AND platform = $5`,
      [result.status, result.platformPostId || null, result.errorMessage || null, reviewId, platform]
    );

    // Backward compat: also set sent_to_booking on success
    if (result.status === "posted" || result.status === "in_moderation") {
      await query(
        "UPDATE raw_reviews SET sent_to_booking = TRUE, sent_to_booking_at = NOW() WHERE id = $1",
        [reviewId]
      );
    }

    if (result.status === "failed" || result.status === "rejected") {
      return NextResponse.json(
        { success: false, status: result.status, error: result.errorMessage },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      platformPostId: result.platformPostId,
    });
  } catch (error) {
    console.error("Post to platform error:", error);
    return NextResponse.json({ error: "Failed to post response" }, { status: 500 });
  }
}

// GET: Return post status for a review
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string; reviewId: string }> }
) {
  try {
    const { hotelId, reviewId } = await params;

    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const post = await queryOne<{
      status: string;
      platform: string;
      platform_post_id: string | null;
      error_message: string | null;
      attempted_at: string;
      confirmed_at: string | null;
    }>(
      `SELECT status, platform, platform_post_id, error_message, attempted_at::text, confirmed_at::text
       FROM review_posts WHERE review_id = $1 AND hotel_id = $2
       ORDER BY attempted_at DESC LIMIT 1`,
      [reviewId, hotelId]
    );

    if (!post) {
      return NextResponse.json({ status: "none" });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("Post status error:", error);
    return NextResponse.json({ error: "Failed to fetch post status" }, { status: 500 });
  }
}
