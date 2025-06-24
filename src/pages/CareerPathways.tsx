import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Target, 
  Users, 
  TrendingUp, 
  ArrowRight,
  Lightbulb
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

const CareerPathways = () => {
  const [careerAreas, setCareerAreas] = useState<CareerArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCareerAreas();
  }, []);

  const fetchCareerAreas = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('career_areas')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setCareerAreas(data || []);
    } catch (err) {
      console.error('Error fetching career areas:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des domaines de carrière');
    } finally {
      setLoading(false);
    }
  };

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string; hover: string; gradient: string }> = {
      green: { 
        bg: 'bg-green-100', 
        text: 'text-green-800', 
        border: 'border-green-200', 
        hover: 'hover:bg-green-200',
        gradient: 'from-green-500 to-emerald-600'
      },
      blue: { 
        bg: 'bg-blue-100', 
        text: 'text-blue-800', 
        border: 'border-blue-200', 
        hover: 'hover:bg-blue-200',
        gradient: 'from-blue-500 to-cyan-600'
      },
      purple: { 
        bg: 'bg-purple-100', 
        text: 'text-purple-800', 
        border: 'border-purple-200', 
        hover: 'hover:bg-purple-200',
        gradient: 'from-purple-500 to-violet-600'
      },
      orange: { 
        bg: 'bg-orange-100', 
        text: 'text-orange-800', 
        border: 'border-orange-200', 
        hover: 'hover:bg-orange-200',
        gradient: 'from-orange-500 to-red-600'
      },
      red: { 
        bg: 'bg-red-100', 
        text: 'text-red-800', 
        border: 'border-red-200', 
        hover: 'hover:bg-red-200',
        gradient: 'from-red-500 to-pink-600'
      },
      indigo: { 
        bg: 'bg-indigo-100', 
        text: 'text-indigo-800', 
        border: 'border-indigo-200', 
        hover: 'hover:bg-indigo-200',
        gradient: 'from-indigo-500 to-purple-600'
      },
      gray: { 
        bg: 'bg-gray-100', 
        text: 'text-gray-800', 
        border: 'border-gray-200', 
        hover: 'hover:bg-gray-200',
        gradient: 'from-gray-500 to-slate-600'
      }
    };
    return colorMap[color] || colorMap.gray;
  };

  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      target: Target,
      calculator: TrendingUp,
      users: Users,
      lightbulb: Lightbulb
    };
    const IconComponent = iconMap[iconName] || Target;
    return <IconComponent className="w-8 h-8" />;
  };

  const handleAreaClick = (areaId: string) => {
    navigate(`/career-pathway/${areaId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg max-w-md mx-auto">
          <h3 className="font-medium mb-2">Erreur de chargement</h3>
          <p className="text-sm">{error}</p>
          <button 
            onClick={fetchCareerAreas}
            className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md transition-colors text-sm"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Career Pathways</h1>
        <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
          Découvrez les parcours de développement professionnel et les compétences requises 
          pour progresser dans votre carrière. Choisissez votre domaine d'expertise pour explorer 
          les différents niveaux et thèmes de développement.
        </p>
      </div>

      {/* Career Areas Grid */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {careerAreas.map((area) => {
            const colors = getColorClasses(area.color);
            
            return (
              <div
                key={area.id}
                onClick={() => handleAreaClick(area.id)}
                className="group cursor-pointer transform transition-all duration-300 hover:scale-105 h-full"
              >
                <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 hover:shadow-2xl transition-all duration-300 overflow-hidden h-full flex flex-col">
                  {/* Header with gradient - Fixed height */}
                  <div className={`bg-gradient-to-r ${colors.gradient} p-6 text-white flex-shrink-0`} style={{ minHeight: '160px' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                        {getIconComponent(area.icon)}
                      </div>
                      <ArrowRight className="w-6 h-6 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 leading-tight line-clamp-2">
                      {area.name}
                    </h3>
                  </div>
                  
                  {/* Content - Flexible height with minimum */}
                  <div className="p-6 flex-1 flex flex-col" style={{ minHeight: '180px' }}>
                    <p className="text-gray-600 leading-relaxed mb-4 flex-1 line-clamp-3">
                      {area.description}
                    </p>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}>
                        Parcours disponible
                      </span>
                      <div className="flex items-center text-indigo-600 font-medium text-sm group-hover:text-indigo-700 transition-colors">
                        Explorer
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {careerAreas.length === 0 && (
          <div className="text-center py-16">
            <Target className="mx-auto h-16 w-16 text-gray-400 mb-6" />
            <h3 className="text-2xl font-medium text-gray-900 mb-4">Aucun domaine de carrière disponible</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Les domaines de carrière seront bientôt disponibles. Contactez votre administrateur pour plus d'informations.
            </p>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Lightbulb className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-medium text-blue-900 mb-4">Comment utiliser les Career Pathways</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-800">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 text-sm font-bold mt-0.5">1</div>
                    <p><strong>Choisissez votre domaine</strong> qui correspond à votre expertise ou vos aspirations professionnelles</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 text-sm font-bold mt-0.5">2</div>
                    <p><strong>Explorez les niveaux</strong> pour comprendre la progression de carrière dans votre domaine</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 text-sm font-bold mt-0.5">3</div>
                    <p><strong>Consultez les thèmes</strong> pour identifier les compétences clés à développer</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 text-sm font-bold mt-0.5">4</div>
                    <p><strong>Planifiez votre développement</strong> avec votre manager ou coach RH</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareerPathways;