/*
  # Add SELECT policy for fiches_projets table

  1. Security
    - Add SELECT policy for fiches_projets table to allow authorized users to read project data
    - Policy allows authors, referents, and privileged roles (referent_projet, direction, admin) to read projects

  This fixes the RLS violation error when creating new projects, as Supabase needs to be able to read the data back after insertion.
*/

-- Add SELECT policy for fiches_projets table
CREATE POLICY "Authors and referents can read fiches projets"
  ON fiches_projets
  FOR SELECT
  TO authenticated
  USING (
    (uid() = auteur_id) OR 
    (uid() = referent_id) OR 
    (EXISTS (
      SELECT 1 
      FROM user_profiles up 
      WHERE up.id = uid() 
      AND up.role = ANY (ARRAY['referent_projet'::text, 'direction'::text, 'admin'::text])
    ))
  );