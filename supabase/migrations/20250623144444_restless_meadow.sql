/*
  # Système complet de gestion des projets

  1. Nouvelles tables
    - `projets` - Table principale pour les projets
    - `projet_collaborateurs` - Table de liaison pour les collaborateurs des projets
  
  2. Sécurité
    - Politiques RLS pour toutes les tables
    - Contrôle d'accès basé sur les rôles
  
  3. Fonctionnalités
    - Gestion des projets avec clients, dates, descriptions
    - Attribution de référents et collaborateurs
    - Définition des rôles pour chaque collaborateur
    - Audit et versioning automatique
*/

-- Table principale des projets
CREATE TABLE IF NOT EXISTS projets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_client text NOT NULL,
  titre text NOT NULL,
  description text NOT NULL,
  date_debut date NOT NULL,
  date_fin_prevue date,
  budget_estime numeric(12,2),
  statut text DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'en_cours', 'termine', 'suspendu', 'annule')),
  priorite text DEFAULT 'normale' CHECK (priorite IN ('basse', 'normale', 'haute', 'urgente')),
  taux_avancement integer DEFAULT 0 CHECK (taux_avancement >= 0 AND taux_avancement <= 100),
  referent_projet_id uuid NOT NULL REFERENCES user_profiles(id),
  auteur_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  objectifs jsonb DEFAULT '[]'::jsonb,
  risques jsonb DEFAULT '[]'::jsonb,
  notes text,
  version integer DEFAULT 1,
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des collaborateurs de projet
CREATE TABLE IF NOT EXISTS projet_collaborateurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projet_id uuid NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  employe_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role_projet text NOT NULL,
  date_debut date,
  date_fin date,
  taux_allocation numeric(5,2) DEFAULT 100.00 CHECK (taux_allocation >= 0 AND taux_allocation <= 100),
  responsabilites text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(projet_id, employe_id)
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS projets_auteur_idx ON projets(auteur_id);
CREATE INDEX IF NOT EXISTS projets_referent_idx ON projets(referent_projet_id);
CREATE INDEX IF NOT EXISTS projets_statut_idx ON projets(statut);
CREATE INDEX IF NOT EXISTS projets_dates_idx ON projets(date_debut, date_fin_prevue);
CREATE INDEX IF NOT EXISTS projets_client_idx ON projets(nom_client);

CREATE INDEX IF NOT EXISTS projet_collaborateurs_projet_idx ON projet_collaborateurs(projet_id);
CREATE INDEX IF NOT EXISTS projet_collaborateurs_employe_idx ON projet_collaborateurs(employe_id);
CREATE INDEX IF NOT EXISTS projet_collaborateurs_active_idx ON projet_collaborateurs(is_active);

-- Activer RLS
ALTER TABLE projets ENABLE ROW LEVEL SECURITY;
ALTER TABLE projet_collaborateurs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour la table projets

-- Lecture : Tous les utilisateurs authentifiés peuvent voir les projets
CREATE POLICY "Tous les utilisateurs peuvent lire les projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (true);

-- Création : Seuls direction, référents projet et admin peuvent créer
CREATE POLICY "Utilisateurs autorisés peuvent créer des projets"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = auteur_id AND
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role = ANY (ARRAY['direction'::text, 'referent_projet'::text, 'admin'::text])
    )
  );

-- Modification : Auteur, référent, direction et admin peuvent modifier
CREATE POLICY "Utilisateurs autorisés peuvent modifier les projets"
  ON projets
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = auteur_id OR 
    auth.uid() = referent_projet_id OR
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role = ANY (ARRAY['direction'::text, 'admin'::text])
    )
  );

-- Suppression : Seuls auteur, direction et admin peuvent supprimer
CREATE POLICY "Utilisateurs autorisés peuvent supprimer les projets"
  ON projets
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = auteur_id OR
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role = ANY (ARRAY['direction'::text, 'admin'::text])
    )
  );

-- Politiques RLS pour la table projet_collaborateurs

-- Lecture : Tous peuvent voir les collaborateurs des projets
CREATE POLICY "Tous peuvent lire les collaborateurs de projet"
  ON projet_collaborateurs
  FOR SELECT
  TO authenticated
  USING (true);

-- Création : Auteur du projet, référent, direction et admin peuvent ajouter des collaborateurs
CREATE POLICY "Utilisateurs autorisés peuvent ajouter des collaborateurs"
  ON projet_collaborateurs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projets p 
      WHERE p.id = projet_id 
      AND (
        p.auteur_id = auth.uid() OR 
        p.referent_projet_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM user_profiles up 
          WHERE up.id = auth.uid() 
          AND up.role = ANY (ARRAY['direction'::text, 'admin'::text])
        )
      )
    )
  );

-- Modification : Mêmes droits que pour la création
CREATE POLICY "Utilisateurs autorisés peuvent modifier les collaborateurs"
  ON projet_collaborateurs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets p 
      WHERE p.id = projet_id 
      AND (
        p.auteur_id = auth.uid() OR 
        p.referent_projet_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM user_profiles up 
          WHERE up.id = auth.uid() 
          AND up.role = ANY (ARRAY['direction'::text, 'admin'::text])
        )
      )
    )
  );

-- Suppression : Mêmes droits que pour la création
CREATE POLICY "Utilisateurs autorisés peuvent supprimer les collaborateurs"
  ON projet_collaborateurs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets p 
      WHERE p.id = projet_id 
      AND (
        p.auteur_id = auth.uid() OR 
        p.referent_projet_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM user_profiles up 
          WHERE up.id = auth.uid() 
          AND up.role = ANY (ARRAY['direction'::text, 'admin'::text])
        )
      )
    )
  );

-- Triggers pour updated_at
CREATE TRIGGER update_projets_updated_at
  BEFORE UPDATE ON projets
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_projet_collaborateurs_updated_at
  BEFORE UPDATE ON projet_collaborateurs
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Triggers pour l'audit
CREATE TRIGGER projets_audit
  AFTER INSERT OR UPDATE OR DELETE ON projets
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER projet_collaborateurs_audit
  AFTER INSERT OR UPDATE OR DELETE ON projet_collaborateurs
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

-- Vue pour faciliter les requêtes avec les collaborateurs
CREATE OR REPLACE VIEW v_projets_complets AS
SELECT 
  p.*,
  up_auteur.full_name as auteur_nom,
  up_referent.full_name as referent_nom,
  up_referent.role as referent_role,
  COALESCE(
    json_agg(
      json_build_object(
        'id', pc.id,
        'employe_id', pc.employe_id,
        'employe_nom', up_collab.full_name,
        'employe_role', up_collab.role,
        'employe_department', up_collab.department,
        'role_projet', pc.role_projet,
        'taux_allocation', pc.taux_allocation,
        'responsabilites', pc.responsabilites,
        'date_debut', pc.date_debut,
        'date_fin', pc.date_fin,
        'is_active', pc.is_active
      ) ORDER BY up_collab.full_name
    ) FILTER (WHERE pc.id IS NOT NULL),
    '[]'::json
  ) as collaborateurs
FROM projets p
LEFT JOIN user_profiles up_auteur ON p.auteur_id = up_auteur.id
LEFT JOIN user_profiles up_referent ON p.referent_projet_id = up_referent.id
LEFT JOIN projet_collaborateurs pc ON p.id = pc.projet_id AND pc.is_active = true
LEFT JOIN user_profiles up_collab ON pc.employe_id = up_collab.id
GROUP BY 
  p.id, p.nom_client, p.titre, p.description, p.date_debut, p.date_fin_prevue,
  p.budget_estime, p.statut, p.priorite, p.taux_avancement, p.referent_projet_id,
  p.auteur_id, p.objectifs, p.risques, p.notes, p.version, p.is_archived,
  p.created_at, p.updated_at, up_auteur.full_name, up_referent.full_name, up_referent.role;