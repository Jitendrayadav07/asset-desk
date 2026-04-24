-- Audit log of every mutating action taken in the app. Writes are
-- fire-and-forget from application code so logging failures never block the
-- main request.
--
-- actor_user_id is nullable because some events (legacy / unauthenticated)
-- may lack one; actor_email / actor_role are denormalized so the log stays
-- readable even if a user is later deleted.

CREATE TABLE IF NOT EXISTS activities (
  id             BIGSERIAL PRIMARY KEY,
  actor_user_id  BIGINT       NULL REFERENCES users(id) ON DELETE SET NULL,
  actor_email    VARCHAR(255) NULL,
  actor_role     VARCHAR(16)  NULL,
  action         VARCHAR(64)  NOT NULL,
  entity_type    VARCHAR(32)  NOT NULL,
  entity_id      BIGINT       NULL,
  entity_label   TEXT         NULL,
  metadata       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activities_created_at_desc ON activities (created_at DESC);
CREATE INDEX IF NOT EXISTS activities_actor           ON activities (actor_user_id);
CREATE INDEX IF NOT EXISTS activities_entity          ON activities (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS activities_action          ON activities (action);
