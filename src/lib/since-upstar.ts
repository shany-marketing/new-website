import { query, queryOne } from './db';

export interface PeriodMetrics {
  label: string;
  startMonth: string;
  endMonth: string;
  totalReviews: number;
  avgRating: number | null;
  positiveCount: number;
  negativeCount: number;
  positiveShare: number;
  complimentsPerComplaint: number;
}

export interface CategoryChange {
  category: string;
  categoryId: string;
  sentiment: string;
  beforePct: number;
  afterPct: number;
  changePct: number; // relative change e.g. -25 means 25% decrease
}

export interface SinceUpstarData {
  before: PeriodMetrics;
  after: PeriodMetrics;
  ratingJump: { before: number; after: number } | null;
  categoryChanges: CategoryChange[];
  improvedCount: number;
  totalNegCategories: number;
}

/**
 * Compute before/after UpStar metrics.
 * "Before" = first half of data months, "After" = second half.
 * This gives a meaningful comparison even without a fixed UpStar start date.
 */
export async function computeSinceUpstar(hotelId: string): Promise<SinceUpstarData | null> {
  // Get all distinct months with data
  const months = await query<{ month: string }>(
    `SELECT DISTINCT TO_CHAR(check_out_date, 'YYYY-MM') AS month
     FROM raw_reviews WHERE hotel_id = $1 AND check_out_date IS NOT NULL
     ORDER BY month`,
    [hotelId]
  );

  if (months.length < 2) return null;

  // Split into halves
  const midpoint = Math.floor(months.length / 2);
  const beforeMonths = months.slice(0, midpoint).map(m => m.month);
  const afterMonths = months.slice(midpoint).map(m => m.month);

  // Fetch metrics for each period
  async function getPeriodMetrics(monthList: string[], label: string): Promise<PeriodMetrics> {
    const placeholders = monthList.map((_, i) => `$${i + 2}`).join(',');
    const row = await queryOne<{
      total: string;
      avg_rating: string | null;
    }>(
      `SELECT COUNT(*)::text AS total, ROUND(AVG(rating), 2)::text AS avg_rating
       FROM raw_reviews WHERE hotel_id = $1
       AND TO_CHAR(check_out_date, 'YYYY-MM') IN (${placeholders})`,
      [hotelId, ...monthList]
    );

    // Get positive/negative counts from atomic items
    const sentimentRows = await query<{ sentiment: string; cnt: string }>(
      `SELECT ai.sentiment, COUNT(*)::text AS cnt
       FROM atomic_items ai
       JOIN raw_reviews rr ON rr.id = ai.raw_review_id
       WHERE ai.hotel_id = $1
       AND TO_CHAR(rr.check_out_date, 'YYYY-MM') IN (${placeholders})
       GROUP BY ai.sentiment`,
      [hotelId, ...monthList]
    );

    const posCount = parseInt(sentimentRows.find(r => r.sentiment === 'positive')?.cnt ?? '0');
    const negCount = parseInt(sentimentRows.find(r => r.sentiment === 'negative')?.cnt ?? '0');
    const posShare = (posCount + negCount) > 0 ? (posCount / (posCount + negCount)) * 100 : 0;
    const ratio = negCount > 0 ? posCount / negCount : 0;

    return {
      label,
      startMonth: monthList[0],
      endMonth: monthList[monthList.length - 1],
      totalReviews: parseInt(row?.total ?? '0'),
      avgRating: row?.avg_rating ? parseFloat(row.avg_rating) : null,
      positiveCount: posCount,
      negativeCount: negCount,
      positiveShare: Math.round(posShare * 10) / 10,
      complimentsPerComplaint: Math.round(ratio * 100) / 100,
    };
  }

  const before = await getPeriodMetrics(beforeMonths, 'Before UpStar');
  const after = await getPeriodMetrics(afterMonths, 'With UpStar');

  // Rating jump
  const ratingJump = (before.avgRating != null && after.avgRating != null)
    ? { before: before.avgRating, after: after.avgRating }
    : null;

  // Category changes: compare share_pct of negative categories between periods
  const beforeMonthDates = beforeMonths.map(m => `${m}-01`);
  const afterMonthDates = afterMonths.map(m => `${m}-01`);

  // Build parameterized placeholders: $1 = hotelId, $2..$N = beforeMonthDates, $N+1..$ = afterMonthDates
  let paramIdx = 2;
  const beforePlaceholders = beforeMonthDates.map(() => `$${paramIdx++}`).join(',');
  const afterPlaceholders = afterMonthDates.map(() => `$${paramIdx++}`).join(',');

  const categoryChanges = await query<{
    category: string;
    category_id: string;
    sentiment: string;
    before_pct: string | null;
    after_pct: string | null;
  }>(
    `SELECT
       cc.label AS category,
       cc.id::text AS category_id,
       cc.sentiment,
       b.avg_pct::text AS before_pct,
       a.avg_pct::text AS after_pct
     FROM consensus_categories cc
     LEFT JOIN (
       SELECT category_id, AVG(share_pct) AS avg_pct
       FROM category_stats
       WHERE hotel_id = $1 AND period_month IN (${beforePlaceholders})
       GROUP BY category_id
     ) b ON b.category_id = cc.id
     LEFT JOIN (
       SELECT category_id, AVG(share_pct) AS avg_pct
       FROM category_stats
       WHERE hotel_id = $1 AND period_month IN (${afterPlaceholders})
       GROUP BY category_id
     ) a ON a.category_id = cc.id
     WHERE cc.hotel_id = $1 AND cc.sentiment = 'negative'
     ORDER BY cc.label`,
    [hotelId, ...beforeMonthDates, ...afterMonthDates]
  );

  const changes: CategoryChange[] = categoryChanges
    .filter(r => r.before_pct != null || r.after_pct != null)
    .map(r => {
      const bPct = r.before_pct ? parseFloat(r.before_pct) : 0;
      const aPct = r.after_pct ? parseFloat(r.after_pct) : 0;
      const changePct = bPct > 0 ? ((aPct - bPct) / bPct) * 100 : 0;
      return {
        category: r.category,
        categoryId: r.category_id,
        sentiment: r.sentiment,
        beforePct: Math.round(bPct * 10) / 10,
        afterPct: Math.round(aPct * 10) / 10,
        changePct: Math.round(changePct * 10) / 10,
      };
    });

  const improvedCount = changes.filter(c => c.changePct < 0).length;

  return {
    before,
    after,
    ratingJump,
    categoryChanges: changes,
    improvedCount,
    totalNegCategories: changes.length,
  };
}
