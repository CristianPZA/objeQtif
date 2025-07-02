export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  role: string;
  manager_id: string | null;
  coach_id: string | null;
  career_level_id: string | null;
  career_pathway_id: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  date_naissance: string | null;
  date_entree_entreprise: string | null;
  fiche_poste: string | null;
  country: string | null;
  manager?: {
    full_name: string;
  };
  coach?: {
    full_name: string;
  };
  career_level?: {
    name: string;
    color: string;
  };
  career_pathway?: {
    name: string;
    color: string;
  };
}

export interface AnnualObjective {
  id: string;
  employee_id: string;
  year: number;
  career_pathway_id: string;
  career_level_id: string;
  selected_themes: string[];
  objectives: any[];
  status: string;
  created_at: string;
  updated_at: string;
  career_pathway?: {
    name: string;
    color: string;
  };
  career_level?: {
    name: string;
    color: string;
  };
}

export interface Evaluation {
  evaluation_id: string;
  objectifs_id: string;
  auto_evaluation: any;
  evaluation_referent: any;
  statut: string;
  date_soumission: string;
  employe_id: string;
  employe_nom: string;
  projet_id: string;
  projet_titre: string;
  nom_client: string;
  projet_statut: string;
  score_auto_evaluation: number;
  score_referent: number;
  note_finale: number;
}

export interface ProjectCollaboration {
  id: string;
  projet_id: string;
  employe_id: string;
  role_projet: string;
  taux_allocation: number;
  responsabilites: string | null;
  date_debut: string | null;
  date_fin: string | null;
  is_active: boolean;
  created_at: string;
  projet: {
    id: string;
    nom_client: string;
    titre: string;
    description: string;
    date_debut: string;
    date_fin_prevue: string | null;
    statut: string;
    priorite: string;
    taux_avancement: number;
    referent_nom: string;
    auteur_nom: string;
    referent_projet_id: string;
    auteur_id: string;
  };
  objectifs?: {
    id: string;
    objectifs: any[];
  };
  evaluation?: {
    id: string;
    statut: string;
    auto_evaluation: any;
    evaluation_referent: any;
    date_soumission: string;
  };
}