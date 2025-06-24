/*
  # Ajout du career_level aux profils utilisateurs et gestion des départements

  1. Modifications des profils utilisateurs
    - Ajouter la colonne career_level_id pour lier aux niveaux de carrière
    - Créer un index pour les performances

  2. Nouvelle table departments
    - Stockage des départements en base de données
    - Gestion des départements actifs/inactifs
    - Ordre de tri personnalisable

  3. Sécurité
    - Politiques RLS pour contrôler l'accès aux départements
    - Seuls les admins, direction et coach_rh peuvent gérer les départements

  4. Données par défaut
    - Insertion des départements standards
    - Migration des départements existants depuis les profils utilisateurs
*/

-- Ajouter la colonne career_level_id aux user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS career_level_id uuid REFERENCES career_levels(id);

-- Créer un index pour les performances
CREATE INDEX IF NOT EXISTS user_profiles_career_level_idx ON user_profiles(career_level_id);

-- Créer la table des départements
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Activer RLS sur la table departments
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Politiques pour la table departments
CREATE POLICY "Everyone can read active departments"
  ON departments
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage departments"
  ON departments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = ANY(ARRAY['admin', 'direction', 'coach_rh'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = ANY(ARRAY['admin', 'direction', 'coach_rh'])
    )
  );

-- Trigger pour updated_at (seulement si la fonction existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
    CREATE TRIGGER update_departments_updated_at
      BEFORE UPDATE ON departments
      FOR EACH ROW
      EXECUTE FUNCTION handle_updated_at();
  END IF;
END $$;

-- Insérer les départements par défaut
INSERT INTO departments (name, description, sort_order) VALUES
('Direction', 'Direction générale et stratégique', 1),
('Ressources Humaines', 'Gestion des ressources humaines', 2),
('Informatique', 'Développement et infrastructure IT', 3),
('Commercial', 'Ventes et développement commercial', 4),
('Marketing', 'Marketing et communication', 5),
('Finance', 'Comptabilité et gestion financière', 6),
('Production', 'Production et opérations', 7),
('Qualité', 'Assurance qualité et contrôle', 8),
('Logistique', 'Supply chain et logistique', 9),
('Recherche et Développement', 'Innovation et développement produit', 10),
('Support Client', 'Service client et support technique', 11),
('Juridique', 'Affaires juridiques et conformité', 12)
ON CONFLICT (name) DO NOTHING;

-- Créer les départements manquants à partir des profils utilisateurs existants
DO $$
DECLARE
    dept_name text;
    max_sort_order integer;
BEGIN
    -- Obtenir le plus grand sort_order existant
    SELECT COALESCE(MAX(sort_order), 0) INTO max_sort_order FROM departments;
    
    -- Pour chaque département unique dans user_profiles qui n'existe pas encore
    FOR dept_name IN 
        SELECT DISTINCT department 
        FROM user_profiles 
        WHERE department IS NOT NULL 
          AND department != '' 
          AND department NOT IN (SELECT name FROM departments)
    LOOP
        -- Incrémenter le sort_order
        max_sort_order := max_sort_order + 1;
        
        -- Insérer le nouveau département
        INSERT INTO departments (name, description, sort_order)
        VALUES (dept_name, 'Département créé automatiquement', max_sort_order)
        ON CONFLICT (name) DO NOTHING;
    END LOOP;
END $$;

-- Ajouter un commentaire sur la table
COMMENT ON TABLE departments IS 'Table des départements de l''entreprise avec gestion de l''état actif/inactif';
COMMENT ON COLUMN departments.name IS 'Nom unique du département';
COMMENT ON COLUMN departments.description IS 'Description optionnelle du département';
COMMENT ON COLUMN departments.is_active IS 'Indique si le département est actif';
COMMENT ON COLUMN departments.sort_order IS 'Ordre d''affichage du département';

-- Ajouter un commentaire sur la nouvelle colonne
COMMENT ON COLUMN user_profiles.career_level_id IS 'Référence vers le niveau de carrière de l''utilisateur';