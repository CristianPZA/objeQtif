/*
  # Fix infinite recursion in user_profiles RLS policies

  1. Problem
    - The "Users can read profiles from same country" policy creates infinite recursion
    - It queries user_profiles table from within a policy on the same table
    - This causes all user_profiles queries to fail with recursion error

  2. Solution
    - Drop the problematic policy that causes recursion
    - Keep the essential policies for basic functionality
    - Users can still read their own profile and managers/coaches can read their team members

  3. Security
    - Maintains security by keeping user access to own profile
    - Keeps manager and coach access to their team members
    - Removes the country-based access that was causing recursion
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can read profiles from same country" ON user_profiles;

-- Ensure we have the essential policies for basic functionality
-- (These should already exist based on the schema, but we'll recreate them to be safe)

-- Users can read their own profile (essential for dashboard)
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can create their own profile
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Managers can read their team members' profiles
DROP POLICY IF EXISTS "Managers can read team profiles" ON user_profiles;
CREATE POLICY "Managers can read team profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid());

-- Coaches can read their coachees' profiles
DROP POLICY IF EXISTS "Coaches can read their coachees" ON user_profiles;
CREATE POLICY "Coaches can read their coachees"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid());

-- Admins can manage all profiles (using the is_admin() function)
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;
CREATE POLICY "Admins can delete profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Service role needs full access for system operations
DROP POLICY IF EXISTS "Service role full access" ON user_profiles;
CREATE POLICY "Service role full access"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public can create profiles (needed for user registration)
DROP POLICY IF EXISTS "Enable profile creation for public" ON user_profiles;
CREATE POLICY "Enable profile creation for public"
  ON user_profiles
  FOR INSERT
  TO public
  WITH CHECK (true);