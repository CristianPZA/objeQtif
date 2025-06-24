/*
  # Ajout du Career Pathway AI Architecture

  1. Nouveau domaine de carrière
    - `AI Architecture Pathway 2025` - Spécialisé dans l'architecture IA et les technologies émergentes

  2. Thèmes de développement
    - Architecture Techniques (Know-how) - 2 thèmes
    - Customer Relationship soft skills - 4 thèmes  
    - Innovation and Development - 2 thèmes
    - Sectoral/functional skills - 2 thèmes
    - Human Development - 2 thèmes
    - Business Development - 2 thèmes
    - Key Skills - 1 thème (Cloud and Systems)

  3. Compétences détaillées
    - Pour chaque niveau : Junior, Confirmé, Senior, Lead, Directeur
    - Descriptions spécifiques aux technologies IA et architecture cloud
*/

-- Ajouter le nouveau domaine de carrière AI Architecture
INSERT INTO career_areas (name, description, icon, color, sort_order) VALUES
('AI Architecture Pathway 2025', 'Spécialisé dans l''architecture IA, le développement de solutions cloud et les technologies émergentes', 'lightbulb', 'purple', 3);

-- Récupérer l'ID du domaine AI Architecture
DO $$
DECLARE
    ai_area_id uuid;
BEGIN
    SELECT id INTO ai_area_id FROM career_areas WHERE name = 'AI Architecture Pathway 2025';

    -- Ajouter les thèmes de développement pour AI Architecture
    
    -- Architecture Techniques (Know-how)
    INSERT INTO development_themes (career_area_id, name, description, sort_order) VALUES
    (ai_area_id, 'Architecture Design', 'Conception et design d''architectures cloud et IA', 1),
    (ai_area_id, 'Architecture Implementation', 'Implémentation et déploiement d''architectures', 2);

    -- Customer Relationship soft skills  
    INSERT INTO development_themes (career_area_id, name, description, sort_order) VALUES
    (ai_area_id, 'Technical Communication', 'Communication technique et présentation de solutions', 3),
    (ai_area_id, 'Customer Communication', 'Communication client et gestion des besoins', 4),
    (ai_area_id, 'Adaptation to Client Needs', 'Adaptation des solutions aux besoins clients', 5),
    (ai_area_id, 'Data Privacy & Security', 'Sécurité des données et conformité', 6);

    -- Innovation and Development
    INSERT INTO development_themes (career_area_id, name, description, sort_order) VALUES
    (ai_area_id, 'Prototyping and Innovation', 'Prototypage et innovation technologique', 7),
    (ai_area_id, 'Solution Knowledge', 'Connaissance des solutions et technologies', 8);

    -- Sectoral/functional skills
    INSERT INTO development_themes (career_area_id, name, description, sort_order) VALUES
    (ai_area_id, 'Functional Expertise', 'Expertise fonctionnelle spécialisée', 9),
    (ai_area_id, 'Sectoral Knowledge', 'Connaissance sectorielle approfondie', 10);

    -- Human Development
    INSERT INTO development_themes (career_area_id, name, description, sort_order) VALUES
    (ai_area_id, 'Mentoring & Coaching', 'Mentorat et coaching d''équipe', 11),
    (ai_area_id, 'Team Management', 'Gestion et leadership d''équipe', 12);

    -- Business Development
    INSERT INTO development_themes (career_area_id, name, description, sort_order) VALUES
    (ai_area_id, 'Client Engagement', 'Engagement client et développement commercial', 13),
    (ai_area_id, 'Market Awareness', 'Connaissance du marché et veille technologique', 14);

    -- Key Skills
    INSERT INTO development_themes (career_area_id, name, description, sort_order) VALUES
    (ai_area_id, 'Cloud and Systems', 'Compétences cloud et systèmes avancés', 15);

END $$;

-- Ajouter les compétences détaillées pour chaque thème et niveau
DO $$
DECLARE
    ai_area_id uuid;
    theme_id uuid;
    junior_level_id uuid;
    confirmed_level_id uuid;
    senior_level_id uuid;
    lead_level_id uuid;
    director_level_id uuid;
BEGIN
    -- Récupérer les IDs nécessaires
    SELECT id INTO ai_area_id FROM career_areas WHERE name = 'AI Architecture Pathway 2025';
    SELECT id INTO junior_level_id FROM career_levels WHERE name = 'Junior';
    SELECT id INTO confirmed_level_id FROM career_levels WHERE name = 'Confirmé';
    SELECT id INTO senior_level_id FROM career_levels WHERE name = 'Senior';
    SELECT id INTO lead_level_id FROM career_levels WHERE name = 'Lead';
    SELECT id INTO director_level_id FROM career_levels WHERE name = 'Directeur';

    -- Architecture Design
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_area_id AND name = 'Architecture Design';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Learns basic sensor and MedTech in the design of cloud architectures', 'Comprendre les capteurs IoT, bases des architectures cloud', 'Formation en technologies cloud de base'),
    (theme_id, confirmed_level_id, 'Designs and implements complex cloud architectures', 'Conception d''architectures multi-cloud, microservices', 'Expérience en développement cloud'),
    (theme_id, senior_level_id, 'Defines cloud architecture standards and best practices', 'Standards d''entreprise, gouvernance cloud', 'Expertise en architecture d''entreprise'),
    (theme_id, lead_level_id, 'Defines technology roadmap and architecture standards', 'Roadmaps technologiques, standards d''équipe', 'Leadership technique confirmé'),
    (theme_id, director_level_id, 'Defines and drives enterprise architecture strategy', 'Stratégie d''architecture d''entreprise', 'Vision stratégique et leadership');

    -- Architecture Implementation
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_area_id AND name = 'Architecture Implementation';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Implements solutions under supervision', 'Déploiement guidé, configuration de base', 'Connaissances en développement'),
    (theme_id, confirmed_level_id, 'Automates deployments and configurations', 'CI/CD, Infrastructure as Code', 'Maîtrise des outils DevOps'),
    (theme_id, senior_level_id, 'Manages critical projects and complex integrations', 'Intégrations complexes, projets critiques', 'Expérience en gestion de projet'),
    (theme_id, lead_level_id, 'Advises technical and business departments on strategic choices', 'Conseil stratégique, choix technologiques', 'Expertise business et technique'),
    (theme_id, director_level_id, 'Works with C-level to innovate and improve competitiveness', 'Innovation stratégique, avantage concurrentiel', 'Relation avec la direction');

    -- Technical Communication
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_area_id AND name = 'Technical Communication';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Participates in code reviews and continuous improvement', 'Revues de code, documentation technique', 'Compétences techniques de base'),
    (theme_id, confirmed_level_id, 'Guarantees infrastructure security and compliance', 'Audits sécurité, conformité réglementaire', 'Connaissance en sécurité'),
    (theme_id, senior_level_id, 'Trains and supports junior and senior architects', 'Formation d''équipe, mentorat technique', 'Compétences pédagogiques'),
    (theme_id, lead_level_id, 'Manages a team of senior architects and ensures their development', 'Management d''équipe, développement des talents', 'Leadership et gestion d''équipe'),
    (theme_id, director_level_id, 'Represents the company at technology events and acts as an evangelist', 'Conférences, représentation externe', 'Visibilité et influence externe');

    -- Customer Communication
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_area_id AND name = 'Customer Communication';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Communicates technical progress clearly', 'Rapports de progression, communication claire', 'Compétences de communication'),
    (theme_id, confirmed_level_id, 'Contributes to technical growth and business value', 'Contribution technique et valeur business', 'Compréhension business'),
    (theme_id, senior_level_id, 'Leads discussions on technical concepts for business value', 'Présentation technique orientée business', 'Expertise technique et business'),
    (theme_id, lead_level_id, 'Drives strategy discussions linking technical and business aspects', 'Alignement stratégique technique-business', 'Vision stratégique'),
    (theme_id, director_level_id, 'Shapes data privacy strategies at the organizational level', 'Stratégies de confidentialité organisationnelles', 'Gouvernance des données');

    -- Adaptation to Client Needs
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_area_id AND name = 'Adaptation to Client Needs';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Understands client requirements with guidance', 'Analyse des besoins avec accompagnement', 'Compétences d''analyse'),
    (theme_id, confirmed_level_id, 'Adapts technical solutions to align with client needs', 'Personnalisation de solutions', 'Expérience client'),
    (theme_id, senior_level_id, 'Proposes innovative technical solutions tailored to client challenges', 'Solutions innovantes sur mesure', 'Créativité technique'),
    (theme_id, lead_level_id, 'Drives cross-team efforts to deliver client-specific AI solutions', 'Coordination d''équipes pour solutions IA', 'Leadership transversal'),
    (theme_id, director_level_id, 'Leads client strategies to integrate advanced AI solutions', 'Stratégies d''intégration IA avancées', 'Vision stratégique IA');

    -- Data Privacy & Security
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_area_id AND name = 'Data Privacy & Security';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Understands basic data privacy and protection guidelines', 'RGPD de base, protection des données', 'Formation en sécurité'),
    (theme_id, confirmed_level_id, 'Implements data privacy measures in technical solutions', 'Chiffrement, anonymisation', 'Compétences en sécurité'),
    (theme_id, senior_level_id, 'Leads data privacy initiatives for projects and teams', 'Initiatives de confidentialité', 'Expertise en gouvernance'),
    (theme_id, lead_level_id, 'Facilitates cross-functional discussions on data security', 'Coordination sécurité transversale', 'Leadership sécurité'),
    (theme_id, director_level_id, 'Shapes data privacy strategies at the organizational level', 'Stratégies organisationnelles de confidentialité', 'Gouvernance d''entreprise');

    -- Prototyping and Innovation
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_area_id AND name = 'Prototyping and Innovation';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Tests new tools or algorithms on simple projects', 'POC simples, tests d''outils', 'Curiosité technique'),
    (theme_id, confirmed_level_id, 'Develops proof-of-concept solutions for business use cases', 'Prototypes métier, validation de concepts', 'Compétences en prototypage'),
    (theme_id, senior_level_id, 'Leads prototyping efforts for complex client challenges', 'Prototypes complexes, défis clients', 'Expertise en innovation'),
    (theme_id, lead_level_id, 'Drives innovation in AI methodologies and tools', 'Innovation en méthodologies IA', 'Leadership en innovation'),
    (theme_id, director_level_id, 'Shapes the organization''s innovation agenda for AI and data science', 'Agenda d''innovation organisationnelle', 'Vision stratégique innovation');

    -- Solution Knowledge
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_area_id AND name = 'Solution Knowledge';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Learns the basics of a few industry sectors', 'Bases sectorielles, domaines d''application', 'Curiosité sectorielle'),
    (theme_id, confirmed_level_id, 'Develops knowledge in specific technical areas (e.g., risk, supply)', 'Spécialisation technique sectorielle', 'Approfondissement technique'),
    (theme_id, senior_level_id, 'Applies functional expertise to lead technical solutions', 'Leadership technique sectoriel', 'Expertise fonctionnelle'),
    (theme_id, lead_level_id, 'Leads sector-specific strategies for technical projects', 'Stratégies techniques sectorielles', 'Vision sectorielle'),
    (theme_id, director_level_id, 'Shapes organizational understanding of sectoral trends and needs', 'Compréhension organisationnelle sectorielle', 'Intelligence sectorielle');

    -- Functional Expertise
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_area_id AND name = 'Functional Expertise';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Learns functional basics relevant to the domain', 'Bases fonctionnelles du domaine', 'Formation fonctionnelle'),
    (theme_id, confirmed_level_id, 'Develops expertise in specific functional areas (e.g., risk, supply)', 'Expertise fonctionnelle spécialisée', 'Approfondissement fonctionnel'),
    (theme_id, senior_level_id, 'Applies functional expertise to lead technical solutions', 'Application de l''expertise fonctionnelle', 'Leadership fonctionnel'),
    (theme_id, lead_level_id, 'Drives cross-functional initiatives for strategic impact', 'Initiatives transfonctionnelles', 'Vision stratégique'),
    (theme_id, director_level_id, 'Shapes functional strategies aligned with organizational goals', 'Stratégies fonctionnelles organisationnelles', 'Alignement stratégique');

    -- Sectoral Knowledge
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_area_id AND name = 'Sectoral Knowledge';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Learns the basics of a few industry sectors', 'Découverte sectorielle, bases industrielles', 'Ouverture sectorielle'),
    (theme_id, confirmed_level_id, 'Develops knowledge in specific technical areas', 'Spécialisation sectorielle technique', 'Expertise sectorielle'),
    (theme_id, senior_level_id, 'Applies sectoral knowledge to propose relevant solutions', 'Solutions sectorielles pertinentes', 'Expertise sectorielle avancée'),
    (theme_id, lead_level_id, 'Leads sector-specific strategies for technical projects', 'Stratégies sectorielles techniques', 'Leadership sectoriel'),
    (theme_id, director_level_id, 'Shapes organizational understanding of sectoral trends and needs', 'Compréhension sectorielle organisationnelle', 'Vision sectorielle stratégique');

    -- Mentoring & Coaching
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_area_id AND name = 'Mentoring & Coaching';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Learns mentoring basics', 'Bases du mentorat, accompagnement', 'Compétences relationnelles'),
    (theme_id, confirmed_level_id, 'Coaches and mentors junior team members', 'Coaching d''équipe junior', 'Compétences pédagogiques'),
    (theme_id, senior_level_id, 'Leads mentoring initiatives for junior team members', 'Programmes de mentorat', 'Leadership de développement'),
    (theme_id, lead_level_id, 'Provides structured coaching for emerging leaders', 'Coaching structuré de leaders', 'Expertise en développement'),
    (theme_id, director_level_id, 'Shapes organizational culture of mentoring and talent development', 'Culture organisationnelle de développement', 'Vision RH stratégique');

    -- Team Management
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_area_id AND name = 'Team Management';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Supports team activities and ensures alignment', 'Support d''équipe, alignement', 'Esprit d''équipe'),
    (theme_id, confirmed_level_id, 'Leads small teams and manages priorities effectively', 'Management de petites équipes', 'Compétences managériales'),
    (theme_id, senior_level_id, 'Leads technical aspects of client engagements', 'Leadership technique client', 'Expertise technique et client'),
    (theme_id, lead_level_id, 'Manages large teams with strategic direction', 'Management stratégique d''équipes', 'Leadership stratégique'),
    (theme_id, director_level_id, 'Develops team leaders and drives organizational alignment', 'Développement de leaders organisationnels', 'Vision organisationnelle');

    -- Client Engagement
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_area_id AND name = 'Client Engagement';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Supports client discussions with technical insights', 'Support technique en réunion client', 'Compétences techniques'),
    (theme_id, confirmed_level_id, 'Proposes technical solutions aligned with client needs', 'Solutions techniques adaptées', 'Compréhension client'),
    (theme_id, senior_level_id, 'Leads technical aspects of client engagements', 'Leadership technique client', 'Expertise client'),
    (theme_id, lead_level_id, 'Drives business opportunities through technical leadership', 'Opportunités business via technique', 'Leadership commercial'),
    (theme_id, director_level_id, 'Shapes client engagement strategies with innovative solutions', 'Stratégies d''engagement innovantes', 'Vision commerciale');

    -- Market Awareness
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_area_id AND name = 'Market Awareness';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Learns market trends relevant to technical solutions', 'Veille technologique, tendances marché', 'Curiosité marché'),
    (theme_id, confirmed_level_id, 'Develops knowledge of market needs for technical solutions', 'Besoins marché techniques', 'Analyse marché'),
    (theme_id, senior_level_id, 'Identifies market opportunities for technical innovations', 'Opportunités d''innovation technique', 'Vision marché'),
    (theme_id, lead_level_id, 'Drives market strategies aligned with technical capabilities', 'Stratégies marché techniques', 'Leadership marché'),
    (theme_id, director_level_id, 'Shapes organizational market strategies for technical growth', 'Stratégies marché organisationnelles', 'Vision stratégique marché');

    -- Cloud and Systems
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_area_id AND name = 'Cloud and Systems';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Understanding of basic cloud concepts (AWS, Azure, GCP), basics of software architecture and infrastructure (IaaS, PaaS, SaaS), good command of scripting languages (Python, Bash, PowerShell), notions of security and cloud networking', 'Concepts cloud de base, scripting, sécurité cloud', 'Formation cloud et sécurité'),
    (theme_id, confirmed_level_id, 'Design of scalable and secure cloud architectures, advanced mastery of cloud services and DevOps best practices, experience with CI/CD and infrastructure as code (IaC), good understanding of microservices and serverless architectures, ability to analyze and optimize system performance', 'Architectures cloud scalables, DevOps, IaC, microservices', 'Expérience en architecture cloud'),
    (theme_id, senior_level_id, 'Strategic vision of IT and cloud architectures, optimization of cloud costs and governance, mastery of hybrid (on-premise/cloud) and multi-cloud models, ability to design architectures ensuring high-performance variations, risk management and implementation of advanced security policies', 'Vision stratégique cloud, gouvernance, architectures hybrides', 'Expertise en gouvernance cloud'),
    (theme_id, lead_level_id, 'Technical leadership and strategic influence, ability to manage several projects in parallel, communication and popularization of technical concepts to non-technical stakeholders, business-oriented architecture and alignment with business objectives, relationship management with cloud providers and technology partners', 'Leadership technique, gestion multi-projets, relation fournisseurs', 'Leadership technique confirmé'),
    (theme_id, director_level_id, 'Global vision of enterprise architecture, alignment of IT and cloud strategies with business objectives, budget management and optimization of cloud investments, influence on strategic decisions regarding technology developments, management and leadership skills', 'Vision d''entreprise, alignement stratégique, gestion budgétaire', 'Vision stratégique d''entreprise');

END $$;