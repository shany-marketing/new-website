-- UpStar: Chain Manager support
-- Run after 015_embedding_large.sql
--
-- Introduces the chain_manager role and a user_hotels join table.
-- chain_manager users have 0 or more rows here; regular users still
-- use users.hotel_id for their single-hotel relationship.

-- Many-to-many: user ↔ hotels
CREATE TABLE IF NOT EXISTS user_hotels (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hotel_id    UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, hotel_id)
);

CREATE INDEX IF NOT EXISTS idx_user_hotels_user  ON user_hotels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_hotels_hotel ON user_hotels(hotel_id);

-- Seed: migrate existing users.hotel_id assignments into user_hotels
-- so the join table is the single source of truth going forward.
INSERT INTO user_hotels (user_id, hotel_id)
SELECT id, hotel_id
FROM users
WHERE hotel_id IS NOT NULL
ON CONFLICT DO NOTHING;
