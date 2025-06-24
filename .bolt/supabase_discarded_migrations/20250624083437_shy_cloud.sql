/*
  # Nettoyage et optimisation de la base de données

  1. Suppression des tables non utilisées
  2. Simplification des politiques RLS
  3. Optimisation des index
  4. Nettoyage des fonctions inutiles
*/

-- =====================================================
-- ÉTAPE 1: SUPPRESSION DES TABLES NON UTILISÉES
-- =====================================================

-- Supprimer les tables qui ne sont pas utilisées dans l'application
DROP TABLE IF EXISTS archives CASCADE;
DROP TABLE IF EXISTS historique_versions CASCADE;
DROP TABLE IF EXISTS fiche_status_timeline CASCADE;
DROP TABLE IF EXISTS fiches CASCADE; -- Table générique non utilisée
DROP TABLE IF EXISTS audit_logs CASCADE; -- Peut être recréée plus tard si nécessaire

-- Supprimer les vues qui ne sont plus nécessaires
DROP VIEW IF EXISTS v_fiche_timeline CASCADE;
DROP VIEW IF EXISTS v_workflow_actions CASCADE;

-- =====================================================
-- ÉTAPE 2: NETTOYAGE DES TYPES ENUM NON UTILISÉS
-- =====================================================

-- Supprimer les types enum qui ne sont plus utilisés
DROP TYPE IF EXISTS audit_action CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;

-- =====================================================
-- ÉTAPE 3: SIMPLIFICATION DES POLITIQUES RLS
-- =====================================================

-- Nettoyer les politiques sur user_profiles (déjà fait dans la migration précédente)

-- Simplifier les politiques sur projets
DROP POLICY IF EXISTS "Tous les utilisateurs peuvent lire les projets" ON projets;
DROP POLICY IF EXISTS "Utilisateurs autorisés peuvent créer des projets" ON projets;
DROP POLICY IF EXISTS "Utilisateurs autorisés peuvent modifier les projets" ON projets;
DROP POLICY IF EXISTS "Utilisateurs autorisés peuvent supprimer les projets" ON projets;

-- Nouvelles politiques simplifiées pour projets
CREATE POLICY "Everyone can read projects"
  ON projets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authorized users can create projects"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = auteur_id AND
    is_admin_or_hr_user() OR 
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'referent_projet'
  );

CREATE POLICY "Authors and referents can update projects"
  ON projets
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = auteur_id OR 
    auth.uid() = referent_projet_id OR 
    is_admin_or_hr_user()
  );

CREATE POLICY "Authors and admins can delete projects"
  ON projets
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = auteur_id OR 
    is_admin_or_hr_user()
  );

-- Simplifier les politiques sur projet_collaborateurs
DROP POLICY IF EXISTS "Tous peuvent lire les collaborateurs de projet" ON projet_collaborateurs;
DROP POLICY IF EXISTS "Utilisateurs autorisés peuvent ajouter des collaborateurs" ON projet_collaborateurs;
DROP POLICY IF EXISTS "Utilisateurs autorisés peuvent modifier les collaborateurs" ON projet_collaborateurs;
DROP POLICY IF EXISTS "Utilisateurs autorisés peuvent supprimer les collaborateurs" ON projet_collaborateurs;

CREATE POLICY "Everyone can read project collaborators"
  ON projet_collaborateurs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Project managers can manage collaborators"
  ON projet_collaborateurs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets p
      WHERE p.id = projet_collaborateurs.projet_id
      AND (p.auteur_id = auth.uid() OR p.referent_projet_id = auth.uid())
    ) OR is_admin_or_hr_user()
  );

-- Simplifier les politiques sur fiches_annuelles
DROP POLICY IF EXISTS "Authors and evaluators can read fiches annuelles" ON fiches_annuelles;
DROP POLICY IF EXISTS "Authors and evaluators can update fiches annuelles" ON fiches_annuelles;
DROP POLICY IF EXISTS "Authors can create their fiches annuelles" ON fiches_annuelles;

CREATE POLICY "Users can manage their annual reviews"
  ON fiches_annuelles
  FOR ALL
  TO authenticated
  USING (auth.uid() = auteur_id OR auth.uid() = evaluateur_id OR is_admin_or_hr_user());

-- Simplifier les politiques sur fiches_projets
DROP POLICY IF EXISTS "Authors and referents can read fiches projets" ON fiches_projets;
DROP POLICY IF EXISTS "Authors and referents can update fiches projets" ON fiches_projets;
DROP POLICY IF EXISTS "Authors can create fiches projets" ON fiches_projets;

CREATE POLICY "Users can manage their project reviews"
  ON fiches_projets
  FOR ALL
  TO authenticated
  USING (auth.uid() = auteur_id OR auth.uid() = referent_id OR is_admin_or_hr_user());

-- Simplifier les politiques sur fiches_collaborateurs
DROP POLICY IF EXISTS "Collaborateurs peuvent créer leurs fiches" ON fiches_collaborateurs;
DROP POLICY IF EXISTS "Collaborateurs peuvent lire leurs fiches" ON fiches_collaborateurs;
DROP POLICY IF EXISTS "Collaborateurs peuvent modifier leurs fiches" ON fiches_collaborateurs;
DROP POLICY IF EXISTS "Managers peuvent lire les fiches de leurs équipes" ON fiches_collaborateurs;
DROP POLICY IF EXISTS "RH et admin peuvent lire toutes les fiches" ON fiches_collaborateurs;
DROP POLICY IF EXISTS "Référents peuvent lire les fiches de leurs projets" ON fiches_collaborateurs;

CREATE POLICY "Collaborators can manage their own sheets"
  ON fiches_collaborateurs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projet_collaborateurs pc
      WHERE pc.id = fiches_collaborateurs.collaboration_id
      AND pc.employe_id = auth.uid()
    ) OR is_admin_or_hr_user()
  );

-- Simplifier les politiques sur objectifs_collaborateurs
DROP POLICY IF EXISTS "Coaches peuvent lire les objectifs de leurs coachés" ON objectifs_collaborateurs;
DROP POLICY IF EXISTS "Collaborateurs peuvent créer leurs objectifs" ON objectifs_collaborateurs;
DROP POLICY IF EXISTS "Collaborateurs peuvent gérer leurs objectifs" ON objectifs_collaborateurs;
DROP POLICY IF EXISTS "RH et admin peuvent lire tous les objectifs" ON objectifs_collaborateurs;
DROP POLICY IF EXISTS "Référents peuvent lire les objectifs de leurs projets" ON objectifs_collaborateurs;

CREATE POLICY "Users can manage objectives"
  ON objectifs_collaborateurs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projet_collaborateurs pc
      WHERE pc.id = objectifs_collaborateurs.collaboration_id
      AND pc.employe_id = auth.uid()
    ) OR is_admin_or_hr_user()
  );

-- Simplifier les politiques sur evaluations_objectifs
DROP POLICY IF EXISTS "Coaches peuvent évaluer leurs coachés" ON evaluations_objectifs;
DROP POLICY IF EXISTS "Collaborateurs peuvent créer leurs auto-évaluations" ON evaluations_objectifs;
DROP POLICY IF EXISTS "Collaborateurs peuvent gérer leurs évaluations" ON evaluations_objectifs;
DROP POLICY IF EXISTS "RH et admin peuvent gérer toutes les évaluations" ON evaluations_objectifs;
DROP POLICY IF EXISTS "Référents peuvent évaluer leurs projets" ON evaluations_objectifs;

CREATE POLICY "Users can manage evaluations"
  ON evaluations_objectifs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM objectifs_collaborateurs oc
      JOIN projet_collaborateurs pc ON pc.id = oc.collaboration_id
      WHERE oc.id = evaluations_objectifs.objectifs_id
      AND pc.employe_id = auth.uid()
    ) OR is_admin_or_hr_user()
  );

-- Simplifier les politiques sur notifications
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can read their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

CREATE POLICY "Users can manage their notifications"
  ON notifications
  FOR ALL
  TO authenticated
  USING (auth.uid() = destinataire_id OR is_admin_or_hr_user());

CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = expediteur_id OR is_admin_or_hr_user());

-- =====================================================
-- ÉTAPE 4: NETTOYAGE DES FONCTIONS INUTILES
-- =====================================================

-- Supprimer les fonctions de trigger qui ne sont plus nécessaires
DROP FUNCTION IF EXISTS create_audit_log() CASCADE;
DROP FUNCTION IF EXISTS create_version_history() CASCADE;
DROP FUNCTION IF EXISTS validate_fiche_status_change() CASCADE;
DROP FUNCTION IF EXISTS validate_evaluation_status_change() CASCADE;
DROP FUNCTION IF EXISTS handle_fiche_versioning() CASCADE;

-- =====================================================
-- ÉTAPE 5: NETTOYAGE DES TRIGGERS INUTILES
-- =====================================================

-- Supprimer les triggers d'audit qui ne sont plus nécessaires
DROP TRIGGER IF EXISTS projets_audit ON projets;
DROP TRIGGER IF EXISTS projet_collaborateurs_audit ON projet_collaborateurs;
DROP TRIGGER IF EXISTS fiches_collaborateurs_audit ON fiches_collaborateurs;
DROP TRIGGER IF EXISTS fiches_annuelles_audit ON fiches_annuelles;
DROP TRIGGER IF EXISTS fiches_projets_audit ON fiches_projets;
DROP TRIGGER IF EXISTS objectifs_collaborateurs_audit ON objectifs_collaborateurs;
DROP TRIGGER IF EXISTS evaluations_objectifs_audit ON evaluations_objectifs;
DROP TRIGGER IF EXISTS user_profiles_audit ON user_profiles;

-- Supprimer les triggers de versioning
DROP TRIGGER IF EXISTS fiches_annuelles_version_history ON fiches_annuelles;
DROP TRIGGER IF EXISTS fiches_projets_version_history ON fiches_projets;
DROP TRIGGER IF EXISTS handle_fiche_version ON fiches;

-- Supprimer les triggers de validation
DROP TRIGGER IF EXISTS validate_fiches_annuelles_status ON fiches_annuelles;
DROP TRIGGER IF EXISTS validate_fiches_projets_status ON fiches_projets;
DROP TRIGGER IF EXISTS validate_evaluations_status ON evaluations_objectifs;

-- =====================================================
-- ÉTAPE 6: OPTIMISATION DES INDEX
-- =====================================================

-- Supprimer les index redondants ou inutiles
DROP INDEX IF EXISTS projets_client_idx;
DROP INDEX IF EXISTS projets_dates_idx;
DROP INDEX IF EXISTS fiches_auteur_id_idx;
DROP INDEX IF EXISTS fiches_type_idx;
DROP INDEX IF EXISTS notifications_priority_idx;
DROP INDEX IF EXISTS notifications_type_idx;

-- Garder seulement les index essentiels et en ajouter quelques-uns optimisés
CREATE INDEX IF NOT EXISTS idx_projets_status_active ON projets(statut) WHERE NOT is_archived;
CREATE INDEX IF NOT EXISTS idx_user_profiles_active_role ON user_profiles(role, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(destinataire_id, is_read, created_at) WHERE NOT is_read;

-- =====================================================
-- ÉTAPE 7: NETTOYAGE DES CONTRAINTES INUTILES
-- =====================================================

-- Garder seulement les contraintes essentielles
-- Les contraintes de clés étrangères et primaires sont conservées automatiquement

-- =====================================================
-- ÉTAPE 8: MISE À JOUR DE LA VUE PROJETS
-- =====================================================

-- Recréer la vue projets de manière simplifiée
DROP VIEW IF EXISTS v_projets_complets;

CREATE VIEW v_projets_complets AS
SELECT 
  p.*,
  auteur.full_name as auteur_nom,
  referent.full_name as referent_nom,
  referent.role as referent_role,
  COALESCE(
    json_agg(
      json_build_object(
        'id', pc.id,
        'employe_id', pc.employe_id,
        'employe_nom', emp.full_name,
        'employe_role', emp.role,
        'employe_department', emp.department,
        'role_projet', pc.role_projet,
        'taux_allocation', pc.taux_allocation,
        'responsabilites', pc.responsabilites,
        'date_debut', pc.date_debut,
        'date_fin', pc.date_fin,
        'is_active', pc.is_active
      )
    ) FILTER (WHERE pc.id IS NOT NULL),
    '[]'::json
  ) as collaborateurs
FROM projets p
LEFT JOIN user_profiles auteur ON auteur.id = p.auteur_id
LEFT JOIN user_profiles referent ON referent.id = p.referent_projet_id
LEFT JOIN projet_collaborateurs pc ON pc.projet_id = p.id AND pc.is_active = true
LEFT JOIN user_profiles emp ON emp.id = pc.employe_id
GROUP BY p.id, auteur.full_name, referent.full_name, referent.role;

-- =====================================================
-- ÉTAPE 9: COMMENTAIRES ET DOCUMENTATION
-- =====================================================

COMMENT ON DATABASE postgres IS 'Base de données objeQtifs - Version nettoyée et optimisée';

-- Ajouter des commentaires sur les tables principales
COMMENT ON TABLE user_profiles IS 'Profils utilisateurs avec informations RH et hiérarchie';
COMMENT ON TABLE projets IS 'Projets clients avec suivi et gestion des collaborateurs';
COMMENT ON TABLE projet_collaborateurs IS 'Association employés-projets avec rôles et allocations';
COMMENT ON TABLE fiches_annuelles IS 'Évaluations annuelles des employés';
COMMENT ON TABLE fiches_projets IS 'Fiches de projet pour suivi et évaluation';
COMMENT ON TABLE fiches_collaborateurs IS 'Auto-évaluations des collaborateurs sur leurs projets';
COMMENT ON TABLE objectifs_collaborateurs IS 'Objectifs définis par les collaborateurs';
COMMENT ON TABLE evaluations_objectifs IS 'Évaluations des objectifs par les managers et coaches';
COMMENT ON TABLE notifications IS 'Système de notifications internes';
COMMENT ON TABLE departments IS 'Départements de l''entreprise';
COMMENT ON TABLE career_levels IS 'Niveaux de carrière et progression';
COMMENT ON TABLE career_areas IS 'Domaines de carrière et spécialisations';
COMMENT ON TABLE development_themes IS 'Thèmes de développement professionnel';
COMMENT ON TABLE pathway_skills IS 'Compétences par niveau et thème de développement';

-- =====================================================
-- ÉTAPE 10: STATISTIQUES FINALES
-- =====================================================

-- Mettre à jour les statistiques de la base de données
ANALYZE;

-- Afficher un résumé des tables restantes
DO $$
DECLARE
    table_count integer;
    policy_count integer;
    index_count integer;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    RAISE NOTICE 'Nettoyage terminé:';
    RAISE NOTICE '- Tables restantes: %', table_count;
    RAISE NOTICE '- Politiques RLS: %', policy_count;
    RAISE NOTICE '- Index: %', index_count;
END $$;