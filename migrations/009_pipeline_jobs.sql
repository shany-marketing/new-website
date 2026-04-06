-- Add a started_by column to track who triggered a pipeline run
ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS started_by UUID REFERENCES users(id);

-- Add 'embeddings' to the allowed current_stage values
ALTER TABLE pipeline_runs DROP CONSTRAINT IF EXISTS pipeline_runs_current_stage_check;
ALTER TABLE pipeline_runs ADD CONSTRAINT pipeline_runs_current_stage_check
  CHECK (current_stage IN (
    'ingestion', 'baseline_stats', 'decomposition', 'embeddings',
    'consensus', 'mapping', 'aggregation', 'insights'
  ));
