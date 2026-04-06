import { query, queryOne } from "@/lib/db";
import InsightsClient from "./insights-client";
import { checkFeatureAccess } from "@/lib/plan";
import type { InsightResult, CategoryTimeSeries, MonthlyDataPoint, StaffActionEntry } from "@/lib/insights";

interface Props {
  params: Promise<{ hotelId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function InsightsPage({ params, searchParams }: Props) {
  const { hotelId } = await params;
  const sp = await searchParams;
  const from = typeof sp.from === "string" ? sp.from : undefined;
  const to = typeof sp.to === "string" ? sp.to : undefined;

  const hasAccess = await checkFeatureAccess(hotelId, "insights_tab");

  let hotelName = "Hotel";
  let insightData: InsightResult | null = null;
  let timeSeries: CategoryTimeSeries[] = [];
  let availableMonths: string[] = [];
  let categories: Array<{ id: string; label: string; sentiment: string }> = [];

  try {
    const hotel = await queryOne<{ name: string }>(
      "SELECT name FROM hotels WHERE id = $1",
      [hotelId]
    );
    if (hotel) hotelName = hotel.name;

    // Fetch cached insights
    const run = await queryOne<{ insights_json: InsightResult }>(
      `SELECT insights_json
       FROM pipeline_runs
       WHERE hotel_id = $1 AND status = 'completed' AND insights_json IS NOT NULL
       ORDER BY completed_at DESC
       LIMIT 1`,
      [hotelId]
    );
    if (run?.insights_json) {
      insightData = run.insights_json;
    }

    // Fetch categories
    categories = await query<{ id: string; label: string; sentiment: string }>(
      `SELECT id::text, label, sentiment
       FROM consensus_categories
       WHERE hotel_id = $1
       ORDER BY label`,
      [hotelId]
    );

    // Build date filter for period_month
    const tsParams: unknown[] = [hotelId];
    let tsDateFilter = "";
    if (from) {
      tsParams.push(from + "-01");
      tsDateFilter += ` AND cs.period_month >= $${tsParams.length}`;
    }
    if (to) {
      tsParams.push(to + "-01");
      tsDateFilter += ` AND cs.period_month <= $${tsParams.length}`;
    }

    // Fetch monthly time series
    const statsRows = await query<{
      category_id: string;
      category_label: string;
      sentiment: string;
      period_month: string;
      item_count: string;
      share_pct: string;
      avg_rating: string | null;
      mom_delta: string | null;
    }>(
      `SELECT
         cc.id::text AS category_id,
         cc.label AS category_label,
         cc.sentiment,
         cs.period_month::text,
         cs.item_count::text,
         cs.share_pct::text,
         cs.avg_rating::text,
         cs.mom_delta::text
       FROM category_stats cs
       JOIN consensus_categories cc ON cc.id = cs.category_id
       WHERE cs.hotel_id = $1${tsDateFilter}
       ORDER BY cc.label, cs.period_month`,
      [...tsParams]
    );

    // Fetch staff actions (filter by period_month range too)
    const saParams: unknown[] = [hotelId];
    let saDateFilter = "";
    if (from) {
      saParams.push(from + "-01");
      saDateFilter += ` AND sa.period_month >= $${saParams.length}`;
    }
    if (to) {
      saParams.push(to + "-01");
      saDateFilter += ` AND sa.period_month <= $${saParams.length}`;
    }

    const actionRows = await query<{
      id: string;
      category_label: string;
      period_month: string;
      action_date: string;
      staff_name: string;
      description: string;
    }>(
      `SELECT sa.id::text, cc.label AS category_label,
              sa.period_month::text, sa.action_date::text,
              sa.staff_name, sa.description
       FROM staff_actions sa
       JOIN consensus_categories cc ON cc.id = sa.category_id
       WHERE sa.hotel_id = $1${saDateFilter}
       ORDER BY cc.label, sa.period_month, sa.action_date`,
      [...saParams]
    );

    // Group staff actions by category -> month
    const actionsByCategory = new Map<string, Record<string, StaffActionEntry[]>>();
    for (const row of actionRows) {
      if (!actionsByCategory.has(row.category_label)) {
        actionsByCategory.set(row.category_label, {});
      }
      const catActions = actionsByCategory.get(row.category_label)!;
      if (!catActions[row.period_month]) {
        catActions[row.period_month] = [];
      }
      catActions[row.period_month].push({
        id: row.id,
        actionDate: row.action_date,
        staffName: row.staff_name,
        description: row.description,
      });
    }

    // Build time series
    const categoryMap = new Map<string, { categoryId: string; sentiment: string; data: MonthlyDataPoint[] }>();
    const monthsSet = new Set<string>();

    for (const row of statsRows) {
      monthsSet.add(row.period_month);
      if (!categoryMap.has(row.category_label)) {
        categoryMap.set(row.category_label, {
          categoryId: row.category_id,
          sentiment: row.sentiment,
          data: [],
        });
      }
      categoryMap.get(row.category_label)!.data.push({
        month: row.period_month,
        sharePct: parseFloat(row.share_pct),
        avgRating: row.avg_rating ? parseFloat(row.avg_rating) : null,
        momDelta: row.mom_delta ? parseFloat(row.mom_delta) : null,
        itemCount: parseInt(row.item_count),
      });
    }

    for (const [label, entry] of categoryMap) {
      timeSeries.push({
        category: label,
        categoryId: entry.categoryId,
        sentiment: entry.sentiment,
        monthlyData: entry.data,
        staffActions: actionsByCategory.get(label) ?? {},
      });
    }

    availableMonths = [...monthsSet].sort();

    // Backfill avgRating and recompute sharePct from live category_stats data.
    // Cached insights_json may have stale per-month sharePct (100% when only
    // one category existed that month). Recompute as overall share across all months.
    if (insightData) {
      // Build lookups from live category_stats
      const ratingLookup = new Map<string, number>();
      const itemCountLookup = new Map<string, number>();
      const sentimentLookup = new Map<string, string>();
      for (const [label, entry] of categoryMap) {
        const totalItems = entry.data.reduce((s, d) => s + d.itemCount, 0);
        itemCountLookup.set(label, totalItems);
        sentimentLookup.set(label, entry.sentiment);
        const ratedRows = entry.data.filter(d => d.avgRating != null);
        if (ratedRows.length > 0) {
          const ratedTotal = ratedRows.reduce((s, d) => s + d.itemCount, 0);
          const weightedSum = ratedRows.reduce((s, d) => s + d.avgRating! * d.itemCount, 0);
          if (ratedTotal > 0) {
            ratingLookup.set(label, Math.round((weightedSum / ratedTotal) * 100) / 100);
          }
        }
      }

      // Total items per sentiment across all categories
      const totalBySentiment = new Map<string, number>();
      for (const [label, count] of itemCountLookup) {
        const s = sentimentLookup.get(label) ?? "unknown";
        totalBySentiment.set(s, (totalBySentiment.get(s) ?? 0) + count);
      }

      for (const insight of insightData.categoryInsights) {
        if (insight.avgRating == null) {
          insight.avgRating = ratingLookup.get(insight.category) ?? null;
        }
        // Recompute sharePct and itemCount from live category_stats data.
        // Categories not in the (possibly date-filtered) stats get zeroed out
        // so the UI doesn't mix stale cached totals with filtered-range values.
        const catItems = itemCountLookup.get(insight.category) ?? 0;
        const sentiment = sentimentLookup.get(insight.category);
        if (sentiment) {
          const sentimentTotal = totalBySentiment.get(sentiment) ?? 1;
          insight.sharePct = Math.round((catItems / sentimentTotal) * 10000) / 100;
          insight.itemCount = catItems;
        } else {
          insight.sharePct = 0;
          insight.itemCount = 0;
        }
        // Also backfill avgRating from live data when available
        const liveRating = ratingLookup.get(insight.category);
        if (liveRating != null) {
          insight.avgRating = liveRating;
        }
      }
    }
  } catch {
    // DB not available
  }

  return (
    <InsightsClient
      hotelId={hotelId}
      hotelName={hotelName}
      insightData={hasAccess ? insightData : null}
      timeSeries={hasAccess ? timeSeries : []}
      availableMonths={hasAccess ? availableMonths : []}
      categories={hasAccess ? categories : []}
      locked={!hasAccess}
    />
  );
}
