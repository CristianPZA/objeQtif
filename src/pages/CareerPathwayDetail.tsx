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
  CheckCircle
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
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (areaId) {
      fetchPathwayData(areaId);
    }
  }, [areaId]);

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
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/career-pathways')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour aux domaines</span>
        </button>
      </div>

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
                  <button
                    onClick={() => toggleTheme(theme.id)}
                    className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{theme.name}</h3>
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
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      {pathwayData.levels.map((level) => {
                        const skills = getSkillsForThemeAndLevel(theme.id, level.id);
                        const colors = getColorClasses(level.color);
                        const isLevelSelected = selectedLevel === level.id;
                        
                        if (skills.length === 0) return null;
                        if (selectedLevel && !isLevelSelected) return null;

                        return (
                          <div key={level.id} className="p-6 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-center gap-3 mb-4">
                              <div className={`px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}>
                                {level.name}
                              </div>
                              <ArrowRight className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">{level.description}</span>
                            </div>
                            
                            <div className="space-y-3">
                              {skills.map((skill) => (
                                <div key={skill.id} className="p-4 bg-gray-50 rounded-lg">
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
                              ))}
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
    </div>
  );
};

export default CareerPathwayDetail;