import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireHotelAccess } from "@/lib/auth";

interface ProactiveInsight {
  type: "warning" | "success" | "info";
  title: string;
  text: string;
}

// GET /api/hotels/:hotelId/chat/insights — proactive insights for Elaine
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;
  const authResult = await requireHotelAccess(hotelId);
  if (authResult.error) return authResult.error;

  const insights: ProactiveInsight[] = [];

  try {
    // 1. Check for recent rating drop (last 30 days vs prior 30 days)
    const ratingTrend = await queryOne<{ recent: string; prior: string }>(
      `SELECT
        COALESCE(AVG(CASE WHEN review_date >= now() - interval '30 days' THEN rating END), 0)::numeric(4,2)::text AS recent,
        COALESCE(AVG(CASE WHEN review_date >= now() - interval '60 days' AND review_date < now() - interval '30 days' THEN rating END), 0)::numeric(4,2)::text AS prior
      FROM raw_reviews WHERE hotel_id = $1 AND rating IS NOT NULL`,
      [hotelId]
    );
    if (ratingTrend) {
      const recent = parseFloat(ratingTrend.recent);
      const prior = parseFloat(ratingTrend.prior);
      if (prior > 0 && recent > 0) {
        const diff = recent - prior;
        if (diff <= -0.3) {
          insights.push({
            type: "warning",
            title: "Rating Drop",
            text: `Tell me why the average rating dropped from ${prior.toFixed(1)} to ${recent.toFixed(1)} in the last 30 days`,
          });
        } else if (diff >= 0.3) {
          insights.push({
            type: "success",
            title: "Rating Improvement",
            text: `Show me what improved — the rating went from ${prior.toFixed(1)} to ${recent.toFixed(1)} recently`,
          });
        }
      }
    }

    // 2. Check for unanswered reviews
    const unanswered = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM raw_reviews
       WHERE hotel_id = $1 AND ai_response IS NULL
       AND review_date >= now() - interval '30 days'`,
      [hotelId]
    );
    if (unanswered && parseInt(unanswered.count) > 5) {
      insights.push({
        type: "info",
        title: `${unanswered.count} Pending Responses`,
        text: `Show me the ${unanswered.count} unanswered reviews from the last 30 days`,
      });
    }

    // 3. Check for top complaint category spike
    const topComplaint = await queryOne<{ label: string; count: string }>(
      `SELECT cc.label, COUNT(*)::text AS count
       FROM atomic_items ai
       JOIN category_mappings cm ON cm.atomic_item_id = ai.id
       JOIN consensus_categories cc ON cc.id = cm.category_id
       JOIN raw_reviews rr ON rr.id = ai.raw_review_id
       WHERE ai.hotel_id = $1 AND ai.sentiment = 'negative'
       AND rr.review_date >= now() - interval '30 days'
       GROUP BY cc.label ORDER BY count DESC LIMIT 1`,
      [hotelId]
    );
    if (topComplaint && parseInt(topComplaint.count) > 3) {
      insights.push({
        type: "warning",
        title: `Top Complaint: ${topComplaint.label}`,
        text: `Analyze the "${topComplaint.label}" complaints — there are ${topComplaint.count} in the last 30 days`,
      });
    }

    // 4. Check for new reviews volume
    const recentVolume = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM raw_reviews
       WHERE hotel_id = $1 AND review_date >= now() - interval '7 days'`,
      [hotelId]
    );
    if (recentVolume && parseInt(recentVolume.count) > 0) {
      insights.push({
        type: "info",
        title: `${recentVolume.count} New Reviews`,
        text: `Summarize the ${recentVolume.count} reviews from the last 7 days — what are guests saying?`,
      });
    }
  } catch (err) {
    console.error("Failed to fetch proactive insights:", err);
  }

  return NextResponse.json({ insights: insights.slice(0, 4) });
}
