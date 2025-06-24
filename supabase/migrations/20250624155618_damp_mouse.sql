/*
  # Création de la table annual_objectives

  1. Nouvelle table
    - `annual_objectives` pour stocker les objectifs annuels des employés
    - Basés sur les career pathways et niveaux de carrière
    - 4 objectifs SMART par employé et par année

  2. Structure
    - Référence vers l'employé, l'année, le career pathway et le niveau
    - Stockage des thèmes sélectionnés et des objectifs SMART en JSON
    - Statuts de workflow (draft, submitted, approved, rejected)

  3. Sécurité
    - RLS activé avec politiques appropriées
    - Les employés peuvent gérer leurs propres objectifs
    - Les managers/coaches/admins peuvent voir et approuver
*/

-- Créer la table annual_objectives
CREATE TABLE IF NOT EXISTS annual_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  year integer NOT NULL,
  career_pathway_id uuid NOT NULL REFERENCES career_areas(id),
  career_level_id uuid NOT NULL REFERENCES career_levels(id),
  selected_themes text[] NOT NULL DEFAULT '{}',
  objectives jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Contrainte d'unicité : un seul ensemble d'objectifs par employé et par année
  UNIQUE(employee_id, year)
);

-- Activer RLS
ALTER TABLE annual_objectives ENABLE ROW LEVEL SECURITY;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS annual_objectives_employee_idx ON annual_objectives(employee_id);
CREATE INDEX IF NOT EXISTS annual_objectives_year_idx ON annual_objectives(year);
CREATE INDEX IF NOT EXISTS annual_objectives_status_idx ON annual_objectives(status);
CREATE INDEX IF NOT EXISTS annual_objectives_pathway_idx ON annual_objectives(career_pathway_id);
CREATE INDEX IF NOT EXISTS annual_objectives_level_idx ON annual_objectives(career_level_id);

-- Politiques RLS

-- Les employés peuvent gérer leurs propres objectifs
CREATE POLICY "Employees can manage their own objectives"
  ON annual_objectives
  FOR ALL
  TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

-- Les managers peuvent voir les objectifs de leurs équipes
CREATE POLICY "Managers can read team objectives"
  ON annual_objectives
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = employee_id AND up.manager_id = auth.uid()
    )
  );

-- Les coaches peuvent voir les objectifs de leurs coachés
CREATE POLICY "Coaches can read coachee objectives"
  ON annual_objectives
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = employee_id AND up.coach_id = auth.uid()
    )
  );

-- Les admins, direction et coach_rh peuvent tout voir et modifier
CREATE POLICY "Admin and HR can manage all objectives"
  ON annual_objectives
  FOR ALL
  TO authenticated
  USING (is_admin_or_hr_user())
  WITH CHECK (is_admin_or_hr_user());

-- Trigger pour updated_at
CREATE TRIGGER update_annual_objectives_updated_at
  BEFORE UPDATE ON annual_objectives
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Commentaires
COMMENT ON TABLE annual_objectives IS 'Objectifs annuels des employés basés sur leurs career pathways';
COMMENT ON COLUMN annual_objectives.employee_id IS 'Référence vers l''employé';
COMMENT ON COLUMN annual_objectives.year IS 'Année des objectifs';
COMMENT ON COLUMN annual_objectives.career_pathway_id IS 'Career pathway au moment de la création';
COMMENT ON COLUMN annual_objectives.career_level_id IS 'Niveau de carrière au moment de la création';
COMMENT ON COLUMN annual_objectives.selected_themes IS 'IDs des 4 thèmes de développement sélectionnés';
COMMENT ON COLUMN annual_objectives.objectives IS 'Objectifs SMART détaillés en JSON';
COMMENT ON COLUMN annual_objectives.status IS 'Statut de validation des objectifs';