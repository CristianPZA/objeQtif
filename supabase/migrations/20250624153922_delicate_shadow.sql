/*
  # Ajouter career_pathway_id aux profils utilisateurs

  1. Modifications
    - Ajouter la colonne career_pathway_id à user_profiles
    - Créer un index pour les performances
    - Ajouter un commentaire explicatif

  2. Sécurité
    - La colonne est nullable pour permettre aux utilisateurs de ne pas avoir de parcours assigné
    - Référence vers career_areas pour maintenir l'intégrité des données
*/

-- Ajouter la colonne career_pathway_id aux user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'career_pathway_id'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN career_pathway_id uuid REFERENCES career_areas(id);
  END IF;
END $$;

-- Créer un index pour les performances
CREATE INDEX IF NOT EXISTS user_profiles_career_pathway_idx ON user_profiles(career_pathway_id);

-- Ajouter un commentaire sur la nouvelle colonne
COMMENT ON COLUMN user_profiles.career_pathway_id IS 'Référence vers le parcours de carrière (career pathway) assigné à l''utilisateur';

-- Mettre à jour les statistiques pour optimiser les requêtes
ANALYZE user_profiles;