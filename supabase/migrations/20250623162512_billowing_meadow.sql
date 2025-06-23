/*
  # Ajout du Career Pathway Consulting

  1. Nouveau domaine de carrière
    - Consulting_Pathway_2025 avec tous les thèmes de développement

  2. Thèmes de développement
    - Business Development
    - Consulting & Customer Relationship (multiple sous-thèmes)
    - Consulting Techniques (Know-how)
    - Human Development
    - Sectoral/functional skills

  3. Compétences détaillées
    - Pour chaque niveau (Junior, Confirmé, Senior, Lead, Directeur)
    - Basées sur les données du fichier Excel fourni
*/

-- Insertion du nouveau domaine de carrière Consulting
INSERT INTO career_areas (name, description, icon, color, sort_order) VALUES
('Consulting Pathway 2025', 'Développement des compétences en conseil, relation client et expertise sectorielle pour les consultants', 'users', 'blue', 2)
ON CONFLICT (name) DO NOTHING;

-- Récupération de l'ID du domaine Consulting et des niveaux
DO $$
DECLARE
  consulting_area_id uuid;
  theme_id uuid;
  junior_id uuid;
  confirmed_id uuid;
  senior_id uuid;
  lead_id uuid;
  director_id uuid;
BEGIN
  -- Récupération des IDs
  SELECT id INTO consulting_area_id FROM career_areas WHERE name = 'Consulting Pathway 2025';
  SELECT id INTO junior_id FROM career_levels WHERE short_name = 'Junior';
  SELECT id INTO confirmed_id FROM career_levels WHERE short_name = 'Confirmed';
  SELECT id INTO senior_id FROM career_levels WHERE short_name = 'Senior';
  SELECT id INTO lead_id FROM career_levels WHERE short_name = 'Lead';
  SELECT id INTO director_id FROM career_levels WHERE short_name = 'Director';

  -- Insertion des thèmes de développement pour le Consulting
  INSERT INTO development_themes (career_area_id, name, description, sort_order) VALUES
  (consulting_area_id, 'Business Development', 'Développement commercial et identification d''opportunités', 1),
  (consulting_area_id, 'Consulting & Customer Relationship - Adaptability & Situational Intelligence', 'Capacité d''adaptation et intelligence situationnelle', 2),
  (consulting_area_id, 'Consulting & Customer Relationship - Customer Recognition', 'Reconnaissance et compréhension des besoins clients', 3),
  (consulting_area_id, 'Consulting & Customer Relationship - Customer Engagement', 'Engagement et interaction avec les clients', 4),
  (consulting_area_id, 'Consulting & Customer Relationship - Customer Prizing', 'Valorisation et tarification des services clients', 5),
  (consulting_area_id, 'Consulting & Customer Relationship - Teamwork', 'Travail en équipe et collaboration', 6),
  (consulting_area_id, 'Consulting & Customer Relationship - Innovation', 'Innovation et créativité dans les solutions', 7),
  (consulting_area_id, 'Consulting Techniques (Know-how) - Presentation Deliverables', 'Techniques de présentation et livrables', 8),
  (consulting_area_id, 'Consulting Techniques (Know-how) - Out Communication', 'Communication externe et présentation', 9),
  (consulting_area_id, 'Consulting Techniques (Know-how) - Advocacy & Personal Organization', 'Plaidoyer et organisation personnelle', 10),
  (consulting_area_id, 'Consulting Techniques (Know-how) - Feedback and Alert Management', 'Gestion des retours et alertes', 11),
  (consulting_area_id, 'Consulting Techniques (Know-how) - Mastery (Operational and Maintenance)', 'Maîtrise opérationnelle et maintenance', 12),
  (consulting_area_id, 'Human Development - Coaching', 'Coaching et développement des talents', 13),
  (consulting_area_id, 'Human Development - Mentoring', 'Mentorat et accompagnement', 14),
  (consulting_area_id, 'Sectoral/functional skills - Sectoral skills', 'Compétences sectorielles spécialisées', 15),
  (consulting_area_id, 'Sectoral/functional skills - Functional skills', 'Compétences fonctionnelles transversales', 16)
  ON CONFLICT DO NOTHING;

  -- Insertion des compétences pour chaque thème et niveau

  -- Business Development
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Business Development' AND career_area_id = consulting_area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Learns to potential sell-out and informs management'),
  (theme_id, confirmed_id, 'Focuses how to qualify opportunities of sell-out on identified'),
  (theme_id, senior_id, 'Identifies and raises sell-out opportunities independently'),
  (theme_id, lead_id, 'Drives business development efforts for key accounts'),
  (theme_id, director_id, 'Shapes and leads business development strategy across sectors');

  -- Consulting & Customer Relationship - Adaptability & Situational Intelligence
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Consulting & Customer Relationship - Adaptability & Situational Intelligence' AND career_area_id = consulting_area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Understands the importance of active listening'),
  (theme_id, confirmed_id, 'Develops the ability to adapt to a situation by making active listening'),
  (theme_id, senior_id, 'Anticipates and manages complex situations with clients'),
  (theme_id, lead_id, 'Leads client interactions with adaptability and precision'),
  (theme_id, director_id, 'Anticipates client needs across multiple projects and environments');

  -- Consulting & Customer Relationship - Customer Recognition
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Consulting & Customer Relationship - Customer Recognition' AND career_area_id = consulting_area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Understands the importance of proactively and demonstrates it on simple'),
  (theme_id, confirmed_id, 'Develops and demonstrates proactively and adaptability'),
  (theme_id, senior_id, 'Demonstrates proactively and adaptability with clients'),
  (theme_id, lead_id, 'Drives business with proactive leadership'),
  (theme_id, director_id, 'Builds a culture of proactive approach with clients');

  -- Consulting & Customer Relationship - Customer Engagement
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Consulting & Customer Relationship - Customer Engagement' AND career_area_id = consulting_area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Demonstrates approachability in behavior'),
  (theme_id, confirmed_id, 'Is credible in the eyes of the client'),
  (theme_id, senior_id, 'Is recognized for the value brought to the client'),
  (theme_id, lead_id, 'Becomes a trusted advisor for the client'),
  (theme_id, director_id, 'Shapes the client''s perception of the organization''s value');

  -- Consulting & Customer Relationship - Customer Prizing
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Consulting & Customer Relationship - Customer Prizing' AND career_area_id = consulting_area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Aligns the customer''s expectations'),
  (theme_id, confirmed_id, 'Understands the customer''s context and internal dynamics'),
  (theme_id, senior_id, 'Provides insights aligned with the customer''s environment'),
  (theme_id, lead_id, 'Leads strategic discussions aligned with the customer''s ecosystem'),
  (theme_id, director_id, 'Shapes organizational approaches to customer privacy');

  -- Consulting & Customer Relationship - Teamwork
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Consulting & Customer Relationship - Teamwork' AND career_area_id = consulting_area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Understands the importance of maintaining customer trust'),
  (theme_id, confirmed_id, 'Proactively ensures data privacy and compliance'),
  (theme_id, senior_id, 'Leads customer privacy initiatives on projects'),
  (theme_id, lead_id, 'Drives strategic discussions on privacy with stakeholders'),
  (theme_id, director_id, 'Shapes organizational approaches to customer privacy');

  -- Consulting & Customer Relationship - Innovation
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Consulting & Customer Relationship - Innovation' AND career_area_id = consulting_area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Contributes effectively to team activities'),
  (theme_id, confirmed_id, 'Collaborates effectively with team members'),
  (theme_id, senior_id, 'Leads collaborative and inclusive project goals'),
  (theme_id, lead_id, 'Facilitates cross-functional teamwork'),
  (theme_id, director_id, 'Fosters a culture of collaboration across teams');

  -- Consulting Techniques (Know-how) - Presentation Deliverables
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Consulting Techniques (Know-how) - Presentation Deliverables' AND career_area_id = consulting_area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Understands the importance of creativity and innovativeness'),
  (theme_id, confirmed_id, 'Proposes innovative ideas within the scope of projects'),
  (theme_id, senior_id, 'Develops creative solutions to complex problems'),
  (theme_id, lead_id, 'Drives innovation in team strategies and approaches'),
  (theme_id, director_id, 'Shapes organizational innovation strategies');

  -- Consulting Techniques (Know-how) - Out Communication
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Consulting Techniques (Know-how) - Out Communication' AND career_area_id = consulting_area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Is able to follow instructions and contribute to deliverables'),
  (theme_id, confirmed_id, 'Develops ownership of deliverables and ensures their quality'),
  (theme_id, senior_id, 'Leads innovation and ensures deliverable excellence'),
  (theme_id, lead_id, 'Oversees deliverable strategies from start to finish with confidence'),
  (theme_id, director_id, 'Shapes organizational standards for deliverable organizational goals');

  -- Consulting Techniques (Know-how) - Advocacy & Personal Organization
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Consulting Techniques (Know-how) - Advocacy & Personal Organization' AND career_area_id = consulting_area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Begins to communicate clearly in team settings'),
  (theme_id, confirmed_id, 'Presents ideas effectively and clear to team discussions'),
  (theme_id, senior_id, 'Leads discussions and moderates workshops with confidence'),
  (theme_id, lead_id, 'Manages strategic presentations for senior stakeholders'),
  (theme_id, director_id, 'Drives high-level communication and thought leadership');

  -- Consulting Techniques (Know-how) - Feedback and Alert Management
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Consulting Techniques (Know-how) - Feedback and Alert Management' AND career_area_id = consulting_area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Learns to give clear feedback and guidance'),
  (theme_id, confirmed_id, 'Independently gives feedback and clear team discussions'),
  (theme_id, senior_id, 'Ensures personal supervision and support team members'),
  (theme_id, lead_id, 'Leads team supervision, ensuring personal and professional growth'),
  (theme_id, director_id, 'Shapes organizational technologies to improve team performance and efficiency');

  -- Consulting Techniques (Know-how) - Mastery (Operational and Maintenance)
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Consulting Techniques (Know-how) - Mastery (Operational and Maintenance)' AND career_area_id = consulting_area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Recognizes feedback and responds appropriately to improve'),
  (theme_id, confirmed_id, 'Proactively seeks feedback and alerts management to risks'),
  (theme_id, senior_id, 'Manages feedback loops and addresses risks within projects'),
  (theme_id, lead_id, 'Establishes feedback systems and ensures alignment with project'),
  (theme_id, director_id, 'Shapes feedback culture and strategic risk management practices');

  -- Human Development - Coaching
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Human Development - Coaching' AND career_area_id = consulting_area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Recognizes in methods and execution for critical thinking'),
  (theme_id, confirmed_id, 'Facilitates meetings and workshops for team delivery'),
  (theme_id, senior_id, 'Leads team focus and strategic and delivery planning'),
  (theme_id, lead_id, 'Drives strategic workshops with senior stakeholders'),
  (theme_id, director_id, 'Shapes organizational frameworks for strategic efficiency');

  -- Human Development - Mentoring
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Human Development - Mentoring' AND career_area_id = consulting_area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Coaches and builds a coaching project for experienced consultants'),
  (theme_id, confirmed_id, 'Mentors teams and junior leaders on strategic consulting skills'),
  (theme_id, senior_id, 'Leads mentoring initiatives for junior team members'),
  (theme_id, lead_id, 'Provides structured coaching for emerging leaders'),
  (theme_id, director_id, 'Shapes the coaching culture across the organization');

  -- Sectoral/functional skills - Sectoral skills
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Sectoral/functional skills - Sectoral skills' AND career_area_id = consulting_area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Develops curiosity about the sectors'),
  (theme_id, confirmed_id, 'Refines appetite for one or more sectors'),
  (theme_id, senior_id, 'Strengthens sector-specific expertise'),
  (theme_id, lead_id, 'Leads sectoral strategies for projects'),
  (theme_id, director_id, 'Drives sectoral growth and knowledge sharing across the organization');

  -- Sectoral/functional skills - Functional skills
  SELECT id INTO theme_id FROM development_themes WHERE name = 'Sectoral/functional skills - Functional skills' AND career_area_id = consulting_area_id;
  
  INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description) VALUES
  (theme_id, junior_id, 'Develops curiosity about the sectors'),
  (theme_id, confirmed_id, 'Refines appetite for one or more sectors'),
  (theme_id, senior_id, 'Strengthens sector-specific expertise'),
  (theme_id, lead_id, 'Leads sectoral strategies for projects'),
  (theme_id, director_id, 'Drives sectoral growth and knowledge sharing across the organization');

END $$;