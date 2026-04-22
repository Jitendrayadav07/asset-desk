-- 002_create_users.sql
-- Creates the `users` table for Microsoft (and future Google/email) login.
-- login_type convention: 1 = email, 2 = google, 3 = microsoft

CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT,
  given_name    TEXT,
  family_name   TEXT,
  microsoft_id  TEXT UNIQUE,
  login_type    SMALLINT NOT NULL DEFAULT 3
                CHECK (login_type IN (1, 2, 3)),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email        ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_microsoft_id ON users (microsoft_id);

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
