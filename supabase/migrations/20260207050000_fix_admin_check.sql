-- Fix is_admin() function to check by email instead of user_id
-- The admin_users table has email populated but user_id is NULL,
-- so we need to look up the user's email from auth.users and match against admin_users.email

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users au
    JOIN auth.users u ON u.email = au.email
    WHERE u.id = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also add a policy so authenticated users can check if their own email is in admin_users
-- This is needed because the middleware queries admin_users directly
DROP POLICY IF EXISTS "Users can check own admin status" ON admin_users;
CREATE POLICY "Users can check own admin status"
  ON admin_users FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
  );
