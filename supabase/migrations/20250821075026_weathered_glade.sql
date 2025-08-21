/*
  # Update annual objectives to support draft mode

  1. Database Changes
    - Update status constraint to include 'draft' status
    - Update RLS policies to hide draft objectives from employees
    - Only managers, admins, and coaches can see draft objectives

  2. Security
    - Employees can only see their own approved objectives
    - Managers can see all objectives including drafts
    - Admins can see and manage all objectives
*/

-- Update the status constraint to include 'draft'
DO $$
BEGIN
  -- Drop the existing constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'annual_objectives_status_check' 
    AND table_name = 'annual_objectives'
  ) THEN
    ALTER TABLE annual_objectives DROP CONSTRAINT annual_objectives_status_check;
  END IF;
  
  -- Add the new constraint with 'draft' status
  ALTER TABLE annual_objectives ADD CONSTRAINT annual_objectives_status_check 
    CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'waiting auto evaluation'::text, 'evaluated'::text]));
END $$;

-- Update RLS policies to handle draft mode
DROP POLICY IF EXISTS "Employees can manage their own objectives" ON annual_objectives;
DROP POLICY IF EXISTS "Managers can read team objectives" ON annual_objectives;
DROP POLICY IF EXISTS "Coaches can read coachee objectives" ON annual_objectives;

-- Policy for employees: can only see their own approved objectives (not drafts)
CREATE POLICY "Employees can manage their approved objectives"
  ON annual_objectives
  FOR ALL
  TO authenticated
  USING (
    employee_id = uid() AND 
    (status != 'draft' OR is_admin())
  )
  WITH CHECK (
    employee_id = uid() AND 
    (status != 'draft' OR is_admin())
  );

-- Policy for managers: can read all objectives including drafts for their team
CREATE POLICY "Managers can read all team objectives including drafts"
  ON annual_objectives
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = annual_objectives.employee_id 
      AND up.manager_id = uid()
    )
    OR is_admin()
  );

-- Policy for coaches: can read all objectives including drafts for their coachees
CREATE POLICY "Coaches can read all coachee objectives including drafts"
  ON annual_objectives
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = annual_objectives.employee_id 
      AND up.coach_id = uid()
    )
    OR is_admin()
  );

-- Policy for managers to create/update objectives for their team
CREATE POLICY "Managers can manage team objectives"
  ON annual_objectives
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = annual_objectives.employee_id 
      AND up.manager_id = uid()
    )
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = annual_objectives.employee_id 
      AND up.manager_id = uid()
    )
    OR is_admin()
  );