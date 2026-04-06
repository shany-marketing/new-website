import { computeBaselineStats, sanitizeStatsForTier } from "@/lib/stats";
import { queryOne, query } from "@/lib/db";
import { getHotelPlan, getHotelAddons, canAccess } from "@/lib/plan";
import RatingsClient from "./ratings-client";

interface Props {
  params: Promise<{ hotelId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RatingsPage({ params, searchParams }: Props) {
  const { hotelId } = await params;
  const sp = await searchParams;
  const from = typeof sp.from === "string" ? sp.from : undefined;
  const to = typeof sp.to === "string" ? sp.to : undefined;

  // Check plan gating
  const [plan, addons] = await Promise.all([
    getHotelPlan(hotelId),
    getHotelAddons(hotelId),
  ]);

  const hasAccess = canAccess(plan, "ratings_tab", addons);

  let hotelName = "Hotel";
  let stats = null;
  let latestRating: number | null = null;
  let platformBreakdown: { source: string; avgRating: number; count: number }[] = [];

  // Build date filter for inline queries
  const dateParams: unknown[] = [hotelId];
  let dateFilter = "";
  if (from) {
    dateParams.push(from + "-01");
    dateFilter += ` AND review_date >= $${dateParams.length}`;
  }
  if (to) {
    const [y, m] = to.split("-").map(Number);
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    dateParams.push(next);
    dateFilter += ` AND review_date < $${dateParams.length}`;
  }

  try {
    const hotel = await queryOne<{ name: string }>(
      "SELECT name FROM hotels WHERE id = $1",
      [hotelId]
    );
    if (hotel) hotelName = hotel.name;

    stats = await computeBaselineStats(hotelId, from, to);

    // Hotel score from latest review in range
    const latest = await queryOne<{ rating: string }>(
      `SELECT rating::text FROM raw_reviews WHERE hotel_id = $1 AND rating IS NOT NULL${dateFilter} ORDER BY review_date DESC NULLS LAST LIMIT 1`,
      [...dateParams]
    );
    if (latest) latestRating = parseFloat(latest.rating);

    // Platform breakdown
    const platforms = await query<{ source: string; avg_rating: string; count: string }>(
      `SELECT source, ROUND(AVG(rating), 2)::text AS avg_rating, COUNT(*)::text AS count FROM raw_reviews WHERE hotel_id = $1 AND rating IS NOT NULL${dateFilter} GROUP BY source ORDER BY COUNT(*) DESC`,
      [...dateParams]
    );
    platformBreakdown = platforms.map((p) => ({
      source: p.source,
      avgRating: parseFloat(p.avg_rating),
      count: parseInt(p.count, 10),
    }));
  } catch {
    // DB not available
  }

  // Sanitize stats for free tier (strip rating values)
  const sanitizedStats = stats && !hasAccess ? sanitizeStatsForTier(stats, "free") : stats;

  return (
    <RatingsClient
      hotelId={hotelId}
      hotelName={hotelName}
      stats={sanitizedStats}
      latestRating={hasAccess ? latestRating : null}
      platformBreakdown={hasAccess ? platformBreakdown : platformBreakdown.map(p => ({ ...p, avgRating: 0 }))}
      locked={!hasAccess}
    />
  );
}
