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
  Eye,
  ArrowRight
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
  objectives: any[];
  expanded: boolean;
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
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [themeStats, setThemeStats] = useState<ThemeStat[]>([]);

  useEffect(() => {
    checkUserAccess();
  }, []);

  useEffect(() => {
    if (selectedEmployee && selectedYear) {
      calculateThemeStats(selectedYear);
    }
  }, [selectedEmployee, selectedYear, employeeData]);

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
            .from('evaluations_objectifs')
            .select(`
              id,
              statut,
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
              id: evaluation.id,
              statut: evaluation.statut,
              auto_evaluation: evaluation.auto_evaluation,
              evaluation_referent: evaluation.evaluation_referent,
              score_moyen: evaluation.auto_evaluation ? calculateAverageScore(evaluation.auto_evaluation) : 0,
              score_referent: evaluation.evaluation_referent ? calculateAverageScore(evaluation.evaluation_referent) : 0,
              note_finale: calculateFinalScore(evaluation.auto_evaluation, evaluation.evaluation_referent)
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

  const calculateAverageScore = (evaluationData: any): number => {
    if (!evaluationData || !evaluationData.evaluations || evaluationData.evaluations.length === 0) {
      return 0;
    }
    
    let totalScore = 0;
    let count = 0;
    
    evaluationData.evaluations.forEach((evaluationItem: any) => {
      if (evaluationItem.auto_evaluation_score) {
        totalScore += parseFloat(evaluationItem.auto_evaluation_score);
        count++;
      } else if (evaluationItem.referent_score) {
        totalScore += parseFloat(evaluationItem.referent_score);
        count++;
      }
    });
    
    return count > 0 ? parseFloat((totalScore / count).toFixed(1)) : 0;
  };

  const calculateFinalScore = (autoEval: any, referentEval: any): number => {
    const autoScore = calculateAverageScore(autoEval);
    const referentScore = calculateAverageScore(referentEval);
    
    if (autoScore > 0 && referentScore > 0) {
      return parseFloat(((autoScore + referentScore) / 2).toFixed(1));
    } else if (autoScore > 0) {
      return autoScore;
    } else if (referentScore > 0) {
      return referentScore;
    }
    
    return 0;
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

  const toggleProjectExpansion = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const handleYearFilter = (year: number | null) => {
    setSelectedYear(year);
    if (year) {
      setExpandedYears(new Set([year]));
      calculateThemeStats(year);
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

  // Fonction pour calculer les statistiques des thèmes travaillés
  const calculateThemeStats = (year: number) => {
    if (!employeeData) {
      setThemeStats([]);
      return;
    }
    
    const allObjectives: any[] = [];
    
    // Ajouter les objectifs annuels de l'année sélectionnée
    employeeData.annualObjectives
      .filter(obj => obj.year === year)
      .forEach(obj => {
        allObjectives.push(...obj.objectives);
      });
    
    // Ajouter les objectifs de projet de l'année sélectionnée
    employeeData.projectObjectives
      .filter(obj => {
        if (!obj.projet?.date_debut) return false;
        const projectYear = new Date(obj.projet.date_debut).getFullYear();
        return projectYear === year;
      })
      .forEach(obj => {
        if (obj.objectifs) {
          allObjectives.push(...obj.objectifs);
        }
      });
    
    // Regrouper par thème
    const themeMap: Record<string, ThemeStat> = {};
    
    allObjectives.forEach(obj => {
      if (obj.theme_name) {
        if (!themeMap[obj.theme_name]) {
          themeMap[obj.theme_name] = {
            theme: obj.theme_name,
            count: 0,
            avgScore: null,
            objectives: [],
            expanded: false
          };
        }
        
        themeMap[obj.theme_name].count += 1;
        themeMap[obj.theme_name].objectives.push(obj);
      }
    });
    
    // Calculer les scores moyens pour chaque thème
    Object.values(themeMap).forEach(themeStat => {
      let totalScore = 0;
      let scoreCount = 0;
      
      // Parcourir les objectifs du thème pour trouver les évaluations
      themeStat.objectives.forEach(obj => {
        // Chercher l'évaluation correspondante dans les projets
        employeeData.projectObjectives.forEach(projObj => {
          if (projObj.evaluation && projObj.objectifs) {
            const objIndex = projObj.objectifs.findIndex((o: any) => 
              o.skill_id === obj.skill_id && o.skill_description === obj.skill_description
            );
            
            if (objIndex >= 0 && projObj.evaluation.auto_evaluation?.evaluations?.[objIndex]) {
              const score = parseFloat(projObj.evaluation.auto_evaluation.evaluations[objIndex].auto_evaluation_score);
              if (!isNaN(score)) {
                totalScore += score;
                scoreCount++;
              }
            }
          }
        });
      });
      
      if (scoreCount > 0) {
        themeStat.avgScore = parseFloat((totalScore / scoreCount).toFixed(1));
      }
    });
    
    // Convertir en tableau et trier par nombre d'occurrences
    const sortedStats = Object.values(themeMap).sort((a, b) => b.count - a.count);
    setThemeStats(sortedStats);
  };

  const toggleThemeExpansion = (index: number) => {
    const newThemeStats = [...themeStats];
    newThemeStats[index].expanded = !newThemeStats[index].expanded;
    setThemeStats(newThemeStats);
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
    return currentUserRole === 'admin' || currentUserRole === 'referent_projet' || 
           (currentUserRole === 'employe' && employees.some(emp => emp.coach_id === currentUserId));
  };

  const getScoreStars = (score: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < score ? 'fill-current text-yellow-400' : 'text-gray-300'}`} 
      />
    ));
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
                    {employeeData.profile.department && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Building className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Département</p>
                          <p className="font-medium">{employeeData.profile.department}</p>
                        </div>
                      </div>
                    )}
                    
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
                  
                  {themeStats.length > 0 ? (
                    <div className="space-y-3">
                      {themeStats.map((stat, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                          <div 
                            className="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => toggleThemeExpansion(index)}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-gray-900">{stat.theme}</h4>
                                  {stat.expanded ? (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">
                                  {stat.count} objectif{stat.count > 1 ? 's' : ''}
                                </p>
                              </div>
                              
                              {stat.avgScore !== null && (
                                <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                                  <div className="flex">
                                    {getScoreStars(Math.round(stat.avgScore))}
                                  </div>
                                  <span>{stat.avgScore}/5</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {stat.expanded && (
                            <div className="border-t border-gray-200 p-4 space-y-3 bg-white">
                              <h5 className="font-medium text-gray-700 text-sm">Objectifs dans ce thème:</h5>
                              {stat.objectives.map((obj, objIndex) => {
                                // Chercher l'évaluation correspondante
                                let evaluation = null;
                                let referentEvaluation = null;
                                
                                employeeData.projectObjectives.forEach(projObj => {
                                  if (projObj.evaluation && projObj.objectifs) {
                                    const matchingObjIndex = projObj.objectifs.findIndex((o: any) => 
                                      o.skill_id === obj.skill_id && o.skill_description === obj.skill_description
                                    );
                                    
                                    if (matchingObjIndex >= 0) {
                                      if (projObj.evaluation.auto_evaluation?.evaluations?.[matchingObjIndex]) {
                                        evaluation = projObj.evaluation.auto_evaluation.evaluations[matchingObjIndex];
                                      }
                                      if (projObj.evaluation.evaluation_referent?.evaluations?.[matchingObjIndex]) {
                                        referentEvaluation = projObj.evaluation.evaluation_referent.evaluations[matchingObjIndex];
                                      }
                                    }
                                  }
                                });
                                
                                return (
                                  <div key={objIndex} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="font-medium text-gray-800 mb-2">{obj.skill_description}</p>
                                    <p className="text-sm text-gray-600 mb-3">{obj.smart_objective}</p>
                                    
                                    {(evaluation || referentEvaluation) && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                        {evaluation && (
                                          <div className="bg-blue-50 p-2 rounded">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="text-xs font-medium text-blue-800">Auto-évaluation</span>
                                              <div className="flex items-center gap-1">
                                                <div className="flex">
                                                  {getScoreStars(evaluation.auto_evaluation_score)}
                                                </div>
                                                <span className="text-xs text-blue-700">({evaluation.auto_evaluation_score}/5)</span>
                                              </div>
                                            </div>
                                            {evaluation.auto_evaluation_comment && (
                                              <p className="text-xs text-blue-700 mt-1">{evaluation.auto_evaluation_comment}</p>
                                            )}
                                          </div>
                                        )}
                                        
                                        {referentEvaluation && (
                                          <div className="bg-purple-50 p-2 rounded">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="text-xs font-medium text-purple-800">Évaluation référent</span>
                                              <div className="flex items-center gap-1">
                                                <div className="flex">
                                                  {getScoreStars(referentEvaluation.referent_score)}
                                                </div>
                                                <span className="text-xs text-purple-700">({referentEvaluation.referent_score}/5)</span>
                                              </div>
                                            </div>
                                            {referentEvaluation.referent_comment && (
                                              <p className="text-xs text-purple-700 mt-1">{referentEvaluation.referent_comment}</p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
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
                              
                              <div className="space-y-4">
                                {project.map(obj => {
                                  const isProjectExpanded = expandedProjects.has(obj.id);
                                  
                                  return (
                                    <div key={obj.id} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                      <div 
                                        className="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => toggleProjectExpansion(obj.id)}
                                      >
                                        <div className="flex justify-between items-center">
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
                                            
                                            {isProjectExpanded ? (
                                              <ChevronDown className="w-4 h-4 text-gray-400 mt-1" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4 text-gray-400 mt-1" />
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {isProjectExpanded && (
                                        <div className="border-t border-gray-200 p-4 bg-white">
                                          {/* Objectifs */}
                                          <div className="space-y-3 mb-4">
                                            <h6 className="font-medium text-gray-700 text-sm">Objectifs:</h6>
                                            {obj.objectifs.map((objective: any, index: number) => (
                                              <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                                    {objective.theme_name || `Thème ${index + 1}`}
                                                  </span>
                                                </div>
                                                <p className="font-medium text-gray-800 mb-1">{objective.skill_description}</p>
                                                <p className="text-sm text-gray-600 mb-2">{objective.smart_objective}</p>
                                              </div>
                                            ))}
                                          </div>
                                          
                                          {/* Évaluations */}
                                          {obj.evaluation && (obj.evaluation.auto_evaluation || obj.evaluation.evaluation_referent) && (
                                            <div className="mt-4 border-t border-gray-200 pt-4">
                                              <h6 className="font-medium text-gray-700 text-sm mb-3">Évaluations:</h6>
                                              
                                              {obj.objectifs.map((objective: any, index: number) => {
                                                const autoEval = obj.evaluation?.auto_evaluation?.evaluations?.[index];
                                                const referentEval = obj.evaluation?.evaluation_referent?.evaluations?.[index];
                                                
                                                if (!autoEval && !referentEval) return null;
                                                
                                                return (
                                                  <div key={index} className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                    <p className="font-medium text-gray-800 mb-2">{index + 1}. {objective.skill_description}</p>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                      {/* Auto-évaluation */}
                                                      {autoEval && (
                                                        <div className="bg-blue-50 p-3 rounded">
                                                          <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs font-medium text-blue-800">Auto-évaluation</span>
                                                            <div className="flex items-center gap-1">
                                                              <div className="flex">
                                                                {getScoreStars(autoEval.auto_evaluation_score)}
                                                              </div>
                                                              <span className="text-xs text-blue-700">({autoEval.auto_evaluation_score}/5)</span>
                                                            </div>
                                                          </div>
                                                          {autoEval.auto_evaluation_comment && (
                                                            <p className="text-xs text-blue-700 mt-1">{autoEval.auto_evaluation_comment}</p>
                                                          )}
                                                          {autoEval.achievements && (
                                                            <p className="text-xs text-blue-700 mt-1">
                                                              <strong>Réalisations:</strong> {autoEval.achievements}
                                                            </p>
                                                          )}
                                                        </div>
                                                      )}
                                                      
                                                      {/* Évaluation référent */}
                                                      {referentEval && (
                                                        <div className="bg-purple-50 p-3 rounded">
                                                          <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs font-medium text-purple-800">Évaluation référent</span>
                                                            <div className="flex items-center gap-1">
                                                              <div className="flex">
                                                                {getScoreStars(referentEval.referent_score)}
                                                              </div>
                                                              <span className="text-xs text-purple-700">({referentEval.referent_score}/5)</span>
                                                            </div>
                                                          </div>
                                                          {referentEval.referent_comment && (
                                                            <p className="text-xs text-purple-700 mt-1">{referentEval.referent_comment}</p>
                                                          )}
                                                          {referentEval.development_recommendations && (
                                                            <p className="text-xs text-purple-700 mt-1">
                                                              <strong>Recommandations:</strong> {referentEval.development_recommendations}
                                                            </p>
                                                          )}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                              
                                              {obj.evaluation.note_finale > 0 && (
                                                <div className="mt-3 flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-200">
                                                  <span className="font-medium text-green-800">Note finale:</span>
                                                  <div className="flex items-center gap-2">
                                                    <div className="flex">
                                                      {getScoreStars(Math.round(obj.evaluation.note_finale))}
                                                    </div>
                                                    <span className="text-green-800 font-medium">{obj.evaluation.note_finale.toFixed(1)}/5</span>
                                                  </div>
                                                </div>
                                              )}
                                              
                                              <div className="mt-3 flex justify-end">
                                                <button
                                                  onClick={() => navigate(`/fiche-projet/${obj.collaboration_id}`)}
                                                  className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm"
                                                >
                                                  <Eye className="w-4 h-4" />
                                                  Voir la fiche complète
                                                  <ArrowRight className="w-3 h-3 ml-1" />
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                          
                                          <div className="mt-3 text-xs text-gray-500">
                                            Projet du {format(new Date(obj.projet.date_debut), 'dd/MM/yyyy', { locale: fr })}
                                            {obj.projet.date_fin_prevue && ` au ${format(new Date(obj.projet.date_fin_prevue), 'dd/MM/yyyy', { locale: fr })}`}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
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