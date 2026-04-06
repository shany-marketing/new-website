import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const { session } = authResult;
    const isAdmin = session.user.role === "admin";
    const isChainManager = session.user.role === "chain_manager";

    // Admins see all; chain managers see their assigned hotels; users see their one hotel
    let whereClause: string;
    let params: unknown[];
    if (isAdmin) {
      whereClause = "";
      params = [];
    } else if (isChainManager) {
      whereClause = "WHERE h.id IN (SELECT hotel_id FROM user_hotels WHERE user_id = $1)";
      params = [session.user.id];
    } else {
      whereClause = "WHERE h.id = $1";
      params = [session.user.hotelId];
    }

    const hotels = await query<{
      id: string;
      name: string;
      booking_url: string | null;
      plan: string;
      created_at: string;
      review_count: string;
      avg_rating: string | null;
      pipeline_status: string | null;
      pipeline_stage: string | null;
    }>(
      `SELECT
         h.id,
         h.name,
         h.booking_url,
         h.plan,
         h.created_at::text,
         COUNT(rr.id)::text AS review_count,
         ROUND(AVG(rr.rating), 2)::text AS avg_rating,
         pr.status AS pipeline_status,
         pr.current_stage AS pipeline_stage
       FROM hotels h
       LEFT JOIN raw_reviews rr ON rr.hotel_id = h.id
       LEFT JOIN LATERAL (
         SELECT status, current_stage
         FROM pipeline_runs
         WHERE hotel_id = h.id
         ORDER BY started_at DESC
         LIMIT 1
       ) pr ON true
       ${whereClause}
       GROUP BY h.id, h.name, h.booking_url, h.plan, h.created_at, pr.status, pr.current_stage
       ORDER BY h.created_at DESC`,
      params
    );

    return NextResponse.json(
      hotels.map((h) => ({
        id: h.id,
        name: h.name,
        bookingUrl: h.booking_url,
        plan: h.plan,
        createdAt: h.created_at,
        reviewCount: parseInt(h.review_count),
        avgRating: h.avg_rating ? parseFloat(h.avg_rating) : null,
        pipelineStatus: h.pipeline_status,
        pipelineStage: h.pipeline_stage,
      }))
    );
  } catch (error) {
    console.error("Hotels list error:", error);
    return NextResponse.json({ error: "Failed to fetch hotels" }, { status: 500 });
  }
}
