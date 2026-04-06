import { query } from './db';
import { updateStageProgress } from './pipeline-progress';
import { getTrackedOpenAI } from './ai-cost';

// ── Types ───────────────────────────────────────────────────────────

export interface CategoryInsight {
  category: string;
  sentiment: string;
  itemCount: number;
  sharePct: number;
  avgRating: number | null;
  trend: 'improving' | 'stable' | 'declining';
  momDelta: number;
  rootCause: string;
  actionItems: string[];
  exampleItems: string[];
}

export interface MonthlyDataPoint {
  month: string;
  sharePct: number;
  avgRating: number | null;
  momDelta: number | null;
  itemCount: number;
}

export interface StaffActionEntry {
  id: string;
  actionDate: string;
  staffName: string;
  description: string;
}

export interface CategoryTimeSeries {
  category: string;
  categoryId: string;
  sentiment: string;
  monthlyData: MonthlyDataPoint[];
  staffActions: Record<string, StaffActionEntry[]>;
}

export interface InsightResult {
  hotelId: string;
  generatedAt: string;
  executiveSummary: string;
  categoryInsights: CategoryInsight[];
}

// ── Helpers ─────────────────────────────────────────────────────────

// OpenAI client context set by generateInsights
let _insightsCtx: { hotelId: string; pipelineRunId: string } = { hotelId: '', pipelineRunId: '' };

function parseJSON<T>(raw: string): T {
  const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned);
}

// ── Data Fetching ───────────────────────────────────────────────────

interface TemporalRow {
  category_label: string;
  sentiment: string;
  period_month: string;
  item_count: number;
  total_items: number;
  share_pct: number;
  avg_rating: number | null;
  mom_delta: number | null;
}

interface SampleItem {
  category_label: string;
  item_text: string;
  rating: number | null;
}

async function fetchTemporalStats(hotelId: string): Promise<TemporalRow[]> {
  const rows = await query<{
    category_label: string;
    sentiment: string;
    period_month: string;
    item_count: string;
    total_items: string;
    share_pct: string;
    avg_rating: string | null;
    mom_delta: string | null;
  }>(
    `SELECT
       cc.label AS category_label,
       cc.sentiment,
       cs.period_month::text,
       cs.item_count::text,
       cs.total_items::text,
       cs.share_pct::text,
       cs.avg_rating::text,
       cs.mom_delta::text
     FROM category_stats cs
     JOIN consensus_categories cc ON cc.id = cs.category_id
     WHERE cs.hotel_id = $1
     ORDER BY cc.label, cs.period_month`,
    [hotelId]
  );

  return rows.map((r) => ({
    category_label: r.category_label,
    sentiment: r.sentiment,
    period_month: r.period_month,
    item_count: parseInt(r.item_count),
    total_items: parseInt(r.total_items),
    share_pct: parseFloat(r.share_pct),
    avg_rating: r.avg_rating ? parseFloat(r.avg_rating) : null,
    mom_delta: r.mom_delta ? parseFloat(r.mom_delta) : null,
  }));
}

async function fetchSampleItems(hotelId: string, perCategory: number = 5): Promise<SampleItem[]> {
  const rows = await query<{
    category_label: string;
    item_text: string;
    rating: string | null;
  }>(
    `WITH deduped AS (
       SELECT DISTINCT ON (cc.label, ai.text)
         cc.label AS category_label,
         ai.text AS item_text,
         rr.rating,
         cm.confidence
       FROM category_mappings cm
       JOIN atomic_items ai ON ai.id = cm.atomic_item_id
       JOIN raw_reviews rr ON rr.id = ai.raw_review_id
       JOIN consensus_categories cc ON cc.id = cm.category_id
       WHERE cm.hotel_id = $1
         AND cm.classification = 'category'
         AND cm.category_id IS NOT NULL
       ORDER BY cc.label, ai.text, cm.confidence DESC
     ),
     ranked AS (
       SELECT *, ROW_NUMBER() OVER (PARTITION BY category_label ORDER BY confidence DESC) AS rn
       FROM deduped
     )
     SELECT category_label, item_text, rating::text FROM ranked WHERE rn <= $2`,
    [hotelId, perCategory]
  );

  return rows.map((r) => ({
    category_label: r.category_label,
    item_text: r.item_text,
    rating: r.rating ? parseFloat(r.rating) : null,
  }));
}

// ── Context Builder ─────────────────────────────────────────────────

interface CategoryContext {
  label: string;
  sentiment: string;
  latestSharePct: number;
  latestMomDelta: number | null;
  totalItemCount: number;
  avgRating: number | null;
  monthlyTrend: Array<{ month: string; sharePct: number; momDelta: number | null }>;
  examples: string[];
}

function buildCategoryContexts(
  temporalStats: TemporalRow[],
  sampleItems: SampleItem[]
): CategoryContext[] {
  // Group temporal stats by category
  const byCategory = new Map<string, TemporalRow[]>();
  for (const row of temporalStats) {
    const existing = byCategory.get(row.category_label) ?? [];
    existing.push(row);
    byCategory.set(row.category_label, existing);
  }

  // Group sample items by category
  const samplesByCategory = new Map<string, string[]>();
  for (const item of sampleItems) {
    const existing = samplesByCategory.get(item.category_label) ?? [];
    existing.push(item.item_text);
    samplesByCategory.set(item.category_label, existing);
  }

  // Pre-compute total items per sentiment across ALL months for overall share
  const totalBySentiment = new Map<string, number>();
  for (const [, rows] of byCategory) {
    const sentiment = rows[0].sentiment;
    const catTotal = rows.reduce((sum, r) => sum + r.item_count, 0);
    totalBySentiment.set(sentiment, (totalBySentiment.get(sentiment) ?? 0) + catTotal);
  }

  const contexts: CategoryContext[] = [];
  for (const [label, rows] of byCategory) {
    const sorted = rows.sort(
      (a, b) => new Date(a.period_month).getTime() - new Date(b.period_month).getTime()
    );
    const latest = sorted[sorted.length - 1];
    const totalItemCount = sorted.reduce((sum, r) => sum + r.item_count, 0);

    // Overall share across all months (not just latest month)
    const sentimentTotal = totalBySentiment.get(latest.sentiment) ?? 1;
    const overallSharePct = Math.round((totalItemCount / sentimentTotal) * 10000) / 100;

    // Weighted avg rating across months
    const ratedRows = sorted.filter((r) => r.avg_rating !== null);
    const avgRating =
      ratedRows.length > 0
        ? Math.round(
            (ratedRows.reduce((sum, r) => sum + r.avg_rating! * r.item_count, 0) /
              ratedRows.reduce((sum, r) => sum + r.item_count, 0)) *
              10
          ) / 10
        : null;

    contexts.push({
      label,
      sentiment: latest.sentiment,
      latestSharePct: overallSharePct,
      latestMomDelta: latest.mom_delta,
      totalItemCount,
      avgRating,
      monthlyTrend: sorted.map((r) => ({
        month: r.period_month,
        sharePct: r.share_pct,
        momDelta: r.mom_delta,
      })),
      examples: [...new Set(samplesByCategory.get(label) ?? [])],
    });
  }

  return contexts;
}

// ── Prompt ───────────────────────────────────────────────────────────

function buildInsightPrompt(categories: CategoryContext[]): string {
  const categoryBlocks = categories
    .map(
      (c) => `### ${c.label} (${c.sentiment})
- Total mentions: ${c.totalItemCount}
- Latest month share: ${c.latestSharePct}%
- MoM delta: ${c.latestMomDelta !== null ? `${c.latestMomDelta > 0 ? '+' : ''}${c.latestMomDelta}%` : 'N/A (first month)'}
- Avg rating of reviews mentioning this: ${c.avgRating ?? 'N/A'}
- Monthly trend: ${c.monthlyTrend.map((m) => `${m.month}: ${m.sharePct}%`).join(' → ')}
- Example guest comments:
${c.examples.map((e) => `  • "${e}"`).join('\n')}`
    )
    .join('\n\n');

  return categoryBlocks;
}

const INSIGHT_SYSTEM_PROMPT = `You are a senior hotel operations analyst. You receive structured data about guest review trends for a specific hotel, organized by category.

Your job: produce ACTIONABLE, DATA-DRIVEN insights that a hotel general manager can immediately act on.

## RULES:
1. Every recommendation MUST reference actual data from the input (percentages, trends, specific guest quotes).
2. Be SPECIFIC to this hotel — never give generic hospitality advice like "train staff better" without connecting it to the data.
3. Root causes must be inferred from the combination of trend direction + guest examples.
4. Action items must be concrete operational directives (e.g., "Audit minibar pricing against competitor hotels within 2km" NOT "Review pricing strategy").
5. Trend classification:
   - "improving" = latest MoM delta < -2% for negative categories OR > +2% for positive categories
   - "declining" = latest MoM delta > +2% for negative categories OR < -2% for positive categories
   - "stable" = MoM delta between -2% and +2%, or only one month of data

## OUTPUT FORMAT:
Return a JSON object with:
{
  "executiveSummary": "2-3 sentence overview connecting the most important patterns",
  "categoryInsights": [
    {
      "category": "exact category label",
      "trend": "improving" | "stable" | "declining",
      "rootCause": "1-2 sentence specific root cause based on the data",
      "actionItems": ["specific action 1", "specific action 2"]
    }
  ]
}

Return ONLY valid JSON. No markdown fences, no explanation.`;

// ── Main Function ───────────────────────────────────────────────────

/**
 * Stage 7: LLM-powered insight generation.
 *
 * 1. Fetches temporal stats from category_stats
 * 2. Fetches sample atomic items per category
 * 3. Builds context prompt with real data
 * 4. GPT-5.4 generates per-category insights + executive summary
 */
export async function generateInsights(
  hotelId: string,
  pipelineRunId: string
): Promise<InsightResult> {
  await query(
    `UPDATE pipeline_runs SET current_stage = 'insights' WHERE id = $1`,
    [pipelineRunId]
  );

  await updateStageProgress(pipelineRunId, "insights", 0, 1);
  _insightsCtx = { hotelId, pipelineRunId };

  // Fetch data
  const [temporalStats, sampleItems] = await Promise.all([
    fetchTemporalStats(hotelId),
    fetchSampleItems(hotelId),
  ]);

  if (temporalStats.length === 0) {
    return {
      hotelId,
      generatedAt: new Date().toISOString(),
      executiveSummary: 'No temporal data available. Run aggregation first.',
      categoryInsights: [],
    };
  }

  // Build structured context
  const categoryContexts = buildCategoryContexts(temporalStats, sampleItems);
  const dataPrompt = buildInsightPrompt(categoryContexts);

  const response = await getTrackedOpenAI({ hotelId: _insightsCtx.hotelId, operation: 'insights', pipelineRunId: _insightsCtx.pipelineRunId }).chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: INSIGHT_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Analyze the following hotel review category data and generate insights:\n\n${dataPrompt}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('GPT returned empty response for insight generation');
  }

  const parsed = parseJSON<{
    executiveSummary?: string;
    categoryInsights?: Array<{
      category: string;
      trend: string;
      rootCause: string;
      actionItems: string[];
    }>;
  }>(content);

  // Merge LLM output with our structured data
  const categoryInsights: CategoryInsight[] = categoryContexts.map((ctx) => {
    const llmInsight = parsed.categoryInsights?.find(
      (i) => i.category.toLowerCase() === ctx.label.toLowerCase()
    );

    const trend = validateTrend(llmInsight?.trend);

    return {
      category: ctx.label,
      sentiment: ctx.sentiment,
      itemCount: ctx.totalItemCount,
      sharePct: ctx.latestSharePct,
      avgRating: ctx.avgRating,
      trend,
      momDelta: ctx.latestMomDelta ?? 0,
      rootCause: llmInsight?.rootCause ?? 'Insufficient data for root cause analysis.',
      actionItems: llmInsight?.actionItems ?? [],
      exampleItems: ctx.examples,
    };
  });

  await updateStageProgress(pipelineRunId, "insights", 1, 1);

  return {
    hotelId,
    generatedAt: new Date().toISOString(),
    executiveSummary:
      parsed.executiveSummary ?? 'Unable to generate executive summary.',
    categoryInsights,
  };
}

function validateTrend(trend: string | undefined): 'improving' | 'stable' | 'declining' {
  if (trend === 'improving' || trend === 'stable' || trend === 'declining') {
    return trend;
  }
  return 'stable';
}
