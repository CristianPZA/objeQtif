/*
  # Fix infinite recursion in user_profiles RLS policies

  1. Problem
    - The existing RLS policy for reading user profiles has infinite recursion
    - It queries user_profiles table within its own policy condition
    - This causes a 500 error when trying to access the table

  2. Solution
    - Drop the problematic policy
    - Create a new simplified policy that avoids recursion
    - Use auth.uid() directly without complex joins that reference the same table

  3. Changes
    - Remove recursive policy for reading profiles
    - Add simplified policies that work correctly
    - Maintain security while avoiding recursion
*/

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can read profiles based on role and hierarchy" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile or managers can update team" ON user_profiles;

-- Create new simplified policies without recursion
CREATE POLICY "Users can read their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read their manager's profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = manager_id);

CREATE POLICY "Managers can read their team profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid());

CREATE POLICY "HR and admin roles can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('coach_rh', 'direction', 'admin')
    )
  );

-- Update policies for user profile updates
CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "HR and admin can update profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('coach_rh', 'direction', 'admin')
    )
  );