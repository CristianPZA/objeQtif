/*
  # Système d'auto-évaluation des objectifs projets

  1. Mise à jour de la table evaluations_objectifs
    - Ajout de nouveaux statuts pour l'auto-évaluation
    - Amélioration de la structure des données d'évaluation
  
  2. Nouvelles politiques RLS
    - Permettre aux collaborateurs de créer et modifier leurs auto-évaluations
    - Permettre aux référents et coaches de consulter les évaluations
  
  3. Fonctions utilitaires
    - Fonction pour calculer les scores moyens d'évaluation
    - Fonction pour notifier les référents des nouvelles évaluations
*/

-- Mise à jour de l'enum des statuts d'évaluation
DO $$
BEGIN
  -- Vérifier si l'enum existe et le mettre à jour
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fiche_status') THEN
    -- Ajouter les nouveaux statuts s'ils n'existent pas
    BEGIN
      ALTER TYPE fiche_status ADD VALUE IF NOT EXISTS 'en_attente';
      ALTER TYPE fiche_status ADD VALUE IF NOT EXISTS 'validee_referent';
      ALTER TYPE fiche_status ADD VALUE IF NOT EXISTS 'validee_coach';
      ALTER TYPE fiche_status ADD VALUE IF NOT EXISTS 'finalisee';
    EXCEPTION
      WHEN duplicate_object THEN
        -- Les valeurs existent déjà, continuer
        NULL;
    END;
  ELSE
    -- Créer l'enum s'il n'existe pas
    CREATE TYPE fiche_status AS ENUM (
      'brouillon',
      'soumise', 
      'en_attente',
      'validee',
      'validee_referent',
      'validee_coach',
      'finalisee',
      'rejetee'
    );
  END IF;
END $$;

-- Mise à jour de la contrainte de statut pour evaluations_objectifs
DO $$
BEGIN
  -- Supprimer l'ancienne contrainte si elle existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'evaluations_objectifs_statut_check' 
    AND table_name = 'evaluations_objectifs'
  ) THEN
    ALTER TABLE evaluations_objectifs DROP CONSTRAINT evaluations_objectifs_statut_check;
  END IF;
  
  -- Ajouter la nouvelle contrainte
  ALTER TABLE evaluations_objectifs ADD CONSTRAINT evaluations_objectifs_statut_check 
  CHECK (statut = ANY (ARRAY[
    'brouillon'::fiche_status, 
    'soumise'::fiche_status,
    'en_attente'::fiche_status, 
    'validee'::fiche_status,
    'validee_referent'::fiche_status,
    'validee_coach'::fiche_status,
    'finalisee'::fiche_status,
    'rejetee'::fiche_status
  ]));
END $$;

-- Fonction pour calculer le score moyen d'une auto-évaluation
CREATE OR REPLACE FUNCTION calculate_average_evaluation_score(evaluation_data jsonb)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  total_score numeric := 0;
  evaluation_count integer := 0;
  evaluation jsonb;
BEGIN
  -- Parcourir les évaluations dans le JSON
  FOR evaluation IN SELECT jsonb_array_elements(evaluation_data->'evaluations')
  LOOP
    IF evaluation ? 'auto_evaluation_score' THEN
      total_score := total_score + (evaluation->>'auto_evaluation_score')::numeric;
      evaluation_count := evaluation_count + 1;
    END IF;
  END LOOP;
  
  -- Retourner la moyenne ou 0 si aucune évaluation
  IF evaluation_count > 0 THEN
    RETURN ROUND(total_score / evaluation_count, 2);
  ELSE
    RETURN 0;
  END IF;
END;
$$;

-- Fonction pour notifier les référents des nouvelles auto-évaluations
CREATE OR REPLACE FUNCTION notify_referent_of_evaluation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  projet_info record;
  collaborateur_info record;
  avg_score numeric;
BEGIN
  -- Récupérer les informations du projet et du collaborateur
  SELECT 
    p.titre as projet_titre,
    p.nom_client,
    p.referent_projet_id,
    pc.employe_id,
    up.full_name as employe_nom
  INTO projet_info
  FROM objectifs_collaborateurs oc
  JOIN projet_collaborateurs pc ON pc.id = oc.collaboration_id
  JOIN projets p ON p.id = pc.projet_id
  JOIN user_profiles up ON up.id = pc.employe_id
  WHERE oc.id = NEW.objectifs_id;
  
  -- Calculer le score moyen
  avg_score := calculate_average_evaluation_score(NEW.auto_evaluation);
  
  -- Créer une notification pour le référent projet
  IF projet_info.referent_projet_id IS NOT NULL AND NEW.statut = 'soumise' THEN
    INSERT INTO notifications (
      destinataire_id,
      expediteur_id,
      titre,
      message,
      type,
      priority,
      action_url,
      metadata
    ) VALUES (
      projet_info.referent_projet_id,
      projet_info.employe_id,
      'Nouvelle auto-évaluation à examiner',
      format(
        '%s a soumis son auto-évaluation pour le projet "%s" (Client: %s). Score moyen: %s/5.',
        projet_info.employe_nom,
        projet_info.projet_titre,
        projet_info.nom_client,
        avg_score
      ),
      'info',
      2,
      '/fiches-projets',
      jsonb_build_object(
        'evaluation_id', NEW.id,
        'projet_titre', projet_info.projet_titre,
        'employe_nom', projet_info.employe_nom,
        'score_moyen', avg_score,
        'action_type', 'review_evaluation'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger pour notifier les référents
DROP TRIGGER IF EXISTS notify_referent_evaluation ON evaluations_objectifs;
CREATE TRIGGER notify_referent_evaluation
  AFTER INSERT OR UPDATE ON evaluations_objectifs
  FOR EACH ROW
  WHEN (NEW.statut = 'soumise' AND (OLD.statut IS NULL OR OLD.statut != 'soumise'))
  EXECUTE FUNCTION notify_referent_of_evaluation();

-- Mise à jour des politiques RLS pour evaluations_objectifs

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Collaborateurs peuvent créer leurs auto-évaluations" ON evaluations_objectifs;
DROP POLICY IF EXISTS "Collaborateurs peuvent gérer leurs évaluations" ON evaluations_objectifs;
DROP POLICY IF EXISTS "Référents peuvent évaluer leurs projets" ON evaluations_objectifs;
DROP POLICY IF EXISTS "Coaches peuvent évaluer leurs coachés" ON evaluations_objectifs;
DROP POLICY IF EXISTS "Admins can manage all evaluations" ON evaluations_objectifs;

-- Nouvelles politiques plus spécifiques

-- Les collaborateurs peuvent créer leurs auto-évaluations
CREATE POLICY "Collaborateurs peuvent créer auto-évaluations"
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

-- Les collaborateurs peuvent lire et modifier leurs propres évaluations (seulement si statut permet)
CREATE POLICY "Collaborateurs peuvent gérer leurs auto-évaluations"
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM objectifs_collaborateurs oc
      JOIN projet_collaborateurs pc ON pc.id = oc.collaboration_id
      WHERE oc.id = objectifs_id 
      AND pc.employe_id = auth.uid()
    )
  );

-- Les référents peuvent lire et évaluer les auto-évaluations de leurs projets
CREATE POLICY "Référents peuvent examiner auto-évaluations"
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM objectifs_collaborateurs oc
      JOIN projet_collaborateurs pc ON pc.id = oc.collaboration_id
      JOIN projets p ON p.id = pc.projet_id
      WHERE oc.id = objectifs_id 
      AND (p.referent_projet_id = auth.uid() OR p.auteur_id = auth.uid())
    )
  );

-- Les coaches peuvent lire et évaluer les auto-évaluations de leurs coachés
CREATE POLICY "Coaches peuvent examiner auto-évaluations coachés"
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM objectifs_collaborateurs oc
      JOIN projet_collaborateurs pc ON pc.id = oc.collaboration_id
      JOIN user_profiles up ON up.id = pc.employe_id
      WHERE oc.id = objectifs_id 
      AND up.coach_id = auth.uid()
    )
  );

-- Les admins peuvent tout gérer
CREATE POLICY "Admins peuvent gérer toutes auto-évaluations"
  ON evaluations_objectifs
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Index pour améliorer les performances des requêtes d'auto-évaluation
CREATE INDEX IF NOT EXISTS evaluations_objectifs_auto_evaluation_idx 
ON evaluations_objectifs USING gin (auto_evaluation);

CREATE INDEX IF NOT EXISTS evaluations_objectifs_date_soumission_idx 
ON evaluations_objectifs (date_soumission DESC);

-- Vue pour faciliter les requêtes d'auto-évaluations avec informations complètes
CREATE OR REPLACE VIEW v_auto_evaluations_completes AS
SELECT 
  eo.id as evaluation_id,
  eo.objectifs_id,
  eo.auto_evaluation,
  eo.evaluation_referent,
  eo.evaluation_coach,
  eo.statut,
  eo.date_soumission,
  eo.created_at,
  eo.updated_at,
  
  -- Informations du collaborateur
  pc.employe_id,
  up.full_name as employe_nom,
  up.role as employe_role,
  
  -- Informations du projet
  p.id as projet_id,
  p.titre as projet_titre,
  p.nom_client,
  p.statut as projet_statut,
  p.referent_projet_id,
  
  -- Informations des objectifs
  oc.objectifs,
  
  -- Score moyen calculé
  calculate_average_evaluation_score(eo.auto_evaluation) as score_moyen
  
FROM evaluations_objectifs eo
JOIN objectifs_collaborateurs oc ON oc.id = eo.objectifs_id
JOIN projet_collaborateurs pc ON pc.id = oc.collaboration_id
JOIN user_profiles up ON up.id = pc.employe_id
JOIN projets p ON p.id = pc.projet_id;

-- Commentaires
COMMENT ON FUNCTION calculate_average_evaluation_score(jsonb) IS 'Calcule le score moyen d''une auto-évaluation à partir des données JSON';
COMMENT ON FUNCTION notify_referent_of_evaluation() IS 'Notifie le référent projet lors de la soumission d''une auto-évaluation';
COMMENT ON VIEW v_auto_evaluations_completes IS 'Vue complète des auto-évaluations avec toutes les informations contextuelles';

-- Mise à jour des commentaires de table
COMMENT ON COLUMN evaluations_objectifs.auto_evaluation IS 'Données JSON de l''auto-évaluation avec scores et commentaires détaillés';
COMMENT ON COLUMN evaluations_objectifs.statut IS 'Statut de l''évaluation: brouillon, soumise, en_attente, validee_referent, validee_coach, finalisee, rejetee';