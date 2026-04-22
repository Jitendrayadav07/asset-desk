-- 001_create_skills.sql
-- Creates the `skills` table and the shared set_updated_at trigger function.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS skills (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  level       TEXT NOT NULL DEFAULT 'beginner'
              CHECK (level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_name ON skills (name);

DROP TRIGGER IF EXISTS trg_skills_set_updated_at ON skills;
CREATE TRIGGER trg_skills_set_updated_at
BEFORE UPDATE ON skills
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
