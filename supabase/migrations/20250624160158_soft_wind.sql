/*
  # Correction du système d'objectifs annuels pour utiliser les compétences

  1. Mise à jour de la table annual_objectives
    - Modification du commentaire pour clarifier l'utilisation des compétences
    - Les selected_themes stockent maintenant les IDs des compétences (pathway_skills)

  2. Ajout d'index pour optimiser les requêtes de compétences
    - Index sur development_themes pour career_area_id
    - Index sur pathway_skills pour career_level_id et development_theme_id

  3. Commentaires mis à jour
    - Clarification que selected_themes contient les IDs des compétences sélectionnées
    - Documentation du nouveau processus de sélection
*/

-- Mise à jour des commentaires pour clarifier l'utilisation
COMMENT ON COLUMN annual_objectives.selected_themes IS 'IDs des 4 compétences (pathway_skills) sélectionnées pour les objectifs';
COMMENT ON COLUMN annual_objectives.objectives IS 'Objectifs SMART détaillés en JSON, basés sur les compétences sélectionnées';

-- Mise à jour du commentaire de la table
COMMENT ON TABLE annual_objectives IS 'Objectifs annuels des employés basés sur les compétences de leur niveau dans leur career pathway';

-- Ajout d'index pour optimiser les requêtes de compétences
CREATE INDEX IF NOT EXISTS development_themes_career_area_idx ON development_themes(career_area_id, is_active);
CREATE INDEX IF NOT EXISTS pathway_skills_level_theme_idx ON pathway_skills(career_level_id, development_theme_id);

-- Analyser les tables pour optimiser les performances
ANALYZE annual_objectives;
ANALYZE pathway_skills;
ANALYZE development_themes;