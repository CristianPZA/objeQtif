export interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  department: string | null;
}

export interface Collaborateur {
  id: string;
  employe_id: string;
  employe_nom: string;
  employe_role: string;
  employe_department: string | null;
  role_projet: string;
  taux_allocation: number;
  responsabilites: string | null;
  date_debut: string | null;
  date_fin: string | null;
  is_active: boolean;
}

export interface Collaborator {
  employe_id: string;
  employe_nom: string;
  role_projet: string;
  taux_allocation: number;
  responsabilites: string;
  date_debut: string;
  date_fin: string;
}

export interface Projet {
  id: string;
  nom_client: string;
  titre: string;
  description: string;
  date_debut: string;
  date_fin_prevue: string | null;
  budget_estime: number | null;
  statut: string;
  priorite: string;
  taux_avancement: number;
  referent_projet_id: string;
  auteur_id: string;
  objectifs: string[];
  risques: string[];
  notes: string | null;
  created_at: string;
  auteur_nom: string;
  referent_nom: string;
  referent_role: string;
  collaborateurs: Collaborateur[];
}

export interface ProjectFormData {
  nom_client: string;
  titre: string;
  description: string;
  date_debut: string;
  date_fin_prevue: string;
  budget_estime: string;
  priorite: string;
  objectifs: string[];
  risques: string[];
  notes: string;
  collaborateurs: Collaborator[];
  id?: string;
}