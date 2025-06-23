/*
  # Automatisation de la création des profils utilisateurs

  1. Fonctions
    - `handle_new_user()` : Fonction trigger pour créer automatiquement un profil utilisateur
    - `update_user_email()` : Fonction pour synchroniser les emails entre auth.users et user_profiles

  2. Triggers
    - Trigger sur auth.users pour créer automatiquement un profil lors de l'inscription
    - Trigger pour synchroniser les modifications d'email

  3. Sécurité
    - Politique RLS mise à jour pour permettre l'insertion automatique
*/

-- Fonction pour gérer la création automatique des profils utilisateurs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employe'),
    true,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Fonction pour synchroniser les emails entre auth.users et user_profiles
CREATE OR REPLACE FUNCTION public.update_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Mettre à jour l'email dans user_profiles si il a changé dans auth.users
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.user_profiles
    SET 
      email = NEW.email,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Créer le trigger pour la création automatique des profils
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Créer le trigger pour la synchronisation des emails
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.update_user_email();

-- Mettre à jour les politiques RLS pour permettre l'insertion automatique
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;

CREATE POLICY "Enable automatic profile creation"
  ON user_profiles FOR INSERT
  WITH CHECK (true);

-- Politique pour permettre la lecture des profils
DROP POLICY IF EXISTS "Users can read their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read their manager's profile" ON user_profiles;
DROP POLICY IF EXISTS "Managers can read their team profiles" ON user_profiles;
DROP POLICY IF EXISTS "HR and admin roles can read all profiles" ON user_profiles;

CREATE POLICY "Users can read their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can read their manager's profile"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.manager_id = user_profiles.id
    )
  );

CREATE POLICY "Managers can read their team profiles"
  ON user_profiles FOR SELECT
  USING (manager_id = auth.uid());

CREATE POLICY "HR and admin roles can read all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() 
      AND up.role IN ('coach_rh', 'direction', 'admin')
    )
  );

-- Politique pour permettre les mises à jour
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "HR and admin can update profiles" ON user_profiles;

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "HR and admin can update profiles"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() 
      AND up.role IN ('coach_rh', 'direction', 'admin')
    )
  );

-- Ajouter une colonne pour la date d'entrée dans l'entreprise si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'date_entree_entreprise'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN date_entree_entreprise date;
  END IF;
END $$;

-- Mettre à jour la colonne date_entree_entreprise avec created_at pour les utilisateurs existants
UPDATE user_profiles 
SET date_entree_entreprise = created_at::date 
WHERE date_entree_entreprise IS NULL;

-- Ajouter un commentaire sur la table pour documenter le processus
COMMENT ON TABLE user_profiles IS 'Profils utilisateurs créés automatiquement lors de l''inscription via auth.users';
COMMENT ON FUNCTION handle_new_user() IS 'Fonction trigger pour créer automatiquement un profil utilisateur lors de l''inscription';
COMMENT ON FUNCTION update_user_email() IS 'Fonction trigger pour synchroniser les emails entre auth.users et user_profiles';