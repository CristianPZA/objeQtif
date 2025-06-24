/*
  # Fix infinite recursion in user_profiles RLS policies

  1. Problem Analysis
    - Several policies on user_profiles table contain subqueries that reference user_profiles itself
    - This creates infinite recursion when policies are evaluated
    - Specifically affects policies that check roles, manager relationships, and coach relationships

  2. Solution
    - Simplify policies to avoid self-referential queries
    - Use direct column comparisons where possible
    - Remove or restructure policies that cause circular dependencies

  3. Changes
    - Drop existing problematic policies
    - Create new simplified policies that avoid recursion
    - Maintain security while preventing infinite loops
*/

-- Drop all existing policies on user_profiles to start fresh
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Coaches can read their coachees" ON user_profiles;
DROP POLICY IF EXISTS "Enable profile creation" ON user_profiles;
DROP POLICY IF EXISTS "Managers can read team profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role can access all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create simplified policies that avoid recursion

-- Allow service role full access (needed for system operations)
CREATE POLICY "Service role full access"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow public to create profiles (needed for signup)
CREATE POLICY "Enable profile creation for public"
  ON user_profiles
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow authenticated users to create their own profile
CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to read their own profile (no subquery needed)
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile (no subquery needed)
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow managers to read their direct reports (simple column check)
CREATE POLICY "Managers can read team profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid());

-- Allow coaches to read their coachees (simple column check)
CREATE POLICY "Coaches can read their coachees"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid());

-- Create a function to check if user has admin/hr role without recursion
CREATE OR REPLACE FUNCTION is_admin_or_hr_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users u
    JOIN user_profiles up ON up.id = u.id
    WHERE u.id = auth.uid() 
    AND up.role IN ('admin', 'direction', 'coach_rh')
  );
$$;

-- Allow admin/HR roles to read all profiles using the function
CREATE POLICY "Admin and HR can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin_or_hr_user());

-- Allow admin/HR roles to update all profiles using the function
CREATE POLICY "Admin and HR can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin_or_hr_user())
  WITH CHECK (is_admin_or_hr_user());

-- Allow admin/HR roles to delete profiles using the function
CREATE POLICY "Admin and HR can delete profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (is_admin_or_hr_user());