-- Align ApexGolf schema with enriched admin/caddie workflows
-- Safe to run against an existing project.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; 
$$ LANGUAGE plpgsql;

ALTER TABLE IF EXISTS clubs
  ADD COLUMN IF NOT EXISTS rate_per_player INTEGER NOT NULL DEFAULT 3500,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE IF EXISTS caddies
  ADD COLUMN IF NOT EXISTS specialty TEXT,
  ADD COLUMN IF NOT EXISTS experience TEXT,
  ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 4.8,
  ADD COLUMN IF NOT EXISTS rounds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS top_rated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS initials TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS id_number TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS po_box TEXT,
  ADD COLUMN IF NOT EXISTS organization_club_id BIGINT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE caddies
SET
  specialty = COALESCE(NULLIF(specialty, ''), 'General caddie support'),
  experience = COALESCE(NULLIF(experience, ''), 'Not specified'),
  rating = COALESCE(rating, 4.8),
  rounds = COALESCE(rounds, 0),
  top_rated = COALESCE(top_rated, FALSE),
  initials = COALESCE(NULLIF(initials, ''), UPPER(LEFT(SPLIT_PART(name, ' ', 1), 1) || LEFT(SPLIT_PART(name, ' ', 2), 1))),
  color = COALESCE(NULLIF(color, ''), 'bg-green-900')
WHERE TRUE;

ALTER TABLE caddies
  ALTER COLUMN specialty SET NOT NULL,
  ALTER COLUMN experience SET NOT NULL,
  ALTER COLUMN rating SET DEFAULT 4.8,
  ALTER COLUMN rounds SET DEFAULT 0,
  ALTER COLUMN top_rated SET DEFAULT FALSE,
  ALTER COLUMN initials SET NOT NULL,
  ALTER COLUMN color SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'caddies_organization_club_id_fkey'
  ) THEN
    ALTER TABLE caddies
      ADD CONSTRAINT caddies_organization_club_id_fkey
      FOREIGN KEY (organization_club_id) REFERENCES clubs(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS admin_users
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS can_edit_bookings BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS can_manage_clubs BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS can_manage_caddies BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS can_manage_club_rates BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_role_check'
  ) THEN
    ALTER TABLE admin_users
      ADD CONSTRAINT admin_users_role_check
      CHECK (role IN ('admin', 'super-admin'));
  END IF;
END $$;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS club_name TEXT,
  ADD COLUMN IF NOT EXISTS caddie_name TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS admin_login_history (
  id BIGSERIAL PRIMARY KEY,
  admin_id BIGINT REFERENCES admin_users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'super-admin')),
  login_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deletion_requests (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('booking', 'club', 'caddie')),
  entity_id BIGINT NOT NULL,
  entity_label TEXT NOT NULL,
  requested_by_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_caddies_organization_club_id ON caddies(organization_club_id);
CREATE INDEX IF NOT EXISTS idx_caddies_phone ON caddies(phone);
CREATE INDEX IF NOT EXISTS idx_caddies_email ON caddies(email);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(email);
CREATE INDEX IF NOT EXISTS idx_bookings_club_name ON bookings(club_name);
CREATE INDEX IF NOT EXISTS idx_bookings_caddie_name ON bookings(caddie_name);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_login_history_admin_id ON admin_login_history(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_login_history_email ON admin_login_history(email);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_entity ON deletion_requests(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_created_at ON deletion_requests(created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clubs_updated_at') THEN
    CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON clubs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_caddies_updated_at') THEN
    CREATE TRIGGER update_caddies_updated_at BEFORE UPDATE ON caddies
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_admin_users_updated_at') THEN
    CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bookings_updated_at') THEN
    CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE caddies ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clubs' AND policyname = 'Public users can read clubs'
  ) THEN
    CREATE POLICY "Public users can read clubs" ON clubs FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'caddies' AND policyname = 'Public users can read caddies'
  ) THEN
    CREATE POLICY "Public users can read caddies" ON caddies FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clubs' AND policyname = 'Service role can do everything on clubs'
  ) THEN
    CREATE POLICY "Service role can do everything on clubs" ON clubs FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'caddies' AND policyname = 'Service role can do everything on caddies'
  ) THEN
    CREATE POLICY "Service role can do everything on caddies" ON caddies FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_users' AND policyname = 'Service role can do everything on admin_users'
  ) THEN
    CREATE POLICY "Service role can do everything on admin_users" ON admin_users FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname = 'Service role can do everything on bookings'
  ) THEN
    CREATE POLICY "Service role can do everything on bookings" ON bookings FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_login_history' AND policyname = 'Service role can do everything on admin_login_history'
  ) THEN
    CREATE POLICY "Service role can do everything on admin_login_history" ON admin_login_history FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'deletion_requests' AND policyname = 'Service role can do everything on deletion_requests'
  ) THEN
    CREATE POLICY "Service role can do everything on deletion_requests" ON deletion_requests FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMIT;
