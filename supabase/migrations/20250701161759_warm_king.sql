/*
  # Correction des évaluations pour les référents

  1. Nouvelles fonctions
    - Fonction pour réinitialiser les évaluations bloquées
    - Fonction pour s'assurer que le statut des évaluations est correct
  
  2. Mises à jour
    - Mise à jour des évaluations existantes pour permettre aux référents d'évaluer
    - Création d'un trigger pour maintenir la cohérence des statuts
  
  3. Vues
    - Mise à jour des vues pour inclure plus d'informations sur les évaluations
*/

-- Fonction pour réinitialiser les évaluations bloquées
CREATE OR REPLACE FUNCTION reset_stuck_evaluations() RETURNS void AS $$
BEGIN
  -- Mettre à jour les évaluations qui sont bloquées dans un état intermédiaire
  UPDATE evaluations_objectifs
  SET statut = 'soumise'
  WHERE statut = 'en_attente_referent' 
    AND evaluation_referent IS NULL;
  
  -- Mettre à jour les évaluations qui ont une auto-évaluation mais pas de statut approprié
  UPDATE evaluations_objectifs
  SET statut = 'soumise'
  WHERE auto_evaluation IS NOT NULL 
    AND auto_evaluation != '{}'::jsonb
    AND evaluation_referent IS NULL
    AND statut NOT IN ('soumise', 'en_attente_referent', 'evaluee_referent', 'finalisee');
END;
$$ LANGUAGE plpgsql;

-- Exécuter la fonction pour corriger les évaluations existantes
SELECT reset_stuck_evaluations();

-- Créer un trigger pour s'assurer que les nouvelles auto-évaluations sont correctement marquées
CREATE OR REPLACE FUNCTION ensure_evaluation_status() RETURNS TRIGGER AS $$
BEGIN
  -- Si une auto-évaluation est ajoutée ou mise à jour, s'assurer que le statut est au moins 'soumise'
  IF NEW.auto_evaluation IS NOT NULL AND NEW.auto_evaluation != '{}'::jsonb AND NEW.statut = 'brouillon' THEN
    NEW.statut := 'soumise';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà pour éviter les erreurs
DROP TRIGGER IF EXISTS ensure_evaluation_status_trigger ON evaluations_objectifs;

-- Créer le trigger
CREATE TRIGGER ensure_evaluation_status_trigger
BEFORE INSERT OR UPDATE ON evaluations_objectifs
FOR EACH ROW
EXECUTE FUNCTION ensure_evaluation_status();

-- Mettre à jour la vue pour inclure plus d'informations sur les évaluations
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

-- Mettre à jour la vue pour le coaching
CREATE OR REPLACE VIEW v_coaching_evaluations AS
SELECT 
  eo.id AS evaluation_id,
  eo.objectifs_id,
  eo.auto_evaluation,
  eo.evaluation_referent,
  eo.statut,
  eo.date_soumission,
  eo.created_at,
  eo.updated_at,
  pc.employe_id,
  up.full_name AS employe_nom,
  up.role AS employe_role,
  up.department AS employe_department,
  up.coach_id,
  p.id AS projet_id,
  p.titre AS projet_titre,
  p.nom_client,
  p.statut AS projet_statut,
  p.referent_projet_id,
  ref.full_name AS referent_nom,
  oc.objectifs,
  -- Calcul des scores
  (SELECT COALESCE(AVG(CAST(e->>'auto_evaluation_score' AS numeric)), 0)
   FROM jsonb_array_elements(eo.auto_evaluation->'evaluations') AS e) AS score_auto_evaluation,
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
  user_profiles up ON pc.employe_id = up.id
LEFT JOIN
  user_profiles ref ON p.referent_projet_id = ref.id
WHERE
  eo.statut = 'finalisee';