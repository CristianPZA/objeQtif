/*
  # Add SELECT policy for fiches_projets table

  1. Security
    - Add SELECT policy for fiches_projets table
    - Allow authors, referents, and privileged users to read project data
*/

-- Add SELECT policy for fiches_projets table
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