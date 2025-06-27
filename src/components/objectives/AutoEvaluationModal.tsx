import React, { useState } from 'react';
import { X, Save, Target, Star, CheckCircle, AlertCircle, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';

interface ObjectiveDetail {
  skill_id: string;
  skill_description: string;
  theme_name: string;
  smart_objective: string;
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  time_bound: string;
  is_custom?: boolean;
}

interface AutoEvaluationData {
  skill_id: string;
  auto_evaluation_score: number; // 1-5
  auto_evaluation_comment: string;
  achievements: string;
  difficulties: string;
  learnings: string;
  next_steps: string;
}

interface AutoEvaluationModalProps {
  collaboration: any;
  objectives: ObjectiveDetail[];
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const AutoEvaluationModal: React.FC<AutoEvaluationModalProps> = ({
  collaboration,
  objectives,
  onClose,
  onSuccess,
  onError
}) => {
  const { t } = useTranslation();
  const [evaluations, setEvaluations] = useState<AutoEvaluationData[]>(
    objectives.map(obj => ({
      skill_id: obj.skill_id,
      auto_evaluation_score: 3,
      auto_evaluation_comment: '',
      achievements: '',
      difficulties: '',
      learnings: '',
      next_steps: ''
    }))
  );
  const [submitting, setSubmitting] = useState(false);

  const handleEvaluationChange = (index: number, field: keyof AutoEvaluationData, value: string | number) => {
    setEvaluations(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const validateEvaluations = () => {
    return evaluations.every(evaluationItem => 
      evaluationItem.auto_evaluation_comment.trim() !== '' &&
      evaluationItem.achievements.trim() !== '' &&
      evaluationItem.learnings.trim() !== ''
    );
  };

  const handleSubmit = async () => {
    if (!validateEvaluations()) {
      onError(t('evaluation.fillRequiredFields'));
      return;
    }

    try {
      setSubmitting(true);

      // Vérifier si une évaluation existe déjà
      const { data: existingEval } = await supabase
        .from('evaluations_objectifs')
        .select('id')
        .eq('objectifs_id', collaboration.objectifs.id)
        .maybeSingle();

      const evaluationData = {
        auto_evaluation: {
          evaluations: evaluations,
          date_soumission: new Date().toISOString(),
          statut: 'soumise'
        },
        statut: 'soumise',
        date_soumission: new Date().toISOString()
      };

      if (existingEval) {
        // Mettre à jour l'évaluation existante
        const { error } = await supabase
          .from('evaluations_objectifs')
          .update(evaluationData)
          .eq('id', existingEval.id);

        if (error) throw error;
      } else {
        // Créer une nouvelle évaluation
        const { error } = await supabase
          .from('evaluations_objectifs')
          .insert([{
            objectifs_id: collaboration.objectifs.id,
            ...evaluationData
          }]);

        if (error) throw error;
      }

      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : t('evaluation.errorSubmitting'));
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreLabel = (score: number) => {
    switch (score) {
      case 1: return t('evaluation.scores.notAchieved');
      case 2: return t('evaluation.scores.partiallyAchieved');
      case 3: return t('evaluation.scores.achieved');
      case 4: return t('evaluation.scores.largelyAchieved');
      case 5: return t('evaluation.scores.exceeded');
      default: return t('evaluation.scores.achieved');
    }
  };

  const getScoreColor = (score: number) => {
    switch (score) {
      case 1: return 'text-red-600';
      case 2: return 'text-orange-600';
      case 3: return 'text-blue-600';
      case 4: return 'text-green-600';
      case 5: return 'text-emerald-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('evaluation.selfEvaluation')}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('projects.project')}: {collaboration.projet.titre} - {collaboration.projet.nom_client}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">{t('evaluation.selfEvaluationInstructions')}</h3>
                <p className="text-sm text-blue-700 mt-1">
                  {t('evaluation.evaluateEachObjective')}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {objectives.map((objective, index) => {
              const evaluation = evaluations[index];
              
              return (
                <div key={objective.skill_id} className={`border rounded-lg p-6 ${objective.is_custom ? 'border-purple-200' : 'border-gray-200'}`}>
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-1 rounded ${objective.is_custom ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                        {objective.theme_name}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {index + 1}. {objective.skill_description}
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700">
                        <strong>{t('objectives.smartObjective')}:</strong> {objective.smart_objective}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Score d'auto-évaluation */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        {t('evaluation.achievementLevel')} *
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() => handleEvaluationChange(index, 'auto_evaluation_score', score)}
                            className={`p-3 rounded-lg border-2 transition-all text-center ${
                              evaluation.auto_evaluation_score === score
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex">
                                {Array.from({ length: score }, (_, i) => (
                                  <Star key={i} className="w-4 h-4 fill-current text-yellow-400" />
                                ))}
                              </div>
                              <span className={`text-xs font-medium ${getScoreColor(score)}`}>
                                {getScoreLabel(score)}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Commentaire sur l'évaluation */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('evaluation.evaluationComment')} *
                      </label>
                      <textarea
                        rows={3}
                        value={evaluation.auto_evaluation_comment}
                        onChange={(e) => handleEvaluationChange(index, 'auto_evaluation_comment', e.target.value)}
                        placeholder={t('evaluation.evaluationComment')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Réalisations */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('evaluation.mainAchievements')} *
                      </label>
                      <textarea
                        rows={3}
                        value={evaluation.achievements}
                        onChange={(e) => handleEvaluationChange(index, 'achievements', e.target.value)}
                        placeholder={t('evaluation.mainAchievements')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Difficultés rencontrées */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('evaluation.difficultiesEncountered')}
                      </label>
                      <textarea
                        rows={2}
                        value={evaluation.difficulties}
                        onChange={(e) => handleEvaluationChange(index, 'difficulties', e.target.value)}
                        placeholder={t('evaluation.difficultiesEncountered')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Apprentissages */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('evaluation.mainLearnings')} *
                      </label>
                      <textarea
                        rows={3}
                        value={evaluation.learnings}
                        onChange={(e) => handleEvaluationChange(index, 'learnings', e.target.value)}
                        placeholder={t('evaluation.mainLearnings')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Prochaines étapes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('evaluation.nextSteps')}
                      </label>
                      <textarea
                        rows={2}
                        value={evaluation.next_steps}
                        onChange={(e) => handleEvaluationChange(index, 'next_steps', e.target.value)}
                        placeholder={t('evaluation.nextSteps')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t mt-8">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !validateEvaluations()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {submitting ? t('common.loading') : t('evaluation.submitEvaluation')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoEvaluationModal;