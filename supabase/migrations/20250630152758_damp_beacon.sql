/*
  # Remove unique constraint on pathway_skills

  1. Changes
    - Remove the unique constraint on development_theme_id and career_level_id
    - This allows multiple skills to be defined for the same theme and level
    - Maintain indexes for performance

  2. Notes
    - This change is necessary to support multiple skills per theme and level
    - The constraint was causing errors when trying to add multiple skills
*/

-- Drop the existing unique constraint
ALTER TABLE pathway_skills 
DROP CONSTRAINT IF EXISTS pathway_skills_development_theme_id_career_level_id_key;

-- Create new indexes to maintain performance
CREATE INDEX IF NOT EXISTS pathway_skills_theme_level_idx 
ON pathway_skills(development_theme_id, career_level_id);

CREATE INDEX IF NOT EXISTS pathway_skills_level_theme_idx 
ON pathway_skills(career_level_id, development_theme_id);

-- Add comment to document the change
COMMENT ON TABLE pathway_skills IS 'Compétences détaillées par thème et niveau - Plusieurs compétences possibles par combinaison thème/niveau';