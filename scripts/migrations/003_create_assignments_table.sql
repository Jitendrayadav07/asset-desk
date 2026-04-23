-- Creates the assignments table tracking asset ↔ employee ownership history.
-- Each row is one "issue-and-return" cycle. An asset may only have one
-- active (unassigned_at IS NULL) assignment at a time — enforced by a
-- partial unique index.

CREATE TABLE IF NOT EXISTS assignments (
  id                 BIGSERIAL PRIMARY KEY,
  asset_id           BIGINT       NOT NULL REFERENCES assets(id)    ON DELETE RESTRICT,
  employee_id        BIGINT       NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  hostname           VARCHAR(255) NOT NULL,
  aid                VARCHAR(255) NOT NULL,
  note               TEXT         NULL,
  assigned_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  assigned_by        VARCHAR(255) NULL,
  unassigned_at      TIMESTAMPTZ  NULL,
  unassigned_reason  TEXT         NULL,
  unassigned_by      VARCHAR(255) NULL,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS assignments_one_active_per_asset
  ON assignments(asset_id) WHERE unassigned_at IS NULL;

CREATE INDEX IF NOT EXISTS assignments_by_employee ON assignments(employee_id);
CREATE INDEX IF NOT EXISTS assignments_by_asset    ON assignments(asset_id);
