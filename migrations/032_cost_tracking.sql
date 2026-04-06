-- 032: AI cost tracking — per-call logging and monthly budget enforcement

CREATE TABLE ai_cost_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID REFERENCES hotels(id) ON DELETE SET NULL,
  provider        TEXT NOT NULL,
  model           TEXT NOT NULL,
  operation       TEXT NOT NULL,
  input_tokens    INTEGER NOT NULL DEFAULT 0,
  output_tokens   INTEGER NOT NULL DEFAULT 0,
  estimated_cost  NUMERIC(10,6) NOT NULL DEFAULT 0,
  pipeline_run_id UUID REFERENCES pipeline_runs(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cost_log_created ON ai_cost_log(created_at);
CREATE INDEX idx_cost_log_hotel ON ai_cost_log(hotel_id, created_at);

CREATE TABLE ai_budget (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_limit   NUMERIC(10,2) NOT NULL DEFAULT 100.00,
  hard_stop       BOOLEAN NOT NULL DEFAULT TRUE,
  alert_threshold NUMERIC(5,2) NOT NULL DEFAULT 80.00,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO ai_budget (monthly_limit, hard_stop, alert_threshold) VALUES (100.00, TRUE, 80.00);
