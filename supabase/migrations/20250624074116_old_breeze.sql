/*
  # Ajout du Career Pathway AI Engineering Data Science 2025

  1. Nouveau domaine de carrière
    - AI Engineering Data Science Pathway 2025
    - Spécialisé dans l'ingénierie IA, data science et développement ML

  2. Thèmes de développement
    - Engineering & Data Science Techniques (Know-how)
    - Customer Relationship soft skills  
    - Innovation and Development
    - Sectoral/functional skills
    - Human Development
    - Business Development
    - Key Skills (Data Scientist, Data Engineer, Data Analyst, ML Ops Engineer)

  3. Compétences détaillées
    - Exemples concrets pour chaque niveau
    - Prérequis spécifiques adaptés
    - Progression cohérente du Junior au Directeur
*/

-- Ajouter le nouveau domaine de carrière AI Engineering Data Science
INSERT INTO career_areas (name, description, icon, color, sort_order) VALUES
('AI Engineering Data Science Pathway 2025', 'Spécialisé dans l''ingénierie IA, la data science et le développement de solutions ML avancées', 'lightbulb', 'indigo', 4);

-- Récupérer l'ID du domaine AI Engineering Data Science
DO $$
DECLARE
    ai_eng_area_id uuid;
BEGIN
    SELECT id INTO ai_eng_area_id FROM career_areas WHERE name = 'AI Engineering Data Science Pathway 2025';

    -- Ajouter les thèmes de développement pour AI Engineering Data Science
    
    -- Engineering & Data Science Techniques (Know-how)
    INSERT INTO development_themes (career_area_id, name, description, sort_order) VALUES
    (ai_eng_area_id, 'Machine Learning Development', 'Développement et déploiement de modèles ML', 1),
    (ai_eng_area_id, 'Data Pipeline Management', 'Gestion et optimisation des pipelines de données', 2),
    (ai_eng_area_id, 'Deployment and Monitoring', 'Déploiement et monitoring des modèles en production', 3);

    -- Customer Relationship soft skills  
    INSERT INTO development_themes (career_area_id, name, description, sort_order) VALUES
    (ai_eng_area_id, 'Technical Communication', 'Communication technique et présentation de résultats', 4),
    (ai_eng_area_id, 'Adaptability & Client Needs', 'Adaptation aux besoins clients et contextes métier', 5),
    (ai_eng_area_id, 'Data Privacy & Security', 'Sécurité des données et conformité réglementaire', 6);

    -- Innovation and Development
    INSERT INTO development_themes (career_area_id, name, description, sort_order) VALUES
    (ai_eng_area_id, 'Prototyping and Innovation', 'Prototypage et innovation en IA/ML', 7),
    (ai_eng_area_id, 'Sectoral Knowledge', 'Connaissance sectorielle et applications métier', 8);

    -- Sectoral/functional skills
    INSERT INTO development_themes (career_area_id, name, description, sort_order) VALUES
    (ai_eng_area_id, 'Functional Expertise', 'Expertise fonctionnelle spécialisée', 9);

    -- Human Development
    INSERT INTO development_themes (career_area_id, name, description, sort_order) VALUES
    (ai_eng_area_id, 'Mentoring & Coaching', 'Mentorat et développement d''équipe', 10),
    (ai_eng_area_id, 'Team Management', 'Gestion et leadership d''équipe technique', 11);

    -- Business Development
    INSERT INTO development_themes (career_area_id, name, description, sort_order) VALUES
    (ai_eng_area_id, 'Client Engagement', 'Engagement client et développement commercial', 12),
    (ai_eng_area_id, 'Market Awareness', 'Connaissance du marché et veille technologique', 13);

    -- Key Skills
    INSERT INTO development_themes (career_area_id, name, description, sort_order) VALUES
    (ai_eng_area_id, 'Data Scientist', 'Compétences en science des données', 14),
    (ai_eng_area_id, 'Data Engineer', 'Compétences en ingénierie des données', 15),
    (ai_eng_area_id, 'Data Analyst', 'Compétences en analyse de données', 16),
    (ai_eng_area_id, 'ML Ops Engineer', 'Compétences en MLOps et déploiement ML', 17);

END $$;

-- Ajouter les compétences détaillées pour chaque thème et niveau
DO $$
DECLARE
    ai_eng_area_id uuid;
    theme_id uuid;
    junior_level_id uuid;
    confirmed_level_id uuid;
    senior_level_id uuid;
    lead_level_id uuid;
    director_level_id uuid;
BEGIN
    -- Récupérer les IDs nécessaires
    SELECT id INTO ai_eng_area_id FROM career_areas WHERE name = 'AI Engineering Data Science Pathway 2025';
    SELECT id INTO junior_level_id FROM career_levels WHERE name = 'Junior';
    SELECT id INTO confirmed_level_id FROM career_levels WHERE name = 'Confirmé';
    SELECT id INTO senior_level_id FROM career_levels WHERE name = 'Senior';
    SELECT id INTO lead_level_id FROM career_levels WHERE name = 'Lead';
    SELECT id INTO director_level_id FROM career_levels WHERE name = 'Directeur';

    -- Machine Learning Development
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_eng_area_id AND name = 'Machine Learning Development';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Implements basic ML models with guidance', 'Modèles de régression/classification simples, scikit-learn', 'Formation en ML, Python de base'),
    (theme_id, confirmed_level_id, 'Develops and fine-tunes ML models independently', 'Optimisation d''hyperparamètres, validation croisée', 'Maîtrise de scikit-learn, bases de deep learning'),
    (theme_id, senior_level_id, 'Leads the development of advanced models for business-critical use cases', 'Modèles de deep learning complexes, NLP avancé', 'Expertise en deep learning, frameworks avancés'),
    (theme_id, lead_level_id, 'Oversees cross-functional teams focused on ML projects', 'Leadership de projets ML multi-équipes', 'Leadership technique, vision produit'),
    (theme_id, director_level_id, 'Shapes the organization''s ML strategy and innovation pipeline', 'Stratégie ML d''entreprise, roadmap innovation', 'Vision stratégique, expertise reconnue');

    -- Data Pipeline Management
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_eng_area_id AND name = 'Data Pipeline Management';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Supports the design and maintenance of simple data pipelines', 'ETL simples, scripts de traitement de données', 'SQL de base, Python, concepts ETL'),
    (theme_id, confirmed_level_id, 'Develops and optimizes robust data pipelines', 'Pipelines Airflow/Kafka, optimisation de performance', 'Maîtrise d''outils ETL, architecture de données'),
    (theme_id, senior_level_id, 'Leads pipeline architecture and ensures scalability', 'Architectures big data, streaming en temps réel', 'Expertise en architecture distribuée'),
    (theme_id, lead_level_id, 'Oversees enterprise-wide data pipeline strategies', 'Stratégies de données d''entreprise', 'Leadership en architecture de données'),
    (theme_id, director_level_id, 'Defines strategic data pipeline frameworks for global implementations', 'Frameworks de données globaux', 'Vision stratégique des données');

    -- Deployment and Monitoring
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_eng_area_id AND name = 'Deployment and Monitoring';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Learns the basics of key industry sectors', 'Déploiement de modèles simples, monitoring de base', 'Bases de DevOps, Docker'),
    (theme_id, confirmed_level_id, 'Deploys models and sets up monitoring frameworks', 'CI/CD pour ML, monitoring avancé', 'MLOps, Kubernetes, monitoring'),
    (theme_id, senior_level_id, 'Ensures seamless deployment and performance monitoring of deployed models', 'Déploiement à grande échelle, SLA de performance', 'Expertise en production ML'),
    (theme_id, lead_level_id, 'Drives automation and best practices for model deployment', 'Automatisation MLOps, best practices', 'Leadership en MLOps'),
    (theme_id, director_level_id, 'Shapes deployment standards and innovation in model deployment', 'Standards de déploiement d''entreprise', 'Vision stratégique MLOps');

    -- Technical Communication
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_eng_area_id AND name = 'Technical Communication';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Communicates technical findings to team members', 'Rapports techniques, présentations d''équipe', 'Compétences de communication'),
    (theme_id, confirmed_level_id, 'Presents technical insights clearly to non-technical stakeholders', 'Présentations business, vulgarisation technique', 'Communication cross-fonctionnelle'),
    (theme_id, senior_level_id, 'Leads discussions translating technical concepts to business value', 'Alignement technique-business, ROI des projets', 'Leadership de communication'),
    (theme_id, lead_level_id, 'Drives strategic conversations linking technical and business', 'Stratégies data-driven, transformation digitale', 'Vision stratégique'),
    (theme_id, director_level_id, 'Shapes the organization''s narrative around technical capabilities', 'Communication d''entreprise, évangélisation', 'Leadership d''influence');

    -- Adaptability & Client Needs
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_eng_area_id AND name = 'Adaptability & Client Needs';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Understands client requirements with guidance', 'Analyse des besoins avec accompagnement', 'Compétences d''analyse'),
    (theme_id, confirmed_level_id, 'Adapts technical solutions to align with client needs', 'Personnalisation de solutions ML', 'Expérience client'),
    (theme_id, senior_level_id, 'Proposes innovative technical solutions tailored to client challenges', 'Solutions innovantes sur mesure', 'Créativité technique'),
    (theme_id, lead_level_id, 'Drives cross-team efforts to deliver client-specific AI solutions', 'Coordination pour solutions IA spécifiques', 'Leadership transversal'),
    (theme_id, director_level_id, 'Shapes client engagement strategies with innovative solutions', 'Stratégies d''engagement innovantes', 'Vision commerciale');

    -- Data Privacy & Security
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_eng_area_id AND name = 'Data Privacy & Security';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Understands the basics of data privacy compliance', 'RGPD de base, anonymisation simple', 'Formation en sécurité des données'),
    (theme_id, confirmed_level_id, 'Implements data privacy measures in technical solutions', 'Chiffrement, pseudonymisation', 'Compétences en sécurité'),
    (theme_id, senior_level_id, 'Leads privacy compliance initiatives for projects', 'Audits de conformité, privacy by design', 'Expertise en gouvernance'),
    (theme_id, lead_level_id, 'Drives strategic discussions on data security', 'Stratégies de sécurité des données', 'Leadership sécurité'),
    (theme_id, director_level_id, 'Shapes data privacy strategies at the organizational level', 'Politiques de confidentialité d''entreprise', 'Gouvernance d''entreprise');

    -- Prototyping and Innovation
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_eng_area_id AND name = 'Prototyping and Innovation';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Tests new tools or algorithms on simple projects', 'POC ML simples, tests d''outils', 'Curiosité technique'),
    (theme_id, confirmed_level_id, 'Develops proof-of-concept solutions for business use cases', 'Prototypes métier, validation de concepts ML', 'Compétences en prototypage'),
    (theme_id, senior_level_id, 'Leads prototyping efforts for complex client challenges', 'Innovation en méthodologies et outils', 'Expertise en innovation'),
    (theme_id, lead_level_id, 'Drives innovation in AI methodologies and tools', 'Leadership en innovation IA', 'Leadership en innovation'),
    (theme_id, director_level_id, 'Shapes the organization''s innovation agenda for AI and data science', 'Agenda d''innovation organisationnelle', 'Vision stratégique innovation');

    -- Sectoral Knowledge
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_eng_area_id AND name = 'Sectoral Knowledge';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Learns the basics of a few industry sectors', 'Découverte sectorielle, cas d''usage métier', 'Ouverture sectorielle'),
    (theme_id, confirmed_level_id, 'Develops knowledge in specific sectors of focus', 'Spécialisation sectorielle, expertise métier', 'Approfondissement sectoriel'),
    (theme_id, senior_level_id, 'Applies sectoral knowledge to propose relevant solutions', 'Solutions sectorielles innovantes', 'Expertise sectorielle avancée'),
    (theme_id, lead_level_id, 'Leads sector-specific strategies for technical projects', 'Stratégies techniques sectorielles', 'Leadership sectoriel'),
    (theme_id, director_level_id, 'Shapes organizational understanding of sectoral trends and needs', 'Vision sectorielle organisationnelle', 'Intelligence sectorielle');

    -- Functional Expertise
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_eng_area_id AND name = 'Functional Expertise';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Learns functional basics relevant to the domain', 'Bases fonctionnelles du domaine', 'Formation fonctionnelle'),
    (theme_id, confirmed_level_id, 'Develops expertise in specific functional areas (e.g., risk, supply)', 'Expertise fonctionnelle spécialisée', 'Approfondissement fonctionnel'),
    (theme_id, senior_level_id, 'Applies functional expertise to lead technical solutions', 'Leadership fonctionnel technique', 'Expertise fonctionnelle confirmée'),
    (theme_id, lead_level_id, 'Drives cross-functional initiatives for strategic impact', 'Initiatives transfonctionnelles', 'Vision stratégique'),
    (theme_id, director_level_id, 'Shapes functional strategies aligned with organizational goals', 'Stratégies fonctionnelles organisationnelles', 'Alignement stratégique');

    -- Mentoring & Coaching
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_eng_area_id AND name = 'Mentoring & Coaching';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Mentors peers on technical tasks and workflows', 'Mentorat technique, partage de connaissances', 'Compétences pédagogiques'),
    (theme_id, confirmed_level_id, 'Leads mentoring initiatives for junior team members', 'Programmes de mentorat junior', 'Leadership de développement'),
    (theme_id, senior_level_id, 'Leads small teams and manages priorities effectively', 'Management d''équipe, priorisation', 'Compétences managériales'),
    (theme_id, lead_level_id, 'Provides structured coaching for emerging leaders', 'Coaching de leaders émergents', 'Expertise en développement'),
    (theme_id, director_level_id, 'Shapes organizational culture of mentoring and talent development', 'Culture de développement organisationnelle', 'Vision RH stratégique');

    -- Team Management
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_eng_area_id AND name = 'Team Management';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Supports team activities and ensures alignment', 'Support d''équipe, coordination', 'Esprit d''équipe'),
    (theme_id, confirmed_level_id, 'Leads small teams and manages priorities effectively', 'Management de petites équipes techniques', 'Compétences managériales'),
    (theme_id, senior_level_id, 'Manages large teams with strategic direction', 'Management stratégique d''équipes', 'Leadership stratégique'),
    (theme_id, lead_level_id, 'Develops team leaders and drives organizational alignment', 'Développement de leaders, alignement', 'Leadership organisationnel'),
    (theme_id, director_level_id, 'Develops team leaders and drives organizational alignment', 'Culture organisationnelle de leadership', 'Vision organisationnelle');

    -- Client Engagement
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_eng_area_id AND name = 'Client Engagement';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Supports client discussions with technical insights', 'Support technique en réunion client', 'Compétences techniques'),
    (theme_id, confirmed_level_id, 'Proposes technical solutions aligned with client needs', 'Solutions techniques adaptées aux besoins', 'Compréhension client'),
    (theme_id, senior_level_id, 'Leads technical aspects of client engagements', 'Leadership technique client', 'Expertise client'),
    (theme_id, lead_level_id, 'Drives business opportunities through technical leadership', 'Opportunités business via leadership technique', 'Leadership commercial'),
    (theme_id, director_level_id, 'Shapes client engagement strategies with innovative solutions', 'Stratégies d''engagement innovantes', 'Vision commerciale');

    -- Market Awareness
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_eng_area_id AND name = 'Market Awareness';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Learns market trends relevant to technical solutions', 'Veille technologique, tendances IA/ML', 'Curiosité marché'),
    (theme_id, confirmed_level_id, 'Develops knowledge of market needs for technical solutions', 'Besoins marché en IA/ML', 'Analyse marché'),
    (theme_id, senior_level_id, 'Identifies market opportunities for technical innovations', 'Opportunités d''innovation technique', 'Vision marché'),
    (theme_id, lead_level_id, 'Drives market strategies aligned with technical capabilities', 'Stratégies marché techniques', 'Leadership marché'),
    (theme_id, director_level_id, 'Shapes organizational market strategies for technical growth', 'Stratégies marché organisationnelles', 'Vision stratégique marché');

    -- Data Scientist
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_eng_area_id AND name = 'Data Scientist';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Good understanding of fundamentals in statistics and machine learning, experience with Python (pandas, scikit-learn), R, or SQL, knowledge of traditional and NoSQL databases, initial experience in data wrangling and data cleaning, knowledge of data visualization tools (Matplotlib, Seaborn, Tableau, Power BI), familiarity with cloud environments (AWS, GCP, Azure) and data pipelines', 'Analyses statistiques de base, modèles ML simples, visualisations', 'Formation en statistiques, Python/R, SQL'),
    (theme_id, confirmed_level_id, 'Experience in developing and deploying predictive models, advanced knowledge of machine learning techniques (XGBoost, neural networks, NLP), strong practice of MLOps and model industrialization (Docker, Kubernetes, CI/CD), experience with deep learning frameworks (TensorFlow, PyTorch), ability to understand and model complex business problems', 'Modèles prédictifs avancés, deep learning, MLOps', 'Expertise en ML avancé, frameworks de deep learning'),
    (theme_id, senior_level_id, 'Expertise in machine learning, deep learning, and advanced statistics, strong experience in handling large-scale data (Big Data, Spark, Dask), ability to design robust and explainable models, proficiency in cloud architectures and large-scale deployment, knowledge of data governance and AI ethics challenges', 'Architectures ML complexes, big data, gouvernance IA', 'Leadership technique, expertise en big data'),
    (theme_id, lead_level_id, 'Technical leadership and strategic leadership in Data Science, excellent communication with business and technical teams, experience in project management and team supervision, comprehensive understanding of the data science ecosystem, ability to align data projects with company objectives', 'Leadership en data science, gestion de projets', 'Leadership confirmé, vision stratégique'),
    (theme_id, director_level_id, 'Technical and strategic leadership in Data Science, excellent communication with business and technical teams, experience in project management and team supervision, comprehensive understanding of the data science ecosystem, ability to align data projects with company objectives', 'Vision stratégique data science d''entreprise', 'Leadership exécutif, vision d''entreprise');

    -- Data Engineer
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_eng_area_id AND name = 'Data Engineer';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Knowledge of relational databases (SQL, PostgreSQL, MySQL) and NoSQL (MongoDB, Cassandra, Elasticsearch), proficiency in programming languages (Python, Java, Scala), familiarity with ETL tools and data migration (Apache NiFi, Talend), understanding of fundamental cloud concepts (AWS, Azure, GCP), basic understanding of data modeling and database normalization', 'ETL simples, bases de données relationnelles', 'SQL, Python, concepts de données'),
    (theme_id, confirmed_level_id, 'Advanced proficiency in SQL and distributed databases, development of scalable and high-performance data pipelines, experience with distributed data processing frameworks (Apache Spark, Flink), mastery of workflow orchestration tools (Apache Airflow, Prefect, Luigi), knowledge of best practices in DataOps and CI/CD for data pipelines', 'Pipelines distribuées, Apache Spark, orchestration', 'Expertise en big data, architectures distribuées'),
    (theme_id, senior_level_id, 'Design and implementation of large-scale data platforms, management and optimization of data warehouse architectures, in-depth experience in data streaming (Kafka, Kinesis, Pulsar), data security and access management (IAM, encryption), implementation and management of serverless data architectures (AWS Lambda, Azure Functions)', 'Plateformes de données à grande échelle, streaming', 'Architecture de données, sécurité'),
    (theme_id, lead_level_id, 'Technical leadership and strategic decision-making on data architecture, expertise in multi-cloud and hybrid data infrastructures, vision on the evolution of data technologies and anticipation, ability to work with cross-functional teams (Data Science, IT, resources), knowledge of data management regulations and compliance (GDPR, HIPAA)', 'Leadership en architecture de données', 'Leadership technique, gouvernance'),
    (theme_id, director_level_id, 'Strategic vision on the use and optimization of data within the company, budget management and prioritization of investments in Data, leadership of large teams and human resource management, alignment of DataOps strategies with business objectives, ability to work with cross-functional teams (Data Science, IT, technology watch and anticipation of MLOps innovations', 'Vision stratégique des données d''entreprise', 'Leadership exécutif, vision budgétaire');

    -- Data Analyst
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_eng_area_id AND name = 'Data Analyst';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Good proficiency in Excel and SQL databases (PostgreSQL, MySQL), knowledge of data visualization tools (Tableau, Power BI, Looker), understanding of basic statistics and business metrics, ability to communicate insights to non-technical teams', 'Analyses descriptives, tableaux de bord simples', 'Excel, SQL, outils de BI'),
    (theme_id, confirmed_level_id, 'Expertise in SQL and database management, advanced proficiency in reporting and data visualization tools, experience with ETL tools and workflow automation (Alteryx, Knime), ability to build simple statistical models for forecasting and segmentation, understanding of business metrics and their impact on the company', 'Analyses prédictives, automatisation de rapports', 'SQL avancé, statistiques, business intelligence'),
    (theme_id, senior_level_id, 'Advanced proficiency in Python/R programming for complex analytics, expertise in advanced statistics and predictive modeling, experience in managing and optimizing large datasets for quality management, ability to translate complex issues into strategic recommendations, in-depth knowledge of experimentation methods (advanced A/B testing, causal inference)', 'Modélisation statistique avancée, expérimentation', 'Python/R, statistiques avancées, méthodologie'),
    (theme_id, lead_level_id, 'Excellent communication with business teams and C-level, ability to structure and prioritize analytics projects for the company, proficiency in analytical frameworks for decision-making, vision on the evolution of data analysis technologies and their impact', 'Leadership analytique, communication C-level', 'Leadership, communication stratégique'),
    (theme_id, director_level_id, 'Holistic vision of AI integration within the company, budget management and prioritization of ML investments, leadership of large teams and human resource management, alignment of DataOps strategies with business objectives, relationship management with technology partners and vendors', 'Vision stratégique analytique d''entreprise', 'Leadership exécutif, vision budgétaire');

    -- ML Ops Engineer
    SELECT id INTO theme_id FROM development_themes WHERE career_area_id = ai_eng_area_id AND name = 'ML Ops Engineer';
    INSERT INTO pathway_skills (development_theme_id, career_level_id, skill_description, examples, requirements) VALUES
    (theme_id, junior_level_id, 'Good understanding of machine learning fundamentals and model deployment, basic knowledge of DevOps and CI/CD applied to ML models, experience with containerization tools (Docker, Kubernetes), familiarity with orchestration tools (Docker, Kubernetes), initial experience with a cloud provider (AWS, Azure, GCP)', 'Déploiement de modèles simples, conteneurisation', 'ML de base, Docker, cloud'),
    (theme_id, confirmed_level_id, 'Experience in industrializing ML models and deploying them to production, proficiency in workflow orchestration tools (Kubeflow, MLflow, Airflow), automation of the model lifecycle (CI/CD for ML, testing, monitoring), understanding of cloud architectures and managed services (SageMaker, Vertex AI), experience with model observability (drift detection, retraining)', 'MLOps avancé, monitoring de modèles', 'Kubernetes, MLflow, observabilité'),
    (theme_id, senior_level_id, 'Expertise in large-scale deployment of ML models, optimization of ML infrastructure costs and performance, model security and access management (IAM, encryption), in-depth knowledge of explainability methods and AI auditing, management of hybrid environments (on-premise & cloud), experience with feature stores and dataset versioning', 'Infrastructure ML à grande échelle, sécurité', 'Architecture ML, sécurité, gouvernance'),
    (theme_id, lead_level_id, 'Technical leadership and strategic decision-making on MLOps, multi-cloud management and hybridization of ML infrastructures, leadership of large teams and human resource management, ability to work with cross-functional teams (Data Science, IT, DevOps), ability to work in model governance policies and risk management', 'Leadership MLOps, gouvernance des modèles', 'Leadership technique, gouvernance'),
    (theme_id, director_level_id, 'Holistic vision of AI integration within the company, budget management and prioritization of MLOps investments, leadership of large teams and human resource management, alignment of DataOps strategies with business objectives, long-term vision on AI advancements and industrialization', 'Vision stratégique MLOps d''entreprise', 'Leadership exécutif, vision stratégique');

END $$;