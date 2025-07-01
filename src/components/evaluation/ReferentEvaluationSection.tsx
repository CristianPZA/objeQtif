import React from 'react';
import { UserCheck, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ReferentEvaluationSectionProps {
  collaboration: any;
  canReferentEvaluate?: boolean;
  onStartReferentEvaluation?: () => void;
  isReferent?: boolean;
}

const ReferentEvaluationSection: React.FC<ReferentEvaluationSectionProps> = ({
  collaboration,
  canReferentEvaluate = false,
  onStartReferentEvaluation = () => {},
  isReferent = false
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

  // Check if the evaluation is in a state where the referent can evaluate
  const canEvaluate = () => {
    // If the user is not a referent, they can't evaluate
    if (!isReferent) return false;
    
    // If there's no auto-evaluation yet, referent can't evaluate
    if (!collaboration.evaluation || !collaboration.evaluation.auto_evaluation) return false;
    
    // If the evaluation is already completed by the referent, they can't evaluate again
    if (collaboration.evaluation.evaluation_referent) return false;
    
    // If the evaluation status is appropriate for referent evaluation
    return ['soumise', 'en_attente_referent'].includes(collaboration.evaluation.statut);
  };

  return (
    <div className="bg-purple-50 rounded-lg border border-purple-200 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <UserCheck className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-purple-900">{t('evaluation.referentEvaluation')}</h3>
            <p className="text-sm text-purple-700">
              {t('evaluation.evaluationBy')} {collaboration.projet.referent_nom}
            </p>
          </div>
        </div>
        {canEvaluate() && (
          <button
            onClick={onStartReferentEvaluation}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <UserCheck className="w-4 h-4" />
            Évaluer
          </button>
        )}
      </div>

      {!collaboration.evaluation || !collaboration.evaluation.auto_evaluation ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-600" />
            <div>
              <h4 className="text-sm font-medium text-gray-800">{t('evaluation.waitingForSelfEvaluation')}</h4>
              <p className="text-sm text-gray-700 mt-1">
                {t('evaluation.referentWillEvaluate')}
              </p>
            </div>
          </div>
        </div>
      ) : collaboration.evaluation.evaluation_referent ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <h4 className="text-sm font-medium text-green-800">{t('evaluation.evaluationCompleted')}</h4>
                <p className="text-sm text-green-700 mt-1">
                  {t('evaluation.evaluatedBy')} {collaboration.projet.referent_nom}
                </p>
              </div>
            </div>
          </div>

          {/* Résultats de l'évaluation référent */}
          {collaboration.evaluation.evaluation_referent.evaluations && (
            <div className="space-y-3">
              <h4 className="font-medium text-purple-900">{t('evaluation.referentEvaluationResults')}</h4>
              {collaboration.evaluation.evaluation_referent.evaluations.map((evalItem: any, index: number) => {
                const objective = collaboration.objectifs?.objectifs[index];
                const autoEval = collaboration.evaluation?.auto_evaluation?.evaluations?.[index];
                
                return (
                  <div key={index} className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="mb-3">
                      <h5 className="font-medium text-gray-900 text-sm">
                        {index + 1}. {objective?.skill_description}
                      </h5>
                      
                      {/* Comparaison des scores */}
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="bg-blue-50 rounded p-2">
                          <div className="text-xs font-medium text-blue-800 mb-1">{t('evaluation.yourScore')}</div>
                          <div className="flex items-center gap-1">
                            <div className="flex">
                              {getScoreStars(autoEval?.auto_evaluation_score || 0)}
                            </div>
                            <span className="text-xs text-blue-700">({autoEval?.auto_evaluation_score || 0}/5)</span>
                          </div>
                        </div>
                        
                        <div className="bg-purple-50 rounded p-2">
                          <div className="text-xs font-medium text-purple-800 mb-1">{t('evaluation.referentScore')}</div>
                          <div className="flex items-center gap-1">
                            <div className="flex">
                              {getScoreStars(evalItem.referent_score)}
                            </div>
                            <span className="text-xs text-purple-700">({evalItem.referent_score}/5)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong className="text-gray-600">{t('evaluation.comment')}:</strong>
                        <p className="text-gray-700 mt-1">{evalItem.referent_comment}</p>
                      </div>
                      {evalItem.development_recommendations && (
                        <div>
                          <strong className="text-gray-600">{t('evaluation.recommendations')}:</strong>
                          <p className="text-gray-700 mt-1">{evalItem.development_recommendations}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : collaboration.evaluation.statut === 'soumise' || collaboration.evaluation.statut === 'en_attente_referent' ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-600" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">{t('evaluation.waitingForEvaluation')}</h4>
              <p className="text-sm text-yellow-700 mt-1">
                {isReferent 
                  ? "L'auto-évaluation a été soumise. Vous pouvez maintenant procéder à l'évaluation."
                  : t('evaluation.evaluationSubmitted')
                }
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-600" />
            <div>
              <h4 className="text-sm font-medium text-gray-800">{t('common.waiting')}</h4>
              <p className="text-sm text-gray-700 mt-1">
                {t('evaluation.referentWillEvaluate')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferentEvaluationSection;