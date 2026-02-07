-- Fix admin_users RLS policy to use auth.jwt() instead of querying auth.users
-- Regular users don't have permission to read auth.users table
DROP POLICY IF EXISTS "Users can check own admin status" ON admin_users;
CREATE POLICY "Users can check own admin status"
  ON admin_users FOR SELECT
  USING (
    email = (SELECT auth.jwt() ->> 'email')
  );
