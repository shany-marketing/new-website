import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { requireHotelAccess } from "@/lib/auth";
import { checkFeatureAccess } from "@/lib/plan";
import {
  refineResponse,
  analyzeResponseQuality,
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

    if (!(await checkFeatureAccess(hotelId, "response_refinement"))) {
      return NextResponse.json(
        { error: "Response refinement requires the Analytics add-on" },
        { status: 403 }
      );
    }

    const review = await queryOne<{
      id: string;
      liked_text: string | null;
      disliked_text: string | null;
      review_title: string | null;
      rating: number | null;
      reviewer_display_name: string | null;
      review_language: string | null;
    }>(
      `SELECT id, liked_text, disliked_text, review_title, rating,
              reviewer_display_name, review_language
       FROM raw_reviews WHERE id = $1 AND hotel_id = $2`,
      [reviewId, hotelId]
    );

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const body = await req.json();
    const { instruction, conversationHistory } = body;

    if (!instruction) {
      return NextResponse.json({ error: "Instruction is required" }, { status: 400 });
    }

    // Validate conversation history: limit size and filter roles
    const validRoles = new Set(["user", "assistant"]);
    const safeHistory = Array.isArray(conversationHistory)
      ? conversationHistory
          .filter(
            (m: { role?: string; content?: string }) =>
              validRoles.has(m.role ?? "") && typeof m.content === "string"
          )
          .slice(-20)
      : [];

    const settings = await getResponseSettings(hotelId);
    const staffActions = await getRelevantStaffActions(hotelId, reviewId);

    const refined = await refineResponse(
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
      safeHistory,
      instruction,
      staffActions,
      hotelId
    );

    // Re-analyze quality
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
      refined
    ).catch((err) => console.error("Quality analysis failed:", err));

    return NextResponse.json({ responseText: refined });
  } catch (error) {
    console.error("Refine response error:", error);
    return NextResponse.json({ error: "Failed to refine response" }, { status: 500 });
  }
}
