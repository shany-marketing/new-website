import { query } from "@/lib/db";
import { auth, getChainHotelIds } from "@/lib/auth";
import { redirect } from "next/navigation";
import HotelListClient from "./hotel-list-client";
import ChainDashboardClient from "./chain-dashboard-client";
import ChainManagerPending from "./chain-manager-pending";

interface HotelRow {
  id: string;
  name: string;
  review_count: string;
  avg_rating: string | null;
  pipeline_status: string | null;
}

async function fetchHotels(filter?: string[]): Promise<{ id: string; name: string; reviewCount: number; avgRating: number | null; pipelineStatus: string | null }[]> {
  const whereClause = filter ? "WHERE h.id = ANY($1::uuid[])" : "";
  const params = filter ? [filter] : [];

  const rows = await query<HotelRow>(
    `SELECT
       h.id,
       h.name,
       COUNT(rr.id)::text AS review_count,
       ROUND(AVG(rr.rating), 2)::text AS avg_rating,
       pr.status AS pipeline_status
     FROM hotels h
     LEFT JOIN raw_reviews rr ON rr.hotel_id = h.id
     LEFT JOIN LATERAL (
       SELECT status FROM pipeline_runs WHERE hotel_id = h.id ORDER BY started_at DESC LIMIT 1
     ) pr ON true
     ${whereClause}
     GROUP BY h.id, h.name, pr.status
     ORDER BY h.name`,
    params
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    reviewCount: parseInt(r.review_count),
    avgRating: r.avg_rating ? parseFloat(r.avg_rating) : null,
    pipelineStatus: r.pipeline_status,
  }));
}

export default async function DashboardPage() {
  const session = await auth();

  // Single-hotel user (not admin, not chain_manager) -> redirect to their hotel
  if (
    session?.user?.hotelId &&
    session.user.role !== "admin" &&
    session.user.role !== "chain_manager"
  ) {
    redirect(`/dashboard/${session.user.hotelId}`);
  }

  // Chain manager
  if (session?.user?.role === "chain_manager") {
    const hotelIds = await getChainHotelIds(session.user.id);
    if (hotelIds.length === 0) {
      return <ChainManagerPending chainName={session.user.chainName ?? null} />;
    }
    try {
      const hotels = await fetchHotels(hotelIds);
      const allPipelinesReady = hotels.length > 0 && hotels.every((h) => h.pipelineStatus === "completed");
      return <ChainDashboardClient hotels={hotels} chainName={session.user.chainName ?? null} allPipelinesReady={allPipelinesReady} />;
    } catch {
      return <ChainDashboardClient hotels={[]} chainName={session.user.chainName ?? null} allPipelinesReady={false} />;
    }
  }

  // No hotel, not admin, not chain_manager -> onboarding
  if (!session?.user?.hotelId && session?.user?.role !== "admin") {
    redirect("/dashboard/onboarding");
  }

  // Admin users see all hotels
  let hotels: { id: string; name: string; reviewCount: number; avgRating: number | null; pipelineStatus: string | null }[] = [];

  try {
    hotels = await fetchHotels();
  } catch {
    // DB not available - show empty state
  }

  return <HotelListClient hotels={hotels} />;
}
