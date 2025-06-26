/*
  # Système d'évaluation référent et coaching

  1. Nouvelles fonctions
    - Fonction pour calculer la note moyenne entre auto-évaluation et évaluation référent
    - Fonction pour notifier les coaches des évaluations terminées
    
  2. Mise à jour des contraintes
    - Nouveaux statuts d'évaluation pour le workflow complet
    
  3. Nouvelles vues
    - Vue pour les coaches avec synthèses d'évaluations
    
  4. Triggers
    - Notification automatique des coaches
*/

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
  
  -- Ajouter la nouvelle contrainte avec les nouveaux statuts
  ALTER TABLE evaluations_objectifs ADD CONSTRAINT evaluations_objectifs_statut_check 
  CHECK (statut = ANY (ARRAY[
    'brouillon'::text, 
    'soumise'::text,
    'en_attente_referent'::text,
    'evaluee_referent'::text,
    'finalisee'::text,
    'rejetee'::text
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

-- Fonction pour calculer la note finale (moyenne auto-évaluation + évaluation référent)
CREATE OR REPLACE FUNCTION calculate_final_score(auto_eval_data jsonb, referent_eval_data jsonb)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  auto_score numeric := 0;
  referent_score numeric := 0;
  final_score numeric := 0;
BEGIN
  -- Calculer le score de l'auto-évaluation
  auto_score := calculate_average_evaluation_score(auto_eval_data);
  
  -- Calculer le score de l'évaluation référent
  referent_score := calculate_average_evaluation_score(referent_eval_data);
  
  -- Moyenne pondérée : 40% auto-évaluation + 60% évaluation référent
  IF auto_score > 0 AND referent_score > 0 THEN
    final_score := ROUND((auto_score * 0.4) + (referent_score * 0.6), 2);
  ELSIF auto_score > 0 THEN
    final_score := auto_score;
  ELSIF referent_score > 0 THEN
    final_score := referent_score;
  END IF;
  
  RETURN final_score;
END;
$$;

-- Fonction pour notifier les référents des nouvelles auto-évaluations
CREATE OR REPLACE FUNCTION notify_referent_of_evaluation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  projet_info record;
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
  
  -- Créer une notification pour le référent projet quand l'auto-évaluation est soumise
  IF projet_info.referent_projet_id IS NOT NULL AND NEW.statut = 'soumise' AND (OLD.statut IS NULL OR OLD.statut != 'soumise') THEN
    -- Mettre à jour le statut à "en_attente_referent"
    UPDATE evaluations_objectifs 
    SET statut = 'en_attente_referent' 
    WHERE id = NEW.id;
    
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
      'Auto-évaluation à examiner',
      format(
        '%s a soumis son auto-évaluation pour le projet "%s" (Client: %s). Score moyen: %s/5. Votre évaluation est maintenant requise.',
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
        'action_type', 'referent_evaluation_required'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fonction pour notifier les coaches quand l'évaluation est finalisée
CREATE OR REPLACE FUNCTION notify_coach_of_final_evaluation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  projet_info record;
  final_score numeric;
BEGIN
  -- Récupérer les informations du projet, collaborateur et coach
  SELECT 
    p.titre as projet_titre,
    p.nom_client,
    pc.employe_id,
    up.full_name as employe_nom,
    up.coach_id
  INTO projet_info
  FROM objectifs_collaborateurs oc
  JOIN projet_collaborateurs pc ON pc.id = oc.collaboration_id
  JOIN projets p ON p.id = pc.projet_id
  JOIN user_profiles up ON up.id = pc.employe_id
  WHERE oc.id = NEW.objectifs_id;
  
  -- Calculer la note finale
  final_score := calculate_final_score(NEW.auto_evaluation, NEW.evaluation_referent);
  
  -- Créer une notification pour le coach quand l'évaluation est finalisée
  IF projet_info.coach_id IS NOT NULL AND NEW.statut = 'finalisee' AND (OLD.statut IS NULL OR OLD.statut != 'finalisee') THEN
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
      projet_info.coach_id,
      projet_info.employe_id,
      'Évaluation finalisée disponible',
      format(
        'L''évaluation de %s pour le projet "%s" (Client: %s) est finalisée. Note finale: %s/5.',
        projet_info.employe_nom,
        projet_info.projet_titre,
        projet_info.nom_client,
        final_score
      ),
      'success',
      1,
      '/mon-coaching',
      jsonb_build_object(
        'evaluation_id', NEW.id,
        'projet_titre', projet_info.projet_titre,
        'employe_nom', projet_info.employe_nom,
        'note_finale', final_score,
        'action_type', 'coaching_review'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger pour notifier les référents (INSERT seulement pour éviter les erreurs avec OLD)
DROP TRIGGER IF EXISTS notify_referent_evaluation ON evaluations_objectifs;
CREATE TRIGGER notify_referent_evaluation
  AFTER INSERT ON evaluations_objectifs
  FOR EACH ROW
  WHEN (NEW.statut = 'soumise')
  EXECUTE FUNCTION notify_referent_of_evaluation();

-- Trigger pour notifier les coaches
DROP TRIGGER IF EXISTS notify_coach_final_evaluation ON evaluations_objectifs;
CREATE TRIGGER notify_coach_final_evaluation
  AFTER UPDATE ON evaluations_objectifs
  FOR EACH ROW
  WHEN (NEW.statut = 'finalisee' AND OLD.statut != 'finalisee')
  EXECUTE FUNCTION notify_coach_of_final_evaluation();

-- Mise à jour des politiques RLS pour evaluations_objectifs

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Collaborateurs peuvent créer auto-évaluations" ON evaluations_objectifs;
DROP POLICY IF EXISTS "Collaborateurs peuvent gérer leurs auto-évaluations" ON evaluations_objectifs;
DROP POLICY IF EXISTS "Référents peuvent examiner auto-évaluations" ON evaluations_objectifs;
DROP POLICY IF EXISTS "Coaches peuvent examiner auto-évaluations coachés" ON evaluations_objectifs;
DROP POLICY IF EXISTS "Admins peuvent gérer toutes auto-évaluations" ON evaluations_objectifs;

-- Nouvelles politiques

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

-- Les collaborateurs peuvent lire et modifier leurs propres évaluations
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

-- Les coaches peuvent lire les évaluations finalisées de leurs coachés
CREATE POLICY "Coaches peuvent voir évaluations coachés"
  ON evaluations_objectifs
  FOR SELECT
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

-- Les admins peuvent tout gérer
CREATE POLICY "Admins peuvent gérer toutes auto-évaluations"
  ON evaluations_objectifs
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS evaluations_objectifs_auto_evaluation_idx 
ON evaluations_objectifs USING gin (auto_evaluation);

CREATE INDEX IF NOT EXISTS evaluations_objectifs_evaluation_referent_idx 
ON evaluations_objectifs USING gin (evaluation_referent);

CREATE INDEX IF NOT EXISTS evaluations_objectifs_date_soumission_idx 
ON evaluations_objectifs (date_soumission DESC);

CREATE INDEX IF NOT EXISTS evaluations_objectifs_statut_idx 
ON evaluations_objectifs (statut);

-- Vue pour les coaches avec synthèses d'évaluations
CREATE OR REPLACE VIEW v_coaching_evaluations AS
SELECT 
  eo.id as evaluation_id,
  eo.objectifs_id,
  eo.auto_evaluation,
  eo.evaluation_referent,
  eo.statut,
  eo.date_soumission,
  eo.created_at,
  eo.updated_at,
  
  -- Informations du collaborateur
  pc.employe_id,
  up.full_name as employe_nom,
  up.role as employe_role,
  up.department as employe_department,
  up.coach_id,
  
  -- Informations du projet
  p.id as projet_id,
  p.titre as projet_titre,
  p.nom_client,
  p.statut as projet_statut,
  p.referent_projet_id,
  
  -- Informations du référent
  ref.full_name as referent_nom,
  
  -- Informations des objectifs
  oc.objectifs,
  
  -- Scores calculés
  calculate_average_evaluation_score(eo.auto_evaluation) as score_auto_evaluation,
  calculate_average_evaluation_score(eo.evaluation_referent) as score_referent,
  calculate_final_score(eo.auto_evaluation, eo.evaluation_referent) as note_finale
  
FROM evaluations_objectifs eo
JOIN objectifs_collaborateurs oc ON oc.id = eo.objectifs_id
JOIN projet_collaborateurs pc ON pc.id = oc.collaboration_id
JOIN user_profiles up ON up.id = pc.employe_id
JOIN projets p ON p.id = pc.projet_id
LEFT JOIN user_profiles ref ON ref.id = p.referent_projet_id
WHERE eo.statut IN ('evaluee_referent', 'finalisee');

-- Vue complète des auto-évaluations avec informations complètes
CREATE OR REPLACE VIEW v_auto_evaluations_completes AS
SELECT 
  eo.id as evaluation_id,
  eo.objectifs_id,
  eo.auto_evaluation,
  eo.evaluation_referent,
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
  
  -- Scores calculés
  calculate_average_evaluation_score(eo.auto_evaluation) as score_moyen,
  calculate_average_evaluation_score(eo.evaluation_referent) as score_referent,
  calculate_final_score(eo.auto_evaluation, eo.evaluation_referent) as note_finale
  
FROM evaluations_objectifs eo
JOIN objectifs_collaborateurs oc ON oc.id = eo.objectifs_id
JOIN projet_collaborateurs pc ON pc.id = oc.collaboration_id
JOIN user_profiles up ON up.id = pc.employe_id
JOIN projets p ON p.id = pc.projet_id;

-- Commentaires
COMMENT ON FUNCTION calculate_average_evaluation_score(jsonb) IS 'Calcule le score moyen d''une évaluation à partir des données JSON';
COMMENT ON FUNCTION calculate_final_score(jsonb, jsonb) IS 'Calcule la note finale pondérée entre auto-évaluation et évaluation référent';
COMMENT ON FUNCTION notify_referent_of_evaluation() IS 'Notifie le référent projet lors de la soumission d''une auto-évaluation';
COMMENT ON FUNCTION notify_coach_of_final_evaluation() IS 'Notifie le coach lors de la finalisation d''une évaluation';
COMMENT ON VIEW v_coaching_evaluations IS 'Vue pour les coaches avec synthèses d''évaluations finalisées';
COMMENT ON VIEW v_auto_evaluations_completes IS 'Vue complète des auto-évaluations avec toutes les informations contextuelles';

-- Mise à jour des commentaires de table
COMMENT ON COLUMN evaluations_objectifs.auto_evaluation IS 'Données JSON de l''auto-évaluation avec scores et commentaires détaillés';
COMMENT ON COLUMN evaluations_objectifs.evaluation_referent IS 'Données JSON de l''évaluation du référent avec scores et commentaires';
COMMENT ON COLUMN evaluations_objectifs.statut IS 'Statut de l''évaluation: brouillon, soumise, en_attente_referent, evaluee_referent, finalisee, rejetee';