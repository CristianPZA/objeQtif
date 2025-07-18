/*
  # Nettoyage complet et optimisation de la base de données

  1. Analyse et suppression des tables non utilisées
  2. Simplification des politiques RLS
  3. Optimisation des index et contraintes
  4. Conservation uniquement des éléments essentiels

  Tables conservées (utilisées dans l'application) :
  - user_profiles (gestion utilisateurs)
  - projets (projets clients)
  - projet_collaborateurs (assignations)
  - departments (départements)
  - career_levels (niveaux carrière)
  - career_areas (domaines carrière)
  - development_themes (thèmes développement)
  - pathway_skills (compétences)
  - notifications (système notifications)

  Tables supprimées (non utilisées) :
  - fiches_annuelles, fiches_projets, fiches_collaborateurs
  - objectifs_collaborateurs, evaluations_objectifs
  - archives, historique_versions, audit_logs
  - fiche_status_timeline, fiches
*/

-- =============================================
-- SUPPRESSION DES TABLES NON UTILISÉES
-- =============================================

-- Supprimer les tables de fiches (non implémentées dans l'UI)
DROP TABLE IF EXISTS fiches_collaborateurs CASCADE;
DROP TABLE IF EXISTS evaluations_objectifs CASCADE;
DROP TABLE IF EXISTS objectifs_collaborateurs CASCADE;
DROP TABLE IF EXISTS fiches_annuelles CASCADE;
DROP TABLE IF EXISTS fiches_projets CASCADE;
DROP TABLE IF EXISTS fiches CASCADE;

-- Supprimer les tables d'audit et versioning (complexité non nécessaire)
DROP TABLE IF EXISTS fiche_status_timeline CASCADE;
DROP TABLE IF EXISTS historique_versions CASCADE;
DROP TABLE IF EXISTS archives CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Supprimer les types énumérés non utilisés
DROP TYPE IF EXISTS fiche_status CASCADE;
DROP TYPE IF EXISTS fiche_type CASCADE;
DROP TYPE IF EXISTS audit_action CASCADE;

-- Supprimer les vues non utilisées
DROP VIEW IF EXISTS v_fiche_timeline CASCADE;
DROP VIEW IF EXISTS v_workflow_actions CASCADE;
DROP VIEW IF EXISTS v_fiches_complete CASCADE;
DROP VIEW IF EXISTS v_user_stats CASCADE;

-- =============================================
-- NETTOYAGE DES FONCTIONS NON UTILISÉES
-- =============================================

-- Supprimer les fonctions de workflow et versioning
DROP FUNCTION IF EXISTS validate_status_transition CASCADE;
DROP FUNCTION IF EXISTS change_fiche_status CASCADE;
DROP FUNCTION IF EXISTS validate_fiche_status_change CASCADE;
DROP FUNCTION IF EXISTS validate_evaluation_status_change CASCADE;
DROP FUNCTION IF EXISTS create_version_history CASCADE;
DROP FUNCTION IF EXISTS create_audit_log CASCADE;
DROP FUNCTION IF EXISTS calculate_json_diff CASCADE;
DROP FUNCTION IF EXISTS archive_fiche CASCADE;
DROP FUNCTION IF EXISTS create_notification CASCADE;
DROP FUNCTION IF EXISTS get_user_actions_for_fiche CASCADE;
DROP FUNCTION IF EXISTS delete_user_completely CASCADE;
DROP FUNCTION IF EXISTS handle_fiche_versioning CASCADE;

-- Garder seulement les fonctions essentielles
-- handle_updated_at, handle_new_user, update_user_email, is_admin_or_hr_user

-- =============================================
-- OPTIMISATION DE LA TABLE USER_PROFILES
-- =============================================

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "Admin and HR can delete profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admin and HR can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admin and HR can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Coaches can read their coachees" ON user_profiles;
DROP POLICY IF EXISTS "Enable profile creation for public" ON user_profiles;
DROP POLICY IF EXISTS "Managers can read team profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role full access" ON user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Créer des politiques simplifiées et sécurisées
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can create own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Managers can read team profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid());

CREATE POLICY "Coaches can read their coachees"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid());

CREATE POLICY "Admin and HR can read all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_admin_or_hr_user());

CREATE POLICY "Admin and HR can update all profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (is_admin_or_hr_user())
  WITH CHECK (is_admin_or_hr_user());

CREATE POLICY "Admin and HR can delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (is_admin_or_hr_user());

CREATE POLICY "Service role full access"
  ON user_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable profile creation for public"
  ON user_profiles FOR INSERT
  TO public
  WITH CHECK (true);

-- =============================================
-- OPTIMISATION DE LA TABLE PROJETS
-- =============================================

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "Tous les utilisateurs peuvent lire les projets" ON projets;
DROP POLICY IF EXISTS "Utilisateurs autorisés peuvent créer des projets" ON projets;
DROP POLICY IF EXISTS "Utilisateurs autorisés peuvent modifier les projets" ON projets;
DROP POLICY IF EXISTS "Utilisateurs autorisés peuvent supprimer les projets" ON projets;

-- Créer des politiques simplifiées
CREATE POLICY "Everyone can read projects"
  ON projets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authorized users can create projects"
  ON projets FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = auteur_id AND
    is_admin_or_hr_user() OR
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('direction', 'referent_projet')
    )
  );

CREATE POLICY "Project stakeholders can update projects"
  ON projets FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = auteur_id OR 
    auth.uid() = referent_projet_id OR
    is_admin_or_hr_user()
  );

CREATE POLICY "Project owners can delete projects"
  ON projets FOR DELETE
  TO authenticated
  USING (
    auth.uid() = auteur_id OR
    is_admin_or_hr_user()
  );

-- =============================================
-- OPTIMISATION DE LA TABLE PROJET_COLLABORATEURS
-- =============================================

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "Tous peuvent lire les collaborateurs de projet" ON projet_collaborateurs;
DROP POLICY IF EXISTS "Utilisateurs autorisés peuvent ajouter des collaborateurs" ON projet_collaborateurs;
DROP POLICY IF EXISTS "Utilisateurs autorisés peuvent modifier les collaborateurs" ON projet_collaborateurs;
DROP POLICY IF EXISTS "Utilisateurs autorisés peuvent supprimer les collaborateurs" ON projet_collaborateurs;

-- Créer des politiques simplifiées
CREATE POLICY "Everyone can read project collaborators"
  ON projet_collaborateurs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Project managers can manage collaborators"
  ON projet_collaborateurs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets p 
      WHERE p.id = projet_id 
      AND (
        p.auteur_id = auth.uid() OR 
        p.referent_projet_id = auth.uid() OR
        is_admin_or_hr_user()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projets p 
      WHERE p.id = projet_id 
      AND (
        p.auteur_id = auth.uid() OR 
        p.referent_projet_id = auth.uid() OR
        is_admin_or_hr_user()
      )
    )
  );

-- =============================================
-- OPTIMISATION DE LA TABLE DEPARTMENTS
-- =============================================

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "Everyone can read active departments" ON departments;
DROP POLICY IF EXISTS "Admins can manage departments" ON departments;

-- Créer des politiques simplifiées
CREATE POLICY "Everyone can read departments"
  ON departments FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage departments"
  ON departments FOR ALL
  TO authenticated
  USING (is_admin_or_hr_user())
  WITH CHECK (is_admin_or_hr_user());

-- =============================================
-- OPTIMISATION DES TABLES CAREER PATHWAYS
-- =============================================

-- Career Areas
DROP POLICY IF EXISTS "Everyone can read career areas" ON career_areas;
DROP POLICY IF EXISTS "Admins can manage career areas" ON career_areas;

CREATE POLICY "Everyone can read career areas"
  ON career_areas FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage career areas"
  ON career_areas FOR ALL
  TO authenticated
  USING (is_admin_or_hr_user())
  WITH CHECK (is_admin_or_hr_user());

-- Career Levels
DROP POLICY IF EXISTS "Everyone can read career levels" ON career_levels;
DROP POLICY IF EXISTS "Admins can manage career levels" ON career_levels;

CREATE POLICY "Everyone can read career levels"
  ON career_levels FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage career levels"
  ON career_levels FOR ALL
  TO authenticated
  USING (is_admin_or_hr_user())
  WITH CHECK (is_admin_or_hr_user());

-- Development Themes
DROP POLICY IF EXISTS "Everyone can read development themes" ON development_themes;
DROP POLICY IF EXISTS "Admins can manage development themes" ON development_themes;

CREATE POLICY "Everyone can read development themes"
  ON development_themes FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage development themes"
  ON development_themes FOR ALL
  TO authenticated
  USING (is_admin_or_hr_user())
  WITH CHECK (is_admin_or_hr_user());

-- Pathway Skills
DROP POLICY IF EXISTS "Everyone can read pathway skills" ON pathway_skills;
DROP POLICY IF EXISTS "Admins can manage pathway skills" ON pathway_skills;

CREATE POLICY "Everyone can read pathway skills"
  ON pathway_skills FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage pathway skills"
  ON pathway_skills FOR ALL
  TO authenticated
  USING (is_admin_or_hr_user())
  WITH CHECK (is_admin_or_hr_user());

-- =============================================
-- OPTIMISATION DE LA TABLE NOTIFICATIONS
-- =============================================

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "Users can read their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- Créer des politiques simplifiées
CREATE POLICY "Users can manage their notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (auth.uid() = destinataire_id)
  WITH CHECK (auth.uid() = destinataire_id);

CREATE POLICY "Admins can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = expediteur_id OR
    is_admin_or_hr_user()
  );

-- =============================================
-- NETTOYAGE DES TRIGGERS NON ESSENTIELS
-- =============================================

-- Supprimer les triggers d'audit non utilisés
DROP TRIGGER IF EXISTS projets_audit ON projets;
DROP TRIGGER IF EXISTS projet_collaborateurs_audit ON projet_collaborateurs;
DROP TRIGGER IF EXISTS user_profiles_audit ON user_profiles;

-- Garder seulement les triggers essentiels (updated_at)
-- Ces triggers sont déjà en place et fonctionnels

-- =============================================
-- OPTIMISATION DES INDEX
-- =============================================

-- Supprimer les index redondants ou non utilisés
DROP INDEX IF EXISTS user_profiles_role_idx;
DROP INDEX IF EXISTS user_profiles_manager_idx;
DROP INDEX IF EXISTS user_profiles_coach_idx;
DROP INDEX IF EXISTS user_profiles_active_idx;
DROP INDEX IF EXISTS user_profiles_career_level_idx;

-- Créer des index composites optimisés
CREATE INDEX IF NOT EXISTS user_profiles_role_active_idx ON user_profiles(role, is_active);
CREATE INDEX IF NOT EXISTS user_profiles_manager_coach_idx ON user_profiles(manager_id, coach_id);
CREATE INDEX IF NOT EXISTS projets_status_priority_idx ON projets(statut, priorite);
CREATE INDEX IF NOT EXISTS projet_collaborateurs_active_idx ON projet_collaborateurs(projet_id, employe_id, is_active);

-- =============================================
-- RECRÉATION DE LA VUE PROJETS SIMPLIFIÉE
-- =============================================

CREATE OR REPLACE VIEW v_projets_complets AS
SELECT 
  p.*,
  up_auteur.full_name as auteur_nom,
  up_referent.full_name as referent_nom,
  up_referent.role as referent_role,
  COALESCE(
    json_agg(
      json_build_object(
        'id', pc.id,
        'employe_id', pc.employe_id,
        'employe_nom', up_collab.full_name,
        'employe_role', up_collab.role,
        'employe_department', up_collab.department,
        'role_projet', pc.role_projet,
        'taux_allocation', pc.taux_allocation,
        'responsabilites', pc.responsabilites,
        'date_debut', pc.date_debut,
        'date_fin', pc.date_fin,
        'is_active', pc.is_active
      ) ORDER BY up_collab.full_name
    ) FILTER (WHERE pc.id IS NOT NULL),
    '[]'::json
  ) as collaborateurs
FROM projets p
LEFT JOIN user_profiles up_auteur ON p.auteur_id = up_auteur.id
LEFT JOIN user_profiles up_referent ON p.referent_projet_id = up_referent.id
LEFT JOIN projet_collaborateurs pc ON p.id = pc.projet_id AND pc.is_active = true
LEFT JOIN user_profiles up_collab ON pc.employe_id = up_collab.id
GROUP BY 
  p.id, p.nom_client, p.titre, p.description, p.date_debut, p.date_fin_prevue,
  p.budget_estime, p.statut, p.priorite, p.taux_avancement, p.referent_projet_id,
  p.auteur_id, p.objectifs, p.risques, p.notes, p.version, p.is_archived,
  p.created_at, p.updated_at, up_auteur.full_name, up_referent.full_name, up_referent.role;

-- =============================================
-- NETTOYAGE FINAL
-- =============================================

-- Supprimer les contraintes orphelines
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Supprimer les contraintes de clés étrangères orphelines
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE contype = 'f' 
        AND NOT EXISTS (
            SELECT 1 FROM pg_class 
            WHERE oid = confrelid
        )
    LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(constraint_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name);
    END LOOP;
END $$;

-- Nettoyer les permissions inutiles
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Accorder seulement les permissions nécessaires
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =============================================
-- COMMENTAIRES DE DOCUMENTATION
-- =============================================

COMMENT ON DATABASE postgres IS 'Base de données objeQtive - Version optimisée et nettoyée';

COMMENT ON TABLE user_profiles IS 'Profils utilisateurs avec gestion des rôles et hiérarchie';
COMMENT ON TABLE projets IS 'Projets clients avec gestion des collaborateurs';
COMMENT ON TABLE projet_collaborateurs IS 'Assignations employé-projet avec rôles spécifiques';
COMMENT ON TABLE departments IS 'Départements de l''entreprise';
COMMENT ON TABLE career_areas IS 'Domaines de carrière pour les parcours de développement';
COMMENT ON TABLE career_levels IS 'Niveaux de progression dans les carrières';
COMMENT ON TABLE development_themes IS 'Thèmes de développement par domaine de carrière';
COMMENT ON TABLE pathway_skills IS 'Compétences détaillées par thème et niveau';
COMMENT ON TABLE notifications IS 'Système de notifications utilisateur';

-- =============================================
-- STATISTIQUES FINALES
-- =============================================

-- Analyser les tables pour optimiser les performances
ANALYZE user_profiles;
ANALYZE projets;
ANALYZE projet_collaborateurs;
ANALYZE departments;
ANALYZE career_areas;
ANALYZE career_levels;
ANALYZE development_themes;
ANALYZE pathway_skills;
ANALYZE notifications;