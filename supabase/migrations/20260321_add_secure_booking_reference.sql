-- Add a less-guessable but still copy-friendly booking reference.
-- Example format: APX-3F8A-7C2D

CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
  candidate TEXT;
BEGIN
  LOOP
    candidate := 'APX-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 4))
      || '-' || UPPER(SUBSTRING(MD5(CLOCK_TIMESTAMP()::TEXT || RANDOM()::TEXT), 1, 4));

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM bookings WHERE booking_reference = candidate
    );
  END LOOP;

  RETURN candidate;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS booking_reference TEXT;

UPDATE bookings
SET booking_reference = generate_booking_reference()
WHERE booking_reference IS NULL OR booking_reference = '';

ALTER TABLE bookings
ALTER COLUMN booking_reference SET DEFAULT generate_booking_reference();

ALTER TABLE bookings
ALTER COLUMN booking_reference SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'bookings_booking_reference_key'
  ) THEN
    CREATE UNIQUE INDEX bookings_booking_reference_key ON bookings(booking_reference);
  END IF;
END $$;
