-- Adds the `is_used` lifetime flag to assets.
-- Flipped true the first time the asset is assigned to an employee and never
-- reverts. For existing rows, we backfill true wherever an assignment exists.

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS is_used BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE assets a
SET is_used = TRUE
WHERE EXISTS (SELECT 1 FROM assignments x WHERE x.asset_id = a.id);
