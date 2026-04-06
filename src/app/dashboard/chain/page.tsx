import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import ChainDashboardClient, { type ChainHotel } from "./chain-client";

interface HotelRow {
  id: string;
  name: string;
  review_count: string;
  avg_rating: string | null;
  pipeline_status: string | null;
  booking_url: string | null;
}

export default async function ChainDashboardPage() {
  const session = await auth();

  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "chain_manager") redirect("/dashboard");

  const hotelIds = session.user.hotelIds ?? [];
  let hotels: ChainHotel[] = [];

  if (hotelIds.length > 0) {
    try {
      const rows = await query<HotelRow>(
        `SELECT
           h.id,
           h.name,
           COUNT(rr.id)::text AS review_count,
           ROUND(AVG(rr.rating), 2)::text AS avg_rating,
           h.booking_url,
           pr.status AS pipeline_status
         FROM hotels h
         LEFT JOIN raw_reviews rr ON rr.hotel_id = h.id
         LEFT JOIN LATERAL (
           SELECT status FROM pipeline_runs WHERE hotel_id = h.id ORDER BY started_at DESC LIMIT 1
         ) pr ON true
         WHERE h.id = ANY($1::uuid[])
         GROUP BY h.id, h.name, h.booking_url, pr.status
         ORDER BY h.name`,
        [hotelIds]
      );

      hotels = rows.map((r) => ({
        id: r.id,
        name: r.name,
        reviewCount: parseInt(r.review_count),
        currentRating: r.avg_rating ? parseFloat(r.avg_rating) : null,
        pipelineStatus: r.pipeline_status,
        bookingUrl: r.booking_url,
      }));
    } catch {
      // DB not available — show empty state
    }
  }

  return <ChainDashboardClient hotels={hotels} />;
}
