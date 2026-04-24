-- Adds `role` to users for simple RBAC (admin / user).
-- Existing users had unrestricted access before this migration, so backfill
-- them as `admin` so nobody gets locked out. New users created after this
-- migration default to `user` and must be promoted explicitly.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(16) NOT NULL DEFAULT 'user'
    CHECK (role IN ('admin', 'user'));

UPDATE users SET role = 'admin' WHERE role = 'user';
