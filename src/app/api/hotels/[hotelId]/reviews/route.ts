import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireHotelAccess } from "@/lib/auth";
import { PLATFORMS } from "@/types/platform";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;

    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const userId = authResult.session.user.id;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const source = searchParams.get("source") || "";
    const ratingMin = searchParams.get("ratingMin");
    const ratingMax = searchParams.get("ratingMax");
    const responseStatus = searchParams.get("responseStatus") || "all";
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "ASC" : "DESC";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    // Build filter conditions — $1 is always hotelId
    const conditions: string[] = ["r.hotel_id = $1"];
    const countValues: unknown[] = [hotelId];
    let countIdx = 1;

    // Platform filter
    if (source && (PLATFORMS as readonly string[]).includes(source)) {
      countIdx++;
      conditions.push(`r.source = $${countIdx}`);
      countValues.push(source);
    }

    // Date range filter (YYYY-MM format from global picker)
    if (startDate && /^\d{4}-\d{2}$/.test(startDate)) {
      countIdx++;
      conditions.push(`r.review_date >= $${countIdx}`);
      countValues.push(startDate + "-01");
    }
    if (endDate && /^\d{4}-\d{2}$/.test(endDate)) {
      const [y, m] = endDate.split("-").map(Number);
      const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
      countIdx++;
      conditions.push(`r.review_date < $${countIdx}`);
      countValues.push(next);
    }

    if (search) {
      countIdx++;
      conditions.push(`(r.liked_text ILIKE $${countIdx} OR r.disliked_text ILIKE $${countIdx} OR r.review_title ILIKE $${countIdx} OR r.reviewer_display_name ILIKE $${countIdx})`);
      countValues.push(`%${search}%`);
    }

    if (ratingMin) {
      countIdx++;
      conditions.push(`r.rating >= $${countIdx}`);
      countValues.push(parseFloat(ratingMin));
    }
    if (ratingMax) {
      countIdx++;
      conditions.push(`r.rating <= $${countIdx}`);
      countValues.push(parseFloat(ratingMax));
    }

    if (responseStatus === "none") {
      conditions.push("r.ai_response IS NULL AND r.property_response IS NULL");
    } else if (responseStatus === "ai") {
      conditions.push("r.ai_response IS NOT NULL");
    } else if (responseStatus === "scraped") {
      conditions.push("r.property_response IS NOT NULL AND r.ai_response IS NULL");
    } else if (responseStatus === "sent") {
      conditions.push("r.sent_to_booking = TRUE");
    }

    const whereClause = conditions.join(" AND ");

    let orderBy = "r.review_date";
    if (sortBy === "rating") orderBy = "r.rating";
    else if (sortBy === "quality") orderBy = "rq.quality_score";

    // COUNT query — uses countValues (no userId needed)
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM raw_reviews r LEFT JOIN response_quality rq ON rq.review_id = r.id WHERE ${whereClause}`,
      countValues
    );
    const total = Number(countResult[0]?.total) || 0;

    // Main query — rebuild WHERE with userId inserted as $2 (shifts other params by 1)
    // Rewrite conditions with $1=hotelId, $2=userId, $3+=filters
    const mainConditions: string[] = ["r.hotel_id = $1"];
    const mainValues: unknown[] = [hotelId, userId];
    let mainIdx = 2; // $1=hotelId, $2=userId

    if (source && (PLATFORMS as readonly string[]).includes(source)) {
      mainIdx++;
      mainConditions.push(`r.source = $${mainIdx}`);
      mainValues.push(source);
    }

    if (search) {
      mainIdx++;
      mainConditions.push(`(r.liked_text ILIKE $${mainIdx} OR r.disliked_text ILIKE $${mainIdx} OR r.review_title ILIKE $${mainIdx} OR r.reviewer_display_name ILIKE $${mainIdx})`);
      mainValues.push(`%${search}%`);
    }

    if (ratingMin) {
      mainIdx++;
      mainConditions.push(`r.rating >= $${mainIdx}`);
      mainValues.push(parseFloat(ratingMin));
    }
    if (ratingMax) {
      mainIdx++;
      mainConditions.push(`r.rating <= $${mainIdx}`);
      mainValues.push(parseFloat(ratingMax));
    }

    // Date range (same logic as count query)
    if (startDate && /^\d{4}-\d{2}$/.test(startDate)) {
      mainIdx++;
      mainConditions.push(`r.review_date >= $${mainIdx}`);
      mainValues.push(startDate + "-01");
    }
    if (endDate && /^\d{4}-\d{2}$/.test(endDate)) {
      const [y, m] = endDate.split("-").map(Number);
      const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
      mainIdx++;
      mainConditions.push(`r.review_date < $${mainIdx}`);
      mainValues.push(next);
    }

    if (responseStatus === "none") {
      mainConditions.push("r.ai_response IS NULL AND r.property_response IS NULL");
    } else if (responseStatus === "ai") {
      mainConditions.push("r.ai_response IS NOT NULL");
    } else if (responseStatus === "scraped") {
      mainConditions.push("r.property_response IS NOT NULL AND r.ai_response IS NULL");
    } else if (responseStatus === "sent") {
      mainConditions.push("r.sent_to_booking = TRUE");
    }

    const mainWhereClause = mainConditions.join(" AND ");

    const rows = await query(
      `SELECT
        r.id, r.external_id, r.source, r.check_in_date::text, r.check_out_date::text,
        r.liked_text, r.disliked_text, r.number_of_nights, r.rating,
        r.review_date::text, r.review_title, r.room_info, r.traveler_type,
        r.user_location, r.review_language, r.reviewer_display_name,
        r.property_response, r.ai_response, r.ai_response_generated_at::text,
        r.ai_response_edited, r.sent_to_booking, r.sent_to_booking_at::text,
        rq.quality_score,
        rq.is_response, rq.is_right_lang, rq.is_answered_positive, rq.is_answered_negative,
        rq.is_include_guest_name, rq.is_include_hotelier_name, rq.is_kind, rq.is_concise,
        rq.is_gratitude, rq.is_include_come_back_asking, rq.is_syntax_right,
        rq.is_personal_tone_not_generic,
        COALESCE(fc.feedback_count, 0)::int AS feedback_count,
        COALESCE(fc.unread_count, 0)::int AS unread_count
      FROM raw_reviews r
      LEFT JOIN response_quality rq ON rq.review_id = r.id
      LEFT JOIN (
        SELECT
          rf.review_id,
          COUNT(*)::int AS feedback_count,
          COUNT(*) FILTER (
            WHERE rf.created_at > COALESCE(frs.last_read_at, '1970-01-01')
          )::int AS unread_count
        FROM response_feedback rf
        LEFT JOIN feedback_read_status frs
          ON frs.review_id = rf.review_id AND frs.user_id = $2
        WHERE rf.hotel_id = $1
        GROUP BY rf.review_id
      ) fc ON fc.review_id = r.id
      WHERE ${mainWhereClause}
      ORDER BY ${orderBy} ${sortOrder} NULLS LAST
      LIMIT $${mainIdx + 1} OFFSET $${mainIdx + 2}`,
      [...mainValues, limit, offset]
    );

    return NextResponse.json({
      reviews: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Reviews GET error:", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}
