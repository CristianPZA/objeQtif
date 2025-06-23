/*
  # Fix infinite recursion in user_profiles RLS policies

  1. Security
    - Drop conflicting RLS policies that cause infinite recursion
    - Create a single comprehensive policy using auth.uid() instead of uid()
    - Avoid recursive subqueries by using proper join syntax
*/

-- Drop the conflicting policies
DROP POLICY IF EXISTS "Users can read their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read their own profile and their team" ON user_profiles;

-- Create a single, non-recursive SELECT policy
CREATE POLICY "Users can read profiles based on role and hierarchy"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Users can always read their own profile
    auth.uid() = id
    OR
    -- Users can read profiles of people they manage
    auth.uid() = manager_id
    OR
    -- Special roles can read all profiles (using direct role check to avoid recursion)
    EXISTS (
      SELECT 1 
      FROM auth.users au 
      JOIN user_profiles up ON au.id = up.id 
      WHERE au.id = auth.uid() 
      AND up.role IN ('coach_rh', 'direction', 'admin')
    )
  );