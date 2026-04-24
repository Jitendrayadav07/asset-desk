-- Lookup tables (asset_types / asset_conditions / asset_statuses) never had a
-- UNIQUE index on `name`, so seeders using `ignoreDuplicates: true` silently
-- inserted fresh duplicate rows on each run. This migration:
--   1. Collapses duplicates per name (keeping the lowest id).
--   2. Rewrites any asset FK that points at a non-canonical row.
--   3. Adds a unique index on name so future seeder runs are actually
--      idempotent.

-- asset_types -------------------------------------------------------------
UPDATE assets
SET asset_type_id = sub.canonical_id
FROM (
  SELECT t.id AS old_id,
         (SELECT MIN(id) FROM asset_types WHERE name = t.name) AS canonical_id
  FROM asset_types t
) sub
WHERE assets.asset_type_id = sub.old_id
  AND sub.old_id <> sub.canonical_id;

DELETE FROM asset_types
WHERE id NOT IN (SELECT MIN(id) FROM asset_types GROUP BY name);

-- asset_conditions --------------------------------------------------------
UPDATE assets
SET asset_condition_id = sub.canonical_id
FROM (
  SELECT c.id AS old_id,
         (SELECT MIN(id) FROM asset_conditions WHERE name = c.name) AS canonical_id
  FROM asset_conditions c
) sub
WHERE assets.asset_condition_id IS NOT NULL
  AND assets.asset_condition_id = sub.old_id
  AND sub.old_id <> sub.canonical_id;

DELETE FROM asset_conditions
WHERE id NOT IN (SELECT MIN(id) FROM asset_conditions GROUP BY name);

-- asset_statuses ----------------------------------------------------------
UPDATE assets
SET asset_status_id = sub.canonical_id
FROM (
  SELECT s.id AS old_id,
         (SELECT MIN(id) FROM asset_statuses WHERE name = s.name) AS canonical_id
  FROM asset_statuses s
) sub
WHERE assets.asset_status_id IS NOT NULL
  AND assets.asset_status_id = sub.old_id
  AND sub.old_id <> sub.canonical_id;

DELETE FROM asset_statuses
WHERE id NOT IN (SELECT MIN(id) FROM asset_statuses GROUP BY name);

-- Prevent recurrence -----------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS asset_types_name_key      ON asset_types(name);
CREATE UNIQUE INDEX IF NOT EXISTS asset_conditions_name_key ON asset_conditions(name);
CREATE UNIQUE INDEX IF NOT EXISTS asset_statuses_name_key   ON asset_statuses(name);
