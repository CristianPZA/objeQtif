/*
  # Fix fiches_projets SELECT policy

  1. Security
    - Drop existing policy if it exists
    - Create new policy for reading fiches projets
    - Allow authors, referents, and privileged users to read
*/

-- Drop the policy if it already exists
DROP POLICY IF EXISTS "Authors and referents can read fiches projets" ON fiches_projets;

-- Create the SELECT policy for fiches_projets table
CREATE POLICY "Authors and referents can read fiches projets"
  ON fiches_projets
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = auteur_id) OR 
    (auth.uid() = referent_id) OR 
    (EXISTS (
      SELECT 1 
      FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role = ANY (ARRAY['referent_projet'::text, 'direction'::text, 'admin'::text])
    ))
  );