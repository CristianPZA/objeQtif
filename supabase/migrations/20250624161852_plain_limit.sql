/*
  # Mise à jour des rôles utilisateurs

  1. Changements
    - Suppression du rôle "referent_projet"
    - Ajout du rôle "coach" (remplace "coach_rh")
    - Migration des utilisateurs existants

  2. Sécurité
    - Mise à jour des politiques RLS
    - Préservation des données existantes
*/

-- =============================================
-- MISE À JOUR DES UTILISATEURS EXISTANTS
-- =============================================

-- Migrer tous les utilisateurs avec le rôle "referent_projet" vers "coach"
UPDATE user_profiles 
SET role = 'coach' 
WHERE role = 'referent_projet';

-- Migrer tous les utilisateurs avec le rôle "coach_rh" vers "coach"
UPDATE user_profiles 
SET role = 'coach' 
WHERE role = 'coach_rh';

-- =============================================
-- MISE À JOUR DES CONTRAINTES
-- =============================================

-- Supprimer l'ancienne contrainte de rôle
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Ajouter la nouvelle contrainte avec les rôles mis à jour
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
CHECK (role = ANY (ARRAY['employe'::text, 'coach'::text, 'direction'::text, 'admin'::text]));

-- =============================================
-- MISE À JOUR DES POLITIQUES RLS
-- =============================================

-- Fonction mise à jour pour vérifier les rôles admin/HR
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

-- Mettre à jour les politiques existantes qui référencent les anciens rôles

-- User profiles
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

-- Departments
DROP POLICY IF EXISTS "Admins can manage departments" ON departments;
CREATE POLICY "Admins can manage departments"
  ON departments FOR ALL
  TO authenticated
  USING (is_admin_or_hr_user())
  WITH CHECK (is_admin_or_hr_user());

-- Career areas
DROP POLICY IF EXISTS "Admins can manage career areas" ON career_areas;
CREATE POLICY "Admins can manage career areas"
  ON career_areas FOR ALL
  TO authenticated
  USING (is_admin_or_hr_user())
  WITH CHECK (is_admin_or_hr_user());

-- Career levels
DROP POLICY IF EXISTS "Admins can manage career levels" ON career_levels;
CREATE POLICY "Admins can manage career levels"
  ON career_levels FOR ALL
  TO authenticated
  USING (is_admin_or_hr_user())
  WITH CHECK (is_admin_or_hr_user());

-- Development themes
DROP POLICY IF EXISTS "Admins can manage development themes" ON development_themes;
CREATE POLICY "Admins can manage development themes"
  ON development_themes FOR ALL
  TO authenticated
  USING (is_admin_or_hr_user())
  WITH CHECK (is_admin_or_hr_user());

-- Pathway skills
DROP POLICY IF EXISTS "Admins can manage pathway skills" ON pathway_skills;
CREATE POLICY "Admins can manage pathway skills"
  ON pathway_skills FOR ALL
  TO authenticated
  USING (is_admin_or_hr_user())
  WITH CHECK (is_admin_or_hr_user());

-- Projets - Mise à jour pour remplacer referent_projet par coach
DROP POLICY IF EXISTS "Authorized users can create projects" ON projets;
CREATE POLICY "Authorized users can create projects"
  ON projets FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = auteur_id AND
    (is_admin_or_hr_user() OR
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('direction', 'coach')
    ))
  );

-- Notifications
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
CREATE POLICY "Admins can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = expediteur_id OR
    is_admin_or_hr_user()
  );

-- Annual objectives
DROP POLICY IF EXISTS "Admin and HR can manage all objectives" ON annual_objectives;
CREATE POLICY "Admin and HR can manage all objectives"
  ON annual_objectives FOR ALL
  TO authenticated
  USING (is_admin_or_hr_user())
  WITH CHECK (is_admin_or_hr_user());

-- =============================================
-- MISE À JOUR DES COMMENTAIRES
-- =============================================

COMMENT ON COLUMN user_profiles.role IS 'Rôle de l''utilisateur: employe, coach, direction, admin';
COMMENT ON FUNCTION is_admin_or_hr_user() IS 'Fonction pour vérifier si l''utilisateur a un rôle administratif (admin, direction, coach)';

-- =============================================
-- NETTOYAGE ET OPTIMISATION
-- =============================================

-- Analyser les tables mises à jour
ANALYZE user_profiles;
ANALYZE projets;

-- Vérification des données migrées
DO $$
DECLARE
  coach_count integer;
  old_role_count integer;
BEGIN
  -- Compter les nouveaux coaches
  SELECT COUNT(*) INTO coach_count FROM user_profiles WHERE role = 'coach';
  
  -- Vérifier qu'il n'y a plus d'anciens rôles
  SELECT COUNT(*) INTO old_role_count FROM user_profiles WHERE role IN ('referent_projet', 'coach_rh');
  
  -- Log des résultats
  RAISE NOTICE 'Migration terminée: % coaches créés, % anciens rôles restants', coach_count, old_role_count;
  
  IF old_role_count > 0 THEN
    RAISE WARNING 'Il reste % utilisateurs avec des anciens rôles', old_role_count;
  END IF;
END $$;