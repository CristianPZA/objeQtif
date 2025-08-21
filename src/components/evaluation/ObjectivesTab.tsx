import React from 'react';
import { Target, Plus, Edit, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface ObjectivesTabProps {
  collaboration: any;
  canDefineObjectives: boolean;
  onCreateObjectives: () => void;
  onEditObjectives: () => void;
}

const ObjectivesTab: React.FC<ObjectivesTabProps> = ({
  collaboration,
  canDefineObjectives,
  onCreateObjectives,
  onEditObjectives
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const getObjectivesStatus = () => {
    if (!collaboration.objectifs?.objectifs) return null;
    
    // Vérifier si tous les objectifs ont un statut
    const hasStatus = collaboration.objectifs.objectifs.some((obj: any) => obj.status);
    
    if (!hasStatus) {
      // Anciens objectifs sans statut - considérés comme soumis
      return 'submitted';
    }
    
    // Vérifier le statut des objectifs
    const statuses = collaboration.objectifs.objectifs.map((obj: any) => obj.status);
    
    if (statuses.every((status: string) => status === 'draft')) {
      return 'draft';
    } else if (statuses.every((status: string) => status === 'submitted')) {
      return 'submitted';
    } else {
      return 'mixed'; // Mélange de statuts
    }
  };
  
  const objectivesStatus = getObjectivesStatus();
  
  const getStatusDisplay = () => {
    switch (objectivesStatus) {
      case 'draft':
        return { 
          icon: <Clock className="w-4 h-4 text-yellow-600" />, 
          text: 'Brouillon', 
          color: 'bg-yellow-100 text-yellow-800' 
        };
      case 'submitted':
        return { 
          icon: <CheckCircle className="w-4 h-4 text-green-600" />, 
          text: 'Finalisés', 
          color: 'bg-green-100 text-green-800' 
        };
      case 'mixed':
        return { 
          icon: <AlertCircle className="w-4 h-4 text-orange-600" />, 
          text: 'En cours', 
          color: 'bg-orange-100 text-orange-800' 
        };
      default:
        return null;
    }
  };
  
  const statusDisplay = getStatusDisplay();
  
  // Compter les objectifs par type
  const countObjectivesByType = () => {
    if (!collaboration.objectifs?.objectifs) return { custom: 0, career: 0, formation: 0, simple: 0 };
    
    return collaboration.objectifs.objectifs.reduce((acc: {custom: number, career: number, formation: number, simple: number}, obj: any) => {
      if (obj.is_custom) {
        if (obj.objective_type === 'formation') {
          acc.formation += 1;
        } else if (obj.objective_type === 'custom') {
          acc.simple += 1;
        } else {
          acc.custom += 1;
        }
      } else {
        acc.career += 1;
      }
      return acc;
    }, { custom: 0, career: 0, formation: 0, simple: 0 });
  };
  
  const objectiveCounts = countObjectivesByType();

  const handleDefineObjectives = () => {
    navigate(`/objectifs-definition/${collaboration.id}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t('objectives.myDevelopmentObjectives')}</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-gray-600">
              {t('objectives.defineSMARTObjectives')}
            </p>
            {statusDisplay && (
              <div className="flex items-center gap-1">
                {statusDisplay.icon}
                <span className={`text-xs px-2 py-1 rounded-full ${statusDisplay.color}`}>
                  {statusDisplay.text}
                </span>
              </div>
            )}
          </div>
        </div>
        {canDefineObjectives && (
          <div className="flex gap-2">
            {collaboration.objectifs ? (
              <button
                onClick={handleDefineObjectives}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Edit className="w-4 h-4" />
                {t('objectives.editObjectives')}
              </button>
            ) : (
              <button
                onClick={handleDefineObjectives}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('objectives.defineObjectives')}
              </button>
            )}
          </div>
        )}
      </div>

      {collaboration.objectifs ? (
        <div className="space-y-4">
          {/* Résumé des objectifs avec statut */}
          {(objectiveCounts.custom > 0 || objectiveCounts.career > 0 || objectiveCounts.formation > 0 || objectiveCounts.simple > 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-blue-800">{t('objectives.objectivesSummary')}</h3>
                {statusDisplay && (
                  <div className="flex items-center gap-1">
                    {statusDisplay.icon}
                    <span className="text-xs text-blue-700 font-medium">
                      Statut: {statusDisplay.text}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {objectiveCounts.career > 0 && (
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {objectiveCounts.career} {t('objectives.careerObjectives')}{objectiveCounts.career > 1 ? 's' : ''}
                  </div>
                )}
                {objectiveCounts.custom > 0 && (
                  <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                    {objectiveCounts.custom} {t('objectives.customObjectives')}{objectiveCounts.custom > 1 ? 's' : ''}
                  </div>
                )}
                {objectiveCounts.formation > 0 && (
                  <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                    {objectiveCounts.formation} formation{objectiveCounts.formation > 1 ? 's' : ''}
                  </div>
                )}
                {objectiveCounts.simple > 0 && (
                  <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
                    {objectiveCounts.simple} objectif{objectiveCounts.simple > 1 ? 's' : ''} libre{objectiveCounts.simple > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}

          {collaboration.objectifs.objectifs.map((objective: any, index: number) => (
            <div 
              key={index} 
              className={`bg-gray-50 rounded-lg p-4 border ${objective.is_custom ? 'border-purple-200' : 'border-blue-200'}`}
                objective.is_custom 
                  ? objective.objective_type === 'formation' 
                    ? 'border-orange-200' 
                    : objective.objective_type === 'custom' 
                      ? 'border-indigo-200' 
                      : 'border-purple-200' 
                  : 'border-blue-200'
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-1 rounded ${
                    objective.is_custom 
                      ? objective.objective_type === 'formation' 
                        ? 'bg-orange-100 text-orange-700' 
                        : objective.objective_type === 'custom' 
                          ? 'bg-indigo-100 text-indigo-700' 
                          : 'bg-purple-100 text-purple-700' 
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {objective.theme_name || `${t('objectives.theme')} ${index + 1}`}
                  </span>
                  {objective.is_custom && (
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {t('objectives.customized')}
                    </span>
                  )}
                  {objective.is_custom && objective.objective_type && (
                    <span className={`text-xs px-2 py-1 rounded ${
                      objective.objective_type === 'smart' ? 'bg-green-100 text-green-800' : 
                      objective.objective_type === 'formation' ? 'bg-orange-100 text-orange-800' : 
                      'bg-indigo-100 text-indigo-800'
                    }`}>
                      {objective.objective_type === 'smart' ? 'SMART' : 
                       objective.objective_type === 'formation' ? 'Formation' : 'Libre'}
                    </span>
                  )}
                </div>
                <h4 className="font-medium text-gray-900">
                  {index + 1}. {objective.skill_description}
                </h4>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                <strong>{t('objectives.smartObjective')}:</strong> {objective.smart_objective}
              </p>
              {(!objective.is_custom || (objective.is_custom && objective.objective_type === 'smart')) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-3 pt-3 border-t border-gray-200">
                <div>
                  <strong className="text-gray-600">{t('objectives.specific')}:</strong>
                  <p className="text-gray-700 mt-1">{objective.specific}</p>
                </div>
                <div>
                  <strong className="text-gray-600">{t('objectives.measurable')}:</strong>
                  <p className="text-gray-700 mt-1">{objective.measurable}</p>
                </div>
                <div>
                  <strong className="text-gray-600">{t('objectives.achievable')}:</strong>
                  <p className="text-gray-700 mt-1">{objective.achievable}</p>
                </div>
                <div>
                  <strong className="text-gray-600">{t('objectives.relevant')}:</strong>
                  <p className="text-gray-700 mt-1">{objective.relevant}</p>
                </div>
                <div className="md:col-span-2">
                  <strong className="text-gray-600">{t('objectives.timeBound')}:</strong>
                  <p className="text-gray-700 mt-1">{objective.time_bound}</p>
                </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('objectives.noObjectivesDefined')}</h3>
          <p className="text-gray-600 mb-4">
            {t('objectives.startDefining')}
          </p>
          {canDefineObjectives && (
            <button
              onClick={handleDefineObjectives}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 mx-auto transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('objectives.defineObjectives')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ObjectivesTab;