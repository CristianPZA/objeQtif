/*
  # Création de la table fiches_collaborateurs

  1. Nouvelle table
    - `fiches_collaborateurs`
      - `id` (uuid, primary key)
      - `collaboration_id` (uuid, foreign key vers projet_collaborateurs)
      - `contenu` (text, contenu JSON de la fiche)
      - `statut` (fiche_status, statut de la fiche)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Sécurité
    - Enable RLS sur la table `fiches_collaborateurs`
    - Politiques pour que les collaborateurs puissent gérer leurs propres fiches
    - Politiques pour que les référents et managers puissent consulter les fiches

  3. Triggers
    - Trigger pour mettre à jour `updated_at`
    - Trigger d'audit
*/

-- Créer la table fiches_collaborateurs
CREATE TABLE IF NOT EXISTS fiches_collaborateurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_id uuid NOT NULL REFERENCES projet_collaborateurs(id) ON DELETE CASCADE,
  contenu text NOT NULL,
  statut fiche_status DEFAULT 'brouillon'::fiche_status NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Activer RLS
ALTER TABLE fiches_collaborateurs ENABLE ROW LEVEL SECURITY;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS fiches_collaborateurs_collaboration_idx ON fiches_collaborateurs(collaboration_id);
CREATE INDEX IF NOT EXISTS fiches_collaborateurs_statut_idx ON fiches_collaborateurs(statut);
CREATE INDEX IF NOT EXISTS fiches_collaborateurs_created_idx ON fiches_collaborateurs(created_at);

-- Contrainte d'unicité : une seule fiche par collaboration
CREATE UNIQUE INDEX IF NOT EXISTS fiches_collaborateurs_collaboration_unique 
ON fiches_collaborateurs(collaboration_id);

-- Politiques RLS

-- Les collaborateurs peuvent créer leurs propres fiches
CREATE POLICY "Collaborateurs peuvent créer leurs fiches"
  ON fiches_collaborateurs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projet_collaborateurs pc
      WHERE pc.id = collaboration_id 
      AND pc.employe_id = auth.uid()
    )
  );

-- Les collaborateurs peuvent lire leurs propres fiches
CREATE POLICY "Collaborateurs peuvent lire leurs fiches"
  ON fiches_collaborateurs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projet_collaborateurs pc
      WHERE pc.id = collaboration_id 
      AND pc.employe_id = auth.uid()
    )
  );

-- Les collaborateurs peuvent modifier leurs propres fiches (si statut permet)
CREATE POLICY "Collaborateurs peuvent modifier leurs fiches"
  ON fiches_collaborateurs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projet_collaborateurs pc
      WHERE pc.id = collaboration_id 
      AND pc.employe_id = auth.uid()
    )
    AND statut IN ('brouillon'::fiche_status, 'retour_demande'::fiche_status)
  );

-- Les référents de projet peuvent lire les fiches de leurs projets
CREATE POLICY "Référents peuvent lire les fiches de leurs projets"
  ON fiches_collaborateurs
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

-- Les managers peuvent lire les fiches de leurs équipes
CREATE POLICY "Managers peuvent lire les fiches de leurs équipes"
  ON fiches_collaborateurs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projet_collaborateurs pc
      JOIN user_profiles up ON up.id = pc.employe_id
      WHERE pc.id = collaboration_id 
      AND up.manager_id = auth.uid()
    )
  );

-- Les RH, direction et admin peuvent tout lire
CREATE POLICY "RH et admin peuvent lire toutes les fiches"
  ON fiches_collaborateurs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() 
      AND up.role IN ('coach_rh', 'direction', 'admin')
    )
  );

-- Triggers

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_fiches_collaborateurs_updated_at
  BEFORE UPDATE ON fiches_collaborateurs
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Trigger d'audit
CREATE TRIGGER fiches_collaborateurs_audit
  AFTER INSERT OR UPDATE OR DELETE ON fiches_collaborateurs
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

-- Commentaires
COMMENT ON TABLE fiches_collaborateurs IS 'Fiches individuelles des collaborateurs sur leurs projets';
COMMENT ON COLUMN fiches_collaborateurs.collaboration_id IS 'Référence vers la collaboration projet-employé';
COMMENT ON COLUMN fiches_collaborateurs.contenu IS 'Contenu JSON de la fiche collaborateur';
COMMENT ON COLUMN fiches_collaborateurs.statut IS 'Statut de validation de la fiche';