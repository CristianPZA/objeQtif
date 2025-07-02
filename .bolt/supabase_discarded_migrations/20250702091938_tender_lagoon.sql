/*
  # Correction du statut d'évaluation référent

  1. Problème
    - Les évaluations sont marquées comme "evaluee_referent" même si le référent n'a pas réellement évalué
    - Le statut ne reflète pas correctement l'état réel de l'évaluation
    - Les référents ne peuvent pas évaluer car le système pense que c'est déjà fait

  2. Solution
    - Ajouter une fonction pour vérifier si une évaluation référent est réellement complète
    - Corriger les statuts incorrects dans la base de données
    - Ajouter un trigger pour maintenir la cohérence entre le statut et le contenu
    - Mettre à jour la vue pour inclure cette vérification
*/

-- Fonction pour vérifier si une évaluation référent est complète
CREATE OR REPLACE FUNCTION is_referent_evaluation_complete(evaluation_data jsonb)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Vérifier si l'évaluation référent existe et contient des évaluations
  RETURN evaluation_data IS NOT NULL 
         AND evaluation_data ? 'evaluations' 
         AND jsonb_array_length(evaluation_data->'evaluations') > 0;
END;
$$;

-- Fonction pour réinitialiser les évaluations incorrectement marquées comme évaluées
CREATE OR REPLACE FUNCTION fix_incorrect_evaluation_statuses()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mettre à jour les évaluations marquées comme "evaluee_referent" mais sans évaluation référent complète
  UPDATE evaluations_objectifs
  SET statut = 'en_attente_referent'
  WHERE statut = 'evaluee_referent'
    AND (
      evaluation_referent IS NULL
      OR evaluation_referent = '{}'::jsonb
      OR NOT is_referent_evaluation_complete(evaluation_referent)
    );
  
  -- Mettre à jour les évaluations qui ont une auto-évaluation mais sont encore en brouillon
  UPDATE evaluations_objectifs
  SET statut = 'soumise'
  WHERE statut = 'brouillon'
    AND auto_evaluation IS NOT NULL
    AND auto_evaluation != '{}'::jsonb
    AND is_referent_evaluation_complete(auto_evaluation);
END;
$$;

-- Exécuter la fonction pour corriger les évaluations existantes
SELECT fix_incorrect_evaluation_statuses();

-- Mettre à jour la fonction de notification pour éviter ce problème à l'avenir
CREATE OR REPLACE FUNCTION notify_referent_of_evaluation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  projet_info record;
BEGIN
  -- Vérifier si c'est une nouvelle soumission
  IF NEW.statut = 'soumise' THEN
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
    
    -- Mettre à jour le statut à "en_attente_referent"
    UPDATE evaluations_objectifs 
    SET statut = 'en_attente_referent' 
    WHERE id = NEW.id;
    
    -- Créer une notification pour le référent projet
    IF projet_info.referent_projet_id IS NOT NULL THEN
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
          '%s a soumis son auto-évaluation pour le projet "%s" (Client: %s). Votre évaluation est maintenant requise.',
          projet_info.employe_nom,
          projet_info.projet_titre,
          projet_info.nom_client
        ),
        'info',
        2,
        '/fiches-projets',
        jsonb_build_object(
          'evaluation_id', NEW.id,
          'projet_titre', projet_info.projet_titre,
          'employe_nom', projet_info.employe_nom,
          'action_type', 'referent_evaluation_required'
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ajouter un trigger pour vérifier le statut lors de la mise à jour d'une évaluation
CREATE OR REPLACE FUNCTION ensure_correct_evaluation_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si l'évaluation référent est ajoutée ou mise à jour, vérifier qu'elle est complète
  IF NEW.evaluation_referent IS NOT NULL AND NEW.evaluation_referent != '{}'::jsonb THEN
    -- Si l'évaluation référent est complète, mettre à jour le statut
    IF is_referent_evaluation_complete(NEW.evaluation_referent) THEN
      NEW.statut := 'evaluee_referent';
    END IF;
  END IF;
  
  -- Si l'auto-évaluation est ajoutée ou mise à jour, vérifier qu'elle est complète
  IF NEW.auto_evaluation IS NOT NULL AND NEW.auto_evaluation != '{}'::jsonb 
     AND is_referent_evaluation_complete(NEW.auto_evaluation)
     AND NEW.statut = 'brouillon' THEN
    NEW.statut := 'soumise';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS ensure_correct_evaluation_status_trigger ON evaluations_objectifs;

-- Créer le trigger
CREATE TRIGGER ensure_correct_evaluation_status_trigger
BEFORE INSERT OR UPDATE ON evaluations_objectifs
FOR EACH ROW
EXECUTE FUNCTION ensure_correct_evaluation_status();

-- Mettre à jour la vue pour inclure la vérification de l'évaluation référent
CREATE OR REPLACE VIEW v_auto_evaluations_completes AS
SELECT 
  eo.id AS evaluation_id,
  eo.objectifs_id,
  eo.auto_evaluation,
  eo.evaluation_referent,
  eo.evaluation_coach,
  eo.statut,
  eo.date_soumission,
  eo.created_at,
  eo.updated_at,
  pc.employe_id,
  up.full_name AS employe_nom,
  up.role AS employe_role,
  p.id AS projet_id,
  p.titre AS projet_titre,
  p.nom_client,
  p.statut AS projet_statut,
  p.referent_projet_id,
  oc.objectifs,
  -- Vérification si l'évaluation référent est réellement complète
  is_referent_evaluation_complete(eo.evaluation_referent) AS has_referent_evaluation,
  -- Calcul des scores moyens
  (SELECT COALESCE(AVG(CAST(e->>'auto_evaluation_score' AS numeric)), 0)
   FROM jsonb_array_elements(eo.auto_evaluation->'evaluations') AS e) AS score_moyen,
  (SELECT COALESCE(AVG(CAST(e->>'referent_score' AS numeric)), 0)
   FROM jsonb_array_elements(eo.evaluation_referent->'evaluations') AS e) AS score_referent,
  -- Note finale (moyenne des deux scores)
  (
    (SELECT COALESCE(AVG(CAST(e->>'auto_evaluation_score' AS numeric)), 0)
     FROM jsonb_array_elements(eo.auto_evaluation->'evaluations') AS e) +
    (SELECT COALESCE(AVG(CAST(e->>'referent_score' AS numeric)), 0)
     FROM jsonb_array_elements(eo.evaluation_referent->'evaluations') AS e)
  ) / 2 AS note_finale
FROM 
  evaluations_objectifs eo
JOIN 
  objectifs_collaborateurs oc ON eo.objectifs_id = oc.id
JOIN 
  projet_collaborateurs pc ON oc.collaboration_id = pc.id
JOIN 
  projets p ON pc.projet_id = p.id
JOIN 
  user_profiles up ON pc.employe_id = up.id;

-- Commentaires
COMMENT ON FUNCTION is_referent_evaluation_complete(jsonb) IS 'Vérifie si une évaluation référent est réellement complète';
COMMENT ON FUNCTION fix_incorrect_evaluation_statuses() IS 'Corrige les statuts d''évaluation incorrects';
COMMENT ON FUNCTION ensure_correct_evaluation_status() IS 'Assure que le statut d''évaluation est cohérent avec le contenu';