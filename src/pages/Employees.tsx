import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

// Import components
import EmployeeList from '../components/employees/EmployeeList';
import EmployeeFilters from '../components/employees/EmployeeFilters';
import EmployeeDetail from '../components/employees/EmployeeDetail';
import AnnualObjectivesList from '../components/employees/AnnualObjectivesList';
import ProjectEvaluationsList from '../components/employees/ProjectEvaluationsList';
import ProjectCollaborationsList from '../components/employees/ProjectCollaborationsList';

// Import types and utilities
import { 
  UserProfile, 
  AnnualObjective, 
  Evaluation, 
  ProjectCollaboration 
} from '../components/employees/types';
import {
  getCareerLevelBadge,
  getStatusColor,
  getStatusLabel,
  getProjectStatusColor,
  getProjectStatusLabel,
  getEvaluationStatusColor,
  getEvaluationStatusLabel,
  getScoreStars,
  getScoreBadgeColor
} from '../components/employees/utils';

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

  if (loading && !selectedEmployee && employees.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

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
          <EmployeeFilters 
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterRole={filterRole}
            setFilterRole={setFilterRole}
            filterDepartment={filterDepartment}
            setFilterDepartment={setFilterDepartment}
            roles={roles}
            departments={departments}
          />

          {/* Liste des employés */}
          <EmployeeList 
            employees={filteredEmployees}
            onEmployeeClick={handleEmployeeClick}
            getCareerLevelBadge={getCareerLevelBadge}
          />
        </>
      ) : (
        <>
          {/* Détail de l'employé */}
          <EmployeeDetail 
            employee={selectedEmployee}
            onBackToList={handleBackToList}
            getCareerLevelBadge={getCareerLevelBadge}
          />

          {/* Objectifs annuels */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Objectifs annuels</h2>
            </div>
            <div className="p-6">
              <AnnualObjectivesList 
                objectives={annualObjectives}
                expandedObjectives={expandedObjectives}
                toggleObjectiveExpansion={toggleObjectiveExpansion}
                getStatusColor={getStatusColor}
                getStatusLabel={(status) => getStatusLabel(status, t)}
                getCareerLevelBadge={getCareerLevelBadge}
                handleViewObjectives={handleViewObjectives}
              />
            </div>
          </div>

          {/* Évaluations de projets */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Évaluations de projets</h2>
            </div>
            <div className="p-6">
              <ProjectEvaluationsList 
                evaluations={projectEvaluations}
                expandedEvaluations={expandedEvaluations}
                toggleEvaluationExpansion={toggleEvaluationExpansion}
                getScoreStars={getScoreStars}
                getScoreBadgeColor={getScoreBadgeColor}
                getEvaluationStatusColor={getEvaluationStatusColor}
                getEvaluationStatusLabel={getEvaluationStatusLabel}
                handleViewEvaluation={handleViewEvaluation}
              />
            </div>
          </div>

          {/* Projets */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Projets</h2>
            </div>
            <div className="p-6">
              <ProjectCollaborationsList 
                collaborations={projectCollaborations}
                expandedProjects={expandedProjects}
                toggleProjectExpansion={toggleProjectExpansion}
                getProjectStatusColor={getProjectStatusColor}
                getProjectStatusLabel={(status) => getProjectStatusLabel(status, t)}
                handleViewProject={handleViewProject}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Employees;