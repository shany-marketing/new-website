import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { requireHotelAccess } from "@/lib/auth";
import { getHotelPlan, canAccess, canGenerateResponse, getHotelAddons, FREE_RESPONSE_LIMIT, type Platform } from "@/lib/plan";
import {
  generateAIResponse,
  analyzeResponseQuality,
  getMonthlyUsage,
  incrementUsage,
  decrementUsage,
  getResponseSettings,
  getRelevantStaffActions,
} from "@/lib/response-generator";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string; reviewId: string }> }
) {
  try {
    const { hotelId, reviewId } = await params;

    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    // Fetch review first so we know its platform
    const review = await queryOne<{
      id: string;
      hotel_id: string;
      liked_text: string | null;
      disliked_text: string | null;
      review_title: string | null;
      rating: number | null;
      reviewer_display_name: string | null;
      review_language: string | null;
      source: string;
    }>(
      `SELECT id, hotel_id, liked_text, disliked_text, review_title, rating,
              reviewer_display_name, review_language, COALESCE(source, 'booking') as source
       FROM raw_reviews WHERE id = $1 AND hotel_id = $2`,
      [reviewId, hotelId]
    );

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const platform = review.source as Platform;
    const plan = await getHotelPlan(hotelId);
    const addons = await getHotelAddons(hotelId);
    const hasUnlimited = canAccess(plan, "unlimited_responses", addons) ||
      await canGenerateResponse(hotelId, platform);

    // Check free tier limit
    if (!hasUnlimited) {
      const usage = await getMonthlyUsage(hotelId);
      if (usage >= FREE_RESPONSE_LIMIT) {
        return NextResponse.json(
          {
            error: `Free plan limit reached (${FREE_RESPONSE_LIMIT} responses/month). Subscribe to the ${platform} response package for unlimited responses.`,
            usage,
            limit: FREE_RESPONSE_LIMIT,
            platform,
          },
          { status: 403 }
        );
      }
    }

    const body = await req.json().catch(() => ({}));
    const customMessage = body.customMessage || "";

    const settings = await getResponseSettings(hotelId);
    const staffActions = await getRelevantStaffActions(hotelId, reviewId);

    // Increment usage BEFORE generation to prevent race condition bypass
    if (!hasUnlimited) {
      await incrementUsage(hotelId);
    }

    let responseText: string;
    try {
      responseText = await generateAIResponse(
        {
          id: review.id,
          likedText: review.liked_text,
          dislikedText: review.disliked_text,
          reviewTitle: review.review_title,
          rating: review.rating,
          reviewerDisplayName: review.reviewer_display_name,
          reviewLanguage: review.review_language,
        },
        settings,
        customMessage,
        staffActions,
        hotelId
      );
    } catch (genError) {
      // Rollback usage if generation failed
      if (!hasUnlimited) {
        await decrementUsage(hotelId);
      }
      throw genError;
    }

    // Increment for paid users (they don't have limits but we track)
    if (hasUnlimited) {
      await incrementUsage(hotelId);
    }

    // Analyze quality in the background (fire-and-forget)
    analyzeResponseQuality(
      {
        id: review.id,
        likedText: review.liked_text,
        dislikedText: review.disliked_text,
        reviewTitle: review.review_title,
        rating: review.rating,
        reviewerDisplayName: review.reviewer_display_name,
        reviewLanguage: review.review_language,
      },
      responseText
    ).catch((err) => console.error("Quality analysis failed:", err));

    const usage = await getMonthlyUsage(hotelId);

    return NextResponse.json({
      responseText,
      usage,
      limit: hasUnlimited ? null : FREE_RESPONSE_LIMIT,
    });
  } catch (error) {
    console.error("Generate response error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
