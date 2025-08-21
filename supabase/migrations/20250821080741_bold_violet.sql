/*
  # Fix RLS policy for objectifs_collaborateurs INSERT operations

  1. Security Changes
    - Add INSERT policy for objectifs_collaborateurs table
    - Allow employees to create objectives for their own collaborations
    - Ensure proper permission checking through projet_collaborateurs relationship

  2. Policy Details
    - Policy name: "Employees can create their own objectives"
    - Allows INSERT operations for authenticated users
    - Validates that the user is the employee associated with the collaboration
*/

-- Drop existing INSERT policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Employees can create their own objectives" ON objectifs_collaborateurs;

-- Create new INSERT policy for objectifs_collaborateurs
CREATE POLICY "Employees can create their own objectives"
  ON objectifs_collaborateurs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM projet_collaborateurs pc 
      WHERE pc.id = collaboration_id 
      AND pc.employe_id = auth.uid()
    )
  );

-- Also ensure the existing policy for managing objectives is correct
DROP POLICY IF EXISTS "Users can manage their own objectives" ON objectifs_collaborateurs;

CREATE POLICY "Users can manage their own objectives"
  ON objectifs_collaborateurs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM projet_collaborateurs pc 
      WHERE pc.id = collaboration_id 
      AND pc.employe_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM projet_collaborateurs pc 
      WHERE pc.id = collaboration_id 
      AND pc.employe_id = auth.uid()
    )
  );