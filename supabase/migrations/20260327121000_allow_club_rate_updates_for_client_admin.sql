BEGIN;

-- Allow the current client-side admin experience to persist club-rate edits.
-- NOTE: This supports the existing browser-admin model and can be tightened later
-- by moving updates behind a server-side admin endpoint.
DROP POLICY IF EXISTS "Public users can update club rates" ON clubs;

CREATE POLICY "Public users can update club rates"
  ON clubs
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

COMMIT;
