/*
  # Ajout du pays aux profils utilisateurs

  1. Modifications
    - Ajout de la colonne `country` à la table `user_profiles`
    - Valeurs possibles: 'france', 'espagne'
    - Mise à jour des politiques RLS pour filtrer par pays

  2. Sécurité
    - Les utilisateurs ne peuvent voir que les profils de leur propre pays
    - Les admins peuvent voir tous les profils
*/

-- Ajouter la colonne country aux user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS country text DEFAULT 'france';

-- Ajouter une contrainte pour limiter les valeurs possibles
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_country_check 
CHECK (country IN ('france', 'espagne'));

-- Créer un index pour les performances
CREATE INDEX IF NOT EXISTS user_profiles_country_idx ON user_profiles(country);

-- Mettre à jour les politiques RLS existantes

-- Supprimer les politiques existantes qui doivent être modifiées
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Managers can read team profiles" ON user_profiles;
DROP POLICY IF EXISTS "Coaches can read their coachees" ON user_profiles;

-- Recréer les politiques avec filtrage par pays
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read profiles from same country"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    country = (SELECT country FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Managers can read team profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid());

CREATE POLICY "Coaches can read their coachees"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid());

-- Mettre à jour la fonction is_admin pour vérifier si l'utilisateur est admin
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

-- Commentaires
COMMENT ON COLUMN user_profiles.country IS 'Pays de l''utilisateur: france ou espagne';