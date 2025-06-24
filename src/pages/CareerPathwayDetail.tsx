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
  Search,
  Filter,
  ArrowRight,
  CheckCircle,
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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

const CareerPathwayDetail = () => {
  const { areaId } = useParams<{ areaId: string }>();
  const navigate = useNavigate();
  
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
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [showCreateThemeForm, setShowCreateThemeForm] = useState(false);
  const [editingTheme, setEditingTheme] = useState<DevelopmentTheme | null>(null);
  const [editingSkill, setEditingSkill] = useState<PathwaySkill | null>(null);
  const [showCreateSkillForm, setShowCreateSkillForm] = useState(false);
  const [selectedThemeForSkill, setSelectedThemeForSkill] = useState<string | null>(null);
  const [selectedLevelForSkill, setSelectedLevelForSkill] = useState<string | null>(null);

  const [themeFormData, setThemeFormData] = useState({
    name: '',
    description: ''
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
    return userRole && ['direction', 'admin'].includes(userRole);
  };

  const fetchPathwayData = async (careerAreaId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [areaResult, levelsResult, themesResult, skillsResult] = await Promise.all([
        supabase.from('career_areas').select('*').eq('id', careerAreaId).eq('is_active', true).single(),
        supabase.from('career_levels').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('development_themes').select('*').eq('career_area_id', careerAreaId).eq('is_active', true).order('sort_order'),
        supabase.from('pathway_skills').select('*').order('sort_order')
      ]);

      if (areaResult.error) throw areaResult.error;
      if (levelsResult.error) throw levelsResult.error;
      if (themesResult.error) throw themesResult.error;
      if (skillsResult.error) throw skillsResult.error;

      setPathwayData({
        area: areaResult.data,
        levels: levelsResult.data || [],
        themes: themesResult.data || [],
        skills: skillsResult.data || []
      });
    } catch (err) {
      console.error('Error fetching pathway data:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
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
      
      const { error } = await supabase
        .from('development_themes')
        .insert([{
          career_area_id: pathwayData.area.id,
          name: themeFormData.name,
          description: themeFormData.description,
          sort_order: maxSortOrder + 1
        }]);

      if (error) throw error;

      setSuccess('Thème de développement créé avec succès');
      resetThemeForm();
      setShowCreateThemeForm(false);
      fetchPathwayData(pathwayData.area.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du thème');
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
      const { error } = await supabase
        .from('development_themes')
        .update({
          name: themeFormData.name,
          description: themeFormData.description
        })
        .eq('id', editingTheme.id);

      if (error) throw error;

      setSuccess('Thème de développement modifié avec succès');
      setEditingTheme(null);
      resetThemeForm();
      fetchPathwayData(pathwayData.area.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification du thème');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTheme = async (theme: DevelopmentTheme) => {
    if (!canManagePathways()) return;

    if (!confirm(`Êtes-vous sûr de vouloir supprimer le thème "${theme.name}" ? Toutes les compétences associées seront également supprimées.`)) {
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

      setSuccess('Thème de développement supprimé avec succès');
      if (pathwayData.area) {
        fetchPathwayData(pathwayData.area.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression du thème');
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

      setSuccess('Compétence créée avec succès');
      resetSkillForm();
      setShowCreateSkillForm(false);
      if (pathwayData.area) {
        fetchPathwayData(pathwayData.area.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la compétence');
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

      setSuccess('Compétence modifiée avec succès');
      setEditingSkill(null);
      resetSkillForm();
      if (pathwayData.area) {
        fetchPathwayData(pathwayData.area.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification de la compétence');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSkill = async (skill: PathwaySkill) => {
    if (!canManagePathways()) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette compétence ?')) {
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

      setSuccess('Compétence supprimée avec succès');
      if (pathwayData.area) {
        fetchPathwayData(pathwayData.area.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression de la compétence');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditThemeForm = (theme: DevelopmentTheme) => {
    setEditingTheme(theme);
    setThemeFormData({
      name: theme.name,
      description: theme.description
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
      description: ''
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

  const filteredThemes = pathwayData.themes.filter(theme => {
    if (!searchTerm) return true;
    return theme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           theme.description?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getSkillsForThemeAndLevel = (themeId: string, levelId: string) => {
    return pathwayData.skills.filter(skill => 
      skill.development_theme_id === themeId && skill.career_level_id === levelId
    );
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
          <h3 className="font-medium mb-2">Erreur de chargement</h3>
          <p className="text-sm">{error || 'Domaine de carrière non trouvé'}</p>
          <button 
            onClick={() => navigate('/career-pathways')}
            className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md transition-colors text-sm"
          >
            Retour aux domaines
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
          <span>Retour aux domaines</span>
        </button>

        {canManagePathways() && (
          <button
            onClick={() => setShowCreateThemeForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouveau thème
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
            <Settings className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Mode administrateur</h3>
              <p className="text-sm text-blue-700 mt-1">
                Vous pouvez créer, modifier et supprimer les thèmes de développement et leurs compétences associées.
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

      {/* Career Levels Legend */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Niveaux de carrière</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {pathwayData.levels.map((level, index) => {
            const colors = getColorClasses(level.color);
            const isSelected = selectedLevel === level.id;
            
            return (
              <button
                key={level.id}
                onClick={() => setSelectedLevel(isSelected ? null : level.id)}
                className={`p-3 rounded-lg border transition-all text-center ${
                  isSelected 
                    ? `${colors.bg} ${colors.border} ${colors.text}` 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isSelected ? 'bg-white bg-opacity-50' : colors.bg
                  }`}>
                    {index + 1}
                  </div>
                </div>
                <h3 className="font-medium text-sm text-gray-900 mb-1">{level.name}</h3>
                <p className="text-xs text-gray-600">{level.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher dans les thèmes de développement..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtres
          </button>
        </div>
        
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Filtrer par niveau</h4>
            <div className="flex flex-wrap gap-2">
              {pathwayData.levels.map((level) => {
                const colors = getColorClasses(level.color);
                const isActive = selectedLevel === level.id;
                
                return (
                  <button
                    key={level.id}
                    onClick={() => setSelectedLevel(isActive ? null : level.id)}
                    className={`px-3 py-1 rounded-full text-sm transition-all ${
                      isActive 
                        ? `${colors.bg} ${colors.text}` 
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {level.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Development Themes and Skills */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Thèmes de développement
          </h2>
          <span className="text-sm text-gray-500">
            {filteredThemes.length} thème{filteredThemes.length > 1 ? 's' : ''}
          </span>
        </div>

        {filteredThemes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
            <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun thème trouvé</h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'Aucun thème ne correspond à vos critères de recherche.'
                : 'Aucun thème de développement disponible pour ce domaine.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredThemes.map((theme) => {
              const isExpanded = expandedThemes.has(theme.id);
              const hasSkills = pathwayData.skills.some(skill => skill.development_theme_id === theme.id);
              
              return (
                <div key={theme.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{theme.name}</h3>
                          {canManagePathways() && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => openEditThemeForm(theme)}
                                className="p-1 text-gray-400 hover:text-indigo-600 rounded"
                                title="Modifier le thème"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTheme(theme)}
                                className="p-1 text-gray-400 hover:text-red-600 rounded"
                                title="Supprimer le thème"
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
                            {pathwayData.skills.filter(s => s.development_theme_id === theme.id).length} compétence{pathwayData.skills.filter(s => s.development_theme_id === theme.id).length > 1 ? 's' : ''}
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
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-600">{level.description}</span>
                              </div>
                              {canManagePathways() && (
                                <button
                                  onClick={() => openCreateSkillForm(theme.id, level.id)}
                                  className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  Ajouter compétence
                                </button>
                              )}
                            </div>
                            
                            <div className="space-y-3">
                              {skills.map((skill) => (
                                <div key={skill.id} className="p-4 bg-gray-50 rounded-lg">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="text-gray-900 leading-relaxed">{skill.skill_description}</p>
                                      {skill.examples && (
                                        <div className="mt-2 text-sm text-gray-600">
                                          <strong>Exemples:</strong> {skill.examples}
                                        </div>
                                      )}
                                      {skill.requirements && (
                                        <div className="mt-2 text-sm text-gray-600">
                                          <strong>Prérequis:</strong> {skill.requirements}
                                        </div>
                                      )}
                                    </div>
                                    {canManagePathways() && (
                                      <div className="flex gap-1 ml-3">
                                        <button
                                          onClick={() => openEditSkillForm(skill)}
                                          className="p-1 text-gray-400 hover:text-indigo-600 rounded"
                                          title="Modifier la compétence"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSkill(skill)}
                                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                                          title="Supprimer la compétence"
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
                                  Aucune compétence définie pour ce niveau
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
            <h3 className="text-lg font-medium text-blue-900 mb-2">Utilisation de ce parcours</h3>
            <div className="text-blue-800 space-y-2">
              <p>• <strong>Explorez les thèmes</strong> pour identifier les compétences à développer dans votre domaine</p>
              <p>• <strong>Utilisez les filtres</strong> pour vous concentrer sur un niveau spécifique</p>
              <p>• <strong>Consultez les exemples</strong> pour comprendre l'application pratique des compétences</p>
              <p>• <strong>Discutez avec votre manager ou coach RH</strong> pour définir votre plan de développement personnalisé</p>
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
                {editingTheme ? 'Modifier le thème' : 'Nouveau thème de développement'}
              </h2>
            </div>

            <form onSubmit={editingTheme ? handleEditTheme : handleCreateTheme} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du thème *
                </label>
                <input
                  type="text"
                  required
                  value={themeFormData.name}
                  onChange={(e) => setThemeFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ex: Machine Learning Development"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={themeFormData.description}
                  onChange={(e) => setThemeFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Description du thème de développement"
                />
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
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {submitting ? (editingTheme ? 'Modification...' : 'Création...') : (editingTheme ? 'Modifier' : 'Créer')}
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
                {editingSkill ? 'Modifier la compétence' : 'Nouvelle compétence'}
              </h2>
              {!editingSkill && selectedThemeForSkill && selectedLevelForSkill && (
                <p className="text-sm text-gray-600 mt-1">
                  Thème: {pathwayData.themes.find(t => t.id === selectedThemeForSkill)?.name} • 
                  Niveau: {pathwayData.levels.find(l => l.id === selectedLevelForSkill)?.name}
                </p>
              )}
            </div>

            <form onSubmit={editingSkill ? handleEditSkill : handleCreateSkill} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description de la compétence *
                </label>
                <textarea
                  required
                  rows={3}
                  value={skillFormData.skill_description}
                  onChange={(e) => setSkillFormData(prev => ({ ...prev, skill_description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Description détaillée de la compétence"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exemples
                </label>
                <textarea
                  rows={2}
                  value={skillFormData.examples}
                  onChange={(e) => setSkillFormData(prev => ({ ...prev, examples: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Exemples concrets d'application de cette compétence"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prérequis
                </label>
                <textarea
                  rows={2}
                  value={skillFormData.requirements}
                  onChange={(e) => setSkillFormData(prev => ({ ...prev, requirements: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Prérequis nécessaires pour développer cette compétence"
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
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {submitting ? (editingSkill ? 'Modification...' : 'Création...') : (editingSkill ? 'Modifier' : 'Créer')}
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