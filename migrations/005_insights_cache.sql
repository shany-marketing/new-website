ALTER TABLE pipeline_runs
  ADD COLUMN IF NOT EXISTS insights_json JSONB;
