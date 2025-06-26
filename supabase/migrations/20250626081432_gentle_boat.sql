/*
  # Mise à jour des permissions de création de projets

  1. Changements
    - Permettre à tous les utilisateurs authentifiés de créer des projets
    - L'utilisateur devient automatiquement le référent du projet qu'il crée
    - Maintenir les permissions de modification et suppression appropriées

  2. Sécurité
    - L'auteur doit être l'utilisateur connecté
    - Seuls l'auteur, le référent et les admins peuvent modifier
    - Seuls l'auteur et les admins peuvent supprimer
*/

-- =============================================
-- CRÉATION D'UNE FONCTION POUR VÉRIFIER LES ADMINS
-- =============================================

-- Créer une fonction pour vérifier si l'utilisateur est admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles up
    WHERE up.id = auth.uid() 
    AND up.role = 'admin'
  );
$$;

-- =============================================
-- SUPPRESSION DE TOUTES LES POLITIQUES EXISTANTES
-- =============================================

-- Supprimer toutes les politiques existantes pour les recréer proprement
DROP POLICY IF EXISTS "Admins can create projects" ON projets;
DROP POLICY IF EXISTS "All users can create projects" ON projets;
DROP POLICY IF EXISTS "Authorized users can create projects" ON projets;
DROP POLICY IF EXISTS "Everyone can read projects" ON projets;
DROP POLICY IF EXISTS "Project stakeholders can update projects" ON projets;
DROP POLICY IF EXISTS "Project owners can delete projects" ON projets;

-- =============================================
-- CRÉATION DES NOUVELLES POLITIQUES
-- =============================================

-- Politique de lecture : tous peuvent lire les projets
CREATE POLICY "Everyone can read projects"
  ON projets FOR SELECT
  TO authenticated
  USING (true);

-- Politique de création : tous les utilisateurs authentifiés peuvent créer des projets
CREATE POLICY "All users can create projects"
  ON projets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auteur_id);

-- Politique de modification : auteur, référent et admins peuvent modifier
CREATE POLICY "Project stakeholders can update projects"
  ON projets FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = auteur_id OR 
    auth.uid() = referent_projet_id OR
    is_admin()
  );

-- Politique de suppression : auteur et admins peuvent supprimer
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

COMMENT ON FUNCTION is_admin() IS 'Fonction pour vérifier si l''utilisateur connecté a le rôle admin';
COMMENT ON POLICY "Everyone can read projects" ON projets IS 'Tous les utilisateurs authentifiés peuvent lire les projets';
COMMENT ON POLICY "All users can create projects" ON projets IS 'Tous les utilisateurs authentifiés peuvent créer des projets dont ils sont l''auteur';
COMMENT ON POLICY "Project stakeholders can update projects" ON projets IS 'L''auteur, le référent et les admins peuvent modifier les projets';
COMMENT ON POLICY "Project owners can delete projects" ON projets IS 'L''auteur et les admins peuvent supprimer les projets';