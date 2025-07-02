import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  User, 
  Search, 
  Calendar, 
  BookOpen, 
  Target, 
  ChevronDown, 
  ChevronRight, 
  Star, 
  FileText, 
  Filter,
  Building,
  Award,
  Flag,
  Briefcase,
  Eye
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department: string | null;
  manager_id: string | null;
  coach_id: string | null;
  career_level_id: string | null;
  career_pathway_id: string | null;
  date_entree_entreprise: string | null;
  date_naissance: string | null;
  fiche_poste: string | null;
  country: string | null;
  is_active: boolean;
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
  status: string;
  objectives: any[];
  created_at: string;
}

interface ProjectObjective {
  id: string;
  collaboration_id: string;
  objectifs: any[];
  created_at: string;
  projet: {
    id: string;
    titre: string;
    nom_client: string;
    statut: string;
    date_debut: string;
    date_fin_prevue: string | null;
  };
  evaluation?: {
    id: string;
    statut: string;
    score_moyen?: number;
    score_referent?: number;
    note_finale?: number;
    auto_evaluation?: any;
    evaluation_referent?: any;
  };
}

interface EmployeeData {
  profile: UserProfile;
  annualObjectives: AnnualObjective[];
  projectObjectives: ProjectObjective[];
}

interface ThemeStat {
  theme: string;
  count: number;
  avgScore: number | null;
  objectives: {
    objectiveId: string;
    skillDescription: string;
    autoScore?: number;
    referentScore?: number;
    finalScore?: number;
    autoComment?: string;
    referentComment?: string;
    projectTitle?: string;
    projectClient?: string;
    isAnnual: boolean;
  }[];
}

const Employees = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userCountry } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<UserProfile[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    checkUserAccess();
  }, []);

  const checkUserAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      setCurrentUserId(user.id);

      // Récupérer le rôle de l'utilisateur
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      
      setCurrentUserRole(profile.role);

      // Si l'utilisateur est admin, charger tous les employés
      if (profile.role === 'admin' || profile.role === 'referent_projet') {
        await fetchAllEmployees();
      } else {
        // Sinon, vérifier s'il est coach
        const { data: coachees, error: coacheesError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('coach_id', user.id)
          .eq('is_active', true);

        if (coacheesError) throw coacheesError;

        if (coachees && coachees.length > 0) {
          // L'utilisateur est coach, charger ses coachés
          await fetchCoachees(user.id);
        } else {
          // L'utilisateur n'a pas accès à cette page
          navigate('/dashboard');
          return;
        }
      }
    } catch (err) {
      console.error('Error checking user access:', err);
      setError('Vous n\'avez pas accès à cette page');
      setLoading(false);
    }
  };

  const fetchAllEmployees = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          full_name,
          email,
          role,
          department,
          manager_id,
          coach_id,
          career_level_id,
          career_pathway_id,
          date_entree_entreprise,
          date_naissance,
          fiche_poste,
          country,
          is_active,
          career_level:career_levels(name, color),
          career_pathway:career_areas(name, color)
        `)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      
      setEmployees(data || []);
      setFilteredEmployees(data || []);
      
      // Si un seul employé, le sélectionner automatiquement
      if (data && data.length === 1) {
        setSelectedEmployee(data[0].id);
        await fetchEmployeeData(data[0].id);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Erreur lors du chargement des employés');
      setLoading(false);
    }
  };

  const fetchCoachees = async (coachId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          full_name,
          email,
          role,
          department,
          manager_id,
          coach_id,
          career_level_id,
          career_pathway_id,
          date_entree_entreprise,
          date_naissance,
          fiche_poste,
          country,
          is_active,
          career_level:career_levels(name, color),
          career_pathway:career_areas(name, color)
        `)
        .eq('coach_id', coachId)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      
      setEmployees(data || []);
      setFilteredEmployees(data || []);
      
      // Si un seul employé, le sélectionner automatiquement
      if (data && data.length === 1) {
        setSelectedEmployee(data[0].id);
        await fetchEmployeeData(data[0].id);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching coachees:', err);
      setError('Erreur lors du chargement des employés coachés');
      setLoading(false);
    }
  };

  const fetchEmployeeData = async (employeeId: string) => {
    try {
      setLoading(true);
      
      // Récupérer le profil de l'employé
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          full_name,
          email,
          role,
          department,
          manager_id,
          coach_id,
          career_level_id,
          career_pathway_id,
          date_entree_entreprise,
          date_naissance,
          fiche_poste,
          country,
          is_active,
          career_level:career_levels(name, color),
          career_pathway:career_areas(name, color)
        `)
        .eq('id', employeeId)
        .single();

      if (profileError) throw profileError;
      
      // Récupérer les objectifs annuels
      const { data: annualObjectives, error: annualError } = await supabase
        .from('annual_objectives')
        .select(`
          id,
          employee_id,
          year,
          status,
          objectives,
          created_at
        `)
        .eq('employee_id', employeeId)
        .order('year', { ascending: false });

      if (annualError) throw annualError;
      
      // Récupérer les objectifs de projet
      // 1. D'abord récupérer les collaborations de projet
      const { data: collaborations, error: collabError } = await supabase
        .from('projet_collaborateurs')
        .select(`
          id,
          projet_id,
          role_projet,
          projet:projets(
            id,
            titre,
            nom_client,
            statut,
            date_debut,
            date_fin_prevue
          )
        `)
        .eq('employe_id', employeeId);

      if (collabError) throw collabError;
      
      // 2. Récupérer les objectifs pour chaque collaboration
      const projectObjectives = [];
      
      for (const collab of collaborations || []) {
        const { data: objectives, error: objError } = await supabase
          .from('objectifs_collaborateurs')
          .select(`
            id,
            collaboration_id,
            objectifs,
            created_at
          `)
          .eq('collaboration_id', collab.id)
          .maybeSingle();
        
        if (objError) throw objError;
        
        if (objectives) {
          // 3. Récupérer l'évaluation si elle existe
          const { data: evaluation, error: evalError } = await supabase
            .from('v_auto_evaluations_completes')
            .select(`
              evaluation_id,
              statut,
              score_moyen,
              score_referent,
              note_finale,
              auto_evaluation,
              evaluation_referent
            `)
            .eq('objectifs_id', objectives.id)
            .maybeSingle();
          
          if (evalError) throw evalError;
          
          projectObjectives.push({
            ...objectives,
            projet: collab.projet,
            evaluation: evaluation ? {
              id: evaluation.evaluation_id,
              statut: evaluation.statut,
              score_moyen: evaluation.score_moyen,
              score_referent: evaluation.score_referent,
              note_finale: evaluation.note_finale,
              auto_evaluation: evaluation.auto_evaluation,
              evaluation_referent: evaluation.evaluation_referent
            } : undefined
          });
        }
      }
      
      // Collecter toutes les années disponibles
      const years = new Set<number>();
      
      // Années des objectifs annuels
      annualObjectives?.forEach(obj => years.add(obj.year));
      
      // Années des projets (basées sur la date de début)
      projectObjectives.forEach(obj => {
        if (obj.projet?.date_debut) {
          const year = new Date(obj.projet.date_debut).getFullYear();
          years.add(year);
        }
      });
      
      // Trier les années par ordre décroissant
      const sortedYears = Array.from(years).sort((a, b) => b - a);
      setAvailableYears(sortedYears);
      
      // Si des années sont disponibles, sélectionner la plus récente
      if (sortedYears.length > 0) {
        setSelectedYear(sortedYears[0]);
        setExpandedYears(new Set([sortedYears[0]]));
      }
      
      setEmployeeData({
        profile: profile,
        annualObjectives: annualObjectives || [],
        projectObjectives: projectObjectives
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching employee data:', err);
      setError('Erreur lors du chargement des données de l\'employé');
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (!term.trim()) {
      setFilteredEmployees(employees);
      return;
    }
    
    const filtered = employees.filter(employee => 
      employee.full_name.toLowerCase().includes(term) ||
      (employee.department && employee.department.toLowerCase().includes(term)) ||
      (employee.fiche_poste && employee.fiche_poste.toLowerCase().includes(term)) ||
      (employee.career_level?.name && employee.career_level.name.toLowerCase().includes(term)) ||
      (employee.career_pathway?.name && employee.career_pathway.name.toLowerCase().includes(term))
    );
    
    setFilteredEmployees(filtered);
  };

  const handleEmployeeSelect = async (employeeId: string) => {
    setSelectedEmployee(employeeId);
    await fetchEmployeeData(employeeId);
  };

  const toggleYearExpansion = (year: number) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  const toggleThemeExpansion = (theme: string) => {
    const newExpanded = new Set(expandedThemes);
    if (newExpanded.has(theme)) {
      newExpanded.delete(theme);
    } else {
      newExpanded.add(theme);
    }
    setExpandedThemes(newExpanded);
  };

  const handleYearFilter = (year: number | null) => {
    setSelectedYear(year);
    if (year) {
      setExpandedYears(new Set([year]));
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

  const getCareerPathwayBadge = (pathway: { name: string, color: string }) => {
    const colorMap: Record<string, string> = {
      'green': 'bg-green-50 text-green-700 border-green-200',
      'blue': 'bg-blue-50 text-blue-700 border-blue-200',
      'purple': 'bg-purple-50 text-purple-700 border-purple-200',
      'orange': 'bg-orange-50 text-orange-700 border-orange-200',
      'red': 'bg-red-50 text-red-700 border-red-200',
      'indigo': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'gray': 'bg-gray-50 text-gray-700 border-gray-200'
    };
    return colorMap[pathway.color] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getProjectStatusColor = (status: string) => {
    switch (status) {
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

  const getProjectStatusLabel = (status: string) => {
    switch (status) {
      case 'en_cours':
        return 'En cours';
      case 'termine':
        return 'Terminé';
      case 'suspendu':
        return 'Suspendu';
      case 'annule':
        return 'Annulé';
      default:
        return status;
    }
  };

  const getEvaluationStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch (status) {
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

  const getEvaluationStatusLabel = (status: string | undefined) => {
    if (!status) return 'Non évaluée';
    
    switch (status) {
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
        return status;
    }
  };

  const getObjectiveStatusColor = (status: string) => {
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

  const getObjectiveStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Brouillon';
      case 'submitted':
        return 'Soumis';
      case 'approved':
        return 'Approuvé';
      case 'rejected':
        return 'Rejeté';
      default:
        return status;
    }
  };

  // Fonction pour extraire les thèmes uniques des objectifs
  const extractThemes = (objectives: any[]) => {
    const themes = new Set<string>();
    
    objectives.forEach(obj => {
      if (obj.theme_name) {
        themes.add(obj.theme_name);
      }
    });
    
    return Array.from(themes);
  };

  // Fonction pour calculer les statistiques des thèmes travaillés
  const calculateThemeStats = (year: number): ThemeStat[] => {
    if (!employeeData) return [];
    
    const themeStats: Record<string, ThemeStat> = {};
    
    // Ajouter les objectifs annuels de l'année sélectionnée
    employeeData.annualObjectives
      .filter(obj => obj.year === year)
      .forEach(obj => {
        obj.objectives.forEach((objective: any) => {
          const theme = objective.theme_name || 'Non catégorisé';
          
          if (!themeStats[theme]) {
            themeStats[theme] = {
              theme,
              count: 0,
              avgScore: null,
              objectives: []
            };
          }
          
          themeStats[theme].count += 1;
          themeStats[theme].objectives.push({
            objectiveId: objective.skill_id,
            skillDescription: objective.skill_description,
            isAnnual: true
          });
        });
      });
    
    // Ajouter les objectifs de projet de l'année sélectionnée
    employeeData.projectObjectives
      .filter(obj => {
        if (!obj.projet?.date_debut) return false;
        const projectYear = new Date(obj.projet.date_debut).getFullYear();
        return projectYear === year;
      })
      .forEach(obj => {
        obj.objectifs.forEach((objective: any) => {
          const theme = objective.theme_name || 'Non catégorisé';
          
          if (!themeStats[theme]) {
            themeStats[theme] = {
              theme,
              count: 0,
              avgScore: null,
              objectives: []
            };
          }
          
          // Récupérer les scores d'évaluation si disponibles
          let autoScore, referentScore, finalScore, autoComment, referentComment;
          
          if (obj.evaluation && obj.evaluation.auto_evaluation && obj.evaluation.auto_evaluation.evaluations) {
            const autoEval = obj.evaluation.auto_evaluation.evaluations.find(
              (e: any) => e.skill_id === objective.skill_id
            );
            if (autoEval) {
              autoScore = autoEval.auto_evaluation_score;
              autoComment = autoEval.auto_evaluation_comment;
            }
          }
          
          if (obj.evaluation && obj.evaluation.evaluation_referent && obj.evaluation.evaluation_referent.evaluations) {
            const refEval = obj.evaluation.evaluation_referent.evaluations.find(
              (e: any) => e.skill_id === objective.skill_id
            );
            if (refEval) {
              referentScore = refEval.referent_score;
              referentComment = refEval.referent_comment;
            }
          }
          
          if (autoScore && referentScore) {
            finalScore = (autoScore + referentScore) / 2;
          }
          
          themeStats[theme].count += 1;
          themeStats[theme].objectives.push({
            objectiveId: objective.skill_id,
            skillDescription: objective.skill_description,
            autoScore,
            referentScore,
            finalScore,
            autoComment,
            referentComment,
            projectTitle: obj.projet.titre,
            projectClient: obj.projet.nom_client,
            isAnnual: false
          });
        });
      });
    
    // Calculer le score moyen pour chaque thème
    Object.values(themeStats).forEach(stat => {
      const scores = stat.objectives
        .filter(obj => obj.finalScore !== undefined)
        .map(obj => obj.finalScore as number);
      
      if (scores.length > 0) {
        stat.avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      }
    });
    
    // Trier par nombre d'occurrences décroissant
    return Object.values(themeStats).sort((a, b) => b.count - a.count);
  };

  // Filtrer les objectifs par année
  const getObjectivesByYear = (year: number) => {
    if (!employeeData) return { annual: [], project: [] };
    
    const annual = employeeData.annualObjectives.filter(obj => obj.year === year);
    
    const project = employeeData.projectObjectives.filter(obj => {
      if (!obj.projet?.date_debut) return false;
      const projectYear = new Date(obj.projet.date_debut).getFullYear();
      return projectYear === year;
    });
    
    return { annual, project };
  };

  // Vérifier si l'utilisateur a accès à cette page
  const hasAccess = () => {
    return currentUserRole === 'admin' || 
           currentUserRole === 'referent_projet' ||
           (currentUserRole === 'employe' && employees.some(emp => emp.coach_id === currentUserId));
  };

  // Générer les étoiles pour un score
  const getScoreStars = (score: number | undefined) => {
    if (score === undefined) return null;
    
    return (
      <div className="flex">
        {Array.from({ length: 5 }, (_, i) => (
          <Star 
            key={i} 
            className={`w-4 h-4 ${i < Math.round(score) ? 'fill-current text-yellow-400' : 'text-gray-300'}`} 
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!hasAccess()) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg max-w-md mx-auto">
          <h3 className="font-medium mb-2">Accès refusé</h3>
          <p className="text-sm">Vous n'avez pas les droits nécessaires pour accéder à cette page.</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md transition-colors text-sm"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dossiers Employés</h1>
          <p className="text-gray-600 mt-1">Consultez les dossiers et objectifs des employés</p>
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

      {/* Messages d'erreur */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Layout principal */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Colonne de gauche: Liste des employés */}
        <div className="w-full lg:w-1/3 space-y-4">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher un employé..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-indigo-600" />
                Employés ({filteredEmployees.length})
              </h2>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
              {filteredEmployees.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {filteredEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedEmployee === employee.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                      }`}
                      onClick={() => handleEmployeeSelect(employee.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{employee.full_name}</h3>
                          
                          <div className="flex flex-wrap gap-2 mt-1">
                            {employee.department && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {employee.department}
                              </span>
                            )}
                            
                            {employee.fiche_poste && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {employee.fiche_poste}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mt-2">
                            {employee.career_level && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCareerLevelBadge(employee.career_level)}`}>
                                {employee.career_level.name}
                              </span>
                            )}
                            
                            {employee.career_pathway && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getCareerPathwayBadge(employee.career_pathway)}`}>
                                {employee.career_pathway.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p>Aucun employé trouvé</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Colonne de droite: Détails de l'employé */}
        <div className="w-full lg:w-2/3">
          {selectedEmployee && employeeData ? (
            <div className="space-y-6">
              {/* Profil de l'employé */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex flex-col items-center md:items-start">
                    <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                      <User className="w-12 h-12 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{employeeData.profile.full_name}</h2>
                    <p className="text-gray-600">{employeeData.profile.fiche_poste || 'Poste non défini'}</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Flag className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        {employeeData.profile.country === 'france' ? '🇫🇷 France' : '🇪🇸 Espagne'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {employeeData.profile.career_level && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <Target className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Niveau de carrière</p>
                          <div className="mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCareerLevelBadge(employeeData.profile.career_level)}`}>
                              {employeeData.profile.career_level.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {employeeData.profile.career_pathway && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 rounded-lg">
                          <Award className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Career Pathway</p>
                          <div className="mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCareerPathwayBadge(employeeData.profile.career_pathway)}`}>
                              {employeeData.profile.career_pathway.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Filtres par année */}
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-medium text-gray-900">Filtrer par année</h3>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleYearFilter(null)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      selectedYear === null 
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' 
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    Toutes les années
                  </button>
                  
                  {availableYears.map(year => (
                    <button
                      key={year}
                      onClick={() => handleYearFilter(year)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        selectedYear === year 
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' 
                          : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>

              {/* Synthèse des thèmes travaillés */}
              {selectedYear && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <BookOpen className="w-5 h-5 mr-2 text-indigo-600" />
                    Synthèse des thèmes travaillés en {selectedYear}
                  </h3>
                  
                  {calculateThemeStats(selectedYear).length > 0 ? (
                    <div className="space-y-3">
                      {calculateThemeStats(selectedYear).map((stat, index) => {
                        const isExpanded = expandedThemes.has(stat.theme);
                        
                        return (
                          <div key={index} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                            <div 
                              className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                              onClick={() => toggleThemeExpansion(stat.theme)}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-gray-900">{stat.theme}</h4>
                                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                                    {stat.count} objectif{stat.count > 1 ? 's' : ''}
                                  </span>
                                </div>
                                
                                {stat.avgScore !== null && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex">
                                      {getScoreStars(stat.avgScore)}
                                    </div>
                                    <span className="text-sm text-gray-600">
                                      Score moyen: {stat.avgScore.toFixed(1)}/5
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="text-gray-400">
                                {isExpanded ? (
                                  <ChevronDown className="w-5 h-5" />
                                ) : (
                                  <ChevronRight className="w-5 h-5" />
                                )}
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="border-t border-gray-200 p-4 space-y-3">
                                <h5 className="font-medium text-gray-700 text-sm mb-2">Objectifs dans ce thème:</h5>
                                
                                {stat.objectives.map((obj, objIndex) => (
                                  <div key={objIndex} className="bg-white p-3 rounded-lg border border-gray-200">
                                    <div className="flex justify-between items-start mb-2">
                                      <div>
                                        <h6 className="font-medium text-gray-900">{obj.skillDescription}</h6>
                                        {obj.projectTitle && (
                                          <p className="text-xs text-gray-500">
                                            Projet: {obj.projectTitle} ({obj.projectClient})
                                          </p>
                                        )}
                                        {obj.isAnnual && (
                                          <p className="text-xs text-gray-500">
                                            Objectif annuel {selectedYear}
                                          </p>
                                        )}
                                      </div>
                                      
                                      {obj.finalScore !== undefined && (
                                        <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-medium">
                                          Note: {obj.finalScore.toFixed(1)}/5
                                        </span>
                                      )}
                                    </div>
                                    
                                    {(obj.autoScore !== undefined || obj.referentScore !== undefined) && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                        {obj.autoScore !== undefined && (
                                          <div className="bg-blue-50 p-2 rounded">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="text-xs font-medium text-blue-700">Auto-évaluation</span>
                                              <span className="text-xs text-blue-700">{obj.autoScore}/5</span>
                                            </div>
                                            {obj.autoComment && (
                                              <p className="text-xs text-blue-600 mt-1">{obj.autoComment}</p>
                                            )}
                                          </div>
                                        )}
                                        
                                        {obj.referentScore !== undefined && (
                                          <div className="bg-purple-50 p-2 rounded">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="text-xs font-medium text-purple-700">Évaluation référent</span>
                                              <span className="text-xs text-purple-700">{obj.referentScore}/5</span>
                                            </div>
                                            {obj.referentComment && (
                                              <p className="text-xs text-purple-600 mt-1">{obj.referentComment}</p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                      <BookOpen className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p>Aucun thème travaillé pour cette année</p>
                    </div>
                  )}
                </div>
              )}

              {/* Objectifs par année */}
              <div className="space-y-4">
                {(selectedYear ? [selectedYear] : availableYears).map(year => {
                  const isExpanded = expandedYears.has(year);
                  const { annual, project } = getObjectivesByYear(year);
                  
                  return (
                    <div key={year} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                      <div 
                        className="p-4 border-b border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleYearExpansion(year)}
                      >
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                          <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
                          Année {year}
                        </h3>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {annual.length + project.length} objectif{annual.length + project.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="p-4 space-y-6">
                          {/* Objectifs annuels */}
                          {annual.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                <Target className="w-4 h-4 mr-2 text-indigo-600" />
                                Objectifs annuels
                              </h4>
                              
                              <div className="space-y-3">
                                {annual.map(obj => (
                                  <div key={obj.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <div className="flex justify-between items-center mb-3">
                                      <h5 className="font-medium text-gray-900">
                                        Objectifs {obj.year}
                                      </h5>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getObjectiveStatusColor(obj.status)}`}>
                                        {getObjectiveStatusLabel(obj.status)}
                                      </span>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      {obj.objectives.map((objective: any, index: number) => (
                                        <div key={index} className="text-sm">
                                          <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-medium text-indigo-800">
                                              {index + 1}
                                            </span>
                                            <span className="font-medium text-gray-900">{objective.skill_description}</span>
                                          </div>
                                          <p className="text-gray-600 ml-7 mt-1">{objective.smart_objective}</p>
                                        </div>
                                      ))}
                                    </div>
                                    
                                    <div className="mt-3 text-xs text-gray-500">
                                      Créé le {format(new Date(obj.created_at), 'dd/MM/yyyy', { locale: fr })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Objectifs de projet */}
                          {project.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                <Briefcase className="w-4 h-4 mr-2 text-indigo-600" />
                                Objectifs de projet
                              </h4>
                              
                              <div className="space-y-3">
                                {project.map(obj => (
                                  <div key={obj.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <div className="flex justify-between items-center mb-3">
                                      <div>
                                        <h5 className="font-medium text-gray-900">
                                          {obj.projet.titre}
                                        </h5>
                                        <p className="text-sm text-gray-600">
                                          Client: {obj.projet.nom_client}
                                        </p>
                                      </div>
                                      <div className="flex flex-col items-end gap-1">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProjectStatusColor(obj.projet.statut)}`}>
                                          {getProjectStatusLabel(obj.projet.statut)}
                                        </span>
                                        
                                        {obj.evaluation && (
                                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEvaluationStatusColor(obj.evaluation.statut)}`}>
                                            {getEvaluationStatusLabel(obj.evaluation.statut)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      {obj.objectifs.map((objective: any, index: number) => (
                                        <div key={index} className="text-sm">
                                          <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-medium text-indigo-800">
                                              {index + 1}
                                            </span>
                                            <span className="font-medium text-gray-900">{objective.skill_description}</span>
                                          </div>
                                          <p className="text-gray-600 ml-7 mt-1">{objective.smart_objective}</p>
                                        </div>
                                      ))}
                                    </div>
                                    
                                    {/* Évaluations */}
                                    {obj.evaluation && (obj.evaluation.auto_evaluation || obj.evaluation.evaluation_referent) && (
                                      <div className="mt-4 border-t border-gray-200 pt-3">
                                        <h6 className="text-sm font-medium text-gray-700 mb-2">Évaluations:</h6>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          {/* Auto-évaluation */}
                                          {obj.evaluation.auto_evaluation && obj.evaluation.auto_evaluation.evaluations && (
                                            <div className="bg-blue-50 p-3 rounded-lg">
                                              <div className="flex justify-between items-center mb-2">
                                                <h6 className="text-sm font-medium text-blue-700">Auto-évaluation</h6>
                                                {obj.evaluation.score_moyen !== undefined && (
                                                  <span className="text-sm font-medium text-blue-700">
                                                    {obj.evaluation.score_moyen.toFixed(1)}/5
                                                  </span>
                                                )}
                                              </div>
                                              
                                              {obj.evaluation.score_moyen !== undefined && (
                                                <div className="flex mb-2">
                                                  {getScoreStars(obj.evaluation.score_moyen)}
                                                </div>
                                              )}
                                              
                                              <button
                                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                                                onClick={() => navigate(`/fiche-projet/${obj.collaboration_id}`)}
                                              >
                                                <Eye className="w-3 h-3" />
                                                Voir les détails
                                              </button>
                                            </div>
                                          )}
                                          
                                          {/* Évaluation référent */}
                                          {obj.evaluation.evaluation_referent && obj.evaluation.evaluation_referent.evaluations && (
                                            <div className="bg-purple-50 p-3 rounded-lg">
                                              <div className="flex justify-between items-center mb-2">
                                                <h6 className="text-sm font-medium text-purple-700">Évaluation référent</h6>
                                                {obj.evaluation.score_referent !== undefined && (
                                                  <span className="text-sm font-medium text-purple-700">
                                                    {obj.evaluation.score_referent.toFixed(1)}/5
                                                  </span>
                                                )}
                                              </div>
                                              
                                              {obj.evaluation.score_referent !== undefined && (
                                                <div className="flex mb-2">
                                                  {getScoreStars(obj.evaluation.score_referent)}
                                                </div>
                                              )}
                                              
                                              <button
                                                className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 mt-1"
                                                onClick={() => navigate(`/fiche-projet/${obj.collaboration_id}`)}
                                              >
                                                <Eye className="w-3 h-3" />
                                                Voir les détails
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Note finale */}
                                        {obj.evaluation.note_finale !== undefined && (
                                          <div className="mt-3 bg-green-50 p-3 rounded-lg">
                                            <div className="flex justify-between items-center">
                                              <h6 className="text-sm font-medium text-green-700">Note finale</h6>
                                              <span className="text-sm font-medium text-green-700">
                                                {obj.evaluation.note_finale.toFixed(1)}/5
                                              </span>
                                            </div>
                                            <div className="flex mt-1">
                                              {getScoreStars(obj.evaluation.note_finale)}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    <div className="mt-3 text-xs text-gray-500">
                                      Projet du {format(new Date(obj.projet.date_debut), 'dd/MM/yyyy', { locale: fr })}
                                      {obj.projet.date_fin_prevue && ` au ${format(new Date(obj.projet.date_fin_prevue), 'dd/MM/yyyy', { locale: fr })}`}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {annual.length === 0 && project.length === 0 && (
                            <div className="text-center py-6 text-gray-500">
                              <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                              <p>Aucun objectif pour cette année</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <User className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">Sélectionnez un employé</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Veuillez sélectionner un employé dans la liste pour consulter son dossier, ses objectifs et ses évaluations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Employees;