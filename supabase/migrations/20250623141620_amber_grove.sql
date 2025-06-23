/*
  # Add fiche_poste column to user_profiles table

  1. Changes
    - Add `fiche_poste` column to `user_profiles` table
    - Column type: TEXT (nullable)
    - Allows storing job description and responsibilities for each user

  2. Notes
    - This column is used by the Administration page to manage employee job descriptions
    - The column is nullable to allow existing users without job descriptions
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'fiche_poste'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN fiche_poste TEXT;
  END IF;
END $$;