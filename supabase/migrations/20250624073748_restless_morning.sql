/*
  # Ajout des exemples et prérequis pour les Career Pathways existants

  1. Mise à jour des compétences
    - Ajout d'exemples concrets pour chaque compétence
    - Ajout de prérequis pour chaque niveau
    - Amélioration de la structure des données

  2. Uniformisation des données
    - Cohérence dans le format des exemples
    - Standardisation des prérequis
*/

-- Mise à jour des compétences pour Quantitative Analyst Pathway
DO $$
DECLARE
    quant_area_id uuid;
    theme_id uuid;
    junior_level_id uuid;
    confirmed_level_id uuid;
    senior_level_id uuid;
    lead_level_id uuid;
    director_level_id uuid;
BEGIN
    -- Récupérer les IDs nécessaires
    SELECT id INTO quant_area_id FROM career_areas WHERE name = 'Quantitative Analyst Pathway 2025';
    SELECT id INTO junior_level_id FROM career_levels WHERE name = 'Junior';
    SELECT id INTO confirmed_level_id FROM career_levels WHERE name = 'Confirmé';
    SELECT id INTO senior_level_id FROM career_levels WHERE name = 'Senior';
    SELECT id INTO lead_level_id FROM career_levels WHERE name = 'Lead';
    SELECT id INTO director_level_id FROM career_levels WHERE name = 'Directeur';

    -- Mise à jour des compétences existantes avec exemples et prérequis
    
    -- Quantitative Analysis Techniques (Know-how) - Financial Modeling
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = quant_area_id AND name = 'Financial Modeling';
    
    UPDATE pathway_skills SET 
        examples = 'Modèles DCF simples, valorisation d''actions basiques',
        requirements = 'Formation en finance, bases d''Excel'
    WHERE development_theme_id = theme_id AND career_level_id = junior_level_id;
    
    UPDATE pathway_skills SET 
        examples = 'Modèles financiers complexes, analyses de sensibilité avancées',
        requirements = 'Maîtrise d''Excel avancé, VBA, bases de Python/R'
    WHERE development_theme_id = theme_id AND career_level_id = confirmed_level_id;
    
    UPDATE pathway_skills SET 
        examples = 'Modèles de risque sophistiqués, optimisation de portefeuille',
        requirements = 'Expertise en modélisation quantitative, Python/R avancé'
    WHERE development_theme_id = theme_id AND career_level_id = senior_level_id;
    
    UPDATE pathway_skills SET 
        examples = 'Stratégies quantitatives multi-actifs, modèles propriétaires',
        requirements = 'Leadership technique, expertise en finance quantitative'
    WHERE development_theme_id = theme_id AND career_level_id = lead_level_id;
    
    UPDATE pathway_skills SET 
        examples = 'Standards de modélisation d''entreprise, méthodologies innovantes',
        requirements = 'Vision stratégique, expertise reconnue du marché'
    WHERE development_theme_id = theme_id AND career_level_id = director_level_id;

    -- Data Preparation & Insight
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = quant_area_id AND name = 'Data Preparation & Insight';
    
    UPDATE pathway_skills SET 
        examples = 'Nettoyage de données simples, analyses descriptives de base',
        requirements = 'Bases de statistiques, Excel, introduction à SQL'
    WHERE development_theme_id = theme_id AND career_level_id = junior_level_id;
    
    UPDATE pathway_skills SET 
        examples = 'ETL complexes, analyses prédictives, visualisations avancées',
        requirements = 'SQL avancé, Python/R, outils de BI'
    WHERE development_theme_id = theme_id AND career_level_id = confirmed_level_id;
    
    UPDATE pathway_skills SET 
        examples = 'Architectures de données, machine learning, insights stratégiques',
        requirements = 'Expertise en data science, leadership analytique'
    WHERE development_theme_id = theme_id AND career_level_id = senior_level_id;
    
    UPDATE pathway_skills SET 
        examples = 'Stratégies data-driven, initiatives d''innovation analytique',
        requirements = 'Vision stratégique des données, leadership d''équipe'
    WHERE development_theme_id = theme_id AND career_level_id = lead_level_id;
    
    UPDATE pathway_skills SET 
        examples = 'Standards organisationnels de données, transformation digitale',
        requirements = 'Vision d''entreprise, expertise en gouvernance des données'
    WHERE development_theme_id = theme_id AND career_level_id = director_level_id;

    -- Optimization Techniques
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = quant_area_id AND name = 'Optimization Techniques';
    
    UPDATE pathway_skills SET 
        examples = 'Optimisation linéaire simple, problèmes d''allocation de base',
        requirements = 'Mathématiques appliquées, bases d''optimisation'
    WHERE development_theme_id = theme_id AND career_level_id = junior_level_id;
    
    UPDATE pathway_skills SET 
        examples = 'Optimisation de portefeuille, algorithmes génétiques',
        requirements = 'Optimisation avancée, programmation mathématique'
    WHERE development_theme_id = theme_id AND career_level_id = confirmed_level_id;
    
    UPDATE pathway_skills SET 
        examples = 'Optimisation stochastique, méta-heuristiques avancées',
        requirements = 'Expertise en recherche opérationnelle'
    WHERE development_theme_id = theme_id AND career_level_id = senior_level_id;
    
    UPDATE pathway_skills SET 
        examples = 'Stratégies d''optimisation multi-objectifs, innovation algorithmique',
        requirements = 'Leadership en optimisation, vision stratégique'
    WHERE development_theme_id = theme_id AND career_level_id = lead_level_id;
    
    UPDATE pathway_skills SET 
        examples = 'Standards d''optimisation d''entreprise, méthodologies propriétaires',
        requirements = 'Vision d''entreprise, expertise reconnue'
    WHERE development_theme_id = theme_id AND career_level_id = director_level_id;

END $$;

-- Mise à jour des compétences pour Consulting Pathway
DO $$
DECLARE
    consulting_area_id uuid;
    theme_id uuid;
    junior_level_id uuid;
    confirmed_level_id uuid;
    senior_level_id uuid;
    lead_level_id uuid;
    director_level_id uuid;
BEGIN
    -- Récupérer les IDs nécessaires
    SELECT id INTO consulting_area_id FROM career_areas WHERE name = 'Consulting Pathway 2025';
    SELECT id INTO junior_level_id FROM career_levels WHERE name = 'Junior';
    SELECT id INTO confirmed_level_id FROM career_levels WHERE name = 'Confirmé';
    SELECT id INTO senior_level_id FROM career_levels WHERE name = 'Senior';
    SELECT id INTO lead_level_id FROM career_levels WHERE name = 'Lead';
    SELECT id INTO director_level_id FROM career_levels WHERE name = 'Directeur';

    -- Business Development
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = consulting_area_id AND name = 'Business Development';
    
    UPDATE pathway_skills SET 
        examples = 'Participation aux présentations client, support commercial',
        requirements = 'Formation commerciale de base, compétences relationnelles'
    WHERE development_theme_id = theme_id AND career_level_id = junior_level_id;
    
    UPDATE pathway_skills SET 
        examples = 'Développement de propositions, qualification d''opportunités',
        requirements = 'Expérience client, compétences en présentation'
    WHERE development_theme_id = theme_id AND career_level_id = confirmed_level_id;
    
    UPDATE pathway_skills SET 
        examples = 'Stratégies de développement commercial, partenariats',
        requirements = 'Expertise sectorielle, réseau professionnel'
    WHERE development_theme_id = theme_id AND career_level_id = senior_level_id;
    
    UPDATE pathway_skills SET 
        examples = 'Leadership commercial, développement de comptes clés',
        requirements = 'Leadership commercial confirmé, vision stratégique'
    WHERE development_theme_id = theme_id AND career_level_id = lead_level_id;
    
    UPDATE pathway_skills SET 
        examples = 'Stratégie commerciale d''entreprise, alliances stratégiques',
        requirements = 'Vision d''entreprise, leadership exécutif'
    WHERE development_theme_id = theme_id AND career_level_id = director_level_id;

    -- Adaptability & Situational Intelligence
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = consulting_area_id AND name = 'Adaptability & Situational Intelligence';
    
    UPDATE pathway_skills SET 
        examples = 'Adaptation aux différents environnements client, écoute active',
        requirements = 'Intelligence émotionnelle, flexibilité'
    WHERE development_theme_id = theme_id AND career_level_id = junior_level_id;
    
    UPDATE pathway_skills SET 
        examples = 'Lecture des dynamiques organisationnelles, adaptation stratégique',
        requirements = 'Expérience multi-sectorielle, analyse comportementale'
    WHERE development_theme_id = theme_id AND career_level_id = confirmed_level_id;
    
    UPDATE pathway_skills SET 
        examples = 'Gestion de situations complexes, leadership adaptatif',
        requirements = 'Expertise en gestion du changement'
    WHERE development_theme_id = theme_id AND career_level_id = senior_level_id;
    
    UPDATE pathway_skills SET 
        examples = 'Transformation organisationnelle, leadership du changement',
        requirements = 'Leadership transformationnel, vision stratégique'
    WHERE development_theme_id = theme_id AND career_level_id = lead_level_id;
    
    UPDATE pathway_skills SET 
        examples = 'Vision stratégique d''adaptation, anticipation des tendances',
        requirements = 'Vision prospective, leadership d''influence'
    WHERE development_theme_id = theme_id AND career_level_id = director_level_id;

END $$;