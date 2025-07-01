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
  
  -- Ajouter la nouvelle contrainte avec les statuts corrects
  ALTER TABLE evaluations_objectifs ADD CONSTRAINT evaluations_objectifs_statut_check 
  CHECK (statut IN ('brouillon', 'soumise', 'en_attente_referent', 'evaluee_referent', 'finalisee', 'rejetee'));
END $$;

-- Fonction pour notifier les référents des nouvelles auto-évaluations
CREATE OR REPLACE FUNCTION notify_referent_of_evaluation()
RETURNS trigger 
LANGUAGE plpgsql
AS $$
DECLARE
  projet_info record;
  avg_score numeric;
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

-- Fonction pour notifier les coaches lors de la finalisation d'une évaluation
CREATE OR REPLACE FUNCTION notify_coach_of_final_evaluation()
RETURNS trigger 
LANGUAGE plpgsql
AS $$
DECLARE
  projet_info record;
BEGIN
  -- Vérifier si l'évaluation vient d'être finalisée
  IF NEW.statut = 'finalisee' AND OLD.statut <> 'finalisee' THEN
    
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
    
    -- Créer une notification pour le coach si disponible
    IF projet_info.coach_id IS NOT NULL THEN
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
          'L''évaluation de %s pour le projet "%s" (Client: %s) est finalisée.',
          projet_info.employe_nom,
          projet_info.projet_titre,
          projet_info.nom_client
        ),
        'success',
        1,
        '/mon-coaching',
        jsonb_build_object(
          'evaluation_id', NEW.id,
          'projet_titre', projet_info.projet_titre,
          'employe_nom', projet_info.employe_nom,
          'action_type', 'coaching_review'
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Supprimer et recréer les triggers
DROP TRIGGER IF EXISTS notify_referent_evaluation ON evaluations_objectifs;
CREATE TRIGGER notify_referent_evaluation
  AFTER INSERT ON evaluations_objectifs
  FOR EACH ROW
  WHEN (NEW.statut = 'soumise')
  EXECUTE FUNCTION notify_referent_of_evaluation();

DROP TRIGGER IF EXISTS notify_coach_final_evaluation ON evaluations_objectifs;
CREATE TRIGGER notify_coach_final_evaluation
  AFTER UPDATE ON evaluations_objectifs
  FOR EACH ROW
  WHEN ((NEW.statut = 'finalisee') AND (OLD.statut <> 'finalisee'))
  EXECUTE FUNCTION notify_coach_of_final_evaluation();

-- Mise à jour des politiques RLS pour les référents
DROP POLICY IF EXISTS "Référents peuvent examiner auto-évaluations" ON evaluations_objectifs;
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