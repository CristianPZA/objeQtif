/*
  # Migration des rôles utilisateurs

  1. Changements
    - Suppression du rôle "referent_projet" et remplacement par "coach"
    - Unification des rôles "coach_rh" vers "coach"
    - Mise à jour de toutes les contraintes et politiques RLS

  2. Sécurité
    - Maintien de toutes les autorisations existantes
    - Mise à jour des fonctions et politiques pour les nouveaux rôles
*/

-- =============================================
-- ÉTAPE 1: SUPPRESSION DES CONTRAINTES EXISTANTES
-- =============================================

-- Supprimer l'ancienne contrainte de rôle pour permettre la migration
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- =============================================
-- ÉTAPE 2: MIGRATION DES DONNÉES UTILISATEURS
-- =============================================

-- Migrer tous les utilisateurs avec le rôle "referent_projet" vers "coach"
UPDATE user_profiles 
SET role = 'coach', updated_at = now()
WHERE role = 'referent_projet';

-- Migrer tous les utilisateurs avec le rôle "coach_rh" vers "coach"
UPDATE user_profiles 
SET role = 'coach', updated_at = now()
WHERE role = 'coach_rh';

-- =============================================
-- ÉTAPE 3: NOUVELLE CONTRAINTE DE RÔLE
-- =============================================

-- Ajouter la nouvelle contrainte avec les rôles mis à jour
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
CHECK (role = ANY (ARRAY['employe'::text, 'coach'::text, 'direction'::text, 'admin'::text]));

-- =============================================
-- ÉTAPE 4: MISE À JOUR DES FONCTIONS
-- =============================================

-- Fonction mise à jour pour vérifier les rôles admin/HR/coach
CREATE OR REPLACE FUNCTION is_admin_or_hr_user()
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
    AND up.role IN ('admin', 'direction', 'coach')
  );
$$;

-- =============================================
-- ÉTAPE 5: MISE À JOUR DES POLITIQUES RLS
-- =============================================

-- User profiles policies
DROP POLICY IF EXISTS "Admin and HR can read all profiles" ON user_profiles;
CREATE POLICY "Admin and HR can read all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_admin_or_hr_user());

DROP POLICY IF EXISTS "Admin and HR can update all profiles" ON user_profiles;
CREATE POLICY "Admin and HR can update all profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (is_admin_or_hr_user())
  WITH CHECK (is_admin_or_hr_user());

DROP POLICY IF EXISTS "Admin and HR can delete profiles" ON user_profiles;
CREATE POLICY "Admin and HR can delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (is_admin_or_hr_user());

-- Departments policies
DROP POLICY IF EXISTS "Admins can manage departments" ON departments;
CREATE POLICY "Admins can manage departments"
  ON departments FOR ALL
  TO authenticated
  USING (is_admin_or_hr_user())
  WITH CHECK (is_admin_or_hr_user());

-- Career areas policies
DROP POLICY IF EXISTS "Admins can manage career areas" ON career_areas;
CREATE POLICY "Admins can manage career areas"
  ON career_areas FOR ALL
  TO authenticated
  USING (is_admin_or_hr_user())
  WITH CHECK (is_admin_or_hr_user());

-- Career levels policies
DROP POLICY IF EXISTS "Admins can manage career levels" ON career_levels;
CREATE POLICY "Admins can manage career levels"
  ON career_levels FOR ALL
  TO authenticated
  USING (is_admin_or_hr_user())
  WITH CHECK (is_admin_or_hr_user());

-- Development themes policies
DROP POLICY IF EXISTS "Admins can manage development themes" ON development_themes;
CREATE POLICY "Admins can manage development themes"
  ON development_themes FOR ALL
  TO authenticated
  USING (is_admin_or_hr_user())
  WITH CHECK (is_admin_or_hr_user());

-- Pathway skills policies
DROP POLICY IF EXISTS "Admins can manage pathway skills" ON pathway_skills;
CREATE POLICY "Admins can manage pathway skills"
  ON pathway_skills FOR ALL
  TO authenticated
  USING (is_admin_or_hr_user())
  WITH CHECK (is_admin_or_hr_user());

-- =============================================
-- ÉTAPE 6: MISE À JOUR DES POLITIQUES PROJETS
-- =============================================

-- Projets - Mise à jour pour remplacer referent_projet par coach
DROP POLICY IF EXISTS "Authorized users can create projects" ON projets;
DROP POLICY IF EXISTS "Utilisateurs autorisés peuvent créer des projets" ON projets;
CREATE POLICY "Authorized users can create projects"
  ON projets FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = auteur_id AND is_admin_or_hr_user()) OR
    (auth.uid() = auteur_id AND EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('direction', 'coach', 'admin')
    ))
  );

-- Mise à jour de la politique de modification des projets
DROP POLICY IF EXISTS "Project stakeholders can update projects" ON projets;
DROP POLICY IF EXISTS "Utilisateurs autorisés peuvent modifier les projets" ON projets;
CREATE POLICY "Project stakeholders can update projects"
  ON projets FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = auteur_id OR 
    auth.uid() = referent_projet_id OR
    is_admin_or_hr_user()
  );

-- Mise à jour de la politique de suppression des projets
DROP POLICY IF EXISTS "Project owners can delete projects" ON projets;
DROP POLICY IF EXISTS "Utilisateurs autorisés peuvent supprimer les projets" ON projets;
CREATE POLICY "Project owners can delete projects"
  ON projets FOR DELETE
  TO authenticated
  USING (
    auth.uid() = auteur_id OR
    is_admin_or_hr_user()
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
    is_admin_or_hr_user()
  );

-- Annual objectives (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'annual_objectives') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin and HR can manage all objectives" ON annual_objectives';
    EXECUTE 'CREATE POLICY "Admin and HR can manage all objectives"
      ON annual_objectives FOR ALL
      TO authenticated
      USING (is_admin_or_hr_user())
      WITH CHECK (is_admin_or_hr_user())';
  END IF;
END $$;

-- Projet collaborateurs - mise à jour des politiques
DROP POLICY IF EXISTS "Project managers can manage collaborators" ON projet_collaborateurs;
CREATE POLICY "Project managers can manage collaborators"
  ON projet_collaborateurs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets p
      WHERE p.id = projet_collaborateurs.projet_id 
      AND (p.auteur_id = auth.uid() OR p.referent_projet_id = auth.uid() OR is_admin_or_hr_user())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projets p
      WHERE p.id = projet_collaborateurs.projet_id 
      AND (p.auteur_id = auth.uid() OR p.referent_projet_id = auth.uid() OR is_admin_or_hr_user())
    )
  );

-- Fiches collaborateurs - mise à jour des politiques
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
          AND (p.auteur_id = auth.uid() OR p.referent_projet_id = auth.uid() OR 
               EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role IN (''coach'', ''direction'', ''admin'')))
        )
      )';
  END IF;
END $$;

-- =============================================
-- ÉTAPE 8: MISE À JOUR DES COMMENTAIRES
-- =============================================

COMMENT ON COLUMN user_profiles.role IS 'Rôle de l''utilisateur: employe, coach, direction, admin';
COMMENT ON FUNCTION is_admin_or_hr_user() IS 'Fonction pour vérifier si l''utilisateur a un rôle administratif (admin, direction, coach)';

-- =============================================
-- ÉTAPE 9: VÉRIFICATION ET NETTOYAGE
-- =============================================

-- Analyser les tables mises à jour pour optimiser les performances
ANALYZE user_profiles;
ANALYZE projets;

-- Vérification des données migrées
DO $$
DECLARE
  coach_count integer;
  old_role_count integer;
  total_users integer;
BEGIN
  -- Compter les nouveaux coaches
  SELECT COUNT(*) INTO coach_count FROM user_profiles WHERE role = 'coach';
  
  -- Vérifier qu'il n'y a plus d'anciens rôles
  SELECT COUNT(*) INTO old_role_count FROM user_profiles WHERE role IN ('referent_projet', 'coach_rh');
  
  -- Compter le total des utilisateurs
  SELECT COUNT(*) INTO total_users FROM user_profiles;
  
  -- Log des résultats
  RAISE NOTICE 'Migration terminée avec succès:';
  RAISE NOTICE '- Total utilisateurs: %', total_users;
  RAISE NOTICE '- Coaches: %', coach_count;
  RAISE NOTICE '- Anciens rôles restants: %', old_role_count;
  
  IF old_role_count > 0 THEN
    RAISE WARNING 'ATTENTION: Il reste % utilisateurs avec des anciens rôles', old_role_count;
  ELSE
    RAISE NOTICE 'Migration réussie: tous les anciens rôles ont été migrés';
  END IF;
END $$;