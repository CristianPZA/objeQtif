/*
  # Implémentation du workflow de validation des fiches

  1. Mise à jour des statuts
    - Ajout des nouveaux statuts : brouillon, en_attente, validee, finalisee, archivee, retour_demande
    - Mise à jour des contraintes et index

  2. Système de workflow
    - Règles de transition entre statuts
    - Validation des permissions selon les rôles
    - Interdiction de l'auto-validation

  3. Timeline statutaire
    - Table pour tracer l'historique des changements de statut
    - Fonctions pour gérer les transitions

  4. Contraintes métier
    - Commentaire obligatoire pour "retour_demande"
    - Blocage des retours arrière non autorisés
*/

-- =============================================
-- MISE À JOUR DES TYPES ÉNUMÉRÉS
-- =============================================

-- Mise à jour du type fiche_status avec les nouveaux statuts
DO $$ BEGIN
  -- Supprimer l'ancien type et le recréer avec les nouveaux statuts
  DROP TYPE IF EXISTS fiche_status CASCADE;
  CREATE TYPE fiche_status AS ENUM (
    'brouillon',
    'en_attente',
    'validee', 
    'finalisee',
    'archivee',
    'retour_demande'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- TABLE TIMELINE STATUTAIRE
-- =============================================

CREATE TABLE IF NOT EXISTS fiche_status_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  fiche_id uuid NOT NULL,
  ancien_statut fiche_status,
  nouveau_statut fiche_status NOT NULL,
  user_id uuid NOT NULL REFERENCES user_profiles(id),
  commentaire text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS fiche_status_timeline_fiche_idx ON fiche_status_timeline(table_name, fiche_id);
CREATE INDEX IF NOT EXISTS fiche_status_timeline_user_idx ON fiche_status_timeline(user_id);
CREATE INDEX IF NOT EXISTS fiche_status_timeline_created_idx ON fiche_status_timeline(created_at);

-- RLS pour la timeline
ALTER TABLE fiche_status_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read timeline of their fiches"
  ON fiche_status_timeline
  FOR SELECT
  TO authenticated
  USING (
    -- L'utilisateur peut voir la timeline de ses propres fiches
    EXISTS (
      SELECT 1 FROM fiches_annuelles fa 
      WHERE fa.id = fiche_id AND fa.auteur_id = auth.uid() AND table_name = 'fiches_annuelles'
    )
    OR
    EXISTS (
      SELECT 1 FROM fiches_projets fp 
      WHERE fp.id = fiche_id AND fp.auteur_id = auth.uid() AND table_name = 'fiches_projets'
    )
    OR
    -- Les évaluateurs/référents peuvent voir la timeline
    EXISTS (
      SELECT 1 FROM fiches_annuelles fa 
      WHERE fa.id = fiche_id AND fa.evaluateur_id = auth.uid() AND table_name = 'fiches_annuelles'
    )
    OR
    EXISTS (
      SELECT 1 FROM fiches_projets fp 
      WHERE fp.id = fiche_id AND fp.referent_id = auth.uid() AND table_name = 'fiches_projets'
    )
    OR
    -- Les rôles privilégiés peuvent voir toutes les timelines
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('coach_rh', 'direction', 'admin')
    )
  );

-- =============================================
-- FONCTIONS DE WORKFLOW
-- =============================================

-- Fonction pour valider les transitions de statut
CREATE OR REPLACE FUNCTION validate_status_transition(
  p_ancien_statut fiche_status,
  p_nouveau_statut fiche_status,
  p_user_role text,
  p_is_author boolean,
  p_is_evaluator boolean
)
RETURNS boolean AS $$
BEGIN
  -- Règles de transition selon le workflow
  CASE p_ancien_statut
    WHEN 'brouillon' THEN
      -- Depuis brouillon : peut aller vers en_attente (auteur seulement)
      IF p_nouveau_statut = 'en_attente' AND p_is_author THEN
        RETURN true;
      END IF;
      
    WHEN 'en_attente' THEN
      -- Depuis en_attente : peut aller vers validee (évaluateur) ou retour_demande (coach/référent)
      IF p_nouveau_statut = 'validee' AND p_is_evaluator AND NOT p_is_author THEN
        RETURN true;
      ELSIF p_nouveau_statut = 'retour_demande' AND p_user_role IN ('coach_rh', 'referent_projet', 'direction', 'admin') THEN
        RETURN true;
      END IF;
      
    WHEN 'validee' THEN
      -- Depuis validee : peut aller vers finalisee (évaluateur/coach/direction)
      IF p_nouveau_statut = 'finalisee' AND (p_is_evaluator OR p_user_role IN ('coach_rh', 'direction', 'admin')) THEN
        RETURN true;
      END IF;
      
    WHEN 'finalisee' THEN
      -- Depuis finalisee : peut aller vers archivee (coach/direction/admin)
      IF p_nouveau_statut = 'archivee' AND p_user_role IN ('coach_rh', 'direction', 'admin') THEN
        RETURN true;
      END IF;
      
    WHEN 'retour_demande' THEN
      -- Depuis retour_demande : peut retourner vers brouillon (auteur seulement)
      IF p_nouveau_statut = 'brouillon' AND p_is_author THEN
        RETURN true;
      END IF;
      
    WHEN 'archivee' THEN
      -- Depuis archivee : aucune transition autorisée
      RETURN false;
  END CASE;
  
  -- Si aucune règle ne correspond, la transition n'est pas autorisée
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour changer le statut d'une fiche
CREATE OR REPLACE FUNCTION change_fiche_status(
  p_table_name text,
  p_fiche_id uuid,
  p_nouveau_statut fiche_status,
  p_commentaire text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  current_user_id uuid;
  current_user_role text;
  ancien_statut fiche_status;
  auteur_id uuid;
  evaluateur_id uuid;
  is_author boolean := false;
  is_evaluator boolean := false;
BEGIN
  current_user_id := auth.uid();
  
  -- Récupérer le rôle de l'utilisateur actuel
  SELECT role INTO current_user_role
  FROM user_profiles 
  WHERE id = current_user_id;
  
  -- Récupérer les informations de la fiche selon la table
  IF p_table_name = 'fiches_annuelles' THEN
    SELECT statut, auteur_id, evaluateur_id 
    INTO ancien_statut, auteur_id, evaluateur_id
    FROM fiches_annuelles 
    WHERE id = p_fiche_id;
  ELSIF p_table_name = 'fiches_projets' THEN
    SELECT statut, auteur_id, referent_id 
    INTO ancien_statut, auteur_id, evaluateur_id
    FROM fiches_projets 
    WHERE id = p_fiche_id;
  ELSE
    RAISE EXCEPTION 'Table non supportée: %', p_table_name;
  END IF;
  
  IF ancien_statut IS NULL THEN
    RAISE EXCEPTION 'Fiche non trouvée';
  END IF;
  
  -- Déterminer si l'utilisateur est auteur ou évaluateur
  is_author := (current_user_id = auteur_id);
  is_evaluator := (current_user_id = evaluateur_id);
  
  -- Vérifier si le commentaire est obligatoire pour "retour_demande"
  IF p_nouveau_statut = 'retour_demande' AND (p_commentaire IS NULL OR trim(p_commentaire) = '') THEN
    RAISE EXCEPTION 'Un commentaire est obligatoire pour demander un retour';
  END IF;
  
  -- Valider la transition
  IF NOT validate_status_transition(ancien_statut, p_nouveau_statut, current_user_role, is_author, is_evaluator) THEN
    RAISE EXCEPTION 'Transition de statut non autorisée de % vers % pour le rôle %', ancien_statut, p_nouveau_statut, current_user_role;
  END IF;
  
  -- Effectuer la mise à jour
  IF p_table_name = 'fiches_annuelles' THEN
    UPDATE fiches_annuelles 
    SET statut = p_nouveau_statut,
        date_validation = CASE WHEN p_nouveau_statut = 'validee' THEN now() ELSE date_validation END
    WHERE id = p_fiche_id;
  ELSIF p_table_name = 'fiches_projets' THEN
    UPDATE fiches_projets 
    SET statut = p_nouveau_statut
    WHERE id = p_fiche_id;
  END IF;
  
  -- Enregistrer dans la timeline
  INSERT INTO fiche_status_timeline (
    table_name,
    fiche_id,
    ancien_statut,
    nouveau_statut,
    user_id,
    commentaire
  ) VALUES (
    p_table_name,
    p_fiche_id,
    ancien_statut,
    p_nouveau_statut,
    current_user_id,
    p_commentaire
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- MISE À JOUR DES TABLES EXISTANTES
-- =============================================

-- Recréer les colonnes statut avec le nouveau type
DO $$
BEGIN
  -- Fiches annuelles
  ALTER TABLE fiches_annuelles 
  ALTER COLUMN statut TYPE fiche_status USING statut::text::fiche_status;
  
  -- Fiches projets  
  ALTER TABLE fiches_projets 
  ALTER COLUMN statut TYPE fiche_status USING statut::text::fiche_status;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Si les colonnes n'existent pas encore, les créer
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiches_annuelles' AND column_name = 'statut') THEN
      ALTER TABLE fiches_annuelles ADD COLUMN statut fiche_status NOT NULL DEFAULT 'brouillon';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiches_projets' AND column_name = 'statut') THEN
      ALTER TABLE fiches_projets ADD COLUMN statut fiche_status NOT NULL DEFAULT 'brouillon';
    END IF;
END $$;

-- =============================================
-- TRIGGERS POUR WORKFLOW
-- =============================================

-- Fonction trigger pour valider les changements de statut
CREATE OR REPLACE FUNCTION validate_fiche_status_change()
RETURNS trigger AS $$
DECLARE
  current_user_id uuid;
  current_user_role text;
  is_author boolean := false;
  is_evaluator boolean := false;
BEGIN
  -- Si le statut n'a pas changé, pas de validation nécessaire
  IF OLD.statut = NEW.statut THEN
    RETURN NEW;
  END IF;
  
  current_user_id := auth.uid();
  
  -- Récupérer le rôle de l'utilisateur actuel
  SELECT role INTO current_user_role
  FROM user_profiles 
  WHERE id = current_user_id;
  
  -- Déterminer si l'utilisateur est auteur ou évaluateur
  is_author := (current_user_id = NEW.auteur_id);
  
  IF TG_TABLE_NAME = 'fiches_annuelles' THEN
    is_evaluator := (current_user_id = NEW.evaluateur_id);
  ELSIF TG_TABLE_NAME = 'fiches_projets' THEN
    is_evaluator := (current_user_id = NEW.referent_id);
  END IF;
  
  -- Valider la transition
  IF NOT validate_status_transition(OLD.statut, NEW.statut, current_user_role, is_author, is_evaluator) THEN
    RAISE EXCEPTION 'Transition de statut non autorisée de % vers % pour le rôle %', OLD.statut, NEW.statut, current_user_role;
  END IF;
  
  -- Enregistrer dans la timeline
  INSERT INTO fiche_status_timeline (
    table_name,
    fiche_id,
    ancien_statut,
    nouveau_statut,
    user_id,
    commentaire
  ) VALUES (
    TG_TABLE_NAME,
    NEW.id,
    OLD.statut,
    NEW.statut,
    current_user_id,
    CASE WHEN NEW.statut = 'retour_demande' THEN 'Changement de statut via trigger' ELSE NULL END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Appliquer les triggers
DROP TRIGGER IF EXISTS validate_fiches_annuelles_status ON fiches_annuelles;
CREATE TRIGGER validate_fiches_annuelles_status
  BEFORE UPDATE ON fiches_annuelles
  FOR EACH ROW
  EXECUTE FUNCTION validate_fiche_status_change();

DROP TRIGGER IF EXISTS validate_fiches_projets_status ON fiches_projets;
CREATE TRIGGER validate_fiches_projets_status
  BEFORE UPDATE ON fiches_projets
  FOR EACH ROW
  EXECUTE FUNCTION validate_fiche_status_change();

-- =============================================
-- MISE À JOUR DES POLITIQUES RLS
-- =============================================

-- Mise à jour des politiques pour fiches_annuelles
DROP POLICY IF EXISTS "Authors and evaluators can update fiches annuelles" ON fiches_annuelles;
CREATE POLICY "Authors and evaluators can update fiches annuelles"
  ON fiches_annuelles
  FOR UPDATE
  TO authenticated
  USING (
    -- Auteur peut modifier si statut = brouillon ou retour_demande
    (auth.uid() = auteur_id AND statut IN ('brouillon', 'retour_demande')) OR
    -- Évaluateur peut modifier si statut = en_attente (pour validation)
    (auth.uid() = evaluateur_id AND statut = 'en_attente') OR
    -- Rôles privilégiés peuvent toujours modifier
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('coach_rh', 'direction', 'admin')
    )
  );

-- Mise à jour des politiques pour fiches_projets
DROP POLICY IF EXISTS "Authors and referents can update fiches projets" ON fiches_projets;
CREATE POLICY "Authors and referents can update fiches projets"
  ON fiches_projets
  FOR UPDATE
  TO authenticated
  USING (
    -- Auteur peut modifier si statut = brouillon ou retour_demande
    (auth.uid() = auteur_id AND statut IN ('brouillon', 'retour_demande')) OR
    -- Référent peut modifier si statut = en_attente (pour validation)
    (auth.uid() = referent_id AND statut = 'en_attente') OR
    -- Rôles privilégiés peuvent toujours modifier
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('referent_projet', 'direction', 'admin')
    )
  );

-- =============================================
-- VUES POUR LE WORKFLOW
-- =============================================

-- Vue pour afficher la timeline complète d'une fiche
CREATE OR REPLACE VIEW v_fiche_timeline AS
SELECT 
  fst.id,
  fst.table_name,
  fst.fiche_id,
  fst.ancien_statut,
  fst.nouveau_statut,
  fst.commentaire,
  fst.created_at,
  up.full_name as user_name,
  up.role as user_role,
  -- Informations sur la fiche selon le type
  CASE 
    WHEN fst.table_name = 'fiches_annuelles' THEN fa.annee::text
    WHEN fst.table_name = 'fiches_projets' THEN fp.titre
  END as fiche_title
FROM fiche_status_timeline fst
LEFT JOIN user_profiles up ON fst.user_id = up.id
LEFT JOIN fiches_annuelles fa ON fst.table_name = 'fiches_annuelles' AND fst.fiche_id = fa.id
LEFT JOIN fiches_projets fp ON fst.table_name = 'fiches_projets' AND fst.fiche_id = fp.id
ORDER BY fst.created_at DESC;

-- Vue pour les actions possibles selon le statut et le rôle
CREATE OR REPLACE VIEW v_workflow_actions AS
SELECT 
  'fiches_annuelles' as table_name,
  fa.id as fiche_id,
  fa.statut as current_status,
  fa.auteur_id,
  fa.evaluateur_id,
  up_auteur.full_name as auteur_name,
  up_eval.full_name as evaluateur_name,
  -- Actions possibles selon le statut
  CASE fa.statut
    WHEN 'brouillon' THEN '["soumettre"]'::jsonb
    WHEN 'en_attente' THEN '["valider", "demander_retour"]'::jsonb
    WHEN 'validee' THEN '["finaliser"]'::jsonb
    WHEN 'finalisee' THEN '["archiver"]'::jsonb
    WHEN 'retour_demande' THEN '["modifier"]'::jsonb
    WHEN 'archivee' THEN '[]'::jsonb
  END as actions_possibles
FROM fiches_annuelles fa
LEFT JOIN user_profiles up_auteur ON fa.auteur_id = up_auteur.id
LEFT JOIN user_profiles up_eval ON fa.evaluateur_id = up_eval.id

UNION ALL

SELECT 
  'fiches_projets' as table_name,
  fp.id as fiche_id,
  fp.statut as current_status,
  fp.auteur_id,
  fp.referent_id as evaluateur_id,
  up_auteur.full_name as auteur_name,
  up_ref.full_name as evaluateur_name,
  -- Actions possibles selon le statut
  CASE fp.statut
    WHEN 'brouillon' THEN '["soumettre"]'::jsonb
    WHEN 'en_attente' THEN '["valider", "demander_retour"]'::jsonb
    WHEN 'validee' THEN '["finaliser"]'::jsonb
    WHEN 'finalisee' THEN '["archiver"]'::jsonb
    WHEN 'retour_demande' THEN '["modifier"]'::jsonb
    WHEN 'archivee' THEN '[]'::jsonb
  END as actions_possibles
FROM fiches_projets fp
LEFT JOIN user_profiles up_auteur ON fp.auteur_id = up_auteur.id
LEFT JOIN user_profiles up_ref ON fp.referent_id = up_ref.id;

-- =============================================
-- FONCTIONS UTILITAIRES POUR L'INTERFACE
-- =============================================

-- Fonction pour obtenir les actions possibles pour un utilisateur sur une fiche
CREATE OR REPLACE FUNCTION get_user_actions_for_fiche(
  p_table_name text,
  p_fiche_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  current_user_id uuid;
  user_role text;
  fiche_status fiche_status;
  auteur_id uuid;
  evaluateur_id uuid;
  actions jsonb := '[]';
BEGIN
  current_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Récupérer le rôle de l'utilisateur
  SELECT role INTO user_role
  FROM user_profiles 
  WHERE id = current_user_id;
  
  -- Récupérer les informations de la fiche
  IF p_table_name = 'fiches_annuelles' THEN
    SELECT statut, auteur_id, evaluateur_id 
    INTO fiche_status, auteur_id, evaluateur_id
    FROM fiches_annuelles 
    WHERE id = p_fiche_id;
  ELSIF p_table_name = 'fiches_projets' THEN
    SELECT statut, auteur_id, referent_id 
    INTO fiche_status, auteur_id, evaluateur_id
    FROM fiches_projets 
    WHERE id = p_fiche_id;
  END IF;
  
  -- Déterminer les actions possibles selon le statut et le rôle
  CASE fiche_status
    WHEN 'brouillon' THEN
      IF current_user_id = auteur_id THEN
        actions := '["soumettre"]';
      END IF;
      
    WHEN 'en_attente' THEN
      IF current_user_id = evaluateur_id AND current_user_id != auteur_id THEN
        actions := '["valider"]';
      END IF;
      IF user_role IN ('coach_rh', 'referent_projet', 'direction', 'admin') THEN
        actions := actions || '["demander_retour"]';
      END IF;
      
    WHEN 'validee' THEN
      IF current_user_id = evaluateur_id OR user_role IN ('coach_rh', 'direction', 'admin') THEN
        actions := '["finaliser"]';
      END IF;
      
    WHEN 'finalisee' THEN
      IF user_role IN ('coach_rh', 'direction', 'admin') THEN
        actions := '["archiver"]';
      END IF;
      
    WHEN 'retour_demande' THEN
      IF current_user_id = auteur_id THEN
        actions := '["modifier"]';
      END IF;
  END CASE;
  
  RETURN actions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;