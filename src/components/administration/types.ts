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
  manager: {
    full_name: string;
  } | null;
  coach: {
    full_name: string;
  } | null;
  career_level: {
    name: string;
    color: string;
  } | null;
  career_pathway: {
    name: string;
    color: string;
  } | null;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface CareerLevel {
  id: string;
  name: string;
  short_name: string;
  description: string;
  color: string;
  sort_order: number;
}

export interface CareerArea {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
}