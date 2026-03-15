# ApexGolf Supabase Schema

This project now expects richer caddie profiles, login-history tracking, and super-admin deletion approvals.

## Recommended setup

### Existing database
1. Open Supabase SQL Editor.
2. Run [supabase/migrations/20260311_align_admin_workflows.sql](supabase/migrations/20260311_align_admin_workflows.sql).
3. Run [supabase/migrations/20260315_add_audit_trail.sql](supabase/migrations/20260315_add_audit_trail.sql).
4. Verify the new columns and tables exist.

### Fresh database
1. Run the full schema below in Supabase SQL Editor.
2. Optionally seed demo data from the seed section.

---

## Full schema

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS clubs (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  rate_per_player INTEGER NOT NULL DEFAULT 3500,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS caddies (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  experience TEXT NOT NULL,
  rating DECIMAL(2,1) DEFAULT 4.8,
  rounds INTEGER DEFAULT 0,
  top_rated BOOLEAN DEFAULT FALSE,
  initials TEXT NOT NULL,
  color TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  id_number TEXT,
  address TEXT,
  age INTEGER,
  po_box TEXT,
  organization_club_id BIGINT REFERENCES clubs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'super-admin')),
  can_edit_bookings BOOLEAN DEFAULT TRUE,
  can_manage_clubs BOOLEAN DEFAULT TRUE,
  can_manage_caddies BOOLEAN DEFAULT TRUE,
  can_manage_club_rates BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  nationality TEXT NOT NULL,
  club_name TEXT,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  players INTEGER NOT NULL CHECK (players > 0),
  caddie_name TEXT,
  equipment JSONB DEFAULT '[]'::jsonb,
  delivery JSONB NOT NULL DEFAULT '{"type": "standard", "cost": 0}'::jsonb,
  addons JSONB NOT NULL DEFAULT '{"photo": false, "video": false}'::jsonb,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON audit_trail(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_actor_email ON audit_trail(actor_email);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity_type ON audit_trail(entity_type);

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
```

---

## RLS / policies

The app currently relies on permissive policies while Supabase auth is only partially wired for admin actions.

```sql
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE caddies ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public users can read clubs" ON clubs FOR SELECT USING (true);
CREATE POLICY "Public users can read caddies" ON caddies FOR SELECT USING (true);

CREATE POLICY "Service role can do everything on clubs" ON clubs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything on caddies" ON caddies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything on admin_users" ON admin_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything on bookings" ON bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything on admin_login_history" ON admin_login_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything on deletion_requests" ON deletion_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can do everything on audit_trail" ON audit_trail FOR ALL USING (true) WITH CHECK (true);
```

If you already created policies manually, prefer the migration file because it adds them idempotently.

---

## Seed data

```sql
INSERT INTO clubs (name, location, rate_per_player) VALUES
  ('Karen Country Club', 'Karen, Nairobi', 3500),
  ('Muthaiga Golf Club', 'Muthaiga, Nairobi', 4500),
  ('Windsor Golf Club', 'Ridgeways, Nairobi', 4000),
  ('Limuru Country Club', 'Limuru', 3800),
  ('Thika Sports Club', 'Thika', 3500),
  ('Vetlab Sports Club', 'Kabete, Nairobi', 6000)
ON CONFLICT DO NOTHING;

INSERT INTO caddies (
  name, specialty, experience, rating, rounds, top_rated, initials, color,
  phone, email, id_number, address, age, po_box
) VALUES
  ('John Kamau', 'Course strategy & reading greens', '8 years', 4.9, 350, true, 'JK', 'bg-green-900', '0712345678', 'john@apexgolf.africa', '12345678', 'Karen, Nairobi', 31, '00100'),
  ('Peter Ochieng', 'Club selection & swing analysis', '6 years', 4.8, 280, false, 'PO', 'bg-blue-900', '0722334455', 'peter@apexgolf.africa', '23456789', 'Muthaiga, Nairobi', 29, '00200'),
  ('David Mwangi', 'Mental game coaching', '10 years', 4.9, 420, true, 'DM', 'bg-yellow-800', '0733445566', 'david@apexgolf.africa', '34567890', 'Limuru', 35, '20100')
ON CONFLICT DO NOTHING;

INSERT INTO admin_users (
  name, email, password, role,
  can_edit_bookings, can_manage_clubs, can_manage_caddies, can_manage_club_rates
) VALUES
  ('Super Admin', 'superadmin@apexgolf.africa', 'Super@2026', 'super-admin', true, true, true, true),
  ('Admin User', 'admin@apexgolf.africa', 'Apex@2026', 'admin', true, true, true, true)
ON CONFLICT (email) DO NOTHING;
```

---

## Expected tables

- `clubs`
- `caddies`
- `admin_users`
- `bookings`
- `admin_login_history`
- `deletion_requests`
- `audit_trail`

---

## Custom super-admin credentials

```sql
UPDATE admin_users
SET
  name = 'Super Admin',
  email = 'your-email@domain.com',
  password = 'YourCustomPassword123!'
WHERE role = 'super-admin';
```

If no super-admin row exists yet:

```sql
INSERT INTO admin_users (
  name, email, password, role,
  can_edit_bookings, can_manage_clubs, can_manage_caddies, can_manage_club_rates
)
VALUES (
  'Super Admin',
  'your-email@domain.com',
  'YourCustomPassword123!',
  'super-admin',
  true, true, true, true
)
ON CONFLICT (email) DO NOTHING;
```

Verify:

```sql
SELECT id, name, email, role
FROM admin_users
WHERE role = 'super-admin';
```
