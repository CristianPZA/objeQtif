/*
  # Système d'évaluation des objectifs

  1. Nouvelles tables
    - `objectifs_collaborateurs` - Objectifs définis par les collaborateurs
    - `evaluations_objectifs` - Auto-évaluations et validations
    
  2. Modifications
    - Ajout du champ `coach_id` dans `user_profiles`
    - Mise à jour des politiques RLS
    
  3. Sécurité
    - Politiques RLS pour chaque table
    - Contrôle des droits d'évaluation
*/

-- Ajouter le champ coach_id dans user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'coach_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN coach_id uuid REFERENCES user_profiles(id);
    CREATE INDEX IF NOT EXISTS user_profiles_coach_idx ON user_profiles(coach_id);
  END IF;
END $$;

-- Table des objectifs définis par les collaborateurs
CREATE TABLE IF NOT EXISTS objectifs_collaborateurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_id uuid NOT NULL REFERENCES projet_collaborateurs(id) ON DELETE CASCADE,
  objectifs jsonb DEFAULT '[]'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table des évaluations d'objectifs
CREATE TABLE IF NOT EXISTS evaluations_objectifs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objectifs_id uuid NOT NULL REFERENCES objectifs_collaborateurs(id) ON DELETE CASCADE,
  auto_evaluation jsonb DEFAULT '{}'::jsonb NOT NULL,
  evaluation_referent jsonb DEFAULT '{}'::jsonb,
  evaluation_coach jsonb DEFAULT '{}'::jsonb,
  statut fiche_status DEFAULT 'brouillon'::fiche_status NOT NULL,
  date_soumission timestamptz,
  date_validation_referent timestamptz,
  date_validation_coach timestamptz,
  commentaires_referent text,
  commentaires_coach text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Activer RLS
ALTER TABLE objectifs_collaborateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations_objectifs ENABLE ROW LEVEL SECURITY;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS objectifs_collaborateurs_collaboration_idx ON objectifs_collaborateurs(collaboration_id);
CREATE INDEX IF NOT EXISTS evaluations_objectifs_objectifs_idx ON evaluations_objectifs(objectifs_id);
CREATE INDEX IF NOT EXISTS evaluations_objectifs_statut_idx ON evaluations_objectifs(statut);

-- Contraintes d'unicité
CREATE UNIQUE INDEX IF NOT EXISTS objectifs_collaborateurs_collaboration_unique 
ON objectifs_collaborateurs(collaboration_id);

CREATE UNIQUE INDEX IF NOT EXISTS evaluations_objectifs_objectifs_unique 
ON evaluations_objectifs(objectifs_id);

-- Politiques RLS pour objectifs_collaborateurs

-- Les collaborateurs peuvent créer leurs objectifs
CREATE POLICY "Collaborateurs peuvent créer leurs objectifs"
  ON objectifs_collaborateurs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projet_collaborateurs pc
      WHERE pc.id = collaboration_id 
      AND pc.employe_id = auth.uid()
    )
  );

-- Les collaborateurs peuvent lire et modifier leurs objectifs
CREATE POLICY "Collaborateurs peuvent gérer leurs objectifs"
  ON objectifs_collaborateurs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projet_collaborateurs pc
      WHERE pc.id = collaboration_id 
      AND pc.employe_id = auth.uid()
    )
  );

-- Les référents peuvent lire les objectifs de leurs projets
CREATE POLICY "Référents peuvent lire les objectifs de leurs projets"
  ON objectifs_collaborateurs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projet_collaborateurs pc
      JOIN projets p ON p.id = pc.projet_id
      WHERE pc.id = collaboration_id 
      AND (p.referent_projet_id = auth.uid() OR p.auteur_id = auth.uid())
    )
  );

-- Les coaches peuvent lire les objectifs de leurs coachés
CREATE POLICY "Coaches peuvent lire les objectifs de leurs coachés"
  ON objectifs_collaborateurs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projet_collaborateurs pc
      JOIN user_profiles up ON up.id = pc.employe_id
      WHERE pc.id = collaboration_id 
      AND up.coach_id = auth.uid()
    )
  );

-- Les RH, direction et admin peuvent tout lire
CREATE POLICY "RH et admin peuvent lire tous les objectifs"
  ON objectifs_collaborateurs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() 
      AND up.role IN ('coach_rh', 'direction', 'admin')
    )
  );

-- Politiques RLS pour evaluations_objectifs

-- Les collaborateurs peuvent créer leurs auto-évaluations
CREATE POLICY "Collaborateurs peuvent créer leurs auto-évaluations"
  ON evaluations_objectifs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM objectifs_collaborateurs oc
      JOIN projet_collaborateurs pc ON pc.id = oc.collaboration_id
      WHERE oc.id = objectifs_id 
      AND pc.employe_id = auth.uid()
    )
  );

-- Les collaborateurs peuvent lire et modifier leurs évaluations (si statut permet)
CREATE POLICY "Collaborateurs peuvent gérer leurs évaluations"
  ON evaluations_objectifs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM objectifs_collaborateurs oc
      JOIN projet_collaborateurs pc ON pc.id = oc.collaboration_id
      WHERE oc.id = objectifs_id 
      AND pc.employe_id = auth.uid()
    )
  );

-- Les référents peuvent lire et évaluer
CREATE POLICY "Référents peuvent évaluer leurs projets"
  ON evaluations_objectifs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM objectifs_collaborateurs oc
      JOIN projet_collaborateurs pc ON pc.id = oc.collaboration_id
      JOIN projets p ON p.id = pc.projet_id
      WHERE oc.id = objectifs_id 
      AND (p.referent_projet_id = auth.uid() OR p.auteur_id = auth.uid())
    )
  );

-- Les coaches peuvent lire et évaluer
CREATE POLICY "Coaches peuvent évaluer leurs coachés"
  ON evaluations_objectifs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM objectifs_collaborateurs oc
      JOIN projet_collaborateurs pc ON pc.id = oc.collaboration_id
      JOIN user_profiles up ON up.id = pc.employe_id
      WHERE oc.id = objectifs_id 
      AND up.coach_id = auth.uid()
    )
  );

-- Les RH, direction et admin peuvent tout gérer
CREATE POLICY "RH et admin peuvent gérer toutes les évaluations"
  ON evaluations_objectifs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() 
      AND up.role IN ('coach_rh', 'direction', 'admin')
    )
  );

-- Triggers pour updated_at
CREATE TRIGGER update_objectifs_collaborateurs_updated_at
  BEFORE UPDATE ON objectifs_collaborateurs
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_evaluations_objectifs_updated_at
  BEFORE UPDATE ON evaluations_objectifs
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Triggers d'audit
CREATE TRIGGER objectifs_collaborateurs_audit
  AFTER INSERT OR UPDATE OR DELETE ON objectifs_collaborateurs
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER evaluations_objectifs_audit
  AFTER INSERT OR UPDATE OR DELETE ON evaluations_objectifs
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

-- Fonction pour valider les changements de statut d'évaluation
CREATE OR REPLACE FUNCTION validate_evaluation_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Vérifier les transitions de statut autorisées
  IF OLD.statut IS DISTINCT FROM NEW.statut THEN
    -- De brouillon vers en_attente : auto-évaluation complète requise
    IF OLD.statut = 'brouillon' AND NEW.statut = 'en_attente' THEN
      IF NEW.auto_evaluation = '{}'::jsonb THEN
        RAISE EXCEPTION 'Auto-évaluation requise avant soumission';
      END IF;
      NEW.date_soumission = now();
    END IF;
    
    -- Autres validations de transition...
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger de validation des statuts
CREATE TRIGGER validate_evaluations_status
  BEFORE UPDATE ON evaluations_objectifs
  FOR EACH ROW
  EXECUTE FUNCTION validate_evaluation_status_change();

-- Commentaires
COMMENT ON TABLE objectifs_collaborateurs IS 'Objectifs définis par les collaborateurs pour leurs projets';
COMMENT ON TABLE evaluations_objectifs IS 'Auto-évaluations et validations hiérarchiques des objectifs';
COMMENT ON COLUMN user_profiles.coach_id IS 'Référence vers le coach assigné';