-- Stage-level progress tracking for pipeline runs
ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS stage_progress JSONB DEFAULT '{}';
