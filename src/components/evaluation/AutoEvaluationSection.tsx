import React from 'react';
import { Star, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface AutoEvaluationSectionProps {
  collaboration: any;
  onStartAutoEvaluation: () => void;
  canAutoEvaluate: boolean;
}

const AutoEvaluationSection: React.FC<AutoEvaluationSectionProps> = ({
  collaboration,
  onStartAutoEvaluation,
  canAutoEvaluate
}) => {
  const { t } = useTranslation();
  
  const getScoreStars = (score: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < score ? 'fill-current text-yellow-400' : 'text-gray-300'}`} 
      />
    ));
  };

  return (
    <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Star className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900">{t('evaluation.selfEvaluation')}</h3>
            <p className="text-sm text-blue-700">{t('evaluation.evaluateObjectivesAchievement')}</p>
          </div>
        </div>
        {canAutoEvaluate && (
          <button
            onClick={onStartAutoEvaluation}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Star className="w-4 h-4" />
            {t('evaluation.start')}
          </button>
        )}
      </div>

      {!collaboration.objectifs ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">{t('evaluation.objectivesRequired')}</h4>
              <p className="text-sm text-yellow-700 mt-1">
                {t('evaluation.defineObjectivesFirst')}
              </p>
            </div>
          </div>
        </div>
      ) : collaboration.evaluation && collaboration.evaluation.auto_evaluation ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <h4 className="text-sm font-medium text-green-800">{t('evaluation.selfEvaluationCompleted')}</h4>
                <p className="text-sm text-green-700 mt-1">
                  {t('evaluation.submittedOn')} {format(new Date(collaboration.evaluation.date_soumission), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                </p>
              </div>
            </div>
          </div>

          {/* Résultats de l'auto-évaluation */}
          {collaboration.evaluation.auto_evaluation.evaluations && (
            <div className="space-y-3">
              <h4 className="font-medium text-blue-900">{t('evaluation.yourResults')}</h4>
              {collaboration.evaluation.auto_evaluation.evaluations.map((evalItem: any, index: number) => {
                const objective = collaboration.objectifs?.objectifs[index];
                return (
                  <div key={index} className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="mb-3">
                      <h5 className="font-medium text-gray-900 text-sm">
                        {index + 1}. {objective?.skill_description}
                      </h5>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex">
                          {getScoreStars(evalItem.auto_evaluation_score)}
                        </div>
                        <span className="text-sm text-gray-600">({evalItem.auto_evaluation_score}/5)</span>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong className="text-gray-600">{t('evaluation.comment')}:</strong>
                        <p className="text-gray-700 mt-1">{evalItem.auto_evaluation_comment}</p>
                      </div>
                      <div>
                        <strong className="text-gray-600">{t('evaluation.achievements')}:</strong>
                        <p className="text-gray-700 mt-1">{evalItem.achievements}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : collaboration.projet.statut === 'termine' ? (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <div>
              <h4 className="text-sm font-medium text-orange-800">{t('evaluation.selfEvaluationRequired')}</h4>
              <p className="text-sm text-orange-700 mt-1">
                {t('evaluation.projectCompletedEvaluate')}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-600" />
            <div>
              <h4 className="text-sm font-medium text-gray-800">{t('evaluation.waitingForProjectEnd')}</h4>
              <p className="text-sm text-gray-700 mt-1">
                {t('evaluation.evaluationAvailableWhenCompleted')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoEvaluationSection;