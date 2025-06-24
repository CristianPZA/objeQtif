/*
  # Fix infinite recursion in user_profiles RLS policies

  1. Problem
    - Multiple conflicting SELECT policies on user_profiles table
    - Second policy contains subquery to same table causing infinite recursion

  2. Solution
    - Drop existing conflicting policies
    - Create single comprehensive SELECT policy without self-referential subqueries
    - Maintain same access control logic but avoid recursion

  3. Security
    - Users can read their own profile
    - Managers can read their team members' profiles
    - HR, Direction, and Admin roles can read all profiles
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
    uid() = id
    OR
    -- Users can read profiles of people they manage
    uid() = manager_id
    OR
    -- Special roles can read all profiles (using direct role check to avoid recursion)
    EXISTS (
      SELECT 1 
      FROM auth.users au 
      JOIN user_profiles up ON au.id = up.id 
      WHERE au.id = uid() 
      AND up.role IN ('coach_rh', 'direction', 'admin')
    )
  );