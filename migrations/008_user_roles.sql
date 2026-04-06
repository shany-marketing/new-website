-- Add role column to users (default 'user', admin gets 'admin')
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Grant admin role to the seeded admin user
UPDATE users SET role = 'admin' WHERE email = 'admin@upstar.com';
