import React from 'react';
import { Target, Plus, Edit } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  
  // Déterminer si des objectifs personnalisés sont présents
  const hasCustomObjectives = collaboration.objectifs?.objectifs?.some((obj: any) => obj.is_custom === true);
  
  // Compter les objectifs par type
  const countObjectivesByType = () => {
    if (!collaboration.objectifs?.objectifs) return { custom: 0, career: 0 };
    
    return collaboration.objectifs.objectifs.reduce((acc: {custom: number, career: number}, obj: any) => {
      if (obj.is_custom) {
        acc.custom += 1;
      } else {
        acc.career += 1;
      }
      return acc;
    }, { custom: 0, career: 0 });
  };
  
  const objectiveCounts = countObjectivesByType();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t('objectives.myDevelopmentObjectives')}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {t('objectives.defineSMARTObjectives')}
          </p>
        </div>
        {canDefineObjectives && (
          <div className="flex gap-2">
            {collaboration.objectifs ? (
              <button
                onClick={onEditObjectives}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Edit className="w-4 h-4" />
                {t('objectives.editObjectives')}
              </button>
            ) : (
              <button
                onClick={onCreateObjectives}
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
          {/* Résumé des objectifs */}
          {(objectiveCounts.custom > 0 || objectiveCounts.career > 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">{t('objectives.objectivesSummary')}</h3>
              <div className="flex flex-wrap gap-3">
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
              </div>
            </div>
          )}

          {collaboration.objectifs.objectifs.map((objective: any, index: number) => (
            <div 
              key={index} 
              className={`bg-gray-50 rounded-lg p-4 border ${objective.is_custom ? 'border-purple-200' : 'border-blue-200'}`}
            >
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-1 rounded ${objective.is_custom ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-700'}`}>
                    {objective.theme_name || `${t('objectives.theme')} ${index + 1}`}
                  </span>
                  {objective.is_custom && (
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {t('objectives.customized')}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
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
              onClick={onCreateObjectives}
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