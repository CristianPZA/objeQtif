/*
  # Correction du flux d'évaluation référent

  1. Problème
    - Lorsqu'un collaborateur soumet son auto-évaluation, le statut passe directement à "evaluee_referent"
    - Le référent ne peut pas évaluer car le système considère que l'évaluation est déjà faite
  
  2. Solution
    - Modifier la fonction notify_referent_of_evaluation() pour mettre le statut à "en_attente_referent"
    - Assurer que le trigger utilise la nouvelle version de la fonction
    - Ajouter une vérification explicite du statut dans la fonction
*/

-- Mise à jour de la fonction pour notifier les référents des nouvelles auto-évaluations
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
  IF projet_info.referent_projet_id IS NOT NULL AND NEW.statut = 'soumise' THEN
    -- Mettre à jour le statut à "en_attente_referent" au lieu de "evaluee_referent"
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

-- Supprimer et recréer le trigger pour s'assurer qu'il utilise la nouvelle fonction
DROP TRIGGER IF EXISTS notify_referent_evaluation ON evaluations_objectifs;
CREATE TRIGGER notify_referent_evaluation
  AFTER INSERT ON evaluations_objectifs
  FOR EACH ROW
  WHEN (NEW.statut = 'soumise')
  EXECUTE FUNCTION notify_referent_of_evaluation();