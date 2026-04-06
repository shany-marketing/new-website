-- 033: Staff members directory + enhanced staff actions + assignment junction

-- 1. Staff Members Directory
CREATE TABLE staff_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id   UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  position   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_members_hotel ON staff_members(hotel_id);
CREATE UNIQUE INDEX idx_staff_members_hotel_email ON staff_members(hotel_id, email);

-- 2. Enhance staff_actions with status, priority, due-date tracking
ALTER TABLE staff_actions
  ADD COLUMN due_date     DATE,
  ADD COLUMN status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed')),
  ADD COLUMN priority     TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  ADD COLUMN completed_at TIMESTAMPTZ,
  ADD COLUMN notes        TEXT;

CREATE INDEX idx_staff_actions_status ON staff_actions(hotel_id, status);
CREATE INDEX idx_staff_actions_due ON staff_actions(hotel_id, due_date) WHERE due_date IS NOT NULL;

-- 3. Staff Action Assignees junction table (many staff per action)
CREATE TABLE staff_action_assignees (
  staff_action_id UUID NOT NULL REFERENCES staff_actions(id) ON DELETE CASCADE,
  staff_member_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  notified_at     TIMESTAMPTZ,
  PRIMARY KEY (staff_action_id, staff_member_id)
);

CREATE INDEX idx_saa_member ON staff_action_assignees(staff_member_id);
