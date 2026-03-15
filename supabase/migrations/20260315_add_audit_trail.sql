-- Add audit trail support for admin and super-admin actions
-- Safe to run multiple times.

BEGIN;

CREATE TABLE IF NOT EXISTS audit_trail (
  id BIGSERIAL PRIMARY KEY,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('admin', 'super-admin')),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('booking', 'club', 'caddie', 'admin_user', 'deletion_request', 'auth', 'system')),
  entity_id BIGINT,
  entity_label TEXT,
  details TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON audit_trail(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_actor_email ON audit_trail(actor_email);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity_type ON audit_trail(entity_type);

ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_trail'
      AND policyname = 'Service role can do everything on audit_trail'
  ) THEN
    CREATE POLICY "Service role can do everything on audit_trail"
      ON audit_trail
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMIT;
