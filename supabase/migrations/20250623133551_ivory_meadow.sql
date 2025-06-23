/*
  # Create user profiles and fiches system

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text)
      - `role` (text with check constraint)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `fiches`
      - `id` (uuid, primary key)
      - `type` (enum: annuelle, projet, evaluation)
      - `statut` (enum: brouillon, en_validation, validee, refusee)
      - `contenu` (text)
      - `auteur_id` (uuid, references user_profiles)
      - `version` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for user profile management
    - Add policies for fiche management with role-based access

  3. Features
    - Automatic versioning system for fiches
    - Updated_at trigger for both tables
    - Indexes for performance
*/

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create user_profiles table first
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role text CHECK (role IN ('employe', 'referent_projet', 'coach_rh', 'direction')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can read their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can create their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create trigger for user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create trigger function to handle new user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Now create enums for fiche type and status
DO $$ BEGIN
  CREATE TYPE fiche_type AS ENUM ('annuelle', 'projet', 'evaluation');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE fiche_status AS ENUM ('brouillon', 'en_validation', 'validee', 'refusee');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create fiches table
CREATE TABLE IF NOT EXISTS fiches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type fiche_type NOT NULL,
  statut fiche_status NOT NULL DEFAULT 'brouillon',
  contenu text NOT NULL,
  auteur_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS fiches_auteur_id_idx ON fiches(auteur_id);
CREATE INDEX IF NOT EXISTS fiches_type_idx ON fiches(type);
CREATE INDEX IF NOT EXISTS fiches_statut_idx ON fiches(statut);
CREATE INDEX IF NOT EXISTS user_profiles_role_idx ON user_profiles(role);

-- Enable RLS on fiches
ALTER TABLE fiches ENABLE ROW LEVEL SECURITY;

-- Create policies for fiches
CREATE POLICY "Authors can create their own fiches"
  ON fiches
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auteur_id);

CREATE POLICY "Authors can read their own fiches"
  ON fiches
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = auteur_id OR
    statut = 'validee'
  );

CREATE POLICY "Authors can update their draft fiches"
  ON fiches
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = auteur_id AND
    statut = 'brouillon'
  )
  WITH CHECK (
    auth.uid() = auteur_id AND
    statut = 'brouillon'
  );

-- Create trigger function to handle versioning
CREATE OR REPLACE FUNCTION handle_fiche_versioning()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.contenu != NEW.contenu) THEN
    -- Insert a new version with incremented version number
    INSERT INTO fiches (
      type,
      statut,
      contenu,
      auteur_id,
      version,
      created_at
    ) VALUES (
      NEW.type,
      NEW.statut,
      NEW.contenu,
      NEW.auteur_id,
      NEW.version + 1,
      now()
    );
    RETURN NULL;  -- Don't perform the update
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for versioning
CREATE TRIGGER handle_fiche_version
  BEFORE UPDATE ON fiches
  FOR EACH ROW
  EXECUTE FUNCTION handle_fiche_versioning();

-- Create trigger for updated_at on fiches
CREATE TRIGGER update_fiches_updated_at
  BEFORE UPDATE ON fiches
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();