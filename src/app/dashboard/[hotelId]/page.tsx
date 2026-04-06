import { computeBaselineStats, sanitizeStatsForTier } from "@/lib/stats";
import { queryOne } from "@/lib/db";
import { getHotelPlan, checkFeatureAccess } from "@/lib/plan";
import StatisticsClient from "./statistics-client";

interface Props {
  params: Promise<{ hotelId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HotelStatisticsPage({ params, searchParams }: Props) {
  const { hotelId } = await params;
  const sp = await searchParams;
  const from = typeof sp.from === "string" ? sp.from : undefined;
  const to = typeof sp.to === "string" ? sp.to : undefined;

  let hotelName = "Hotel";
  let stats = null;
  let plan: "free" | "ratings" | "premium" = "free";
  let canRunPipeline = false;

  try {
    const hotel = await queryOne<{ name: string }>(
      "SELECT name FROM hotels WHERE id = $1",
      [hotelId]
    );
    if (hotel) hotelName = hotel.name;

    stats = await computeBaselineStats(hotelId, from, to);
    plan = await getHotelPlan(hotelId);
    canRunPipeline = await checkFeatureAccess(hotelId, "pipeline");
  } catch {
    // DB not available
  }

  const sanitizedStats = stats ? sanitizeStatsForTier(stats, plan) : null;

  return <StatisticsClient hotelId={hotelId} hotelName={hotelName} stats={sanitizedStats} plan={plan} canRunPipeline={canRunPipeline} />;
}
