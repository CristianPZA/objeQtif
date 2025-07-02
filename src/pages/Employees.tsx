import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  User, 
  Building, 
  Calendar, 
  Mail, 
  Phone, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronRight, 
  Edit, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  Star,
  BookOpen,
  Award,
  Target,
  Flag
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface UserProfile {
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

interface AnnualObjective {
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
}

interface Evaluation {
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

interface ProjectCollaboration {
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

const Employees = () => {
  const navigate = useNavigate();
  const { userCountry } = useAuth();
  const { t } = useTranslation();
  
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<UserProfile | null>(null);
  const [annualObjectives, setAnnualObjectives] = useState<AnnualObjective[]>([]);
  const [projectEvaluations, setProjectEvaluations] = useState<Evaluation[]>([]);
  const [projectCollaborations, setProjectCollaborations] = useState<ProjectCollaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string | null>(null);
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());
  const [expandedEvaluations, setExpandedEvaluations] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [departments, setDepartments] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    fetchEmployees();
  }, [userCountry]);

  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeDetails(selectedEmployee.id);
    }
  }, [selectedEmployee]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      
      // Récupérer tous les employés avec les informations de base
      const { data: employeesData, error: employeesError } = await supabase
        .from('user_profiles')
        .select(`
          *,
          manager:manager_id(full_name),
          coach:coach_id(full_name),
          career_level:career_levels!career_level_id(name, color),
          career_pathway:career_areas!career_pathway_id(name, color)
        `)
        .eq('is_active', true)
        .eq('country', userCountry)
        .order('full_name');

      if (employeesError) throw employeesError;
      
      setEmployees(employeesData || []);
      
      // Extraire les départements et rôles uniques pour les filtres
      const uniqueDepartments = Array.from(new Set(
        employeesData?.filter(emp => emp.department).map(emp => emp.department) || []
      )).filter(Boolean) as string[];
      
      const uniqueRoles = Array.from(new Set(
        employeesData?.map(emp => emp.role) || []
      )).filter(Boolean) as string[];
      
      setDepartments(uniqueDepartments);
      setRoles(uniqueRoles);
      
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err instanceof Error ? err.message : 'Error fetching employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeDetails = async (employeeId: string) => {
    try {
      setLoading(true);
      
      // Récupérer les objectifs annuels
      const { data: objectivesData, error: objectivesError } = await supabase
        .from('annual_objectives')
        .select(`
          *,
          career_pathway:career_areas!career_pathway_id(name, color),
          career_level:career_levels!career_level_id(name, color)
        `)
        .eq('employee_id', employeeId)
        .order('year', { ascending: false });

      if (objectivesError) throw objectivesError;
      setAnnualObjectives(objectivesData || []);
      
      // Récupérer les évaluations de projets
      const { data: evaluationsData, error: evaluationsError } = await supabase
        .from('v_coaching_evaluations')
        .select('*')
        .eq('employe_id', employeeId)
        .order('date_soumission', { ascending: false });

      if (evaluationsError) throw evaluationsError;
      setProjectEvaluations(evaluationsData || []);
      
      // Récupérer les collaborations de projets
      const { data: collaborationsData, error: collaborationsError } = await supabase
        .from('projet_collaborateurs')
        .select(`
          *,
          projet:projets!inner(
            id,
            nom_client,
            titre,
            description,
            date_debut,
            date_fin_prevue,
            statut,
            priorite,
            taux_avancement,
            referent_projet_id,
            auteur_id,
            referent_nom:user_profiles!referent_projet_id(full_name),
            auteur_nom:user_profiles!auteur_id(full_name)
          )
        `)
        .eq('employe_id', employeeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (collaborationsError) throw collaborationsError;
      
      // Pour chaque collaboration, récupérer les objectifs et évaluations
      const enrichedCollaborations = await Promise.all(
        (collaborationsData || []).map(async (collab) => {
          // Récupérer les objectifs
          const { data: objectifsData } = await supabase
            .from('objectifs_collaborateurs')
            .select('*')
            .eq('collaboration_id', collab.id)
            .maybeSingle();
          
          // Récupérer l'évaluation si elle existe
          let evaluationData = null;
          if (objectifsData) {
            const { data: evalData } = await supabase
              .from('evaluations_objectifs')
              .select('*')
              .eq('objectifs_id', objectifsData.id)
              .maybeSingle();
            evaluationData = evalData;
          }
          
          return {
            ...collab,
            objectifs: objectifsData,
            evaluation: evaluationData
          };
        })
      );
      
      setProjectCollaborations(enrichedCollaborations);
      
    } catch (err) {
      console.error('Error fetching employee details:', err);
      setError(err instanceof Error ? err.message : 'Error fetching employee details');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeClick = (employee: UserProfile) => {
    setSelectedEmployee(employee);
  };

  const handleBackToList = () => {
    setSelectedEmployee(null);
    setAnnualObjectives([]);
    setProjectEvaluations([]);
    setProjectCollaborations([]);
  };

  const toggleObjectiveExpansion = (objectiveId: string) => {
    const newExpanded = new Set(expandedObjectives);
    if (newExpanded.has(objectiveId)) {
      newExpanded.delete(objectiveId);
    } else {
      newExpanded.add(objectiveId);
    }
    setExpandedObjectives(newExpanded);
  };

  const toggleEvaluationExpansion = (evaluationId: string) => {
    const newExpanded = new Set(expandedEvaluations);
    if (newExpanded.has(evaluationId)) {
      newExpanded.delete(evaluationId);
    } else {
      newExpanded.add(evaluationId);
    }
    setExpandedEvaluations(newExpanded);
  };

  const toggleProjectExpansion = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const getScoreStars = (score: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < score ? 'fill-current text-yellow-400' : 'text-gray-300'}`} 
      />
    ));
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 3.5) return 'text-blue-600';
    if (score >= 2.5) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 4.5) return 'bg-green-100 text-green-800';
    if (score >= 3.5) return 'bg-blue-100 text-blue-800';
    if (score >= 2.5) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return t('annualObjectives.objectiveStatuses.draft');
      case 'submitted':
        return t('annualObjectives.objectiveStatuses.submitted');
      case 'approved':
        return t('annualObjectives.objectiveStatuses.approved');
      case 'rejected':
        return t('annualObjectives.objectiveStatuses.rejected');
      default:
        return t('common.unknown');
    }
  };

  const getCareerLevelBadge = (level: { name: string, color: string }) => {
    const colorMap: Record<string, string> = {
      'green': 'bg-green-100 text-green-800',
      'blue': 'bg-blue-100 text-blue-800',
      'purple': 'bg-purple-100 text-purple-800',
      'orange': 'bg-orange-100 text-orange-800',
      'red': 'bg-red-100 text-red-800',
      'indigo': 'bg-indigo-100 text-indigo-800',
      'gray': 'bg-gray-100 text-gray-800'
    };
    return colorMap[level.color] || 'bg-gray-100 text-gray-800';
  };

  const getProjectStatusColor = (statut: string) => {
    switch (statut) {
      case 'en_cours':
        return 'bg-blue-100 text-blue-800';
      case 'termine':
        return 'bg-green-100 text-green-800';
      case 'suspendu':
        return 'bg-yellow-100 text-yellow-800';
      case 'annule':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProjectStatusLabel = (statut: string) => {
    switch (statut) {
      case 'en_cours':
        return t('projects.statuses.inProgress');
      case 'termine':
        return t('projects.statuses.completed');
      case 'suspendu':
        return t('projects.statuses.suspended');
      case 'annule':
        return t('projects.statuses.cancelled');
      default:
        return statut;
    }
  };

  const getEvaluationStatusColor = (statut: string) => {
    switch (statut) {
      case 'brouillon':
        return 'bg-gray-100 text-gray-800';
      case 'soumise':
      case 'en_attente_referent':
        return 'bg-yellow-100 text-yellow-800';
      case 'evaluee_referent':
        return 'bg-purple-100 text-purple-800';
      case 'finalisee':
        return 'bg-green-100 text-green-800';
      case 'rejetee':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEvaluationStatusLabel = (statut: string) => {
    switch (statut) {
      case 'brouillon':
        return 'Brouillon';
      case 'soumise':
        return 'Soumise';
      case 'en_attente_referent':
        return 'En attente référent';
      case 'evaluee_referent':
        return 'Évaluée par référent';
      case 'finalisee':
        return 'Finalisée';
      case 'rejetee':
        return 'Rejetée';
      default:
        return statut;
    }
  };

  const calculateAverageScore = (evaluationData: any, type: 'auto' | 'referent') => {
    if (!evaluationData || !evaluationData.evaluations || !Array.isArray(evaluationData.evaluations)) {
      return 0;
    }
    
    let totalScore = 0;
    let count = 0;
    
    evaluationData.evaluations.forEach((evaluationItem: any) => {
      if (type === 'auto' && evaluationItem.auto_evaluation_score) {
        totalScore += parseFloat(evaluationItem.auto_evaluation_score);
        count++;
      } else if (type === 'referent' && evaluationItem.referent_score) {
        totalScore += parseFloat(evaluationItem.referent_score);
        count++;
      }
    });
    
    return count > 0 ? (totalScore / count).toFixed(1) : '0.0';
  };

  const filteredEmployees = employees.filter(employee => {
    // Filtre par recherche
    const searchMatch = 
      employee.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.fiche_poste?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtre par rôle
    const roleMatch = !filterRole || employee.role === filterRole;
    
    // Filtre par département
    const departmentMatch = !filterDepartment || employee.department === filterDepartment;
    
    return searchMatch && roleMatch && departmentMatch;
  });

  const handleViewObjectives = (objectiveId: string) => {
    // Naviguer vers la page de détail des objectifs annuels
    // navigate(`/objectifs-annuels/${objectiveId}`);
    console.log('View objectives:', objectiveId);
  };

  const handleViewEvaluation = (evaluationId: string) => {
    // Naviguer vers la page de détail de l'évaluation
    // navigate(`/evaluations/${evaluationId}`);
    console.log('View evaluation:', evaluationId);
  };

  const handleViewProject = (collaborationId: string) => {
    // Naviguer vers la page de détail de la fiche projet
    navigate(`/fiche-projet/${collaborationId}`);
  };

  // Grouper les évaluations par thème
  const groupEvaluationsByTheme = (evaluations: Evaluation[]) => {
    const themes: Record<string, Evaluation[]> = {};
    
    evaluations.forEach(evaluation => {
      // Extraire les thèmes des objectifs
      if (evaluation.auto_evaluation && evaluation.auto_evaluation.evaluations) {
        evaluation.auto_evaluation.evaluations.forEach((evalItem: any) => {
          const theme = evalItem.theme || 'Non catégorisé';
          if (!themes[theme]) {
            themes[theme] = [];
          }
          themes[theme].push(evaluation);
        });
      }
    });
    
    return themes;
  };

  const evaluationThemes = groupEvaluationsByTheme(projectEvaluations);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dossiers Employés</h1>
          <p className="text-gray-600 mt-1">Consultez les dossiers complets des employés</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              {userCountry === 'france' ? '🇫🇷 France' : '🇪🇸 Espagne'}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {!selectedEmployee ? (
        <>
          {/* Filtres */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Recherche */}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Rechercher un employé..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Filtre par rôle */}
              <div>
                <select
                  value={filterRole || ''}
                  onChange={(e) => setFilterRole(e.target.value || null)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Tous les rôles</option>
                  {roles.map(role => (
                    <option key={role} value={role}>
                      {role === 'admin' ? 'Administrateur' : 
                       role === 'employe' ? 'Employé' : 
                       role === 'referent_projet' ? 'Référent Projet' : role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtre par département */}
              <div>
                <select
                  value={filterDepartment || ''}
                  onChange={(e) => setFilterDepartment(e.target.value || null)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Tous les départements</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Bouton de réinitialisation */}
              {(searchTerm || filterRole || filterDepartment) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterRole(null);
                    setFilterDepartment(null);
                  }}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          </div>

          {/* Liste des employés */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map(employee => (
              <div
                key={employee.id}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all cursor-pointer"
                onClick={() => handleEmployeeClick(employee)}
              >
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{employee.full_name}</h3>
                      <p className="text-gray-600">{employee.fiche_poste || 'Poste non défini'}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{employee.email}</span>
                    </div>
                    
                    {employee.department && (
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">{employee.department}</span>
                      </div>
                    )}
                    
                    {employee.career_level && (
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-gray-400" />
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCareerLevelBadge(employee.career_level)}`}>
                          {employee.career_level.name}
                        </span>
                      </div>
                    )}
                    
                    {employee.career_pathway && (
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">{employee.career_pathway.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun employé trouvé</h3>
              <p className="text-gray-600">
                Aucun employé ne correspond à vos critères de recherche.
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Détail de l'employé */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {/* Header avec bouton retour */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <div className="flex justify-between items-center">
                <button
                  onClick={handleBackToList}
                  className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>Retour à la liste</span>
                </button>
                <div className="text-right">
                  <h2 className="text-2xl font-bold">{selectedEmployee.full_name}</h2>
                  <p className="text-indigo-100">{selectedEmployee.fiche_poste || 'Poste non défini'}</p>
                </div>
              </div>
            </div>

            {/* Informations de base */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Informations personnelles</h3>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{selectedEmployee.email}</p>
                    </div>
                  </div>
                  
                  {selectedEmployee.phone && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Phone className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Téléphone</p>
                        <p className="font-medium">{selectedEmployee.phone}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Flag className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Pays</p>
                      <p className="font-medium">
                        {selectedEmployee.country === 'france' ? '🇫🇷 France' : '🇪🇸 Espagne'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Informations professionnelles</h3>
                  
                  {selectedEmployee.department && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Building className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Département</p>
                        <p className="font-medium">{selectedEmployee.department}</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedEmployee.manager && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <User className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Manager</p>
                        <p className="font-medium">{selectedEmployee.manager.full_name}</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedEmployee.coach && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-100 rounded-lg">
                        <Users className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Coach</p>
                        <p className="font-medium">{selectedEmployee.coach.full_name}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Parcours de carrière</h3>
                  
                  {selectedEmployee.career_level && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Target className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Niveau de carrière</p>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCareerLevelBadge(selectedEmployee.career_level)}`}>
                            {selectedEmployee.career_level.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {selectedEmployee.career_pathway && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-100 rounded-lg">
                        <BookOpen className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Parcours de carrière</p>
                        <p className="font-medium">{selectedEmployee.career_pathway.name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Objectifs annuels */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Target className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Objectifs annuels</h2>
                </div>
                <span className="text-sm text-gray-500">
                  {annualObjectives.length} objectif(s)
                </span>
              </div>
            </div>

            <div className="p-6">
              {annualObjectives.length > 0 ? (
                <div className="space-y-4">
                  {annualObjectives.map(objective => {
                    const isExpanded = expandedObjectives.has(objective.id);
                    
                    return (
                      <div key={objective.id} className="bg-gray-50 rounded-lg border p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                Objectifs {objective.year}
                              </h3>
                              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(objective.status)}`}>
                                {getStatusLabel(objective.status)}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-1">
                              {objective.career_level && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCareerLevelBadge(objective.career_level)}`}>
                                  {objective.career_level.name}
                                </span>
                              )}
                              
                              {objective.career_pathway && (
                                <span className="text-sm text-gray-600">
                                  {objective.career_pathway.name}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleObjectiveExpansion(objective.id)}
                              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-500" />
                              )}
                            </button>
                            
                            <button
                              onClick={() => handleViewObjectives(objective.id)}
                              className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-full transition-colors"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="mt-4 space-y-3">
                            {objective.objectives.map((obj: any, index: number) => (
                              <div 
                                key={index} 
                                className={`p-3 rounded-lg border ${
                                  obj.is_custom 
                                    ? obj.objective_type === 'formation' 
                                      ? 'border-orange-200 bg-orange-50' 
                                      : obj.objective_type === 'custom' 
                                        ? 'border-indigo-200 bg-indigo-50' 
                                        : 'border-purple-200 bg-purple-50' 
                                    : 'border-blue-200 bg-blue-50'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    obj.is_custom 
                                      ? obj.objective_type === 'formation' 
                                        ? 'bg-orange-100 text-orange-700' 
                                        : obj.objective_type === 'custom' 
                                          ? 'bg-indigo-100 text-indigo-700' 
                                          : 'bg-purple-100 text-purple-700' 
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {obj.theme_name || `Thème ${index + 1}`}
                                  </span>
                                  {obj.is_custom && (
                                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                      Personnalisé
                                    </span>
                                  )}
                                  {obj.is_custom && obj.objective_type && (
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      obj.objective_type === 'smart' ? 'bg-green-100 text-green-800' : 
                                      obj.objective_type === 'formation' ? 'bg-orange-100 text-orange-800' : 
                                      'bg-indigo-100 text-indigo-800'
                                    }`}>
                                      {obj.objective_type === 'smart' ? 'SMART' : 
                                       obj.objective_type === 'formation' ? 'Formation' : 
                                       'Personnalisé'}
                                    </span>
                                  )}
                                </div>
                                
                                <h4 className="font-medium text-gray-900">
                                  {obj.skill_description}
                                </h4>
                                
                                <p className="text-sm text-gray-700 mt-2">
                                  <strong>Objectif:</strong> {obj.smart_objective}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun objectif annuel</h3>
                  <p className="text-gray-600">
                    Cet employé n'a pas encore défini d'objectifs annuels.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Évaluations de projets */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Award className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Évaluations de projets</h2>
                </div>
                <span className="text-sm text-gray-500">
                  {projectEvaluations.length} évaluation(s)
                </span>
              </div>
            </div>

            <div className="p-6">
              {projectEvaluations.length > 0 ? (
                <div className="space-y-6">
                  {/* Synthèse par thème */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Synthèse par thème</h3>
                    
                    {Object.keys(evaluationThemes).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(evaluationThemes).map(([theme, evals]) => {
                          const isExpanded = expandedEvaluations.has(theme);
                          
                          // Calculer le score moyen pour ce thème
                          let totalScore = 0;
                          let count = 0;
                          evals.forEach(eval => {
                            if (eval.note_finale) {
                              totalScore += eval.note_finale;
                              count++;
                            }
                          });
                          const avgScore = count > 0 ? (totalScore / count).toFixed(1) : '0.0';
                          
                          return (
                            <div key={theme} className="bg-gray-50 rounded-lg border p-4">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-gray-900">{theme}</h4>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreBadgeColor(parseFloat(avgScore))}`}>
                                    {avgScore}/5
                                  </span>
                                </div>
                                
                                <button
                                  onClick={() => toggleEvaluationExpansion(theme)}
                                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-5 h-5 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-gray-500" />
                                  )}
                                </button>
                              </div>
                              
                              {isExpanded && (
                                <div className="mt-4 space-y-3">
                                  {evals.map(evaluation => (
                                    <div key={evaluation.evaluation_id} className="p-3 rounded-lg border border-gray-200 bg-white">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <h5 className="font-medium text-gray-900">{evaluation.projet_titre}</h5>
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${getEvaluationStatusColor(evaluation.statut)}`}>
                                              {getEvaluationStatusLabel(evaluation.statut)}
                                            </span>
                                          </div>
                                          <p className="text-sm text-gray-600">
                                            Client: {evaluation.nom_client}
                                          </p>
                                        </div>
                                        
                                        <div className="flex items-center gap-1">
                                          <div className="flex">
                                            {getScoreStars(evaluation.note_finale)}
                                          </div>
                                          <span className={`text-sm font-medium ${getScoreColor(evaluation.note_finale)}`}>
                                            ({evaluation.note_finale}/5)
                                          </span>
                                        </div>
                                      </div>
                                      
                                      <div className="mt-3 grid grid-cols-2 gap-3">
                                        <div className="bg-blue-50 p-2 rounded">
                                          <div className="text-xs font-medium text-blue-800 mb-1">Auto-évaluation</div>
                                          <div className="flex items-center gap-1">
                                            <div className="flex">
                                              {getScoreStars(evaluation.score_auto_evaluation)}
                                            </div>
                                            <span className="text-xs text-blue-700">({evaluation.score_auto_evaluation}/5)</span>
                                          </div>
                                        </div>
                                        
                                        <div className="bg-purple-50 p-2 rounded">
                                          <div className="text-xs font-medium text-purple-800 mb-1">Évaluation référent</div>
                                          <div className="flex items-center gap-1">
                                            <div className="flex">
                                              {getScoreStars(evaluation.score_referent)}
                                            </div>
                                            <span className="text-xs text-purple-700">({evaluation.score_referent}/5)</span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <button
                                        onClick={() => handleViewEvaluation(evaluation.evaluation_id)}
                                        className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                      >
                                        Voir les détails
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-600 text-center py-4">
                        Aucun thème d'évaluation disponible
                      </p>
                    )}
                  </div>
                  
                  {/* Liste complète des évaluations */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Toutes les évaluations</h3>
                    
                    <div className="space-y-4">
                      {projectEvaluations.map(evaluation => (
                        <div key={evaluation.evaluation_id} className="bg-white rounded-lg border shadow-sm p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-900">{evaluation.projet_titre}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${getEvaluationStatusColor(evaluation.statut)}`}>
                                  {getEvaluationStatusLabel(evaluation.statut)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                Client: {evaluation.nom_client}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Évaluée le {format(new Date(evaluation.date_soumission), 'dd/MM/yyyy', { locale: fr })}
                              </p>
                            </div>
                            
                            <div className="flex flex-col items-end">
                              <div className="flex items-center gap-1">
                                <div className="flex">
                                  {getScoreStars(evaluation.note_finale)}
                                </div>
                                <span className={`text-sm font-medium ${getScoreColor(evaluation.note_finale)}`}>
                                  ({evaluation.note_finale}/5)
                                </span>
                              </div>
                              
                              <button
                                onClick={() => handleViewEvaluation(evaluation.evaluation_id)}
                                className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                              >
                                Voir les détails
                              </button>
                            </div>
                          </div>
                          
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <div className="bg-blue-50 p-2 rounded">
                              <div className="text-xs font-medium text-blue-800 mb-1">Auto-évaluation</div>
                              <div className="flex items-center gap-1">
                                <div className="flex">
                                  {getScoreStars(evaluation.score_auto_evaluation)}
                                </div>
                                <span className="text-xs text-blue-700">({evaluation.score_auto_evaluation}/5)</span>
                              </div>
                            </div>
                            
                            <div className="bg-purple-50 p-2 rounded">
                              <div className="text-xs font-medium text-purple-800 mb-1">Évaluation référent</div>
                              <div className="flex items-center gap-1">
                                <div className="flex">
                                  {getScoreStars(evaluation.score_referent)}
                                </div>
                                <span className="text-xs text-purple-700">({evaluation.score_referent}/5)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune évaluation</h3>
                  <p className="text-gray-600">
                    Cet employé n'a pas encore d'évaluations de projets finalisées.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Projets */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Briefcase className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Projets</h2>
                </div>
                <span className="text-sm text-gray-500">
                  {projectCollaborations.length} projet(s)
                </span>
              </div>
            </div>

            <div className="p-6">
              {projectCollaborations.length > 0 ? (
                <div className="space-y-4">
                  {projectCollaborations.map(collab => {
                    const isExpanded = expandedProjects.has(collab.id);
                    const hasObjectives = collab.objectifs && collab.objectifs.objectifs && collab.objectifs.objectifs.length > 0;
                    const hasEvaluation = collab.evaluation && collab.evaluation.auto_evaluation;
                    
                    return (
                      <div key={collab.id} className="bg-gray-50 rounded-lg border p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-gray-900">{collab.projet.titre}</h3>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${getProjectStatusColor(collab.projet.statut)}`}>
                                {getProjectStatusLabel(collab.projet.statut)}
                              </span>
                            </div>
                            
                            <p className="text-sm text-gray-600">
                              Client: {collab.projet.nom_client}
                            </p>
                            
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-sm text-gray-600">
                                Rôle: {collab.role_projet}
                              </p>
                              
                              {collab.taux_allocation !== 100 && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                  {collab.taux_allocation}%
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleProjectExpansion(collab.id)}
                              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-500" />
                              )}
                            </button>
                            
                            <button
                              onClick={() => handleViewProject(collab.id)}
                              className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-full transition-colors"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-white p-3 rounded-lg border">
                                <h4 className="font-medium text-gray-900 mb-2">Informations du projet</h4>
                                
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Référent:</span>
                                    <span className="font-medium">{collab.projet.referent_nom}</span>
                                  </div>
                                  
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Date de début:</span>
                                    <span className="font-medium">
                                      {format(new Date(collab.projet.date_debut), 'dd/MM/yyyy', { locale: fr })}
                                    </span>
                                  </div>
                                  
                                  {collab.projet.date_fin_prevue && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Date de fin prévue:</span>
                                      <span className="font-medium">
                                        {format(new Date(collab.projet.date_fin_prevue), 'dd/MM/yyyy', { locale: fr })}
                                      </span>
                                    </div>
                                  )}
                                  
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Avancement:</span>
                                    <span className="font-medium">{collab.projet.taux_avancement}%</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-white p-3 rounded-lg border">
                                <h4 className="font-medium text-gray-900 mb-2">Objectifs et évaluations</h4>
                                
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Objectifs:</span>
                                    {hasObjectives ? (
                                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                        Définis ({collab.objectifs.objectifs.length})
                                      </span>
                                    ) : (
                                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                                        Non définis
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Auto-évaluation:</span>
                                    {hasEvaluation ? (
                                      <span className={`text-xs px-2 py-1 rounded-full ${getEvaluationStatusColor(collab.evaluation.statut)}`}>
                                        {getEvaluationStatusLabel(collab.evaluation.statut)}
                                      </span>
                                    ) : (
                                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                                        Non réalisée
                                      </span>
                                    )}
                                  </div>
                                  
                                  {hasEvaluation && collab.evaluation.auto_evaluation && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-600">Score:</span>
                                      <div className="flex items-center gap-1">
                                        <div className="flex">
                                          {getScoreStars(parseFloat(calculateAverageScore(collab.evaluation.auto_evaluation, 'auto')))}
                                        </div>
                                        <span className="text-xs text-gray-700">
                                          ({calculateAverageScore(collab.evaluation.auto_evaluation, 'auto')}/5)
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {hasEvaluation && collab.evaluation.evaluation_referent && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-600">Évaluation référent:</span>
                                      <div className="flex items-center gap-1">
                                        <div className="flex">
                                          {getScoreStars(parseFloat(calculateAverageScore(collab.evaluation.evaluation_referent, 'referent')))}
                                        </div>
                                        <span className="text-xs text-gray-700">
                                          ({calculateAverageScore(collab.evaluation.evaluation_referent, 'referent')}/5)
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                <button
                                  onClick={() => handleViewProject(collab.id)}
                                  className="mt-3 w-full px-3 py-1 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                                >
                                  Voir la fiche projet
                                </button>
                              </div>
                            </div>
                            
                            {hasObjectives && (
                              <div className="bg-white p-3 rounded-lg border">
                                <h4 className="font-medium text-gray-900 mb-3">Objectifs du projet</h4>
                                
                                <div className="space-y-3">
                                  {collab.objectifs.objectifs.map((obj: any, index: number) => (
                                    <div 
                                      key={index} 
                                      className={`p-3 rounded-lg border ${
                                        obj.is_custom 
                                          ? obj.objective_type === 'formation' 
                                            ? 'border-orange-200 bg-orange-50' 
                                            : obj.objective_type === 'custom' 
                                              ? 'border-indigo-200 bg-indigo-50' 
                                              : 'border-purple-200 bg-purple-50' 
                                          : 'border-blue-200 bg-blue-50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs px-2 py-1 rounded ${
                                          obj.is_custom 
                                            ? obj.objective_type === 'formation' 
                                              ? 'bg-orange-100 text-orange-700' 
                                              : obj.objective_type === 'custom' 
                                                ? 'bg-indigo-100 text-indigo-700' 
                                                : 'bg-purple-100 text-purple-700' 
                                            : 'bg-blue-100 text-blue-700'
                                        }`}>
                                          {obj.theme_name || `Thème ${index + 1}`}
                                        </span>
                                      </div>
                                      
                                      <h5 className="font-medium text-gray-900">
                                        {obj.skill_description}
                                      </h5>
                                      
                                      <p className="text-sm text-gray-700 mt-1">
                                        <strong>Objectif:</strong> {obj.smart_objective}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun projet</h3>
                  <p className="text-gray-600">
                    Cet employé n'est assigné à aucun projet actuellement.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Employees;