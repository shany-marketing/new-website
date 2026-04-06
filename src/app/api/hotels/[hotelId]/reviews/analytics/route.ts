import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireHotelAccess } from "@/lib/auth";
import { checkFeatureAccess } from "@/lib/plan";
import { PLATFORMS } from "@/types/platform";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;

    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source") || "";

    // Build where clause with optional source filter
    let whereClause = "r.hotel_id = $1";
    const queryParams: unknown[] = [hotelId];
    if (source && (PLATFORMS as readonly string[]).includes(source)) {
      whereClause += " AND r.source = $2";
      queryParams.push(source);
    }

    // Basic stats available to all
    const stats = await queryOne<{
      total_reviews: number;
      responded_count: number;
      ai_generated_count: number;
      sent_to_booking_count: number;
      avg_quality: number | null;
    }>(
      `SELECT
        COUNT(*)::int AS total_reviews,
        COUNT(CASE WHEN ai_response IS NOT NULL OR property_response IS NOT NULL THEN 1 END)::int AS responded_count,
        COUNT(CASE WHEN ai_response IS NOT NULL THEN 1 END)::int AS ai_generated_count,
        COUNT(CASE WHEN sent_to_booking = TRUE THEN 1 END)::int AS sent_to_booking_count,
        ROUND(AVG(rq.quality_score), 1) AS avg_quality
      FROM raw_reviews r
      LEFT JOIN response_quality rq ON rq.review_id = r.id
      WHERE ${whereClause}`,
      queryParams
    );

    const result: Record<string, unknown> = {
      totalReviews: stats?.total_reviews || 0,
      respondedCount: stats?.responded_count || 0,
      responseRate:
        stats && stats.total_reviews > 0
          ? Math.round((stats.responded_count / stats.total_reviews) * 100)
          : 0,
      avgQualityScore: stats?.avg_quality ?? null,
      aiGeneratedCount: stats?.ai_generated_count || 0,
      sentToBookingCount: stats?.sent_to_booking_count || 0,
    };

    // Analytics add-on: add quality criteria breakdown
    if (await checkFeatureAccess(hotelId, "response_analytics")) {
      const criteria = await queryOne<{
        resp: number; lang: number; pos: number; neg: number;
        guest: number; hotelier: number; kind: number; concise: number;
        grat: number; comeback: number; syntax: number; personal: number;
        total: number;
      }>(
        `SELECT
          COUNT(CASE WHEN is_response THEN 1 END)::int AS resp,
          COUNT(CASE WHEN is_right_lang THEN 1 END)::int AS lang,
          COUNT(CASE WHEN is_answered_positive THEN 1 END)::int AS pos,
          COUNT(CASE WHEN is_answered_negative THEN 1 END)::int AS neg,
          COUNT(CASE WHEN is_include_guest_name THEN 1 END)::int AS guest,
          COUNT(CASE WHEN is_include_hotelier_name THEN 1 END)::int AS hotelier,
          COUNT(CASE WHEN is_kind THEN 1 END)::int AS kind,
          COUNT(CASE WHEN is_concise THEN 1 END)::int AS concise,
          COUNT(CASE WHEN is_gratitude THEN 1 END)::int AS grat,
          COUNT(CASE WHEN is_include_come_back_asking THEN 1 END)::int AS comeback,
          COUNT(CASE WHEN is_syntax_right THEN 1 END)::int AS syntax,
          COUNT(CASE WHEN is_personal_tone_not_generic THEN 1 END)::int AS personal,
          COUNT(*)::int AS total
        FROM response_quality rq
        JOIN raw_reviews r ON r.id = rq.review_id
        WHERE ${whereClause}`,
        queryParams
      );

      if (criteria && criteria.total > 0) {
        const t = criteria.total;
        result.criteriaBreakdown = {
          is_response: Math.round((criteria.resp / t) * 100),
          is_right_lang: Math.round((criteria.lang / t) * 100),
          is_answered_positive: Math.round((criteria.pos / t) * 100),
          is_answered_negative: Math.round((criteria.neg / t) * 100),
          is_include_guest_name: Math.round((criteria.guest / t) * 100),
          is_include_hotelier_name: Math.round((criteria.hotelier / t) * 100),
          is_kind: Math.round((criteria.kind / t) * 100),
          is_concise: Math.round((criteria.concise / t) * 100),
          is_gratitude: Math.round((criteria.grat / t) * 100),
          is_include_come_back_asking: Math.round((criteria.comeback / t) * 100),
          is_syntax_right: Math.round((criteria.syntax / t) * 100),
          is_personal_tone_not_generic: Math.round((criteria.personal / t) * 100),
        };
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
