import React from 'react';
import { Target, ChevronDown, ChevronRight } from 'lucide-react';
import { AnnualObjective } from './types';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AnnualObjectivesListProps {
  objectives: AnnualObjective[];
  expandedObjectives: Set<string>;
  toggleObjectiveExpansion: (id: string) => void;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  getCareerLevelBadge: (level: { name: string, color: string }) => string;
  handleViewObjectives: (id: string) => void;
}

const AnnualObjectivesList: React.FC<AnnualObjectivesListProps> = ({
  objectives,
  expandedObjectives,
  toggleObjectiveExpansion,
  getStatusColor,
  getStatusLabel,
  getCareerLevelBadge,
  handleViewObjectives
}) => {
  const { t } = useTranslation();

  if (objectives.length === 0) {
    return (
      <div className="text-center py-8">
        <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun objectif annuel</h3>
        <p className="text-gray-600">
          Cet employé n'a pas encore défini d'objectifs annuels.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {objectives.map(objective => {
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
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCareerLevelBadge(objective.career_level)}`}>
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
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            
            {isExpanded && (
              <div className="mt-4 space-y-3">
                {objective.objectives.map((obj, index) => (
                  <div key={index} className="bg-white p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-1 rounded ${obj.is_custom ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                        {obj.theme_name || 'Thème non défini'}
                      </span>
                      {obj.is_custom && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          Personnalisé
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-gray-900">{obj.skill_description}</h4>
                    <p className="text-sm text-gray-700 mt-1">{obj.smart_objective}</p>
                  </div>
                ))}
                
                <div className="text-xs text-gray-500 mt-2">
                  <span>Créé le {format(new Date(objective.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
                  {objective.updated_at !== objective.created_at && (
                    <span> • Modifié le {format(new Date(objective.updated_at), 'dd/MM/yyyy', { locale: fr })}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AnnualObjectivesList;