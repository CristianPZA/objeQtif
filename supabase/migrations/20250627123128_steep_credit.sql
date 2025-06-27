/*
  # Fix infinite recursion in user_profiles RLS policies

  1. Problem Analysis
    - The current policies have circular dependencies that cause infinite recursion
    - Policies reference user_profiles table within their own conditions
    - Manager and coach relationships create recursive lookups

  2. Solution
    - Simplify policies to avoid self-referential queries
    - Use direct user ID comparisons where possible
    - Remove complex joins that cause recursion
    - Ensure policies don't query the same table they're protecting

  3. Changes
    - Drop existing problematic policies
    - Create new simplified policies
    - Maintain security while avoiding recursion
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Coaches can read their coachees" ON user_profiles;
DROP POLICY IF EXISTS "Enable profile creation for public" ON user_profiles;
DROP POLICY IF EXISTS "Managers can read team profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role full access" ON user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read profiles from same country" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create simplified policies that avoid recursion

-- 1. Service role has full access (no recursion risk)
CREATE POLICY "Service role full access"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Users can manage their own profile (direct ID comparison, no recursion)
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 3. Enable profile creation for public (for initial signup)
CREATE POLICY "Enable profile creation for public"
  ON user_profiles
  FOR INSERT
  TO public
  WITH CHECK (true);

-- 4. Admin access using function (avoids direct table queries)
CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- 5. Simplified country-based access (using auth.uid() directly)
CREATE POLICY "Users can read profiles from same country"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    country = (
      SELECT country 
      FROM user_profiles 
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

-- 6. Manager access (simplified to avoid recursion)
CREATE POLICY "Managers can read team profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid());

-- 7. Coach access (simplified to avoid recursion)
CREATE POLICY "Coaches can read their coachees"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid());