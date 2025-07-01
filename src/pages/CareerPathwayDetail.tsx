import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Target, 
  Users, 
  TrendingUp, 
  ChevronRight, 
  ChevronDown,
  Award,
  Lightbulb,
  Star,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Filter,
  Tag,
  Layers
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

interface CareerArea {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
}

interface CareerLevel {
  id: string;
  name: string;
  short_name: string;
  description: string;
  sort_order: number;
  color: string;
}

interface DevelopmentTheme {
  id: string;
  career_area_id: string;
  name: string;
  description: string;
  sort_order: number;
  is_core?: boolean; // Nouvelle propriété pour indiquer si c'est un tronc commun
  specialty?: string; // Nouvelle propriété pour indiquer la spécialité
}

interface PathwaySkill {
  id: string;
  development_theme_id: string;
  career_level_id: string;
  skill_description: string;
  examples: string | null;
  requirements: string | null;
}

interface PathwayData {
  area: CareerArea | null;
  levels: CareerLevel[];
  themes: DevelopmentTheme[];
  skills: PathwaySkill[];
}

interface ThemeGroup {
  baseThemeName: string;
  themes: DevelopmentTheme[];
  isCore: boolean;
}

const CareerPathwayDetail = () => {
  const { areaId } = useParams<{ areaId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [pathwayData, setPathwayData] = useState<PathwayData>({
    area: null,
    levels: [],
    themes: [],
    skills: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [selectedThemeGroup, setSelectedThemeGroup] = useState<string | null>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);

  // Form states
  const [showCreateThemeForm, setShowCreateThemeForm] = useState(false);
  const [editingTheme, setEditingTheme] = useState<DevelopmentTheme | null>(null);
  const [editingSkill, setEditingSkill] = useState<PathwaySkill | null>(null);
  const [showCreateSkillForm, setShowCreateSkillForm] = useState(false);
  const [selectedThemeForSkill, setSelectedThemeForSkill] = useState<string | null>(null);
  const [selectedLevelForSkill, setSelectedLevelForSkill] = useState<string | null>(null);

  const [themeFormData, setThemeFormData] = useState({
    name: '',
    description: '',
    is_core: false,
    specialty: ''
  });

  const [skillFormData, setSkillFormData] = useState({
    skill_description: '',
    examples: '',
    requirements: ''
  });

  useEffect(() => {
    checkUserRole();
    if (areaId) {
      fetchPathwayData(areaId);
    }
  }, [areaId]);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserRole(profile.role);
      }
    } catch (err) {
      console.error('Error checking user role:', err);
    }
  };

  const canManagePathways = () => {
    return userRole && ['admin'].includes(userRole);
  };

  const fetchPathwayData = async (careerAreaId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [areaResult, levelsResult, themesResult, skillsResult] = await Promise.all([
        supabase.from('career_areas').select('*').eq('id', careerAreaId).eq('is_active', true).single(),
        supabase.from('career_levels').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('development_themes').select('*').eq('career_area_id', careerAreaId).eq('is_active', true).order('name'),
        supabase.from('pathway_skills').select('*').order('sort_order')
      ]);

      if (areaResult.error) throw areaResult.error;
      if (levelsResult.error) throw levelsResult.error;
      if (themesResult.error) throw themesResult.error;
      if (skillsResult.error) throw skillsResult.error;

      // Enrichir les thèmes avec les propriétés is_core et specialty
      const enrichedThemes = (themesResult.data || []).map(theme => {
        // Un thème est considéré comme tronc commun s'il ne contient pas de tiret
        // Utiliser une regex pour détecter spécifiquement le pattern "Nom - Spécialité"
        const specialtyMatch = theme.name.match(/^([^-]+)\s*-\s*([^(]+)/);
        const isCore = !specialtyMatch;
        const specialty = specialtyMatch ? specialtyMatch[2].trim() : null;
        
        return {
          ...theme,
          is_core: isCore,
          specialty: specialty
        };
      });

      setPathwayData({
        area: areaResult.data,
        levels: levelsResult.data || [],
        themes: enrichedThemes,
        skills: skillsResult.data || []
      });
    } catch (err) {
      console.error('Error fetching pathway data:', err);
      setError(err instanceof Error ? err.message : t('careerPathways.errorLoadingData'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManagePathways() || !pathwayData.area) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const maxSortOrder = Math.max(...pathwayData.themes.map(theme => theme.sort_order), 0);
      
      // Construire le nom complet du thème (avec spécialité si applicable)
      let fullName = themeFormData.name;
      if (!themeFormData.is_core && themeFormData.specialty) {
        fullName = `${themeFormData.name} - ${themeFormData.specialty}`;
      }
      
      const { error } = await supabase
        .from('development_themes')
        .insert([{
          career_area_id: pathwayData.area.id,
          name: fullName,
          description: themeFormData.description,
          sort_order: maxSortOrder + 1
        }]);

      if (error) throw error;

      setSuccess(t('careerPathways.themeCreatedSuccess'));
      resetThemeForm();
      setShowCreateThemeForm(false);
      fetchPathwayData(pathwayData.area.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('careerPathways.errorCreatingTheme'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTheme || !canManagePathways() || !pathwayData.area) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Construire le nom complet du thème (avec spécialité si applicable)
      let fullName = themeFormData.name;
      if (!themeFormData.is_core && themeFormData.specialty) {
        fullName = `${themeFormData.name} - ${themeFormData.specialty}`;
      }
      
      const { error } = await supabase
        .from('development_themes')
        .update({
          name: fullName,
          description: themeFormData.description
        })
        .eq('id', editingTheme.id);

      if (error) throw error;

      setSuccess(t('careerPathways.themeUpdatedSuccess'));
      setEditingTheme(null);
      resetThemeForm();
      fetchPathwayData(pathwayData.area.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('careerPathways.errorUpdatingTheme'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTheme = async (theme: DevelopmentTheme) => {
    if (!canManagePathways()) return;

    if (!confirm(t('careerPathways.confirmDeleteTheme', { name: theme.name }))) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('development_themes')
        .update({ is_active: false })
        .eq('id', theme.id);

      if (error) throw error;

      setSuccess(t('careerPathways.themeDeletedSuccess'));
      if (pathwayData.area) {
        fetchPathwayData(pathwayData.area.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('careerPathways.errorDeletingTheme'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManagePathways() || !selectedThemeForSkill || !selectedLevelForSkill) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Vérifier si une compétence avec la même description existe déjà pour ce thème et niveau
      const existingSkills = pathwayData.skills.filter(
        skill => skill.development_theme_id === selectedThemeForSkill && 
                skill.career_level_id === selectedLevelForSkill &&
                skill.skill_description === skillFormData.skill_description
      );
      
      if (existingSkills.length > 0) {
        const theme = pathwayData.themes.find(t => t.id === selectedThemeForSkill);
        const level = pathwayData.levels.find(l => l.id === selectedLevelForSkill);
        throw new Error(t('careerPathways.skillAlreadyExists', { 
          theme: theme?.name || 'Unknown', 
          level: level?.name || 'Unknown' 
        }));
      }
      
      const { error } = await supabase
        .from('pathway_skills')
        .insert([{
          development_theme_id: selectedThemeForSkill,
          career_level_id: selectedLevelForSkill,
          skill_description: skillFormData.skill_description,
          examples: skillFormData.examples || null,
          requirements: skillFormData.requirements || null
        }]);

      if (error) throw error;

      setSuccess(t('careerPathways.skillCreatedSuccess'));
      resetSkillForm();
      setShowCreateSkillForm(false);
      if (pathwayData.area) {
        fetchPathwayData(pathwayData.area.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('careerPathways.errorCreatingSkill'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill || !canManagePathways()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('pathway_skills')
        .update({
          skill_description: skillFormData.skill_description,
          examples: skillFormData.examples || null,
          requirements: skillFormData.requirements || null
        })
        .eq('id', editingSkill.id);

      if (error) throw error;

      setSuccess(t('careerPathways.skillUpdatedSuccess'));
      setEditingSkill(null);
      resetSkillForm();
      if (pathwayData.area) {
        fetchPathwayData(pathwayData.area.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('careerPathways.errorUpdatingSkill'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSkill = async (skill: PathwaySkill) => {
    if (!canManagePathways()) return;

    if (!confirm(t('careerPathways.confirmDeleteSkill'))) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('pathway_skills')
        .delete()
        .eq('id', skill.id);

      if (error) throw error;

      setSuccess(t('careerPathways.skillDeletedSuccess'));
      if (pathwayData.area) {
        fetchPathwayData(pathwayData.area.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('careerPathways.errorDeletingSkill'));
    } finally {
      setSubmitting(false);
    }
  };

  const openEditThemeForm = (theme: DevelopmentTheme) => {
    // Extraire le nom de base et la spécialité
    let baseName = theme.name;
    let specialty = '';
    let isCore = true;
    
    // Utiliser une regex pour détecter spécifiquement le pattern "Nom - Spécialité"
    const specialtyMatch = theme.name.match(/^([^-]+)\s*-\s*([^(]+)/);
    if (specialtyMatch) {
      baseName = specialtyMatch[1].trim();
      specialty = specialtyMatch[2].trim();
      isCore = false;
    }
    
    setEditingTheme(theme);
    setThemeFormData({
      name: baseName,
      description: theme.description,
      is_core: isCore,
      specialty: specialty
    });
  };

  const openEditSkillForm = (skill: PathwaySkill) => {
    setEditingSkill(skill);
    setSkillFormData({
      skill_description: skill.skill_description,
      examples: skill.examples || '',
      requirements: skill.requirements || ''
    });
  };

  const openCreateSkillForm = (themeId: string, levelId: string) => {
    setSelectedThemeForSkill(themeId);
    setSelectedLevelForSkill(levelId);
    setShowCreateSkillForm(true);
  };

  const resetThemeForm = () => {
    setThemeFormData({
      name: '',
      description: '',
      is_core: false,
      specialty: ''
    });
  };

  const resetSkillForm = () => {
    setSkillFormData({
      skill_description: '',
      examples: '',
      requirements: ''
    });
    setSelectedThemeForSkill(null);
    setSelectedLevelForSkill(null);
  };

  const toggleTheme = (themeId: string) => {
    const newExpanded = new Set(expandedThemes);
    if (newExpanded.has(themeId)) {
      newExpanded.delete(themeId);
    } else {
      newExpanded.add(themeId);
    }
    setExpandedThemes(newExpanded);
  };

  // Fonction pour extraire le nom de base d'un thème (sans les suffixes comme "- Teamwork")
  const getBaseThemeName = (themeName: string): string => {
    // Utiliser une regex pour extraire le nom de base avant le tiret
    const match = themeName.match(/^([^-]+)(?:\s*-\s*.+)?$/);
    return match ? match[1].trim() : themeName;
  };

  // Fonction pour extraire la spécialité d'un thème
  const getSpecialty = (themeName: string): string | null => {
    // Utiliser une regex pour extraire la spécialité après le tiret
    const match = themeName.match(/^[^-]+\s*-\s*([^(]+)/);
    return match ? match[1].trim() : null;
  };

  // Regrouper les thèmes par nom de base
  const groupThemesByBaseName = (): ThemeGroup[] => {
    const themeGroups: Record<string, ThemeGroup> = {};
    
    pathwayData.themes.forEach(theme => {
      const baseThemeName = getBaseThemeName(theme.name);
      // Un thème est considéré comme tronc commun s'il ne contient pas de tiret suivi d'un texte
      const isCore = !theme.name.match(/^[^-]+\s*-\s*[^(]+/);
      
      if (!themeGroups[baseThemeName]) {
        themeGroups[baseThemeName] = {
          baseThemeName,
          themes: [],
          isCore
        };
      }
      
      themeGroups[baseThemeName].themes.push(theme);
    });
    
    // Convertir l'objet en tableau et trier par nom de base
    return Object.values(themeGroups).sort((a, b) => 
      a.baseThemeName.localeCompare(b.baseThemeName)
    );
  };

  // Obtenir toutes les spécialités uniques
  const getUniqueSpecialties = (): string[] => {
    const specialties = new Set<string>();
    
    pathwayData.themes.forEach(theme => {
      const specialty = getSpecialty(theme.name);
      if (specialty) {
        specialties.add(specialty);
      }
    });
    
    return Array.from(specialties).sort();
  };

  const themeGroups = groupThemesByBaseName();
  const specialties = getUniqueSpecialties();

  // Filtrer les thèmes en fonction des sélections
  const filteredThemes = pathwayData.themes.filter(theme => {
    // Filtre par groupe de thème
    if (selectedThemeGroup && getBaseThemeName(theme.name) !== selectedThemeGroup) {
      return false;
    }
    
    // Filtre par spécialité
    if (selectedSpecialty) {
      // Utiliser une regex pour vérifier si le thème contient la spécialité après un tiret
      const specialtyPattern = new RegExp(`^[^-]+\\s*-\\s*${selectedSpecialty}(?:\\s|$)`);
      if (!specialtyPattern.test(theme.name)) {
        return false;
      }
    }
    
    return true;
  });

  const handleThemeGroupFilterChange = (baseThemeName: string | null) => {
    setSelectedThemeGroup(baseThemeName === selectedThemeGroup ? null : baseThemeName);
  };

  const handleSpecialtyFilterChange = (specialty: string | null) => {
    setSelectedSpecialty(specialty === selectedSpecialty ? null : specialty);
  };

  const getSkillsForThemeAndLevel = (themeId: string, levelId: string) => {
    return pathwayData.skills.filter(skill => 
      skill.development_theme_id === themeId && skill.career_level_id === levelId
    );
  };

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string; hover: string }> = {
      green: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', hover: 'hover:bg-green-200' },
      blue: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', hover: 'hover:bg-blue-200' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', hover: 'hover:bg-purple-200' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', hover: 'hover:bg-orange-200' },
      red: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', hover: 'hover:bg-red-200' },
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', hover: 'hover:bg-indigo-200' },
      gray: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', hover: 'hover:bg-gray-200' }
    };
    return colorMap[color] || colorMap.gray;
  };

  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      target: Target,
      calculator: TrendingUp,
      users: Users,
      award: Award,
      lightbulb: Lightbulb,
      star: Star
    };
    const IconComponent = iconMap[iconName] || Target;
    return <IconComponent className="w-6 h-6" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !pathwayData.area) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg max-w-md mx-auto">
          <h3 className="font-medium mb-2">{t('careerPathways.loadingError')}</h3>
          <p className="text-sm">{error || t('careerPathways.domainNotFound')}</p>
          <button 
            onClick={() => navigate('/career-pathways')}
            className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md transition-colors text-sm"
          >
            {t('common.back')} {t('careerPathways.domains').toLowerCase()}
          </button>
        </div>
      </div>
    );
  }

  const areaColors = getColorClasses(pathwayData.area.color);

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/career-pathways')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('common.back')} {t('careerPathways.domains').toLowerCase()}</span>
        </button>

        {canManagePathways() && (
          <button
            onClick={() => setShowCreateThemeForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('careerPathways.newTheme')}
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg">
          {success}
        </div>
      )}

      {/* Admin Info */}
      {canManagePathways() && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Edit className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">{t('careerPathways.adminMode')}</h3>
              <p className="text-sm text-blue-700 mt-1">
                {t('careerPathways.adminModeThemes')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Area Header */}
      <div className={`bg-gradient-to-r ${areaColors.bg} ${areaColors.border} border rounded-xl p-8`}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`p-3 bg-white rounded-xl shadow-sm`}>
            {getIconComponent(pathwayData.area.icon)}
          </div>
          <div>
            <h1 className={`text-3xl font-bold ${areaColors.text} mb-2`}>
              {pathwayData.area.name}
            </h1>
            <p className="text-lg text-gray-700">
              {pathwayData.area.description}
            </p>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5 text-indigo-600" />
          Filtres
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Filtre par groupe de thème */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Groupes de thèmes</h3>
            <div className="flex flex-wrap gap-2">
              {themeGroups.map((group) => {
                const isSelected = selectedThemeGroup === group.baseThemeName;
                
                return (
                  <button
                    key={group.baseThemeName}
                    onClick={() => handleThemeGroupFilterChange(group.baseThemeName)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      isSelected 
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' 
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {group.baseThemeName}
                  </button>
                );
              })}
              
              {selectedThemeGroup && (
                <button
                  onClick={() => setSelectedThemeGroup(null)}
                  className="px-3 py-1 rounded-lg text-sm bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 transition-colors"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>
          
          {/* Filtre par spécialité */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Spécialités</h3>
            <div className="flex flex-wrap gap-2">
              {specialties.map((specialty) => {
                const isSelected = selectedSpecialty === specialty;
                
                return (
                  <button
                    key={specialty}
                    onClick={() => handleSpecialtyFilterChange(specialty)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      isSelected 
                        ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {specialty}
                  </button>
                );
              })}
              
              {selectedSpecialty && (
                <button
                  onClick={() => setSelectedSpecialty(null)}
                  className="px-3 py-1 rounded-lg text-sm bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 transition-colors"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>
          
          {/* Bouton de réinitialisation des filtres */}
          {(selectedThemeGroup || selectedSpecialty) && (
            <div className="md:col-span-2">
              <button
                onClick={() => {
                  setSelectedThemeGroup(null);
                  setSelectedSpecialty(null);
                }}
                className="px-3 py-1 rounded-lg text-sm bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 transition-colors"
              >
                Réinitialiser tous les filtres
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Development Themes and Skills */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {selectedThemeGroup ? selectedThemeGroup : t('careerPathways.developmentThemes')}
            {selectedSpecialty && <span className="ml-2 text-purple-600">• Spécialité: {selectedSpecialty}</span>}
          </h2>
          <span className="text-sm text-gray-500">
            {filteredThemes.length} {t('common.theme', { count: filteredThemes.length })}
          </span>
        </div>

        {filteredThemes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
            <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('careerPathways.noThemesFound')}</h3>
            <p className="text-gray-600">
              {t('careerPathways.noThemesAvailable')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredThemes.map((theme) => {
              const isExpanded = expandedThemes.has(theme.id);
              const hasSkills = pathwayData.skills.some(skill => skill.development_theme_id === theme.id);
              // Utiliser une regex pour détecter spécifiquement le pattern "Nom - Spécialité"
              const specialtyMatch = theme.name.match(/^([^-]+)\s*-\s*([^(]+)/);
              const isCore = !specialtyMatch;
              const specialty = specialtyMatch ? specialtyMatch[2].trim() : null;
              
              return (
                <div key={theme.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {isCore ? (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Tronc commun
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                              Spécialité: {specialty}
                            </span>
                          )}
                          <h3 className="text-lg font-semibold text-gray-900 break-words">{theme.name}</h3>
                          {canManagePathways() && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => openEditThemeForm(theme)}
                                className="p-1 text-gray-400 hover:text-indigo-600 rounded"
                                title={t('common.editTheme')}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTheme(theme)}
                                className="p-1 text-gray-400 hover:text-red-600 rounded"
                                title={t('common.deleteTheme')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        {theme.description && (
                          <p className="text-gray-600">{theme.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {hasSkills && (
                          <span className="text-sm text-gray-500">
                            {pathwayData.skills.filter(s => s.development_theme_id === theme.id).length} {t('common.skill', { count: pathwayData.skills.filter(s => s.development_theme_id === theme.id).length })}
                          </span>
                        )}
                        <button
                          onClick={() => toggleTheme(theme.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      {pathwayData.levels.map((level) => {
                        const skills = getSkillsForThemeAndLevel(theme.id, level.id);
                        const colors = getColorClasses(level.color);
                        const isLevelSelected = selectedLevel === level.id;
                        
                        if (selectedLevel && !isLevelSelected) return null;

                        return (
                          <div key={level.id} className="p-6 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}>
                                  {level.name}
                                </div>
                              </div>
                              {canManagePathways() && (
                                <button
                                  onClick={() => openCreateSkillForm(theme.id, level.id)}
                                  className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  {t('careerPathways.addSkill')}
                                </button>
                              )}
                            </div>
                            
                            <div className="space-y-3">
                              {skills.map((skill) => (
                                <div key={skill.id} className="p-4 bg-gray-50 rounded-lg">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="text-gray-900 leading-relaxed break-words">{skill.skill_description}</p>
                                      {skill.examples && (
                                        <div className="mt-2 text-sm text-gray-600">
                                          <strong>{t('common.examples')}:</strong> {skill.examples}
                                        </div>
                                      )}
                                      {skill.requirements && (
                                        <div className="mt-2 text-sm text-gray-600">
                                          <strong>{t('common.requirements')}:</strong> {skill.requirements}
                                        </div>
                                      )}
                                    </div>
                                    {canManagePathways() && (
                                      <div className="flex gap-1 ml-3">
                                        <button
                                          onClick={() => openEditSkillForm(skill)}
                                          className="p-1 text-gray-400 hover:text-indigo-600 rounded"
                                          title={t('common.editSkill')}
                                        >
                                          <Edit className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSkill(skill)}
                                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                                          title={t('common.deleteSkill')}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {skills.length === 0 && (
                                <div className="text-center py-4 text-gray-500">
                                  {t('careerPathways.noSkillsDefined')}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-medium text-blue-900 mb-2">{t('careerPathways.usage')}</h3>
            <div className="text-blue-800 space-y-2">
              <p>• <strong>{t('careerPathways.exploreThemes')}</strong></p>
              <p>• <strong>{t('careerPathways.useFilters')}</strong></p>
              <p>• <strong>{t('careerPathways.consultExamples')}</strong></p>
              <p>• <strong>{t('careerPathways.discussWithManager')}</strong></p>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Theme Form Modal */}
      {(showCreateThemeForm || editingTheme) && canManagePathways() && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingTheme ? t('careerPathways.editTheme') : t('careerPathways.newTheme')}
              </h2>
            </div>

            <form onSubmit={editingTheme ? handleEditTheme : handleCreateTheme} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('careerPathways.themeName')} *
                </label>
                <input
                  type="text"
                  required
                  value={themeFormData.name}
                  onChange={(e) => setThemeFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={t('careerPathways.themeNamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.description')}
                </label>
                <textarea
                  required
                  rows={3}
                  value={themeFormData.description}
                  onChange={(e) => setThemeFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={t('careerPathways.themeDescriptionPlaceholder')}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_core"
                    checked={themeFormData.is_core}
                    onChange={(e) => setThemeFormData(prev => ({ ...prev, is_core: e.target.checked }))}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_core" className="ml-2 block text-sm text-gray-900">
                    Tronc commun
                  </label>
                </div>
                
                {!themeFormData.is_core && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Spécialité *
                    </label>
                    <input
                      type="text"
                      required={!themeFormData.is_core}
                      value={themeFormData.specialty}
                      onChange={(e) => setThemeFormData(prev => ({ ...prev, specialty: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Ex: Teamwork, Innovation, Customer Recognition"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      La spécialité sera ajoutée au nom du thème sous la forme "Nom - Spécialité"
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    if (editingTheme) {
                      setEditingTheme(null);
                    } else {
                      setShowCreateThemeForm(false);
                    }
                    resetThemeForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {submitting ? (editingTheme ? t('common.updating') : t('common.creating')) : (editingTheme ? t('common.update') : t('common.create'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Skill Form Modal */}
      {(showCreateSkillForm || editingSkill) && canManagePathways() && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingSkill ? t('careerPathways.editSkill') : t('careerPathways.newSkill')}
              </h2>
              {!editingSkill && selectedThemeForSkill && selectedLevelForSkill && (
                <p className="text-sm text-gray-600 mt-1">
                  {t('careerPathways.themeAndLevel', {
                    theme: pathwayData.themes.find(t => t.id === selectedThemeForSkill)?.name,
                    level: pathwayData.levels.find(l => l.id === selectedLevelForSkill)?.name
                  })}
                </p>
              )}
            </div>

            <form onSubmit={editingSkill ? handleEditSkill : handleCreateSkill} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('careerPathways.skillDescription')} *
                </label>
                <textarea
                  required
                  rows={3}
                  value={skillFormData.skill_description}
                  onChange={(e) => setSkillFormData(prev => ({ ...prev, skill_description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={t('careerPathways.skillDescriptionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.examples')}
                </label>
                <textarea
                  rows={2}
                  value={skillFormData.examples}
                  onChange={(e) => setSkillFormData(prev => ({ ...prev, examples: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={t('careerPathways.examplesPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.requirements')}
                </label>
                <textarea
                  rows={2}
                  value={skillFormData.requirements}
                  onChange={(e) => setSkillFormData(prev => ({ ...prev, requirements: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={t('careerPathways.requirementsPlaceholder')}
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    if (editingSkill) {
                      setEditingSkill(null);
                    } else {
                      setShowCreateSkillForm(false);
                    }
                    resetSkillForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {submitting ? (editingSkill ? t('common.updating') : t('common.creating')) : (editingSkill ? t('common.update') : t('common.create'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareerPathwayDetail;