-- Adds End-of-Life and Missing/Lost lifecycle tracking columns to `assets`.
-- Idempotent: uses IF NOT EXISTS so re-running is safe.

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS retired_at          TIMESTAMPTZ   NULL,
  ADD COLUMN IF NOT EXISTS retired_reason      TEXT          NULL,
  ADD COLUMN IF NOT EXISTS retired_by          VARCHAR(255)  NULL,
  ADD COLUMN IF NOT EXISTS missing_since       TIMESTAMPTZ   NULL,
  ADD COLUMN IF NOT EXISTS missing_reason      TEXT          NULL,
  ADD COLUMN IF NOT EXISTS last_known_location VARCHAR(255)  NULL,
  ADD COLUMN IF NOT EXISTS reported_by         VARCHAR(255)  NULL;
