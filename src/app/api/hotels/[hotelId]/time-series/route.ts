import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireHotelAccess } from "@/lib/auth";
import type { CategoryTimeSeries, MonthlyDataPoint, StaffActionEntry } from "@/lib/insights";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;

    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    // Build date filter
    const tsParams: unknown[] = [hotelId];
    let tsDateFilter = "";
    if (from && /^\d{4}-\d{2}$/.test(from)) {
      tsParams.push(from + "-01");
      tsDateFilter += ` AND cs.period_month >= $${tsParams.length}`;
    }
    if (to && /^\d{4}-\d{2}$/.test(to)) {
      tsParams.push(to + "-01");
      tsDateFilter += ` AND cs.period_month <= $${tsParams.length}`;
    }

    // Fetch monthly stats per category
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

    // Fetch staff actions (same date range)
    const saParams: unknown[] = [hotelId];
    let saDateFilter = "";
    if (from && /^\d{4}-\d{2}$/.test(from)) {
      saParams.push(from + "-01");
      saDateFilter += ` AND sa.period_month >= $${saParams.length}`;
    }
    if (to && /^\d{4}-\d{2}$/.test(to)) {
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

    // Group stats by category and build time series
    const categoryMap = new Map<string, { categoryId: string; sentiment: string; data: MonthlyDataPoint[] }>();
    const allMonths = new Set<string>();

    for (const row of statsRows) {
      allMonths.add(row.period_month);
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

    const timeSeries: CategoryTimeSeries[] = [];
    for (const [label, entry] of categoryMap) {
      timeSeries.push({
        category: label,
        categoryId: entry.categoryId,
        sentiment: entry.sentiment,
        monthlyData: entry.data,
        staffActions: actionsByCategory.get(label) ?? {},
      });
    }

    const availableMonths = [...allMonths].sort();

    return NextResponse.json({ timeSeries, availableMonths });
  } catch (error) {
    console.error("Time series GET error:", error);
    return NextResponse.json({ error: "Failed to fetch time series" }, { status: 500 });
  }
}
