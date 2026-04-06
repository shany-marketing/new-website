import { query, queryOne } from "./db";
import { PLATFORM_CONFIG } from "@/types/platform";
import type { ReviewSource } from "@/types/platform";

const MAX_COMPETITORS = 5;
const MAX_COMPETITOR_REVIEWS = 500;

export interface CompetitorHotel {
  id: string;
  hotel_id: string;
  name: string;
  platform: ReviewSource;
  platform_url: string;
  total_reviews: number | null;
  avg_rating: number | null;
  response_rate: number | null;
  rating_distribution: Record<string, number> | null;
  monthly_data: MonthlyDataPoint[] | null;
  last_scraped_at: string | null;
  scrape_status: string;
  scrape_error: string | null;
  created_at: string;
}

export interface MonthlyDataPoint {
  month: string;
  count: number;
  avgRating: number | null;
  responseRate: number | null;
}

export interface BenchmarkEntity {
  id: string;
  name: string;
  isYourHotel: boolean;
  avgRating: number | null;
  totalReviews: number;
  responseRate: number | null;
  ratingDistribution: Record<string, number>;
  monthlyData: MonthlyDataPoint[];
}

/**
 * Add a competitor hotel. Validates 5-limit and uniqueness.
 */
export async function addCompetitor(
  hotelId: string,
  name: string,
  platformUrl: string,
  platform: ReviewSource
): Promise<CompetitorHotel> {
  // Check limit
  const countResult = await queryOne<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM competitor_hotels WHERE hotel_id = $1",
    [hotelId]
  );
  if ((countResult?.count ?? 0) >= MAX_COMPETITORS) {
    throw new Error(`Maximum of ${MAX_COMPETITORS} competitors allowed`);
  }

  const row = await queryOne<CompetitorHotel>(
    `INSERT INTO competitor_hotels (hotel_id, name, platform, platform_url, scrape_status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING *`,
    [hotelId, name, platform, platformUrl]
  );

  return row!;
}

/**
 * Remove a competitor (with ownership check).
 */
export async function removeCompetitor(competitorId: string, hotelId: string): Promise<boolean> {
  const result = await query(
    "DELETE FROM competitor_hotels WHERE id = $1 AND hotel_id = $2 RETURNING id",
    [competitorId, hotelId]
  );
  return result.length > 0;
}

/**
 * Get all competitors for a hotel.
 */
export async function getCompetitors(hotelId: string): Promise<CompetitorHotel[]> {
  return query<CompetitorHotel>(
    "SELECT * FROM competitor_hotels WHERE hotel_id = $1 ORDER BY created_at",
    [hotelId]
  );
}

/**
 * Scrape competitor reviews via Apify and compute aggregate metrics.
 * Runs in background (fire-and-forget).
 */
export async function scrapeCompetitor(competitorId: string): Promise<void> {
  const competitor = await queryOne<CompetitorHotel>(
    "SELECT * FROM competitor_hotels WHERE id = $1",
    [competitorId]
  );
  if (!competitor) throw new Error("Competitor not found");

  // Mark as scraping
  await query(
    "UPDATE competitor_hotels SET scrape_status = 'scraping', scrape_error = NULL WHERE id = $1",
    [competitorId]
  );

  try {
    const { triggerApifyScrape } = await import("./scrape");
    const { normalizeBatchForPlatform } = await import("./normalize");

    // Trigger Apify scrape
    const { runId, datasetId } = await triggerApifyScrape(
      competitor.platform_url,
      competitor.platform as ReviewSource,
      MAX_COMPETITOR_REVIEWS
    );

    // Poll until done
    const token = process.env.APIFY_API_TOKEN!;
    const APIFY_BASE = "https://api.apify.com/v2";
    const maxAttempts = 120; // 20 min max
    for (let i = 0; i < maxAttempts; i++) {
      const statusRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`);
      const statusData = await statusRes.json();
      const status = statusData.data?.status;

      if (status === "SUCCEEDED") break;
      if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
        throw new Error(`Apify run ${status}: ${statusData.data?.statusMessage || "unknown"}`);
      }
      await new Promise((r) => setTimeout(r, 10_000));
    }

    // Fetch dataset
    let allReviews: Record<string, unknown>[] = [];
    let offset = 0;
    const limit = 1000;
    while (true) {
      const res = await fetch(
        `${APIFY_BASE}/datasets/${datasetId}/items?token=${token}&limit=${limit}&offset=${offset}`
      );
      if (!res.ok) throw new Error(`Failed to fetch dataset: ${res.status}`);
      const items = await res.json();
      if (!Array.isArray(items) || items.length === 0) break;
      allReviews = allReviews.concat(items);
      offset += items.length;
      if (items.length < limit) break;
    }

    // Normalize and aggregate
    const normalized = normalizeBatchForPlatform(allReviews, competitor.platform as ReviewSource);
    const ratingScale = PLATFORM_CONFIG[competitor.platform as ReviewSource].ratingScale;
    const metrics = aggregateCompetitorMetrics(normalized, ratingScale);

    // Update competitor with metrics
    await query(
      `UPDATE competitor_hotels SET
        total_reviews = $1,
        avg_rating = $2,
        response_rate = $3,
        rating_distribution = $4,
        monthly_data = $5,
        last_scraped_at = NOW(),
        scrape_status = 'completed',
        scrape_error = NULL
      WHERE id = $6`,
      [
        metrics.totalReviews,
        metrics.avgRating,
        metrics.responseRate,
        JSON.stringify(metrics.ratingDistribution),
        JSON.stringify(metrics.monthlyData),
        competitorId,
      ]
    );

    // Store individual reviews for Elaine to analyze
    // Clear old reviews first, then bulk insert
    await query("DELETE FROM competitor_reviews WHERE competitor_id = $1", [competitorId]);
    const scale = 10 / ratingScale;
    for (const r of normalized) {
      if (!r.likedText && !r.dislikedText) continue;
      await query(
        `INSERT INTO competitor_reviews
          (competitor_id, hotel_id, liked_text, disliked_text, rating, review_date,
           review_title, traveler_type, room_info, user_location, review_language, property_response)
        VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, $9, $10, $11, $12)`,
        [
          competitorId,
          competitor.hotel_id,
          r.likedText,
          r.dislikedText,
          r.rating != null ? Math.round(r.rating * scale * 10) / 10 : null,
          r.reviewDate,
          r.reviewTitle,
          r.travelerType,
          r.roomInfo,
          r.userLocation,
          r.reviewLanguage,
          r.propertyResponse,
        ]
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[competitor] Scrape failed for ${competitorId}:`, msg);
    await query(
      "UPDATE competitor_hotels SET scrape_status = 'failed', scrape_error = $1 WHERE id = $2",
      [msg.slice(0, 500), competitorId]
    );
  }
}

/**
 * Aggregate metrics from normalized reviews in-memory.
 * All ratings normalized to 0-10 scale.
 */
function aggregateCompetitorMetrics(
  reviews: { rating: number | null; reviewDate: string | null; propertyResponse: string | null }[],
  ratingScale: number
) {
  const scale = 10 / ratingScale; // e.g., Google (5-scale) → multiply by 2

  let ratingSum = 0;
  let ratingCount = 0;
  let respondedCount = 0;
  const distribution: Record<string, number> = {};
  const monthlyBuckets: Record<string, { ratings: number[]; responded: number; count: number }> = {};

  for (const r of reviews) {
    const normalizedRating = r.rating != null ? Math.round(r.rating * scale * 10) / 10 : null;
    const hasResponse = !!r.propertyResponse;

    if (normalizedRating != null) {
      ratingSum += normalizedRating;
      ratingCount++;
      // Distribution buckets: 1-2, 3-4, 5-6, 7-8, 9-10
      const bucket = Math.min(10, Math.max(1, Math.ceil(normalizedRating)));
      const key = String(bucket);
      distribution[key] = (distribution[key] || 0) + 1;
    }

    if (hasResponse) respondedCount++;

    if (r.reviewDate) {
      const month = r.reviewDate.slice(0, 7); // YYYY-MM
      if (!monthlyBuckets[month]) monthlyBuckets[month] = { ratings: [], responded: 0, count: 0 };
      monthlyBuckets[month].count++;
      if (normalizedRating != null) monthlyBuckets[month].ratings.push(normalizedRating);
      if (hasResponse) monthlyBuckets[month].responded++;
    }
  }

  const monthlyData: MonthlyDataPoint[] = Object.entries(monthlyBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      count: data.count,
      avgRating: data.ratings.length > 0
        ? Math.round((data.ratings.reduce((s, v) => s + v, 0) / data.ratings.length) * 10) / 10
        : null,
      responseRate: data.count > 0
        ? Math.round((data.responded / data.count) * 1000) / 10
        : null,
    }));

  return {
    totalReviews: reviews.length,
    avgRating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
    responseRate: reviews.length > 0
      ? Math.round((respondedCount / reviews.length) * 1000) / 10
      : null,
    ratingDistribution: distribution,
    monthlyData,
  };
}

/**
 * Build full benchmark comparison data (hotel + competitors).
 */
export async function getBenchmarkData(hotelId: string): Promise<{
  hotel: BenchmarkEntity;
  competitors: BenchmarkEntity[];
}> {
  // Hotel's own stats
  const hotelRow = await queryOne<{ name: string }>(
    "SELECT name FROM hotels WHERE id = $1",
    [hotelId]
  );

  const reviewStats = await queryOne<{
    total: number;
    avg_rating: number | null;
    responded: number;
  }>(
    `SELECT
      COUNT(*)::int AS total,
      ROUND(AVG(rating), 1) AS avg_rating,
      COUNT(*) FILTER (WHERE ai_response IS NOT NULL OR property_response IS NOT NULL)::int AS responded
    FROM raw_reviews WHERE hotel_id = $1`,
    [hotelId]
  );

  const hotelDistribution = await query<{ rating: number; count: number }>(
    `SELECT CEIL(rating)::int AS rating, COUNT(*)::int AS count
     FROM raw_reviews WHERE hotel_id = $1 AND rating IS NOT NULL
     GROUP BY CEIL(rating) ORDER BY rating`,
    [hotelId]
  );

  const hotelMonthly = await query<{
    month: string;
    count: number;
    avg_rating: number | null;
    responded: number;
  }>(
    `SELECT
      TO_CHAR(review_date, 'YYYY-MM') AS month,
      COUNT(*)::int AS count,
      ROUND(AVG(rating), 1) AS avg_rating,
      COUNT(*) FILTER (WHERE ai_response IS NOT NULL OR property_response IS NOT NULL)::int AS responded
    FROM raw_reviews WHERE hotel_id = $1 AND review_date IS NOT NULL
    GROUP BY TO_CHAR(review_date, 'YYYY-MM')
    ORDER BY month`,
    [hotelId]
  );

  const total = reviewStats?.total ?? 0;
  const hotel: BenchmarkEntity = {
    id: hotelId,
    name: hotelRow?.name ?? "Your Hotel",
    isYourHotel: true,
    avgRating: reviewStats?.avg_rating ? Number(reviewStats.avg_rating) : null,
    totalReviews: total,
    responseRate: total > 0
      ? Math.round(((reviewStats?.responded ?? 0) / total) * 1000) / 10
      : null,
    ratingDistribution: Object.fromEntries(
      hotelDistribution.map((r) => [String(r.rating), r.count])
    ),
    monthlyData: hotelMonthly.map((r) => ({
      month: r.month,
      count: r.count,
      avgRating: r.avg_rating ? Number(r.avg_rating) : null,
      responseRate: r.count > 0
        ? Math.round((r.responded / r.count) * 1000) / 10
        : null,
    })),
  };

  // Competitors
  const competitorRows = await getCompetitors(hotelId);
  const competitors: BenchmarkEntity[] = competitorRows
    .filter((c) => c.scrape_status === "completed")
    .map((c) => ({
      id: c.id,
      name: c.name,
      isYourHotel: false,
      avgRating: c.avg_rating ? Number(c.avg_rating) : null,
      totalReviews: c.total_reviews ?? 0,
      responseRate: c.response_rate ? Number(c.response_rate) : null,
      ratingDistribution: (c.rating_distribution as Record<string, number>) ?? {},
      monthlyData: (c.monthly_data as MonthlyDataPoint[]) ?? [],
    }));

  return { hotel, competitors };
}
