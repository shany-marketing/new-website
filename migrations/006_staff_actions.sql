-- Staff actions: track actions hotel staff take on specific issue categories
CREATE TABLE IF NOT EXISTS staff_actions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id     UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES consensus_categories(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  action_date  DATE NOT NULL,
  staff_name   TEXT NOT NULL,
  description  TEXT NOT NULL,
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_actions_hotel ON staff_actions(hotel_id);
CREATE INDEX idx_staff_actions_category ON staff_actions(category_id);
CREATE INDEX idx_staff_actions_lookup ON staff_actions(hotel_id, category_id, period_month);
