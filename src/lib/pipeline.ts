import { query, queryOne } from "./db";
import { computeBaselineStats } from "./stats";
import { runDecomposition } from "./decompose";
import { runConsensus } from "./consensus";
import { runMapping } from "./mapping";
import { runAggregation } from "./aggregate";
import { generateInsights } from "./insights";
import { generateEmbeddings } from "./embeddings";
import { updateStageProgress, type StageProgress } from "./pipeline-progress";

export type { StageProgress };
export { updateStageProgress };

/**
 * Check if a pipeline run would produce new results.
 * Returns false if no new reviews exist since the last completed pipeline run.
 */
export async function hasPendingWork(hotelId: string): Promise<boolean> {
  const result = await queryOne<{ has_work: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM raw_reviews r
      WHERE r.hotel_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM atomic_items ai WHERE ai.source_review_id = r.id
        )
    ) AS has_work
  `, [hotelId]);
  return result?.has_work ?? false;
}

export interface PipelineProgress {
  runId: string;
  status: "pending" | "running" | "completed" | "failed";
  currentStage: string | null;
  error?: string;
  startedAt: string;
  completedAt: string | null;
  stageProgress?: Record<string, StageProgress>;
}

const STAGES = [
  "baseline_stats",
  "decomposition",
  "embeddings",
  "consensus",
  "mapping",
  "aggregation",
  "insights",
] as const;

/**
 * Run the full 7-stage pipeline.
 * If `existingRunId` is provided, uses that pipeline_runs record instead of creating a new one.
 * This enables the API to return immediately while the pipeline runs in the background.
 */
export async function runFullPipeline(hotelId: string, existingRunId?: string): Promise<PipelineProgress> {
  let runId: string;
  let startedAt: string;

  if (existingRunId) {
    runId = existingRunId;
    const run = await queryOne<{ started_at: string }>(
      `SELECT started_at::text FROM pipeline_runs WHERE id = $1`,
      [existingRunId]
    );
    startedAt = run?.started_at ?? new Date().toISOString();
  } else {
    const run = await queryOne<{ id: string; started_at: string }>(
      `INSERT INTO pipeline_runs (hotel_id, status, current_stage)
       VALUES ($1, 'running', 'baseline_stats')
       RETURNING id, started_at::text`,
      [hotelId]
    );
    if (!run) throw new Error("Failed to create pipeline run");
    runId = run.id;
    startedAt = run.started_at;
  }

  try {
    // Stage 2: Baseline stats (pure SQL)
    await updateStage(runId, "baseline_stats");
    await updateStageProgress(runId, "baseline_stats", 0, 1);
    await computeBaselineStats(hotelId);
    await updateStageProgress(runId, "baseline_stats", 1, 1);

    // Stage 3: Decomposition (items_count updated inside runDecomposition)
    await updateStage(runId, "decomposition");
    await runDecomposition(hotelId, runId);

    // Embeddings: generate for newly decomposed items
    await updateStage(runId, "embeddings");
    await generateEmbeddings(hotelId, runId);

    // Stage 4: Consensus
    await updateStage(runId, "consensus");
    await runConsensus(hotelId, runId);

    // Stage 5: Mapping
    await updateStage(runId, "mapping");
    await runMapping(hotelId, runId);

    // Stage 6: Aggregation
    await updateStage(runId, "aggregation");
    await runAggregation(hotelId, runId);

    // Stage 7: Insights
    await updateStage(runId, "insights");
    const insightResult = await generateInsights(hotelId, runId);

    // Cache insights in pipeline_runs
    await query(
      `UPDATE pipeline_runs
       SET status = 'completed', completed_at = NOW(), insights_json = $1
       WHERE id = $2`,
      [JSON.stringify(insightResult), runId]
    );

    return {
      runId,
      status: "completed",
      currentStage: "insights",
      startedAt,
      completedAt: new Date().toISOString(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await query(
      `UPDATE pipeline_runs SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2`,
      [message, runId]
    );
    return {
      runId,
      status: "failed",
      currentStage: null,
      error: message,
      startedAt,
      completedAt: new Date().toISOString(),
    };
  }
}

async function updateStage(runId: string, stage: string) {
  await query(
    `UPDATE pipeline_runs SET current_stage = $1 WHERE id = $2`,
    [stage, runId]
  );
}

/**
 * Run an incremental pipeline (5 stages — skips consensus + insights).
 * Used by the weekly scheduler to cheaply process new reviews against existing categories.
 * If >15% of newly mapped items are classified as "other", flags the hotel for a full rerun.
 */
export async function runIncrementalPipeline(hotelId: string): Promise<PipelineProgress> {
  const run = await queryOne<{ id: string; started_at: string }>(
    `INSERT INTO pipeline_runs (hotel_id, status, current_stage)
     VALUES ($1, 'running', 'baseline_stats')
     RETURNING id, started_at::text`,
    [hotelId]
  );
  if (!run) throw new Error("Failed to create pipeline run");
  const { id: runId, started_at: startedAt } = run;

  try {
    // Stage 1: Baseline stats (fast SQL)
    await updateStage(runId, "baseline_stats");
    await updateStageProgress(runId, "baseline_stats", 0, 1);
    await computeBaselineStats(hotelId);
    await updateStageProgress(runId, "baseline_stats", 1, 1);

    // Stage 2: Decomposition (incremental — skips already-decomposed reviews)
    await updateStage(runId, "decomposition");
    await runDecomposition(hotelId, runId);

    // Stage 3: Embeddings (incremental — skips already-embedded items)
    await updateStage(runId, "embeddings");
    await generateEmbeddings(hotelId, runId);

    // Stage 4: Mapping to EXISTING categories (consensus is skipped entirely)
    const catCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM consensus_categories WHERE hotel_id = $1`,
      [hotelId]
    );

    if (parseInt(catCount?.count ?? "0") > 0) {
      await updateStage(runId, "mapping");
      const mappingResult = await runMapping(hotelId, runId);

      // Stage 5: Aggregation (recalculate monthly stats)
      await updateStage(runId, "aggregation");
      await runAggregation(hotelId, runId);

      // Flag hotel if too many items don't fit existing categories
      const otherPct = mappingResult.totalMapped > 0
        ? mappingResult.byClassification.other / mappingResult.totalMapped
        : 0;
      if (otherPct > 0.15 && mappingResult.totalMapped >= 20) {
        await query(
          `UPDATE hotels SET needs_full_pipeline = TRUE WHERE id = $1`,
          [hotelId]
        );
        console.log(`[incremental] Hotel ${hotelId}: ${Math.round(otherPct * 100)}% "other" — flagged for full pipeline rerun`);
      }
    } else {
      // No categories exist — flag for full pipeline
      await query(
        `UPDATE hotels SET needs_full_pipeline = TRUE WHERE id = $1`,
        [hotelId]
      );
      console.log(`[incremental] Hotel ${hotelId}: no consensus categories — flagged for full pipeline`);
    }

    await query(
      `UPDATE pipeline_runs SET status = 'completed', completed_at = NOW() WHERE id = $1`,
      [runId]
    );
    await query(
      `UPDATE hotels SET last_incremental_at = NOW() WHERE id = $1`,
      [hotelId]
    );

    return {
      runId,
      status: "completed",
      currentStage: "aggregation",
      startedAt,
      completedAt: new Date().toISOString(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await query(
      `UPDATE pipeline_runs SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2`,
      [message, runId]
    );
    return {
      runId,
      status: "failed",
      currentStage: null,
      error: message,
      startedAt,
      completedAt: new Date().toISOString(),
    };
  }
}

export async function getPipelineStatus(hotelId: string): Promise<PipelineProgress | null> {
  const run = await queryOne<{
    id: string;
    status: string;
    current_stage: string | null;
    error_message: string | null;
    started_at: string;
    completed_at: string | null;
    stage_progress: Record<string, StageProgress> | null;
  }>(
    `SELECT id, status, current_stage, error_message,
            started_at::text, completed_at::text, stage_progress
     FROM pipeline_runs
     WHERE hotel_id = $1
     ORDER BY started_at DESC
     LIMIT 1`,
    [hotelId]
  );

  if (!run) return null;

  return {
    runId: run.id,
    status: run.status as PipelineProgress["status"],
    currentStage: run.current_stage,
    error: run.error_message ?? undefined,
    startedAt: run.started_at,
    completedAt: run.completed_at,
    stageProgress: run.stage_progress ?? undefined,
  };
}

export { STAGES };
