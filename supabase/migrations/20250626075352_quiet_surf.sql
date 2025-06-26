/*
  # Simplification des rôles utilisateurs vers Admin/Employee

  1. Migration des données
    - direction → admin
    - coach → employe
    - consultant → employe (si existe)
    - Tous les autres rôles → employe

  2. Mise à jour des contraintes
    - Nouvelle contrainte avec seulement 'admin' et 'employe'

  3. Mise à jour des fonctions et politiques
    - Simplification de is_admin_or_hr_user() vers is_admin()
    - Mise à jour de toutes les politiques RLS
*/

-- =============================================
-- ÉTAPE 1: SUPPRESSION DES CONTRAINTES EXISTANTES
-- =============================================

-- Supprimer l'ancienne contrainte de rôle
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- =============================================
-- ÉTAPE 2: MIGRATION DES DONNÉES UTILISATEURS
-- =============================================

-- Migrer tous les utilisateurs avec le rôle "direction" vers "admin"
UPDATE user_profiles 
SET role = 'admin', updated_at = now()
WHERE role = 'direction';

-- Migrer tous les utilisateurs avec le rôle "coach" vers "employe"
UPDATE user_profiles 
SET role = 'employe', updated_at = now()
WHERE role = 'coach';

-- Migrer tous les utilisateurs avec le rôle "consultant" vers "employe" (si existe)
UPDATE user_profiles 
SET role = 'employe', updated_at = now()
WHERE role = 'consultant';

-- Migrer tous les autres rôles non-admin vers "employe"
UPDATE user_profiles 
SET role = 'employe', updated_at = now()
WHERE role NOT IN ('admin', 'employe');

-- =============================================
-- ÉTAPE 3: NOUVELLE CONTRAINTE DE RÔLE
-- =============================================

-- Ajouter la nouvelle contrainte avec seulement admin et employe
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
CHECK (role = ANY (ARRAY['admin'::text, 'employe'::text]));

-- =============================================
-- ÉTAPE 4: MISE À JOUR DES FONCTIONS
-- =============================================

-- Fonction simplifiée pour vérifier les droits admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users u
    JOIN user_profiles up ON up.id = u.id
    WHERE u.id = auth.uid() 
    AND up.role = 'admin'
  );
$$;

-- Garder l'ancienne fonction pour compatibilité mais la rediriger vers is_admin()
CREATE OR REPLACE FUNCTION is_admin_or_hr_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT is_admin();
$$;

-- =============================================
-- ÉTAPE 5: MISE À JOUR DES POLITIQUES RLS
-- =============================================

-- User profiles policies
DROP POLICY IF EXISTS "Admin and HR can read all profiles" ON user_profiles;
CREATE POLICY "Admins can read all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admin and HR can update all profiles" ON user_profiles;
CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin and HR can delete profiles" ON user_profiles;
CREATE POLICY "Admins can delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (is_admin());

-- Departments policies
DROP POLICY IF EXISTS "Admins can manage departments" ON departments;
CREATE POLICY "Admins can manage departments"
  ON departments FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Career areas policies
DROP POLICY IF EXISTS "Admins can manage career areas" ON career_areas;
CREATE POLICY "Admins can manage career areas"
  ON career_areas FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Career levels policies
DROP POLICY IF EXISTS "Admins can manage career levels" ON career_levels;
CREATE POLICY "Admins can manage career levels"
  ON career_levels FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Development themes policies
DROP POLICY IF EXISTS "Admins can manage development themes" ON development_themes;
CREATE POLICY "Admins can manage development themes"
  ON development_themes FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Pathway skills policies
DROP POLICY IF EXISTS "Admins can manage pathway skills" ON pathway_skills;
CREATE POLICY "Admins can manage pathway skills"
  ON pathway_skills FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =============================================
-- ÉTAPE 6: MISE À JOUR DES POLITIQUES PROJETS
-- =============================================

-- Projets - Seuls les admins peuvent créer des projets
DROP POLICY IF EXISTS "Authorized users can create projects" ON projets;
CREATE POLICY "Admins can create projects"
  ON projets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auteur_id AND is_admin());

-- Mise à jour de la politique de modification des projets
DROP POLICY IF EXISTS "Project stakeholders can update projects" ON projets;
CREATE POLICY "Project stakeholders can update projects"
  ON projets FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = auteur_id OR 
    auth.uid() = referent_projet_id OR
    is_admin()
  );

-- Mise à jour de la politique de suppression des projets
DROP POLICY IF EXISTS "Project owners can delete projects" ON projets;
CREATE POLICY "Project owners can delete projects"
  ON projets FOR DELETE
  TO authenticated
  USING (
    auth.uid() = auteur_id OR
    is_admin()
  );

-- =============================================
-- ÉTAPE 7: MISE À JOUR DES AUTRES POLITIQUES
-- =============================================

-- Notifications
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
CREATE POLICY "Admins can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = expediteur_id OR
    is_admin()
  );

-- Annual objectives
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'annual_objectives') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin and HR can manage all objectives" ON annual_objectives';
    EXECUTE 'CREATE POLICY "Admins can manage all objectives"
      ON annual_objectives FOR ALL
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin())';
  END IF;
END $$;

-- Projet collaborateurs
DROP POLICY IF EXISTS "Project managers can manage collaborators" ON projet_collaborateurs;
CREATE POLICY "Project managers can manage collaborators"
  ON projet_collaborateurs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets p
      WHERE p.id = projet_collaborateurs.projet_id 
      AND (p.auteur_id = auth.uid() OR p.referent_projet_id = auth.uid() OR is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projets p
      WHERE p.id = projet_collaborateurs.projet_id 
      AND (p.auteur_id = auth.uid() OR p.referent_projet_id = auth.uid() OR is_admin())
    )
  );

-- Fiches collaborateurs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fiches_collaborateurs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Project managers can read collaborator forms" ON fiches_collaborateurs';
    EXECUTE 'CREATE POLICY "Project managers can read collaborator forms"
      ON fiches_collaborateurs FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM projet_collaborateurs pc
          JOIN projets p ON p.id = pc.projet_id
          WHERE pc.id = fiches_collaborateurs.collaboration_id 
          AND (p.auteur_id = auth.uid() OR p.referent_projet_id = auth.uid() OR is_admin())
        )
      )';
  END IF;
END $$;

-- Objectifs collaborateurs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'objectifs_collaborateurs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "RH et admin peuvent lire tous les objectifs" ON objectifs_collaborateurs';
    EXECUTE 'CREATE POLICY "Admins can read all objectives"
      ON objectifs_collaborateurs FOR SELECT
      TO authenticated
      USING (is_admin())';
  END IF;
END $$;

-- Evaluations objectifs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evaluations_objectifs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "RH et admin peuvent gérer toutes les évaluations" ON evaluations_objectifs';
    EXECUTE 'CREATE POLICY "Admins can manage all evaluations"
      ON evaluations_objectifs FOR ALL
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin())';
  END IF;
END $$;

-- =============================================
-- ÉTAPE 8: MISE À JOUR DES COMMENTAIRES
-- =============================================

COMMENT ON COLUMN user_profiles.role IS 'Rôle de l''utilisateur: employe ou admin';
COMMENT ON FUNCTION is_admin() IS 'Fonction pour vérifier si l''utilisateur a le rôle admin';
COMMENT ON FUNCTION is_admin_or_hr_user() IS 'Fonction de compatibilité - redirige vers is_admin()';

-- =============================================
-- ÉTAPE 9: VÉRIFICATION ET NETTOYAGE
-- =============================================

-- Analyser les tables mises à jour
ANALYZE user_profiles;
ANALYZE projets;

-- Vérification des données migrées
DO $$
DECLARE
  admin_count integer;
  employe_count integer;
  other_roles_count integer;
  total_users integer;
BEGIN
  -- Compter les admins
  SELECT COUNT(*) INTO admin_count FROM user_profiles WHERE role = 'admin';
  
  -- Compter les employés
  SELECT COUNT(*) INTO employe_count FROM user_profiles WHERE role = 'employe';
  
  -- Vérifier qu'il n'y a plus d'autres rôles
  SELECT COUNT(*) INTO other_roles_count FROM user_profiles WHERE role NOT IN ('admin', 'employe');
  
  -- Compter le total des utilisateurs
  SELECT COUNT(*) INTO total_users FROM user_profiles;
  
  -- Log des résultats
  RAISE NOTICE 'Migration des rôles terminée avec succès:';
  RAISE NOTICE '- Total utilisateurs: %', total_users;
  RAISE NOTICE '- Admins: %', admin_count;
  RAISE NOTICE '- Employés: %', employe_count;
  RAISE NOTICE '- Autres rôles restants: %', other_roles_count;
  
  IF other_roles_count > 0 THEN
    RAISE WARNING 'ATTENTION: Il reste % utilisateurs avec des rôles non-standard', other_roles_count;
  ELSE
    RAISE NOTICE 'Migration réussie: tous les utilisateurs ont été migrés vers admin/employe';
  END IF;
END $$;