# ApexGolf Supabase Database Schema

This file contains the SQL schema to create all necessary tables in your Supabase database.

## Instructions:
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor (left sidebar)
3. Create a new query
4. Copy and paste the SQL below
5. Click "Run" to execute

---

## SQL Schema

```sql
-- ============================================
-- APEXGOLF DATABASE SCHEMA
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CLUBS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS clubs (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  rate_per_player INTEGER NOT NULL DEFAULT 3500,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CADDIES TABLE
-- ============================================
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ADMIN USERS TABLE
-- ============================================
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

-- ============================================
-- BOOKINGS TABLE
-- ============================================
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

-- ============================================
-- ADMIN LOGIN HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin_login_history (
  id BIGSERIAL PRIMARY KEY,
  admin_id BIGINT REFERENCES admin_users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  login_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(email);
CREATE INDEX IF NOT EXISTS idx_bookings_club_name ON bookings(club_name);
CREATE INDEX IF NOT EXISTS idx_bookings_caddie_name ON bookings(caddie_name);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_login_history_admin_id ON admin_login_history(admin_id);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON clubs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_caddies_updated_at BEFORE UPDATE ON caddies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE caddies ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_login_history ENABLE ROW LEVEL SECURITY;

-- Public read access for clubs and caddies (needed for booking form)
CREATE POLICY "Public users can read clubs" ON clubs
  FOR SELECT USING (true);

CREATE POLICY "Public users can read caddies" ON caddies
  FOR SELECT USING (true);

-- Admins can manage everything (you'll need to set up auth for this)
-- For now, allow all operations via service role key
CREATE POLICY "Service role can do everything on clubs" ON clubs
  FOR ALL USING (true);

CREATE POLICY "Service role can do everything on caddies" ON caddies
  FOR ALL USING (true);

CREATE POLICY "Service role can do everything on admin_users" ON admin_users
  FOR ALL USING (true);

CREATE POLICY "Service role can do everything on bookings" ON bookings
  FOR ALL USING (true);

CREATE POLICY "Service role can do everything on admin_login_history" ON admin_login_history
  FOR ALL USING (true);

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default clubs
INSERT INTO clubs (name, location, rate_per_player) VALUES
  ('Karen Country Club', 'Karen, Nairobi', 3500),
  ('Muthaiga Golf Club', 'Muthaiga, Nairobi', 4500),
  ('Windsor Golf Club', 'Ridgeways, Nairobi', 4000),
  ('Limuru Country Club', 'Limuru', 3800),
  ('Thika Sports Club', 'Thika', 3500),
  ('Vetlab Sports Club', 'Kabete, Nairobi', 6000)
ON CONFLICT DO NOTHING;

-- Insert default caddies
INSERT INTO caddies (name, specialty, experience, rating, rounds, top_rated, initials, color) VALUES
  ('John Kamau', 'Course strategy & reading greens', '8 years', 4.9, 350, true, 'JK', 'bg-green-900'),
  ('Peter Ochieng', 'Club selection & swing analysis', '6 years', 4.8, 280, false, 'PO', 'bg-blue-900'),
  ('David Mwangi', 'Mental game coaching', '10 years', 4.9, 420, true, 'DM', 'bg-yellow-800'),
  ('James Kipchoge', 'Short game specialist', '5 years', 4.7, 200, false, 'JK', 'bg-stone-800')
ON CONFLICT DO NOTHING;

-- Insert default admin users
-- Note: In production, passwords should be hashed!
INSERT INTO admin_users (name, email, password, role, can_edit_bookings, can_manage_clubs, can_manage_caddies, can_manage_club_rates) VALUES
  ('Super Admin', 'superadmin@apexgolf.africa', 'Super@2026', 'super-admin', true, true, true, true),
  ('Admin User', 'admin@apexgolf.africa', 'Apex@2026', 'admin', true, true, true, true)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify your data was inserted:
-- SELECT * FROM clubs;
-- SELECT * FROM caddies;
-- SELECT * FROM admin_users;
-- SELECT * FROM bookings;
```

---

## After Running the SQL:

1. **Verify Tables Created:**
   - Go to Table Editor in Supabase
   - You should see: `clubs`, `caddies`, `admin_users`, `bookings`, `admin_login_history`

2. **Check Seed Data:**
   - Click on each table to see the default clubs, caddies, and admin users

3. **Get Your API Keys:**
   - Go to Settings > API
   - Copy your `Project URL` and `anon public` key
   - Add them to your `.env` file

4. **Test Connection:**
   - The app will automatically connect once you add the credentials
