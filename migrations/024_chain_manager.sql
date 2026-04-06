-- 024: Chain manager role
-- Adds chain_name to users and a join table for admin-controlled hotel access

ALTER TABLE users ADD COLUMN IF NOT EXISTS chain_name TEXT;

CREATE TABLE IF NOT EXISTS chain_hotel_access (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hotel_id   UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, hotel_id)
);

CREATE INDEX IF NOT EXISTS idx_chain_hotel_access_user ON chain_hotel_access(user_id);
CREATE INDEX IF NOT EXISTS idx_chain_hotel_access_hotel ON chain_hotel_access(hotel_id);

-- Allow chain-level Elaine conversations (no single hotel)
ALTER TABLE chat_conversations ALTER COLUMN hotel_id DROP NOT NULL;
