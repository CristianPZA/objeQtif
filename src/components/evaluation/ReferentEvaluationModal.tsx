import React, { useState } from 'react';
import { X, Save, Star, CheckCircle, AlertCircle, User, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
  objective_type?: string;
}

interface AutoEvaluationData {
  skill_id: string;
  auto_evaluation_score: number;
  auto_evaluation_comment: string;
  achievements: string;
  difficulties: string;
  learnings: string;
  next_steps: string;
}

interface ReferentEvaluationData {
  skill_id: string;
  referent_score: number;
  referent_comment: string;
  observed_achievements: string;
  areas_for_improvement: string;
  development_recommendations: string;
  overall_performance: string;
}

interface ReferentEvaluationModalProps {
  evaluation: any;
  objectives: ObjectiveDetail[];
  autoEvaluations: AutoEvaluationData[];
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const ReferentEvaluationModal: React.FC<ReferentEvaluationModalProps> = ({
  evaluation,
  objectives,
  autoEvaluations,
  onClose,
  onSuccess,
  onError
}) => {
  const [referentEvaluations, setReferentEvaluations] = useState<ReferentEvaluationData[]>(
    objectives.map((obj, index) => ({
      skill_id: obj.skill_id,
      referent_score: 3,
      referent_comment: '',
      observed_achievements: '',
      areas_for_improvement: '',
      development_recommendations: '',
      overall_performance: ''
    }))
  );
  const [submitting, setSubmitting] = useState(false);

  const handleEvaluationChange = (index: number, field: keyof ReferentEvaluationData, value: string | number) => {
    setReferentEvaluations(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const validateEvaluations = () => {
    return referentEvaluations.every(evalItem => 
      evalItem.referent_comment.trim() !== '' &&
      evalItem.observed_achievements.trim() !== '' &&
      evalItem.overall_performance.trim() !== ''
    );
  };

  const handleSubmit = async () => {
    if (!validateEvaluations()) {
      onError('Veuillez remplir tous les champs obligatoires pour chaque objectif');
      return;
    }

    try {
      setSubmitting(true);

      const evaluationData = {
        evaluation_referent: {
          evaluations: referentEvaluations,
          date_evaluation: new Date().toISOString(),
          statut: 'evaluee_referent'
        },
        statut: 'evaluee_referent'
      };

      const { error } = await supabase
        .from('evaluations_objectifs')
        .update(evaluationData)
        .eq('id', evaluation.id);

      if (error) throw error;

      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erreur lors de la soumission de l\'évaluation');
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreLabel = (score: number) => {
    switch (score) {
      case 1: return 'Insuffisant';
      case 2: return 'À améliorer';
      case 3: return 'Satisfaisant';
      case 4: return 'Bon';
      case 5: return 'Excellent';
      default: return 'Satisfaisant';
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

  const getScoreStars = (score: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < score ? 'fill-current text-yellow-400' : 'text-gray-300'}`} 
      />
    ));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Évaluation Référent</h2>
            <p className="text-sm text-gray-600 mt-1">
              Évaluez les objectifs de {evaluation.employe_nom} pour le projet {evaluation.projet_titre}
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
              <User className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">Instructions pour l'évaluation</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Évaluez chaque objectif en vous basant sur vos observations du travail de l'employé. 
                  Vous pouvez voir son auto-évaluation pour comparaison, mais votre évaluation doit refléter 
                  votre propre perception de sa performance.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {objectives.map((objective, index) => {
              const referentEval = referentEvaluations[index];
              const autoEval = autoEvaluations[index];
              
              return (
                <div key={objective.skill_id} className="border border-gray-200 rounded-lg p-6">
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {objective.theme_name}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {index + 1}. {objective.skill_description}
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <p className="text-sm text-gray-700">
                        <strong>Objectif SMART défini:</strong> {objective.smart_objective}
                      </p>
                    </div>

                    {/* Auto-évaluation de l'employé pour référence */}
                    <div className="bg-blue-50 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Auto-évaluation de l'employé</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-blue-700">Score:</span>
                        <div className="flex">
                          {getScoreStars(autoEval.auto_evaluation_score)}
                        </div>
                        <span className="text-sm text-blue-700">({autoEval.auto_evaluation_score}/5)</span>
                      </div>
                      <p className="text-sm text-blue-700">
                        <strong>Commentaire:</strong> {autoEval.auto_evaluation_comment}
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        <strong>Réalisations:</strong> {autoEval.achievements}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Score du référent */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Votre évaluation de la performance *
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() => handleEvaluationChange(index, 'referent_score', score)}
                            className={`p-3 rounded-lg border-2 transition-all text-center ${
                              referentEval.referent_score === score
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

                    {/* Commentaire du référent */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Commentaire sur votre évaluation *
                      </label>
                      <textarea
                        rows={3}
                        value={referentEval.referent_comment}
                        onChange={(e) => handleEvaluationChange(index, 'referent_comment', e.target.value)}
                        placeholder="Justifiez votre évaluation..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Réalisations observées */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Réalisations observées *
                      </label>
                      <textarea
                        rows={3}
                        value={referentEval.observed_achievements}
                        onChange={(e) => handleEvaluationChange(index, 'observed_achievements', e.target.value)}
                        placeholder="Décrivez les réalisations que vous avez observées..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Axes d'amélioration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Axes d'amélioration
                      </label>
                      <textarea
                        rows={2}
                        value={referentEval.areas_for_improvement}
                        onChange={(e) => handleEvaluationChange(index, 'areas_for_improvement', e.target.value)}
                        placeholder="Quels sont les points à améliorer ?"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Recommandations de développement */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Recommandations de développement
                      </label>
                      <textarea
                        rows={2}
                        value={referentEval.development_recommendations}
                        onChange={(e) => handleEvaluationChange(index, 'development_recommendations', e.target.value)}
                        placeholder="Quelles actions recommandez-vous pour développer cette compétence ?"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Performance globale */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Commentaire sur la performance globale *
                      </label>
                      <textarea
                        rows={3}
                        value={referentEval.overall_performance}
                        onChange={(e) => handleEvaluationChange(index, 'overall_performance', e.target.value)}
                        placeholder="Évaluation globale de la performance sur cet objectif..."
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
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !validateEvaluations()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Soumission...' : 'Soumettre l\'évaluation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferentEvaluationModal;