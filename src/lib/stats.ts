import { query } from './db';

export interface GuestCombination {
  location: string;
  travelerType: string;
  count: number;
  avgRating: number;
}

export interface NightOriginEntry {
  nights: number;
  location: string;
  count: number;
  avgRating: number;
  sharePct: number;
}

export interface ReviewComposition {
  hasLiked: boolean;
  hasDisliked: boolean;
  hasTitle: boolean;
  count: number;
  avgRating: number;
}

export interface PlatformMixEntry {
  platform: string;
  count: number;
}

export interface HeatmapEntry {
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  month: number;     // 1-12
  count: number;
}

export interface ReviewDepthStats {
  totalWithText: number;
  avgWordCount: number;
  shortCount: number;   // <20 words
  mediumCount: number;   // 20-49 words
  longCount: number;     // 50-99 words
  detailedCount: number; // 100+ words
}

export interface LanguageBreakdownEntry {
  language: string;
  count: number;
}

export interface PlatformHealthEntry {
  platform: string;
  currentMonthCount: number;
  priorMonthCount: number;
  countChange: number;
  currentAvgRating: number | null;
  priorAvgRating: number | null;
  ratingChange: number | null;
}

export interface BaselineStats {
  totalReviews: number;
  dateRange: { earliest: string | null; latest: string | null };
  avgRating: number | null;
  medianRating: number | null;
  ratingDistribution: { rating: number; count: number }[];
  byTravelerType: { travelerType: string; count: number; avgRating: number }[];
  byRoomInfo: { roomInfo: string; count: number; avgRating: number }[];
  byUserLocation: { userLocation: string; count: number; avgRating: number }[];
  monthlyVolume: { month: string; count: number; avgRating: number }[];
  guestCombinations: GuestCombination[];
  nightOrigins: NightOriginEntry[];
  reviewComposition: ReviewComposition[];
  platformMix: PlatformMixEntry[];
  reviewHeatmap: HeatmapEntry[];
  reviewDepth: ReviewDepthStats | null;
  responseRate: { respondedCount: number; totalCount: number; percent: number };
  reviewVelocity: { recentCount: number; priorCount: number; percentChange: number | null; periodLabel: string };
  byLanguage: LanguageBreakdownEntry[];
  platformHealth: PlatformHealthEntry[];
}

/**
 * Stage 2: Deterministic baseline statistics.
 * Pure SQL aggregations — no AI, no probabilities.
 * Optional startMonth/endMonth (YYYY-MM) to filter by review_date.
 */
export async function computeBaselineStats(
  hotelId: string,
  startMonth?: string,
  endMonth?: string
): Promise<BaselineStats> {
  // Build date filter clause + params
  const baseParams: unknown[] = [hotelId];
  let dateFilter = "";
  if (startMonth) {
    baseParams.push(startMonth + "-01");
    dateFilter += ` AND review_date >= $${baseParams.length}`;
  }
  if (endMonth) {
    // End of month: first day of next month
    const [y, m] = endMonth.split("-").map(Number);
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    baseParams.push(next);
    dateFilter += ` AND review_date < $${baseParams.length}`;
  }

  const [totals] = await query<{
    total: string;
    earliest: string | null;
    latest: string | null;
    avg_rating: string | null;
  }>(
    `SELECT
       COUNT(*)::text AS total,
       MIN(check_out_date)::text AS earliest,
       MAX(check_out_date)::text AS latest,
       ROUND(AVG(rating), 2)::text AS avg_rating
     FROM raw_reviews WHERE hotel_id = $1${dateFilter}`,
    [...baseParams]
  );

  // Prefer the official platform rating (from latest review) over computed AVG
  const [officialRating] = await query<{ hotel_rating: string | null }>(
    `SELECT hotel_rating::text FROM raw_reviews
     WHERE hotel_id = $1 AND hotel_rating IS NOT NULL${dateFilter}
     ORDER BY review_date DESC NULLS LAST LIMIT 1`,
    [...baseParams]
  );

  const [median] = await query<{ median: string | null }>(
    `SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY rating)::text AS median
     FROM raw_reviews WHERE hotel_id = $1 AND rating IS NOT NULL${dateFilter}`,
    [...baseParams]
  );

  const ratingDist = await query<{ rating: string; count: string }>(
    `SELECT ROUND(rating)::text AS rating, COUNT(*)::text AS count
     FROM raw_reviews WHERE hotel_id = $1 AND rating IS NOT NULL${dateFilter}
     GROUP BY ROUND(rating) ORDER BY ROUND(rating)`,
    [...baseParams]
  );

  const byTraveler = await query<{ traveler_type: string; count: string; avg_rating: string }>(
    `SELECT traveler_type, COUNT(*)::text AS count, ROUND(AVG(rating), 2)::text AS avg_rating
     FROM raw_reviews WHERE hotel_id = $1 AND traveler_type IS NOT NULL${dateFilter}
     GROUP BY traveler_type ORDER BY COUNT(*) DESC`,
    [...baseParams]
  );

  const byRoom = await query<{ room_info: string; count: string; avg_rating: string }>(
    `SELECT room_info, COUNT(*)::text AS count, ROUND(AVG(rating), 2)::text AS avg_rating
     FROM raw_reviews WHERE hotel_id = $1 AND room_info IS NOT NULL${dateFilter}
     GROUP BY room_info ORDER BY COUNT(*) DESC`,
    [...baseParams]
  );

  const byLocation = await query<{ user_location: string; count: string; avg_rating: string }>(
    `SELECT user_location, COUNT(*)::text AS count, ROUND(AVG(rating), 2)::text AS avg_rating
     FROM raw_reviews WHERE hotel_id = $1 AND user_location IS NOT NULL${dateFilter}
     GROUP BY user_location ORDER BY COUNT(*) DESC LIMIT 20`,
    [...baseParams]
  );

  const monthly = await query<{ month: string; count: string; avg_rating: string }>(
    `SELECT TO_CHAR(check_out_date, 'YYYY-MM') AS month,
            COUNT(*)::text AS count,
            ROUND(AVG(rating), 2)::text AS avg_rating
     FROM raw_reviews WHERE hotel_id = $1 AND check_out_date IS NOT NULL${dateFilter}
     GROUP BY TO_CHAR(check_out_date, 'YYYY-MM')
     ORDER BY month`,
    [...baseParams]
  );

  // Guest combinations: location × traveler type
  const combos = await query<{
    location: string; traveler_type: string; count: string; avg_rating: string;
  }>(
    `SELECT user_location AS location, traveler_type, COUNT(*)::text AS count,
            ROUND(AVG(rating), 2)::text AS avg_rating
     FROM raw_reviews
     WHERE hotel_id = $1 AND user_location IS NOT NULL AND traveler_type IS NOT NULL${dateFilter}
     GROUP BY user_location, traveler_type
     ORDER BY COUNT(*) DESC LIMIT 50`,
    [...baseParams]
  );

  // Night-origin distribution
  const nightOriginRaw = await query<{
    nights: string; location: string; count: string; avg_rating: string;
  }>(
    `SELECT number_of_nights::text AS nights, user_location AS location,
            COUNT(*)::text AS count, ROUND(AVG(rating), 2)::text AS avg_rating
     FROM raw_reviews
     WHERE hotel_id = $1 AND number_of_nights IS NOT NULL AND user_location IS NOT NULL${dateFilter}
     GROUP BY number_of_nights, user_location
     ORDER BY number_of_nights, COUNT(*) DESC`,
    [...baseParams]
  );

  // Compute sharePct per night group
  const nightTotals: Record<number, number> = {};
  for (const r of nightOriginRaw) {
    const n = parseInt(r.nights);
    nightTotals[n] = (nightTotals[n] ?? 0) + parseInt(r.count);
  }
  const nightOrigins: NightOriginEntry[] = nightOriginRaw.map(r => {
    const n = parseInt(r.nights);
    const cnt = parseInt(r.count);
    return {
      nights: n,
      location: r.location,
      count: cnt,
      avgRating: parseFloat(r.avg_rating),
      sharePct: nightTotals[n] > 0 ? Math.round((cnt / nightTotals[n]) * 10000) / 100 : 0,
    };
  });

  // Review composition: text vs non-text breakdown
  const composition = await query<{
    has_liked: boolean; has_disliked: boolean; has_title: boolean;
    count: string; avg_rating: string;
  }>(
    `SELECT
       (liked_text IS NOT NULL AND liked_text != '') AS has_liked,
       (disliked_text IS NOT NULL AND disliked_text != '') AS has_disliked,
       (review_title IS NOT NULL AND review_title != '') AS has_title,
       COUNT(*)::text AS count,
       ROUND(AVG(rating), 2)::text AS avg_rating
     FROM raw_reviews WHERE hotel_id = $1${dateFilter}
     GROUP BY has_liked, has_disliked, has_title
     ORDER BY COUNT(*) DESC`,
    [...baseParams]
  );

  // Platform mix: review counts by source
  const platformRows = await query<{ source: string; count: string }>(
    `SELECT COALESCE(source, 'booking') AS source, COUNT(*)::text AS count
     FROM raw_reviews WHERE hotel_id = $1${dateFilter}
     GROUP BY COALESCE(source, 'booking')
     ORDER BY COUNT(*) DESC`,
    [...baseParams]
  );

  // Review heatmap: day-of-week × month
  const heatmapRows = await query<{ dow: string; mon: string; count: string }>(
    `SELECT EXTRACT(DOW FROM review_date)::text AS dow,
            EXTRACT(MONTH FROM review_date)::text AS mon,
            COUNT(*)::text AS count
     FROM raw_reviews
     WHERE hotel_id = $1 AND review_date IS NOT NULL${dateFilter}
     GROUP BY dow, mon
     ORDER BY dow, mon`,
    [...baseParams]
  );

  // Review depth: word count buckets (only for reviews with text)
  const depthRows = await query<{
    total_with_text: string; avg_word_count: string;
    short_count: string; medium_count: string;
    long_count: string; detailed_count: string;
  }>(
    `WITH word_counts AS (
       SELECT array_length(
         regexp_split_to_array(
           trim(COALESCE(liked_text, '') || ' ' || COALESCE(disliked_text, '')),
           '\\s+'
         ), 1
       ) AS word_count
       FROM raw_reviews
       WHERE hotel_id = $1
         AND ((liked_text IS NOT NULL AND liked_text != '')
           OR (disliked_text IS NOT NULL AND disliked_text != ''))${dateFilter}
     )
     SELECT
       COUNT(*)::text AS total_with_text,
       COALESCE(ROUND(AVG(word_count)), 0)::text AS avg_word_count,
       COUNT(*) FILTER (WHERE word_count < 20)::text AS short_count,
       COUNT(*) FILTER (WHERE word_count >= 20 AND word_count < 50)::text AS medium_count,
       COUNT(*) FILTER (WHERE word_count >= 50 AND word_count < 100)::text AS long_count,
       COUNT(*) FILTER (WHERE word_count >= 100)::text AS detailed_count
     FROM word_counts`,
    [...baseParams]
  );

  const depth = depthRows.length > 0 && parseInt(depthRows[0].total_with_text) > 0
    ? {
        totalWithText: parseInt(depthRows[0].total_with_text),
        avgWordCount: parseInt(depthRows[0].avg_word_count),
        shortCount: parseInt(depthRows[0].short_count),
        mediumCount: parseInt(depthRows[0].medium_count),
        longCount: parseInt(depthRows[0].long_count),
        detailedCount: parseInt(depthRows[0].detailed_count),
      }
    : null;

  // Response rate
  const [responseRateRow] = await query<{ responded_count: string; total_count: string }>(
    `SELECT
       COUNT(CASE WHEN ai_response IS NOT NULL OR property_response IS NOT NULL THEN 1 END)::text AS responded_count,
       COUNT(*)::text AS total_count
     FROM raw_reviews WHERE hotel_id = $1${dateFilter}`,
    [...baseParams]
  );
  const respondedCount = parseInt(responseRateRow.responded_count);
  const totalCount = parseInt(responseRateRow.total_count);

  // Language breakdown
  const byLang = await query<{ review_language: string; count: string }>(
    `SELECT review_language, COUNT(*)::text AS count
     FROM raw_reviews WHERE hotel_id = $1 AND review_language IS NOT NULL${dateFilter}
     GROUP BY review_language ORDER BY COUNT(*) DESC LIMIT 20`,
    [...baseParams]
  );

  // Review velocity: compare recent vs prior period using already-fetched monthly data
  const sortedMonths = monthly
    .map(r => ({ month: r.month, count: parseInt(r.count) }))
    .sort((a, b) => a.month.localeCompare(b.month));

  let recentCount = 0;
  let priorCount = 0;
  let velocityPeriodLabel = "3 months";
  const totalMonths = sortedMonths.length;

  if (totalMonths >= 6) {
    const recent3 = sortedMonths.slice(-3);
    const prior3 = sortedMonths.slice(-6, -3);
    recentCount = recent3.reduce((s, m) => s + m.count, 0);
    priorCount = prior3.reduce((s, m) => s + m.count, 0);
  } else if (totalMonths >= 2) {
    const half = Math.floor(totalMonths / 2);
    const recent = sortedMonths.slice(half);
    const prior = sortedMonths.slice(0, half);
    recentCount = recent.reduce((s, m) => s + m.count, 0);
    priorCount = prior.reduce((s, m) => s + m.count, 0);
    velocityPeriodLabel = `${sortedMonths.length - half} month${sortedMonths.length - half > 1 ? "s" : ""}`;
  }

  const velocityPercentChange = priorCount > 0
    ? Math.round(((recentCount - priorCount) / priorCount) * 100)
    : null;

  // Platform health: current month vs prior month by platform
  const platformHealthRows = await query<{
    source: string; period: string; count: string; avg_rating: string | null;
  }>(
    `WITH months AS (
       SELECT DISTINCT TO_CHAR(review_date, 'YYYY-MM') AS m
       FROM raw_reviews WHERE hotel_id = $1 AND review_date IS NOT NULL${dateFilter}
       ORDER BY m DESC LIMIT 2
     )
     SELECT COALESCE(source, 'booking') AS source,
            TO_CHAR(review_date, 'YYYY-MM') AS period,
            COUNT(*)::text AS count,
            ROUND(AVG(rating), 2)::text AS avg_rating
     FROM raw_reviews
     WHERE hotel_id = $1 AND review_date IS NOT NULL${dateFilter}
       AND TO_CHAR(review_date, 'YYYY-MM') IN (SELECT m FROM months)
     GROUP BY source, period
     ORDER BY source, period`,
    [...baseParams]
  );

  const platformHealthMap = new Map<string, { current: { count: number; avgRating: number | null }; prior: { count: number; avgRating: number | null } }>();
  const allPeriods = [...new Set(platformHealthRows.map(r => r.period))].sort();
  const currentPeriod = allPeriods[allPeriods.length - 1] ?? "";
  const priorPeriod = allPeriods.length >= 2 ? allPeriods[allPeriods.length - 2] : "";

  for (const row of platformHealthRows) {
    if (!platformHealthMap.has(row.source)) {
      platformHealthMap.set(row.source, {
        current: { count: 0, avgRating: null },
        prior: { count: 0, avgRating: null },
      });
    }
    const entry = platformHealthMap.get(row.source)!;
    const bucket = row.period === currentPeriod ? "current" : "prior";
    entry[bucket] = {
      count: parseInt(row.count),
      avgRating: row.avg_rating ? parseFloat(row.avg_rating) : null,
    };
  }

  const platformHealth: PlatformHealthEntry[] = [];
  for (const [platform, data] of platformHealthMap) {
    const countChange = data.prior.count > 0
      ? Math.round(((data.current.count - data.prior.count) / data.prior.count) * 100)
      : 0;
    const ratingChange = data.current.avgRating != null && data.prior.avgRating != null
      ? Math.round((data.current.avgRating - data.prior.avgRating) * 100) / 100
      : null;
    platformHealth.push({
      platform,
      currentMonthCount: data.current.count,
      priorMonthCount: data.prior.count,
      countChange,
      currentAvgRating: data.current.avgRating,
      priorAvgRating: data.prior.avgRating,
      ratingChange,
    });
  }

  return {
    totalReviews: parseInt(totals.total),
    dateRange: { earliest: totals.earliest, latest: totals.latest },
    avgRating: officialRating?.hotel_rating
      ? parseFloat(officialRating.hotel_rating)
      : (totals.avg_rating ? parseFloat(totals.avg_rating) : null),
    medianRating: median.median ? parseFloat(median.median) : null,
    ratingDistribution: ratingDist.map(r => ({
      rating: parseFloat(r.rating),
      count: parseInt(r.count),
    })),
    byTravelerType: byTraveler.map(r => ({
      travelerType: r.traveler_type,
      count: parseInt(r.count),
      avgRating: parseFloat(r.avg_rating),
    })),
    byRoomInfo: byRoom.map(r => ({
      roomInfo: r.room_info,
      count: parseInt(r.count),
      avgRating: parseFloat(r.avg_rating),
    })),
    byUserLocation: byLocation.map(r => ({
      userLocation: r.user_location,
      count: parseInt(r.count),
      avgRating: parseFloat(r.avg_rating),
    })),
    monthlyVolume: monthly.map(r => ({
      month: r.month,
      count: parseInt(r.count),
      avgRating: parseFloat(r.avg_rating),
    })),
    guestCombinations: combos.map(r => ({
      location: r.location,
      travelerType: r.traveler_type,
      count: parseInt(r.count),
      avgRating: parseFloat(r.avg_rating),
    })),
    nightOrigins,
    reviewComposition: composition.map(r => ({
      hasLiked: r.has_liked,
      hasDisliked: r.has_disliked,
      hasTitle: r.has_title,
      count: parseInt(r.count),
      avgRating: parseFloat(r.avg_rating),
    })),
    platformMix: platformRows.map(r => ({
      platform: r.source,
      count: parseInt(r.count),
    })),
    reviewHeatmap: heatmapRows.map(r => ({
      dayOfWeek: parseInt(r.dow),
      month: parseInt(r.mon),
      count: parseInt(r.count),
    })),
    reviewDepth: depth,
    responseRate: {
      respondedCount,
      totalCount,
      percent: totalCount > 0 ? Math.round((respondedCount / totalCount) * 100) : 0,
    },
    reviewVelocity: {
      recentCount,
      priorCount,
      percentChange: velocityPercentChange,
      periodLabel: velocityPeriodLabel,
    },
    byLanguage: byLang.map(r => ({
      language: r.review_language,
      count: parseInt(r.count),
    })),
    platformHealth,
  };
}

/**
 * Strip rating data for lower-tier plans (defense-in-depth).
 * - free: nullify all avgRating, medianRating, ratingDistribution fields
 * - ratings / premium: full data
 */
export function sanitizeStatsForTier(
  stats: BaselineStats,
  plan: "free" | "ratings" | "premium"
): BaselineStats {
  if (plan !== "free") return stats;

  return {
    ...stats,
    avgRating: null,
    medianRating: null,
    ratingDistribution: [],
    byTravelerType: stats.byTravelerType.map(r => ({ ...r, avgRating: 0 })),
    byRoomInfo: stats.byRoomInfo.map(r => ({ ...r, avgRating: 0 })),
    byUserLocation: stats.byUserLocation.map(r => ({ ...r, avgRating: 0 })),
    monthlyVolume: stats.monthlyVolume.map(r => ({ ...r, avgRating: 0 })),
    guestCombinations: stats.guestCombinations.map(r => ({ ...r, avgRating: 0 })),
    nightOrigins: stats.nightOrigins.map(r => ({ ...r, avgRating: 0 })),
    reviewComposition: stats.reviewComposition.map(r => ({ ...r, avgRating: 0 })),
    platformHealth: stats.platformHealth.map(r => ({
      ...r,
      currentAvgRating: null,
      priorAvgRating: null,
      ratingChange: null,
    })),
  };
}
