/*
  # Correction des statuts d'évaluation et amélioration de l'affichage

  1. Problème
    - Les évaluations référent ne sont pas correctement affichées
    - Certaines évaluations sont marquées comme complétées alors qu'elles ne le sont pas
    - Les statuts d'évaluation ne correspondent pas au contenu réel

  2. Solution
    - Ajouter une fonction pour vérifier si une évaluation référent est réellement complète
    - Mettre à jour les statuts incorrects dans la base de données
    - Améliorer les vues pour afficher correctement les évaluations
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
    
  -- Mettre à jour les évaluations qui ont une évaluation référent complète mais ne sont pas marquées comme telles
  UPDATE evaluations_objectifs
  SET statut = 'evaluee_referent'
  WHERE statut IN ('en_attente_referent', 'soumise')
    AND evaluation_referent IS NOT NULL
    AND evaluation_referent != '{}'::jsonb
    AND is_referent_evaluation_complete(evaluation_referent);
END;
$$;

-- Exécuter la fonction pour corriger les évaluations existantes
SELECT fix_incorrect_evaluation_statuses();

-- Supprimer les vues existantes pour éviter les conflits
DROP VIEW IF EXISTS v_coaching_evaluations;
DROP VIEW IF EXISTS v_auto_evaluations_completes;

-- Recréer la vue avec la structure correcte
CREATE VIEW v_auto_evaluations_completes AS
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
  -- Ajouter le nom du référent comme nouvelle colonne
  ref.full_name AS referent_nom,
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
  user_profiles up ON pc.employe_id = up.id
LEFT JOIN
  user_profiles ref ON p.referent_projet_id = ref.id;

-- Créer la vue pour le coaching
CREATE VIEW v_coaching_evaluations AS
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
  -- Vérification si l'évaluation référent est réellement complète
  is_referent_evaluation_complete(eo.evaluation_referent) AS has_referent_evaluation,
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
  eo.statut IN ('evaluee_referent', 'finalisee');

-- Commentaires
COMMENT ON FUNCTION is_referent_evaluation_complete(jsonb) IS 'Vérifie si une évaluation référent est réellement complète';
COMMENT ON FUNCTION fix_incorrect_evaluation_statuses() IS 'Corrige les statuts d''évaluation incorrects';