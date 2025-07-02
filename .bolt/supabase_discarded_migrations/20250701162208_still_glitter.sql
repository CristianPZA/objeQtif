/*
  # Ajout du rôle referent_projet et mise à jour des permissions

  1. Nouvelles fonctionnalités
    - Ajout du rôle "referent_projet" au type enum user_role
    - Mise à jour des politiques RLS pour permettre aux référents projet d'accéder aux projets
    - Ajout d'une fonction pour vérifier si un utilisateur est référent projet
    - Mise à jour des politiques pour les évaluations

  2. Corrections
    - Correction des problèmes d'évaluation pour les référents projet
    - Amélioration de la logique de vérification des rôles
*/

-- Ajouter le rôle "referent_projet" au type enum user_role s'il n'existe pas déjà
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid 
                  WHERE t.typname = 'user_role' AND e.enumlabel = 'referent_projet') THEN
        ALTER TYPE user_role ADD VALUE 'referent_projet';
    END IF;
END$$;

-- Créer une fonction pour vérifier si l'utilisateur est référent projet
CREATE OR REPLACE FUNCTION is_referent_projet() RETURNS boolean AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'referent_projet'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer une fonction pour vérifier si l'utilisateur est référent d'un projet spécifique
CREATE OR REPLACE FUNCTION is_project_referent(project_id uuid) RETURNS boolean AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM projets
      WHERE id = project_id AND (referent_projet_id = auth.uid() OR auteur_id = auth.uid())
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer une fonction pour vérifier si l'utilisateur est admin ou référent projet
CREATE OR REPLACE FUNCTION is_admin_or_referent() RETURNS boolean AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND (role = 'admin' OR role = 'referent_projet')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mettre à jour les politiques pour les projets
DROP POLICY IF EXISTS "Project stakeholders can update projects" ON projets;
CREATE POLICY "Project stakeholders can update projects" 
ON projets
FOR UPDATE
TO authenticated
USING ((uid() = auteur_id) OR (uid() = referent_projet_id) OR is_admin() OR is_referent_projet());

-- Mettre à jour les politiques pour les évaluations d'objectifs
DROP POLICY IF EXISTS "Référents peuvent examiner auto-évaluations" ON evaluations_objectifs;
CREATE POLICY "Référents peuvent examiner auto-évaluations" 
ON evaluations_objectifs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM objectifs_collaborateurs oc
    JOIN projet_collaborateurs pc ON pc.id = oc.collaboration_id
    JOIN projets p ON p.id = pc.projet_id
    WHERE oc.id = evaluations_objectifs.objectifs_id 
    AND (p.referent_projet_id = uid() OR p.auteur_id = uid() OR is_admin() OR is_referent_projet())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM objectifs_collaborateurs oc
    JOIN projet_collaborateurs pc ON pc.id = oc.collaboration_id
    JOIN projets p ON p.id = pc.projet_id
    WHERE oc.id = evaluations_objectifs.objectifs_id 
    AND (p.referent_projet_id = uid() OR p.auteur_id = uid() OR is_admin() OR is_referent_projet())
  )
);

-- Mettre à jour la fonction pour réinitialiser les évaluations bloquées
CREATE OR REPLACE FUNCTION reset_stuck_evaluations() RETURNS void AS $$
BEGIN
  -- Mettre à jour les évaluations qui sont bloquées dans un état intermédiaire
  UPDATE evaluations_objectifs
  SET statut = 'soumise'
  WHERE statut = 'en_attente_referent' 
    AND evaluation_referent IS NULL;
  
  -- Mettre à jour les évaluations qui ont une auto-évaluation mais pas de statut approprié
  UPDATE evaluations_objectifs
  SET statut = 'soumise'
  WHERE auto_evaluation IS NOT NULL 
    AND auto_evaluation != '{}'::jsonb
    AND evaluation_referent IS NULL
    AND statut NOT IN ('soumise', 'en_attente_referent', 'evaluee_referent', 'finalisee');
END;
$$ LANGUAGE plpgsql;

-- Exécuter la fonction pour corriger les évaluations existantes
SELECT reset_stuck_evaluations();

-- Mettre à jour les politiques pour les collaborateurs de projet
DROP POLICY IF EXISTS "Project managers can manage collaborators" ON projet_collaborateurs;
CREATE POLICY "Project managers can manage collaborators" 
ON projet_collaborateurs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM projets p
    WHERE p.id = projet_collaborateurs.projet_id 
    AND (p.auteur_id = uid() OR p.referent_projet_id = uid() OR is_admin() OR is_referent_projet())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM projets p
    WHERE p.id = projet_collaborateurs.projet_id 
    AND (p.auteur_id = uid() OR p.referent_projet_id = uid() OR is_admin() OR is_referent_projet())
  )
);