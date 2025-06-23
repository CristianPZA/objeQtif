/*
  # Création du système de Career Pathways

  1. Nouvelles tables
    - `career_areas` - Domaines de carrière (ex: Quantitative Analysis Techniques)
    - `development_themes` - Thèmes de développement pour chaque domaine
    - `career_levels` - Niveaux de carrière (Junior, Confirmed, Senior, Lead, Director)
    - `pathway_skills` - Compétences et descriptions pour chaque niveau

  2. Sécurité
    - Lecture publique pour tous les utilisateurs authentifiés
    - Modification réservée aux administrateurs et RH
*/

-- Table des domaines de carrière
CREATE TABLE IF NOT EXISTS career_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon text DEFAULT 'target',
  color text DEFAULT 'indigo',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des niveaux de carrière
CREATE TABLE IF NOT EXISTS career_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  short_name text NOT NULL,
  description text,
  sort_order integer NOT NULL,
  color text DEFAULT 'gray',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des thèmes de développement
CREATE TABLE IF NOT EXISTS development_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  career_area_id uuid REFERENCES career_areas(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des compétences par niveau
CREATE TABLE IF NOT EXISTS pathway_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  development_theme_id uuid REFERENCES development_themes(id) ON DELETE CASCADE,
  career_level_id uuid REFERENCES career_levels(id) ON DELETE CASCADE,
  skill_description text NOT NULL,
  examples text,
  requirements text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(development_theme_id, career_level_id)
);

-- Indexes pour les performances
CREATE INDEX IF NOT EXISTS career_areas_active_idx ON career_areas(is_active, sort_order);
CREATE INDEX IF NOT EXISTS career_levels_active_idx ON career_levels(is_active, sort_order);
CREATE INDEX IF NOT EXISTS development_themes_area_idx ON development_themes(career_area_id, sort_order);
CREATE INDEX IF NOT EXISTS pathway_skills_theme_level_idx ON pathway_skills(development_theme_id, career_level_id);

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_career_areas_updated_at
  BEFORE UPDATE ON career_areas
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_career_levels_updated_at
  BEFORE UPDATE ON career_levels
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_development_themes_updated_at
  BEFORE UPDATE ON development_themes
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_pathway_skills_updated_at
  BEFORE UPDATE ON pathway_skills
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- RLS Policies
ALTER TABLE career_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathway_skills ENABLE ROW LEVEL SECURITY;

-- Lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Everyone can read career areas"
  ON career_areas FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Everyone can read career levels"
  ON career_levels FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Everyone can read development themes"
  ON development_themes FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Everyone can read pathway skills"
  ON pathway_skills FOR SELECT
  TO authenticated
  USING (true);

-- Modification pour les administrateurs et RH
CREATE POLICY "Admins can manage career areas"
  ON career_areas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'direction', 'coach_rh')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'direction', 'coach_rh')
    )
  );

CREATE POLICY "Admins can manage career levels"
  ON career_levels FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'direction', 'coach_rh')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'direction', 'coach_rh')
    )
  );

CREATE POLICY "Admins can manage development themes"
  ON development_themes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'direction', 'coach_rh')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'direction', 'coach_rh')
    )
  );

CREATE POLICY "Admins can manage pathway skills"
  ON pathway_skills FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'direction', 'coach_rh')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'direction', 'coach_rh')
    )
  );

-- Insertion des données de base

-- Niveaux de carrière
INSERT INTO career_levels (name, short_name, description, sort_order, color) VALUES
('Junior', 'Junior', 'Niveau débutant avec supervision et formation continue', 1, 'green'),
('Confirmé', 'Confirmed', 'Niveau intermédiaire avec autonomie sur les tâches courantes', 2, 'blue'),
('Senior', 'Senior', 'Niveau avancé avec expertise technique et mentorat', 3, 'purple'),
('Lead', 'Lead', 'Niveau de leadership avec responsabilités d''équipe', 4, 'orange'),
('Directeur', 'Director', 'Niveau de direction avec vision stratégique', 5, 'red')
ON CONFLICT (name) DO NOTHING;

-- Domaine de carrière principal basé sur le fichier Excel
INSERT INTO career_areas (name, description, icon, color, sort_order) VALUES
('Techniques d''Analyse Quantitative', 'Développement des compétences en analyse quantitative, modélisation financière et techniques statistiques', 'calculator', 'indigo', 1)
ON CONFLICT (name) DO NOTHING;

-- Récupération de l'ID du domaine pour les thèmes
DO $$
DECLARE
  area_id uuid;
  theme_id uuid;
  junior_id uuid;
  confirmed_id uuid;
  senior_id uuid;
  lead_id uuid;
  director_id uuid;
BEGIN
  -- Récupération des IDs
  SELECT id INTO area_id FROM career_areas WHERE name = 'Techniques d''Analyse Quantitative';
  SELECT id INTO junior_id FROM career_levels WHERE short_name = 'Junior';
  SELECT id INTO confirmed_id FROM career_levels WHERE short_name = 'Confirmed';
  SELECT id INTO senior_id FROM career_levels WHERE short_name = 'Senior';
  SELECT id INTO lead_id FROM career_levels WHERE short_name = 'Lead';
  SELECT id INTO director_id FROM career_levels WHERE short_name = 'Director';

  -- Insertion des thèmes de développement
  INSERT INTO development_themes (career_area_id, name, description, sort_order) VALUES
  (area_id, 'Techniques d''Analyse Quantitative (Know-How)', 'Maîtrise des outils et méthodes d''analyse quantitative', 1),
  (area_id, 'Techniques d''Analyse Quantitative (Know-What)', 'Connaissance des domaines d''application et des contextes', 2),
  (area_id, 'Techniques d''Analyse Quantitative (Know-Who)', 'Réseau et collaboration dans le domaine quantitatif', 3),
  (area_id, 'Développement de la clientèle', 'Capacités de développement commercial et relation client', 4),
  (area_id, 'Vente de solutions clients', 'Compétences en vente et présentation de solutions', 5),
  (area_id, 'Compétences sectorielles', 'Expertise sectorielle et connaissance métier', 6),
  (area_id, 'Compétences multi-fonctionnelles', 'Compétences transversales et leadership', 7),
  (area_id, 'Développement humain', 'Développement personnel et gestion d''équipe', 8),
  (area_id, 'Développement commercial', 'Stratégies commerciales et développement business', 9)
  ON CONFLICT DO NOTHING;

  -- Insertion des compétences pour chaque thème et niveau
  
  -- Techniques d'Analyse Quantitative (Know-How)
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Techniques d''Analyse Quantitative (Know-How)' AND career_area_id = area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Maîtrise des bases de la modélisation financière avec supervision. Développe et valide des modèles financiers de base'),
  (theme_id, confirmed_id, 'Développe et valide des modèles financiers indépendamment. Maîtrise les techniques d''optimisation et d''algorithmes'),
  (theme_id, senior_id, 'Supervise la livraison de modèles financiers complexes. Leads des projets d''optimisation et de business intelligence'),
  (theme_id, lead_id, 'Supervise la livraison de stratégies d''optimisation complexes. Dirige des équipes de développement et révision de modèles financiers stratégiques'),
  (theme_id, director_id, 'Façonne les standards de modélisation financière de l''organisation et les méthodologies');

  -- Techniques d'Analyse Quantitative (Know-What)
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Techniques d''Analyse Quantitative (Know-What)' AND career_area_id = area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Préparation et analyse des données avec supervision. Dérive des insights actionnables à partir de données complexes'),
  (theme_id, confirmed_id, 'Dirige les efforts de préparation de données pour les décisions business. Supervise les techniques d''optimisation complexes'),
  (theme_id, senior_id, 'Leads l''optimisation des processus pour les problèmes à grande échelle. Supervise les techniques d''optimisation complexes'),
  (theme_id, lead_id, 'Supervise la livraison de stratégies d''optimisation complexes. Définit et dirige les standards d''analyse organisationnels'),
  (theme_id, director_id, 'Définit et dirige les standards organisationnels pour l''analyse quantitative et l''innovation');

  -- Techniques d'Analyse Quantitative (Know-Who)
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Techniques d''Analyse Quantitative (Know-Who)' AND career_area_id = area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Comprend les bases des techniques d''optimisation et d''algorithmes. Implémente des techniques d''optimisation basiques'),
  (theme_id, confirmed_id, 'Leads l''optimisation des processus pour les problèmes à grande échelle. Supervise les techniques d''optimisation complexes'),
  (theme_id, senior_id, 'Leads l''optimisation des processus pour les problèmes à grande échelle. Supervise les techniques d''optimisation complexes'),
  (theme_id, lead_id, 'Supervise la livraison de stratégies d''optimisation complexes. Définit et dirige les standards d''analyse organisationnels'),
  (theme_id, director_id, 'Façonne les standards de modélisation financière de l''organisation et les méthodologies');

  -- Développement de la clientèle
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Développement de la clientèle' AND career_area_id = area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Comprend les besoins clients avec supervision. Propose des solutions basiques adaptées aux besoins clients'),
  (theme_id, confirmed_id, 'Développe des solutions orientées client de manière indépendante. Leads des discussions avec les clients techniques'),
  (theme_id, senior_id, 'Leads des discussions stratégiques avec les clients. Leads l''aspect technique des engagements clients'),
  (theme_id, lead_id, 'Dirige les stratégies d''engagement client alignées avec les capacités techniques. Identifie les opportunités de marché pour les innovations techniques'),
  (theme_id, director_id, 'Façonne l''engagement client et les stratégies de croissance technique');

  -- Vente de solutions clients
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Vente de solutions clients' AND career_area_id = area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Approche Client-Centric. Comprend les exigences clients avec supervision'),
  (theme_id, confirmed_id, 'Propose des solutions orientées client de manière indépendante. Développe des connaissances de marché pour les solutions techniques'),
  (theme_id, senior_id, 'Développe une connaissance approfondie des secteurs de focus. Applique des connaissances sectorielles pour proposer des solutions pertinentes'),
  (theme_id, lead_id, 'Leads des stratégies sectorielles pour les projets techniques. Dirige des initiatives cross-fonctionnelles pour les solutions clients'),
  (theme_id, director_id, 'Façonne les stratégies organisationnelles de marché pour la croissance technique');

  -- Compétences sectorielles
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Compétences sectorielles' AND career_area_id = area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Apprend les bases des secteurs clés. Développe une connaissance approfondie des secteurs de focus'),
  (theme_id, confirmed_id, 'Développe une connaissance approfondie des secteurs de focus. Applique des connaissances sectorielles pour proposer des solutions pertinentes'),
  (theme_id, senior_id, 'Applique des connaissances sectorielles pour proposer des solutions pertinentes. Leads des stratégies sectorielles pour les projets techniques'),
  (theme_id, lead_id, 'Leads des stratégies sectorielles pour les projets techniques. Façonne la compréhension organisationnelle des secteurs et de l''innovation'),
  (theme_id, director_id, 'Façonne la compréhension organisationnelle des secteurs et de l''innovation');

  -- Compétences multi-fonctionnelles
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Compétences multi-fonctionnelles' AND career_area_id = area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Apprend les bases des connaissances sectorielles. Développe une connaissance approfondie des secteurs de focus'),
  (theme_id, confirmed_id, 'Apprend les stratégies et algorithmes pour des problèmes spécifiques. Développe des algorithmes pour des problèmes spécifiques'),
  (theme_id, senior_id, 'Leads l''innovation en algorithmes pour des problèmes spécifiques. Applique des algorithmes spécialisés pour l''innovation'),
  (theme_id, lead_id, 'Leads des stratégies spécialisées pour les projets techniques. Façonne la compréhension organisationnelle des tendances sectorielles et des besoins'),
  (theme_id, director_id, 'Façonne la compréhension organisationnelle des tendances sectorielles et des besoins');

  -- Développement humain
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Développement humain' AND career_area_id = area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Mentorat et Coaching. Mentore des pairs sur les tâches techniques et les outils'),
  (theme_id, confirmed_id, 'Supporte les activités d''équipe et assure l''alignement. Leads des petites équipes et des managers priorité efficacement'),
  (theme_id, senior_id, 'Leads l''aspect technique des engagements clients. Leads des initiatives de mentorat pour les membres d''équipe'),
  (theme_id, lead_id, 'Provides un coaching structurel pour les leaders émergents. Manages de grandes équipes avec des capacités de leadership'),
  (theme_id, director_id, 'Façonne la culture organisationnelle de mentorat et de développement des talents');

  -- Développement commercial
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Développement commercial' AND career_area_id = area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Gestion d''équipe. Supporte les discussions avec les insights techniques'),
  (theme_id, confirmed_id, 'Propose des solutions techniques alignées avec les besoins clients. Développe des connaissances de marché pour les solutions techniques'),
  (theme_id, senior_id, 'Leads l''aspect technique des engagements clients. Dirige les opportunités commerciales à travers le leadership technique'),
  (theme_id, lead_id, 'Dirige les stratégies commerciales alignées avec les capacités techniques. Façonne l''engagement client et les stratégies avec le leadership technique'),
  (theme_id, director_id, 'Façonne les stratégies organisationnelles de marché pour la croissance technique');

END $$;