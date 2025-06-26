/*
  # Mise à jour des permissions de création de projets

  1. Changements
    - Tous les utilisateurs authentifiés peuvent créer des projets
    - Le référent projet est automatiquement l'auteur du projet
    - Mise à jour des politiques RLS pour refléter ces changements

  2. Sécurité
    - Maintien de la sécurité avec RLS
    - Les utilisateurs ne peuvent créer que leurs propres projets
*/

-- =============================================
-- MISE À JOUR DES POLITIQUES PROJETS
-- =============================================

-- Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "Admins can create projects" ON projets;

-- Créer une nouvelle politique permettant à tous les utilisateurs de créer des projets
CREATE POLICY "All users can create projects"
  ON projets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auteur_id);

-- Mise à jour de la politique de lecture (inchangée)
-- Tous peuvent lire les projets
CREATE POLICY "Everyone can read projects"
  ON projets FOR SELECT
  TO authenticated
  USING (true);

-- Mise à jour de la politique de modification
-- L'auteur et le référent peuvent modifier, plus les admins
DROP POLICY IF EXISTS "Project stakeholders can update projects" ON projets;
CREATE POLICY "Project stakeholders can update projects"
  ON projets FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = auteur_id OR 
    auth.uid() = referent_projet_id OR
    is_admin()
  );

-- Mise à jour de la politique de suppression
-- L'auteur peut supprimer son projet, plus les admins
DROP POLICY IF EXISTS "Project owners can delete projects" ON projets;
CREATE POLICY "Project owners can delete projects"
  ON projets FOR DELETE
  TO authenticated
  USING (
    auth.uid() = auteur_id OR
    is_admin()
  );

-- =============================================
-- COMMENTAIRES DE DOCUMENTATION
-- =============================================

COMMENT ON POLICY "All users can create projects" ON projets IS 'Tous les utilisateurs authentifiés peuvent créer des projets dont ils sont l''auteur';
COMMENT ON POLICY "Project stakeholders can update projects" ON projets IS 'L''auteur, le référent et les admins peuvent modifier les projets';
COMMENT ON POLICY "Project owners can delete projects" ON projets IS 'L''auteur et les admins peuvent supprimer les projets';