-- Ensure newer caddie profile columns exist so details are preserved after refresh.
ALTER TABLE caddies ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE caddies ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE caddies ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE caddies ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE caddies ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE caddies ADD COLUMN IF NOT EXISTS po_box TEXT;
ALTER TABLE caddies ADD COLUMN IF NOT EXISTS organization_club_id BIGINT REFERENCES clubs(id) ON DELETE SET NULL;

-- Prevent caddie overbooking for active booking statuses.
CREATE OR REPLACE FUNCTION prevent_caddie_overbooking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.caddie_name IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('pending', 'confirmed') THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM bookings b
    WHERE b.caddie_name = NEW.caddie_name
      AND b.date = NEW.date
      AND b.time = NEW.time
      AND b.status IN ('pending', 'confirmed')
      AND b.id <> COALESCE(NEW.id, -1)
  ) THEN
    RAISE EXCEPTION 'Caddie is already booked for this date and time';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_caddie_overbooking ON bookings;

CREATE TRIGGER trg_prevent_caddie_overbooking
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION prevent_caddie_overbooking();
