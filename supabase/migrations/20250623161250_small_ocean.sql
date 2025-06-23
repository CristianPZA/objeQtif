/*
  # Fix infinite recursion in user_profiles RLS policies

  1. Problem
    - The "Users can read manager profile" policy creates infinite recursion
    - It queries user_profiles table from within a policy on the same table
    
  2. Solution
    - Remove the problematic policy that causes recursion
    - Simplify policies to avoid self-referencing queries
    - Keep essential policies for basic access control
    
  3. Security
    - Users can read their own profile
    - Users can read profiles of their direct reports (manager relationship)
    - Admins and service roles maintain full access
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can read manager profile" ON user_profiles;

-- Create a simpler policy for manager access that doesn't cause recursion
-- This allows users to read profiles where they are listed as the manager
CREATE POLICY "Managers can read direct reports"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (manager_id = uid());

-- Ensure we have a clean policy for users reading their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (uid() = id);

-- Ensure managers can read team profiles (this should already exist but let's make sure it's clean)
DROP POLICY IF EXISTS "Managers can read team profiles" ON user_profiles;
CREATE POLICY "Managers can read team profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (manager_id = uid());

-- Keep the service role policy for system operations
-- This should already exist but ensure it's properly defined
DROP POLICY IF EXISTS "Service role can access all profiles" ON user_profiles;
CREATE POLICY "Service role can access all profiles"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Keep the profile creation policies
DROP POLICY IF EXISTS "Enable profile creation" ON user_profiles;
CREATE POLICY "Enable profile creation"
  ON user_profiles
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (uid() = id);

-- Keep the update policy
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (uid() = id)
  WITH CHECK (uid() = id);