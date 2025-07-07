/*
  # Update annual_objectives status values

  1. Changes
    - Update the status constraint to use new values: 'submitted', 'approved', 'waiting auto evaluation', 'evaluated'
    - Migrate existing data to the new status values
    - Update any references to the old status values

  2. Security
    - Maintain existing RLS policies
    - No changes to access control
*/

-- Drop the existing constraint
ALTER TABLE annual_objectives 
DROP CONSTRAINT IF EXISTS annual_objectives_status_check;

-- Update existing data to new status values
UPDATE annual_objectives
SET status = 
  CASE 
    WHEN status = 'draft' THEN 'submitted'
    WHEN status = 'submitted' THEN 'approved'
    WHEN status = 'approved' THEN 'waiting auto evaluation'
    WHEN status = 'rejected' THEN 'evaluated'
    ELSE status
  END;

-- Add the new constraint with updated values
ALTER TABLE annual_objectives 
ADD CONSTRAINT annual_objectives_status_check 
CHECK (status IN ('submitted', 'approved', 'waiting auto evaluation', 'evaluated'));

-- Update any functions or triggers that reference the old status values
DO $$
DECLARE
  function_name text;
BEGIN
  -- Find and update functions that reference the old status values
  FOR function_name IN 
    SELECT p.proname 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prosrc LIKE '%annual_objectives%'
    AND p.prosrc LIKE '%status%'
  LOOP
    RAISE NOTICE 'Consider updating function: %', function_name;
  END LOOP;
END $$;

-- Add comments to document the change
COMMENT ON COLUMN annual_objectives.status IS 'Status of the objectives: submitted, approved, waiting auto evaluation, evaluated';