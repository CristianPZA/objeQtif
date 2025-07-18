/*
  # Schéma complet pour objeQtive

  1. Tables créées
    - `user_profiles` - Profils utilisateurs multi-rôles
    - `fiches_annuelles` - Évaluations annuelles avec auto-évaluation
    - `fiches_projets` - Gestion complète des projets
    - `notifications` - Système de notifications
    - `historique_versions` - Versioning avec diff avant/après
    - `archives` - Archives non supprimables
    - `audit_logs` - Traçabilité complète

  2. Sécurité
    - RLS activé sur toutes les tables
    - Politiques granulaires par rôle
    - Audit automatique de toutes les opérations
    - Versioning automatique avec calcul des différences

  3. Fonctionnalités
    - Archivage sécurisé permanent
    - Droit à l'oubli limité au compte complet
    - Notifications avec priorités
    - Vues utiles pour reporting
*/

-- =============================================
-- FONCTIONS UTILITAIRES
-- =============================================

-- Fonction pour gérer updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour calculer les différences JSON
CREATE OR REPLACE FUNCTION calculate_json_diff(old_data jsonb, new_data jsonb)
RETURNS jsonb AS $$
DECLARE
  diff_result jsonb := '{}';
  key text;
BEGIN
  -- Parcourir les clés de l'ancien objet
  FOR key IN SELECT jsonb_object_keys(old_data)
  LOOP
    IF old_data->key != new_data->key THEN
      diff_result := diff_result || jsonb_build_object(
        key, jsonb_build_object(
          'avant', old_data->key,
          'apres', new_data->key
        )
      );
    END IF;
  END LOOP;
  
  -- Parcourir les nouvelles clés
  FOR key IN SELECT jsonb_object_keys(new_data)
  LOOP
    IF NOT old_data ? key THEN
      diff_result := diff_result || jsonb_build_object(
        key, jsonb_build_object(
          'avant', null,
          'apres', new_data->key
        )
      );
    END IF;
  END LOOP;
  
  RETURN diff_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TYPES ÉNUMÉRÉS
-- =============================================

-- Rôles utilisateurs
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'employe',
    'referent_projet', 
    'coach_rh',
    'direction',
    'admin'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Types de notifications
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'info',
    'warning',
    'success',
    'error',
    'reminder'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Actions d'audit
DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'CREATE',
    'READ',
    'UPDATE',
    'DELETE',
    'ARCHIVE',
    'LOGIN',
    'LOGOUT',
    'EXPORT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- TABLE UTILISATEURS (MISE À JOUR)
-- =============================================

-- Ajouter les nouvelles colonnes à user_profiles si elles n'existent pas
DO $$
BEGIN
  -- Ajouter email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email text;
  END IF;

  -- Ajouter phone
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN phone text;
  END IF;

  -- Ajouter department
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'department'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN department text;
  END IF;

  -- Ajouter manager_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN manager_id uuid REFERENCES user_profiles(id);
  END IF;

  -- Ajouter is_active
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;

  -- Ajouter last_login
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_login timestamptz;
  END IF;

  -- Ajouter preferences
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'preferences'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN preferences jsonb DEFAULT '{}';
  END IF;
END $$;

-- Mettre à jour le type de la colonne role si nécessaire
DO $$
BEGIN
  -- Vérifier si la colonne role existe et la mettre à jour
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    -- Supprimer la contrainte existante si elle existe
    ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
    
    -- Ajouter la nouvelle contrainte avec tous les rôles
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
    CHECK (role = ANY (ARRAY['employe'::text, 'referent_projet'::text, 'coach_rh'::text, 'direction'::text, 'admin'::text]));
  END IF;
END $$;

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS user_profiles_manager_idx ON user_profiles(manager_id);
CREATE INDEX IF NOT EXISTS user_profiles_active_idx ON user_profiles(is_active);

-- Supprimer les anciennes politiques pour les recréer
DROP POLICY IF EXISTS "Users can read their own profile and their team" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Nouvelles politiques RLS pour user_profiles
CREATE POLICY "Users can read their own profile and their team"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    auth.uid() = manager_id OR
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('coach_rh', 'direction', 'admin')
    )
  );

CREATE POLICY "Users can update their own profile or managers can update team"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('coach_rh', 'direction', 'admin')
    )
  );

-- =============================================
-- TABLE FICHES ANNUELLES
-- =============================================

CREATE TABLE IF NOT EXISTS fiches_annuelles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auteur_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  evaluateur_id uuid REFERENCES user_profiles(id),
  annee integer NOT NULL,
  objectifs jsonb NOT NULL DEFAULT '[]',
  competences jsonb NOT NULL DEFAULT '{}',
  auto_evaluation jsonb DEFAULT '{}',
  evaluation_manager jsonb DEFAULT '{}',
  evaluation_rh jsonb DEFAULT '{}',
  commentaires text,
  statut fiche_status NOT NULL DEFAULT 'brouillon',
  date_validation timestamptz,
  version integer NOT NULL DEFAULT 1,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(auteur_id, annee, version)
);

-- Index
CREATE INDEX IF NOT EXISTS fiches_annuelles_auteur_idx ON fiches_annuelles(auteur_id);
CREATE INDEX IF NOT EXISTS fiches_annuelles_evaluateur_idx ON fiches_annuelles(evaluateur_id);
CREATE INDEX IF NOT EXISTS fiches_annuelles_annee_idx ON fiches_annuelles(annee);
CREATE INDEX IF NOT EXISTS fiches_annuelles_statut_idx ON fiches_annuelles(statut);

-- RLS
ALTER TABLE fiches_annuelles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors and evaluators can read fiches annuelles"
  ON fiches_annuelles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = auteur_id OR
    auth.uid() = evaluateur_id OR
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('coach_rh', 'direction', 'admin')
    )
  );

CREATE POLICY "Authors can create their fiches annuelles"
  ON fiches_annuelles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auteur_id);

CREATE POLICY "Authors and evaluators can update fiches annuelles"
  ON fiches_annuelles
  FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = auteur_id AND statut IN ('brouillon', 'refusee')) OR
    (auth.uid() = evaluateur_id AND statut = 'en_validation') OR
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('coach_rh', 'direction', 'admin')
    )
  );

-- =============================================
-- TABLE FICHES PROJETS
-- =============================================

CREATE TABLE IF NOT EXISTS fiches_projets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auteur_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  referent_id uuid REFERENCES user_profiles(id),
  titre text NOT NULL,
  description text NOT NULL,
  objectifs jsonb NOT NULL DEFAULT '[]',
  ressources jsonb DEFAULT '{}',
  planning jsonb DEFAULT '{}',
  budget_estime numeric(10,2),
  risques jsonb DEFAULT '[]',
  indicateurs jsonb DEFAULT '[]',
  statut fiche_status NOT NULL DEFAULT 'brouillon',
  date_debut date,
  date_fin_prevue date,
  date_fin_reelle date,
  taux_avancement integer DEFAULT 0 CHECK (taux_avancement >= 0 AND taux_avancement <= 100),
  version integer NOT NULL DEFAULT 1,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS fiches_projets_auteur_idx ON fiches_projets(auteur_id);
CREATE INDEX IF NOT EXISTS fiches_projets_referent_idx ON fiches_projets(referent_id);
CREATE INDEX IF NOT EXISTS fiches_projets_statut_idx ON fiches_projets(statut);
CREATE INDEX IF NOT EXISTS fiches_projets_dates_idx ON fiches_projets(date_debut, date_fin_prevue);

-- RLS
ALTER TABLE fiches_projets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project stakeholders can read fiches projets"
  ON fiches_projets
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = auteur_id OR
    auth.uid() = referent_id OR
    statut = 'validee' OR
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('referent_projet', 'direction', 'admin')
    )
  );

CREATE POLICY "Authors can create fiches projets"
  ON fiches_projets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auteur_id);

CREATE POLICY "Authors and referents can update fiches projets"
  ON fiches_projets
  FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = auteur_id AND statut IN ('brouillon', 'refusee')) OR
    (auth.uid() = referent_id) OR
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('referent_projet', 'direction', 'admin')
    )
  );

-- =============================================
-- TABLE NOTIFICATIONS
-- =============================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destinataire_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  expediteur_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  titre text NOT NULL,
  message text NOT NULL,
  type notification_type NOT NULL DEFAULT 'info',
  priority integer NOT NULL DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  is_read boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  action_url text,
  metadata jsonb DEFAULT '{}',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

-- Index
CREATE INDEX IF NOT EXISTS notifications_destinataire_idx ON notifications(destinataire_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(is_read);
CREATE INDEX IF NOT EXISTS notifications_type_idx ON notifications(type);
CREATE INDEX IF NOT EXISTS notifications_priority_idx ON notifications(priority);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = destinataire_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = destinataire_id);

CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = expediteur_id OR
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'direction', 'coach_rh')
    )
  );

-- =============================================
-- TABLE HISTORIQUE VERSIONS
-- =============================================

CREATE TABLE IF NOT EXISTS historique_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  version_number integer NOT NULL,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  action audit_action NOT NULL,
  data_before jsonb,
  data_after jsonb,
  diff jsonb,
  comment text,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(table_name, record_id, version_number)
);

-- Index
CREATE INDEX IF NOT EXISTS historique_versions_table_record_idx ON historique_versions(table_name, record_id);
CREATE INDEX IF NOT EXISTS historique_versions_user_idx ON historique_versions(user_id);
CREATE INDEX IF NOT EXISTS historique_versions_action_idx ON historique_versions(action);
CREATE INDEX IF NOT EXISTS historique_versions_created_idx ON historique_versions(created_at);

-- RLS
ALTER TABLE historique_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read version history of their records"
  ON historique_versions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'direction', 'coach_rh')
    )
  );

-- =============================================
-- TABLE ARCHIVES
-- =============================================

CREATE TABLE IF NOT EXISTS archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  original_data jsonb NOT NULL,
  archived_by uuid NOT NULL REFERENCES user_profiles(id),
  archive_reason text,
  retention_until timestamptz,
  is_permanent boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(table_name, record_id)
);

-- Index
CREATE INDEX IF NOT EXISTS archives_table_record_idx ON archives(table_name, record_id);
CREATE INDEX IF NOT EXISTS archives_archived_by_idx ON archives(archived_by);
CREATE INDEX IF NOT EXISTS archives_retention_idx ON archives(retention_until);

-- RLS
ALTER TABLE archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can read archives"
  ON archives
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'direction', 'coach_rh')
    )
  );

CREATE POLICY "Authorized users can create archives"
  ON archives
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = archived_by AND
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'direction', 'coach_rh')
    )
  );

-- =============================================
-- TABLE AUDIT LOGS
-- =============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  session_id text,
  action audit_action NOT NULL,
  table_name text,
  record_id uuid,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_table_idx ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS audit_logs_session_idx ON audit_logs(session_id);

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('admin', 'direction')
    )
  );

CREATE POLICY "Users can read their own audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- TRIGGERS POUR VERSIONING ET AUDIT
-- =============================================

-- Fonction pour créer l'historique des versions
CREATE OR REPLACE FUNCTION create_version_history()
RETURNS trigger AS $$
DECLARE
  current_user_id uuid;
  version_num integer;
  diff_data jsonb;
BEGIN
  -- Récupérer l'utilisateur actuel
  current_user_id := auth.uid();
  
  -- Calculer le numéro de version
  SELECT COALESCE(MAX(version_number), 0) + 1 
  INTO version_num
  FROM historique_versions 
  WHERE table_name = TG_TABLE_NAME AND record_id = NEW.id;
  
  -- Calculer les différences pour UPDATE
  IF TG_OP = 'UPDATE' THEN
    diff_data := calculate_json_diff(to_jsonb(OLD), to_jsonb(NEW));
  END IF;
  
  -- Insérer dans l'historique
  INSERT INTO historique_versions (
    table_name,
    record_id,
    version_number,
    user_id,
    action,
    data_before,
    data_after,
    diff,
    ip_address
  ) VALUES (
    TG_TABLE_NAME,
    NEW.id,
    version_num,
    current_user_id,
    TG_OP::audit_action,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW),
    diff_data,
    inet_client_addr()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour l'audit automatique
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS trigger AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    details,
    ip_address
  ) VALUES (
    current_user_id,
    TG_OP::audit_action,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'old', CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
      'new', CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
    ),
    inet_client_addr()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Appliquer les triggers sur les tables principales
DROP TRIGGER IF EXISTS fiches_annuelles_version_history ON fiches_annuelles;
CREATE TRIGGER fiches_annuelles_version_history
  AFTER INSERT OR UPDATE ON fiches_annuelles
  FOR EACH ROW
  EXECUTE FUNCTION create_version_history();

DROP TRIGGER IF EXISTS fiches_projets_version_history ON fiches_projets;
CREATE TRIGGER fiches_projets_version_history
  AFTER INSERT OR UPDATE ON fiches_projets
  FOR EACH ROW
  EXECUTE FUNCTION create_version_history();

DROP TRIGGER IF EXISTS user_profiles_audit ON user_profiles;
CREATE TRIGGER user_profiles_audit
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

DROP TRIGGER IF EXISTS fiches_annuelles_audit ON fiches_annuelles;
CREATE TRIGGER fiches_annuelles_audit
  AFTER INSERT OR UPDATE OR DELETE ON fiches_annuelles
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

DROP TRIGGER IF EXISTS fiches_projets_audit ON fiches_projets;
CREATE TRIGGER fiches_projets_audit
  AFTER INSERT OR UPDATE OR DELETE ON fiches_projets
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_fiches_annuelles_updated_at ON fiches_annuelles;
CREATE TRIGGER update_fiches_annuelles_updated_at
  BEFORE UPDATE ON fiches_annuelles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS update_fiches_projets_updated_at ON fiches_projets;
CREATE TRIGGER update_fiches_projets_updated_at
  BEFORE UPDATE ON fiches_projets
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- =============================================
-- FONCTIONS UTILITAIRES MÉTIER
-- =============================================

-- Fonction pour archiver une fiche
CREATE OR REPLACE FUNCTION archive_fiche(
  p_table_name text,
  p_record_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  record_data jsonb;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Vérifier les permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = current_user_id 
    AND role IN ('admin', 'direction', 'coach_rh')
  ) THEN
    RAISE EXCEPTION 'Permission denied for archiving';
  END IF;
  
  -- Récupérer les données selon la table
  EXECUTE format('SELECT to_jsonb(t.*) FROM %I t WHERE id = $1', p_table_name)
  INTO record_data
  USING p_record_id;
  
  IF record_data IS NULL THEN
    RAISE EXCEPTION 'Record not found';
  END IF;
  
  -- Insérer dans les archives
  INSERT INTO archives (
    table_name,
    record_id,
    original_data,
    archived_by,
    archive_reason
  ) VALUES (
    p_table_name,
    p_record_id,
    record_data,
    current_user_id,
    p_reason
  );
  
  -- Marquer comme archivé dans la table source
  EXECUTE format('UPDATE %I SET is_archived = true, statut = ''archivee'' WHERE id = $1', p_table_name)
  USING p_record_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour créer une notification
CREATE OR REPLACE FUNCTION create_notification(
  p_destinataire_id uuid,
  p_titre text,
  p_message text,
  p_type notification_type DEFAULT 'info',
  p_priority integer DEFAULT 1,
  p_action_url text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO notifications (
    destinataire_id,
    expediteur_id,
    titre,
    message,
    type,
    priority,
    action_url
  ) VALUES (
    p_destinataire_id,
    auth.uid(),
    p_titre,
    p_message,
    p_type,
    p_priority,
    p_action_url
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- VUES UTILES
-- =============================================

-- Vue pour les fiches avec informations utilisateur
CREATE OR REPLACE VIEW v_fiches_complete AS
SELECT 
  'annuelle' as type_fiche,
  fa.id,
  fa.auteur_id,
  up_auteur.full_name as auteur_nom,
  up_auteur.role as auteur_role,
  fa.evaluateur_id,
  up_eval.full_name as evaluateur_nom,
  fa.annee,
  fa.statut,
  fa.version,
  fa.is_archived,
  fa.created_at,
  fa.updated_at
FROM fiches_annuelles fa
LEFT JOIN user_profiles up_auteur ON fa.auteur_id = up_auteur.id
LEFT JOIN user_profiles up_eval ON fa.evaluateur_id = up_eval.id

UNION ALL

SELECT 
  'projet' as type_fiche,
  fp.id,
  fp.auteur_id,
  up_auteur.full_name as auteur_nom,
  up_auteur.role as auteur_role,
  fp.referent_id as evaluateur_id,
  up_ref.full_name as evaluateur_nom,
  EXTRACT(YEAR FROM fp.date_debut)::integer as annee,
  fp.statut,
  fp.version,
  fp.is_archived,
  fp.created_at,
  fp.updated_at
FROM fiches_projets fp
LEFT JOIN user_profiles up_auteur ON fp.auteur_id = up_auteur.id
LEFT JOIN user_profiles up_ref ON fp.referent_id = up_ref.id;

-- Vue pour les statistiques utilisateur
CREATE OR REPLACE VIEW v_user_stats AS
SELECT 
  up.id,
  up.full_name,
  up.role,
  COUNT(DISTINCT fa.id) as fiches_annuelles_count,
  COUNT(DISTINCT fp.id) as fiches_projets_count,
  COUNT(DISTINCT CASE WHEN fa.statut = 'validee' THEN fa.id END) as fiches_annuelles_validees,
  COUNT(DISTINCT CASE WHEN fp.statut = 'validee' THEN fp.id END) as fiches_projets_validees,
  COUNT(DISTINCT n.id) as notifications_non_lues
FROM user_profiles up
LEFT JOIN fiches_annuelles fa ON up.id = fa.auteur_id AND NOT fa.is_archived
LEFT JOIN fiches_projets fp ON up.id = fp.auteur_id AND NOT fp.is_archived
LEFT JOIN notifications n ON up.id = n.destinataire_id AND NOT n.is_read AND NOT n.is_archived
GROUP BY up.id, up.full_name, up.role;

-- =============================================
-- FONCTION DE NETTOYAGE (DROIT À L'OUBLI)
-- =============================================

-- Fonction pour supprimer complètement un utilisateur (droit à l'oubli)
CREATE OR REPLACE FUNCTION delete_user_completely(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Vérifier que c'est l'utilisateur lui-même ou un admin
  IF current_user_id != p_user_id AND NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = current_user_id 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied for user deletion';
  END IF;
  
  -- Supprimer dans l'ordre des dépendances
  DELETE FROM notifications WHERE destinataire_id = p_user_id OR expediteur_id = p_user_id;
  DELETE FROM audit_logs WHERE user_id = p_user_id;
  DELETE FROM historique_versions WHERE user_id = p_user_id;
  DELETE FROM archives WHERE archived_by = p_user_id;
  DELETE FROM fiches_annuelles WHERE auteur_id = p_user_id OR evaluateur_id = p_user_id;
  DELETE FROM fiches_projets WHERE auteur_id = p_user_id OR referent_id = p_user_id;
  DELETE FROM user_profiles WHERE id = p_user_id;
  
  -- Supprimer de auth.users (cascade)
  DELETE FROM auth.users WHERE id = p_user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;