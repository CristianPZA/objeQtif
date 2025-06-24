/*
  # Fix user profiles policies and access

  1. Security Updates
    - Update RLS policies for user_profiles to allow proper admin access
    - Add missing policies for reading user profiles
    - Fix manager and coach relationships access

  2. Data Integrity
    - Ensure all users are properly accessible
    - Add indexes for better performance
*/

-- Supprimer les anciennes politiques qui peuvent poser problème
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
DROP POLICY IF EXISTS "Managers can read direct reports" ON user_profiles;
DROP POLICY IF EXISTS "Managers can read team profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role can access all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable profile creation" ON user_profiles;

-- Créer des politiques plus permissives pour l'administration
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Politique pour permettre aux admins de lire tous les profils
CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() 
      AND up.role = ANY(ARRAY['admin', 'direction', 'coach_rh'])
    )
  );

-- Politique pour permettre aux admins de modifier tous les profils
CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() 
      AND up.role = ANY(ARRAY['admin', 'direction', 'coach_rh'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() 
      AND up.role = ANY(ARRAY['admin', 'direction', 'coach_rh'])
    )
  );

-- Politique pour permettre aux managers de lire leurs équipes
CREATE POLICY "Managers can read team profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid());

-- Politique pour permettre aux coaches de lire leurs coachés
CREATE POLICY "Coaches can read their coachees"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid());

-- Politique pour le service role (pour les opérations système)
CREATE POLICY "Service role can access all profiles"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Politique pour permettre la création de profils publics (pour l'inscription)
CREATE POLICY "Enable profile creation"
  ON user_profiles
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Ajouter des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS user_profiles_role_idx ON user_profiles(role);
CREATE INDEX IF NOT EXISTS user_profiles_manager_idx ON user_profiles(manager_id);
CREATE INDEX IF NOT EXISTS user_profiles_coach_idx ON user_profiles(coach_id);
CREATE INDEX IF NOT EXISTS user_profiles_active_idx ON user_profiles(is_active);

-- S'assurer que tous les utilisateurs existants sont actifs
UPDATE user_profiles SET is_active = true WHERE is_active IS NULL;

-- Ajouter des valeurs par défaut manquantes
UPDATE user_profiles SET 
  preferences = COALESCE(preferences, '{}'),
  is_active = COALESCE(is_active, true),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now())
WHERE preferences IS NULL OR is_active IS NULL OR created_at IS NULL OR updated_at IS NULL;