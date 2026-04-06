CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,           -- e.g. 'scrape_failure'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_notifications_undismissed ON admin_notifications (dismissed, created_at DESC) WHERE NOT dismissed;
