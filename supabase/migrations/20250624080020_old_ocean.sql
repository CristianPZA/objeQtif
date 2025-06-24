/*
  # Ajout du career_level aux profils utilisateurs et gestion des départements

  1. Modifications
    - Ajouter la colonne career_level_id aux user_profiles
    - Créer une table pour stocker les départements
    - Migrer les départements existants vers la nouvelle table

  2. Sécurité
    - Maintenir les politiques RLS existantes
    - Ajouter les contraintes de clé étrangère
*/

-- Ajouter la colonne career_level_id aux user_profiles
ALTER TABLE user_profiles 
ADD COLUMN career_level_id uuid REFERENCES career_levels(id);

-- Créer un index pour les performances
CREATE INDEX user_profiles_career_level_idx ON user_profiles(career_level_id);

-- Créer la table des départements
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
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
      WHERE id = uid() AND role = ANY(ARRAY['admin', 'direction', 'coach_rh'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = uid() AND role = ANY(ARRAY['admin', 'direction', 'coach_rh'])
    )
  );

-- Trigger pour updated_at
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

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
('Logistique', 'Supply chain et logistique', 9)
ON CONFLICT (name) DO NOTHING;

-- Mettre à jour les user_profiles pour utiliser les IDs des départements
DO $$
DECLARE
    dept_record RECORD;
    user_record RECORD;
BEGIN
    -- Pour chaque utilisateur ayant un département en texte
    FOR user_record IN 
        SELECT id, department 
        FROM user_profiles 
        WHERE department IS NOT NULL AND department != ''
    LOOP
        -- Trouver le département correspondant
        SELECT id INTO dept_record
        FROM departments 
        WHERE name = user_record.department
        LIMIT 1;
        
        -- Si le département n'existe pas, le créer
        IF NOT FOUND THEN
            INSERT INTO departments (name, sort_order)
            VALUES (user_record.department, 100)
            RETURNING id INTO dept_record;
        END IF;
        
        -- Mettre à jour l'utilisateur (on garde l'ancien champ pour compatibilité)
        -- Le nouveau système utilisera la table departments
    END LOOP;
END $$;