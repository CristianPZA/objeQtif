/*
  # Fix annual objectives status constraint

  1. Database Changes
    - Update the status check constraint to include 'draft' as a valid status
    - Keep all existing valid status values: 'submitted', 'approved', 'waiting auto evaluation', 'evaluated'
    - Add 'draft' to allow saving objectives in draft mode

  2. Security
    - No changes to RLS policies needed
    - Constraint update maintains data integrity while allowing draft status
*/

-- Drop the existing constraint
ALTER TABLE annual_objectives DROP CONSTRAINT IF EXISTS annual_objectives_status_check;

-- Add the updated constraint with 'draft' included
ALTER TABLE annual_objectives ADD CONSTRAINT annual_objectives_status_check 
CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'waiting auto evaluation'::text, 'evaluated'::text]));