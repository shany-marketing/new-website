import { query } from './db';
import { updateStageProgress } from './pipeline-progress';

// ── Types ───────────────────────────────────────────────────────────

export interface AggregationResult {
  totalRows: number;
  categoriesProcessed: number;
  monthsCovered: number;
}

// ── Main Function ───────────────────────────────────────────────────

/**
 * Stage 6: Temporal aggregation — pre-compute monthly stats per category.
 *
 * 1. Groups category_mappings (classification='category') by category_id + month
 * 2. Calculates item_count, total_items (all items that month with same sentiment), share_pct
 * 3. Joins raw_reviews via atomic_items for avg_rating
 * 4. Calculates mom_delta by comparing to previous month's share_pct
 * 5. UPSERTs into category_stats
 */
export async function runAggregation(
  hotelId: string,
  pipelineRunId: string
): Promise<AggregationResult> {
  await query(
    `UPDATE pipeline_runs SET current_stage = 'aggregation' WHERE id = $1`,
    [pipelineRunId]
  );

  await updateStageProgress(pipelineRunId, "aggregation", 0, 1);

  // Clear stale stats for this hotel before recomputing
  await query(`DELETE FROM category_stats WHERE hotel_id = $1`, [hotelId]);

  // Single CTE-based query that computes everything and upserts
  const rows = await query<{ upserted: string }>(
    `WITH monthly_counts AS (
       -- Count items per category per month
       SELECT
         cm.category_id,
         DATE_TRUNC('month', cm.check_out_date)::date AS period_month,
         COUNT(*)::int AS item_count
       FROM category_mappings cm
       WHERE cm.hotel_id = $1
         AND cm.classification = 'category'
         AND cm.category_id IS NOT NULL
         AND cm.check_out_date IS NOT NULL
       GROUP BY cm.category_id, DATE_TRUNC('month', cm.check_out_date)
     ),
     monthly_totals AS (
       -- Total items per sentiment per month (for share_pct denominator)
       SELECT
         DATE_TRUNC('month', cm.check_out_date)::date AS period_month,
         cc.sentiment,
         COUNT(*)::int AS total_items
       FROM category_mappings cm
       JOIN consensus_categories cc ON cc.id = cm.category_id
       WHERE cm.hotel_id = $1
         AND cm.classification = 'category'
         AND cm.category_id IS NOT NULL
         AND cm.check_out_date IS NOT NULL
       GROUP BY DATE_TRUNC('month', cm.check_out_date), cc.sentiment
     ),
     monthly_ratings AS (
       -- Average rating per category per month (join through atomic_items → raw_reviews)
       SELECT
         cm.category_id,
         DATE_TRUNC('month', cm.check_out_date)::date AS period_month,
         ROUND(AVG(rr.rating), 1) AS avg_rating
       FROM category_mappings cm
       JOIN atomic_items ai ON ai.id = cm.atomic_item_id
       JOIN raw_reviews rr ON rr.id = ai.raw_review_id
       WHERE cm.hotel_id = $1
         AND cm.classification = 'category'
         AND cm.category_id IS NOT NULL
         AND cm.check_out_date IS NOT NULL
         AND rr.rating IS NOT NULL
       GROUP BY cm.category_id, DATE_TRUNC('month', cm.check_out_date)
     ),
     base_stats AS (
       SELECT
         mc.category_id,
         mc.period_month,
         mc.item_count,
         mt.total_items,
         CASE WHEN mt.total_items > 0
           THEN ROUND((mc.item_count::numeric / mt.total_items) * 100, 2)
           ELSE 0
         END AS share_pct,
         mr.avg_rating
       FROM monthly_counts mc
       JOIN consensus_categories cc ON cc.id = mc.category_id
       JOIN monthly_totals mt
         ON mt.period_month = mc.period_month
         AND mt.sentiment = cc.sentiment
       LEFT JOIN monthly_ratings mr
         ON mr.category_id = mc.category_id
         AND mr.period_month = mc.period_month
     ),
     with_delta AS (
       SELECT
         bs.*,
         ROUND(
           bs.share_pct - LAG(bs.share_pct) OVER (
             PARTITION BY bs.category_id ORDER BY bs.period_month
           ),
           2
         ) AS mom_delta
       FROM base_stats bs
     )
     INSERT INTO category_stats (hotel_id, category_id, period_month, item_count, total_items, share_pct, avg_rating, mom_delta)
     SELECT
       $1,
       wd.category_id,
       wd.period_month,
       wd.item_count,
       wd.total_items,
       wd.share_pct,
       wd.avg_rating,
       wd.mom_delta
     FROM with_delta wd
     ON CONFLICT (hotel_id, category_id, period_month)
     DO UPDATE SET
       item_count  = EXCLUDED.item_count,
       total_items = EXCLUDED.total_items,
       share_pct   = EXCLUDED.share_pct,
       avg_rating  = EXCLUDED.avg_rating,
       mom_delta   = EXCLUDED.mom_delta,
       updated_at  = NOW()
     RETURNING id::text AS upserted`,
    [hotelId]
  );

  // Gather summary info
  const summary = await query<{
    categories: string;
    months: string;
  }>(
    `SELECT
       COUNT(DISTINCT category_id)::text AS categories,
       COUNT(DISTINCT period_month)::text AS months
     FROM category_stats
     WHERE hotel_id = $1`,
    [hotelId]
  );

  await updateStageProgress(pipelineRunId, "aggregation", 1, 1);

  return {
    totalRows: rows.length,
    categoriesProcessed: summary[0] ? parseInt(summary[0].categories) : 0,
    monthsCovered: summary[0] ? parseInt(summary[0].months) : 0,
  };
}
