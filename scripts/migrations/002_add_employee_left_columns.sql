-- Adds "left the job" lifecycle columns to `employees`.
-- Idempotent: uses IF NOT EXISTS so re-running is safe.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS left_at     TIMESTAMPTZ   NULL,
  ADD COLUMN IF NOT EXISTS left_reason TEXT          NULL,
  ADD COLUMN IF NOT EXISTS left_by     VARCHAR(255)  NULL;
