import { query } from "./db";

export interface StageProgress {
  done: number;
  total: number;
}

export async function updateStageProgress(runId: string, stage: string, done: number, total: number) {
  await query(
    `UPDATE pipeline_runs
     SET stage_progress = jsonb_set(COALESCE(stage_progress, '{}'), $1, $2::jsonb)
     WHERE id = $3`,
    [`{${stage}}`, JSON.stringify({ done, total }), runId]
  );
}
