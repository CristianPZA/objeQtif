/*
  # Create missing tables for FichesProjets functionality

  1. New Tables
    - `fiches_collaborateurs`
      - `id` (uuid, primary key)
      - `collaboration_id` (uuid, foreign key to projet_collaborateurs)
      - `contenu` (text, JSON content of the collaborator form)
      - `statut` (text, status of the form)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `objectifs_collaborateurs`
      - `id` (uuid, primary key)
      - `collaboration_id` (uuid, foreign key to projet_collaborateurs)
      - `objectifs` (jsonb, array of objectives)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `evaluations_objectifs`
      - `id` (uuid, primary key)
      - `objectifs_id` (uuid, foreign key to objectifs_collaborateurs)
      - `auto_evaluation` (jsonb, self-evaluation data)
      - `evaluation_referent` (jsonb, manager evaluation)
      - `evaluation_coach` (jsonb, coach evaluation)
      - `statut` (text, evaluation status)
      - `date_soumission` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each table
*/

-- Create fiches_collaborateurs table
CREATE TABLE IF NOT EXISTS fiches_collaborateurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_id uuid NOT NULL REFERENCES projet_collaborateurs(id) ON DELETE CASCADE,
  contenu text NOT NULL,
  statut text DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'soumise', 'validee', 'rejetee')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create objectifs_collaborateurs table
CREATE TABLE IF NOT EXISTS objectifs_collaborateurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_id uuid NOT NULL REFERENCES projet_collaborateurs(id) ON DELETE CASCADE,
  objectifs jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create evaluations_objectifs table
CREATE TABLE IF NOT EXISTS evaluations_objectifs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objectifs_id uuid NOT NULL REFERENCES objectifs_collaborateurs(id) ON DELETE CASCADE,
  auto_evaluation jsonb DEFAULT '{}'::jsonb,
  evaluation_referent jsonb DEFAULT '{}'::jsonb,
  evaluation_coach jsonb DEFAULT '{}'::jsonb,
  statut text DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'en_attente', 'validee_referent', 'validee_coach', 'finalisee')),
  date_soumission timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS fiches_collaborateurs_collaboration_idx ON fiches_collaborateurs(collaboration_id);
CREATE INDEX IF NOT EXISTS fiches_collaborateurs_statut_idx ON fiches_collaborateurs(statut);

CREATE INDEX IF NOT EXISTS objectifs_collaborateurs_collaboration_idx ON objectifs_collaborateurs(collaboration_id);

CREATE INDEX IF NOT EXISTS evaluations_objectifs_objectifs_idx ON evaluations_objectifs(objectifs_id);
CREATE INDEX IF NOT EXISTS evaluations_objectifs_statut_idx ON evaluations_objectifs(statut);

-- Enable RLS
ALTER TABLE fiches_collaborateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectifs_collaborateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations_objectifs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fiches_collaborateurs
CREATE POLICY "Users can manage their own collaborator forms"
  ON fiches_collaborateurs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projet_collaborateurs pc
      WHERE pc.id = collaboration_id AND pc.employe_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projet_collaborateurs pc
      WHERE pc.id = collaboration_id AND pc.employe_id = auth.uid()
    )
  );

CREATE POLICY "Project managers can read collaborator forms"
  ON fiches_collaborateurs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projet_collaborateurs pc
      JOIN projets p ON p.id = pc.projet_id
      WHERE pc.id = collaboration_id 
      AND (p.auteur_id = auth.uid() OR p.referent_projet_id = auth.uid() OR is_admin_or_hr_user())
    )
  );

-- RLS Policies for objectifs_collaborateurs
CREATE POLICY "Users can manage their own objectives"
  ON objectifs_collaborateurs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projet_collaborateurs pc
      WHERE pc.id = collaboration_id AND pc.employe_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projet_collaborateurs pc
      WHERE pc.id = collaboration_id AND pc.employe_id = auth.uid()
    )
  );

CREATE POLICY "Project managers can read objectives"
  ON objectifs_collaborateurs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projet_collaborateurs pc
      JOIN projets p ON p.id = pc.projet_id
      WHERE pc.id = collaboration_id 
      AND (p.auteur_id = auth.uid() OR p.referent_projet_id = auth.uid() OR is_admin_or_hr_user())
    )
  );

-- RLS Policies for evaluations_objectifs
CREATE POLICY "Users can manage their own evaluations"
  ON evaluations_objectifs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM objectifs_collaborateurs oc
      JOIN projet_collaborateurs pc ON pc.id = oc.collaboration_id
      WHERE oc.id = objectifs_id AND pc.employe_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM objectifs_collaborateurs oc
      JOIN projet_collaborateurs pc ON pc.id = oc.collaboration_id
      WHERE oc.id = objectifs_id AND pc.employe_id = auth.uid()
    )
  );

CREATE POLICY "Project managers can read and update evaluations"
  ON evaluations_objectifs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM objectifs_collaborateurs oc
      JOIN projet_collaborateurs pc ON pc.id = oc.collaboration_id
      JOIN projets p ON p.id = pc.projet_id
      WHERE oc.id = objectifs_id 
      AND (p.auteur_id = auth.uid() OR p.referent_projet_id = auth.uid() OR is_admin_or_hr_user())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM objectifs_collaborateurs oc
      JOIN projet_collaborateurs pc ON pc.id = oc.collaboration_id
      JOIN projets p ON p.id = pc.projet_id
      WHERE oc.id = objectifs_id 
      AND (p.auteur_id = auth.uid() OR p.referent_projet_id = auth.uid() OR is_admin_or_hr_user())
    )
  );

-- Add updated_at triggers
CREATE TRIGGER update_fiches_collaborateurs_updated_at
  BEFORE UPDATE ON fiches_collaborateurs
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_objectifs_collaborateurs_updated_at
  BEFORE UPDATE ON objectifs_collaborateurs
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_evaluations_objectifs_updated_at
  BEFORE UPDATE ON evaluations_objectifs
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();