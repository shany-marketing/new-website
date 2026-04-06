-- 035: In-app notifications + staff assignee notes

-- Add notes column to staff_action_assignees for per-assignee task notes
ALTER TABLE staff_action_assignees ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hotel_id    UUID REFERENCES hotels(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,  -- 'task_assigned', 'scrape_complete', 'rating_drop', 'budget_alert'
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  link        TEXT,           -- optional deep link path
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, created_at DESC) WHERE NOT read;
