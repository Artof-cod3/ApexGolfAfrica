BEGIN;

-- Restore minimal access needed by current frontend credential/OAuth login flow.
-- Note: this keeps write access restricted and only re-enables read lookup + login history insert.

DROP POLICY IF EXISTS "Public users can read admin users for login" ON admin_users;
CREATE POLICY "Public users can read admin users for login"
  ON admin_users
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public users can create admin login history" ON admin_login_history;
CREATE POLICY "Public users can create admin login history"
  ON admin_login_history
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

COMMIT;
