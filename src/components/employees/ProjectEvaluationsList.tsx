import React, { useState } from 'react';
import { Award, ChevronDown, ChevronRight, Star, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { Evaluation } from './types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ProjectEvaluationsListProps {
  evaluations: Evaluation[];
  expandedEvaluations: Set<string>;
  toggleEvaluationExpansion: (id: string) => void;
  getScoreStars: (score: number) => JSX.Element[];
  getScoreBadgeColor: (score: number) => string;
  getEvaluationStatusColor: (status: string) => string;
  getEvaluationStatusLabel: (status: string) => string;
  handleViewEvaluation: (id: string) => void;
}

const ProjectEvaluationsList: React.FC<ProjectEvaluationsListProps> = ({
  evaluations,
  expandedEvaluations,
  toggleEvaluationExpansion,
  getScoreStars,
  getScoreBadgeColor,
  getEvaluationStatusColor,
  getEvaluationStatusLabel,
  handleViewEvaluation
}) => {
  const [detailedView, setDetailedView] = useState<Set<string>>(new Set());

  const toggleDetailedView = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDetailedView(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (evaluations.length === 0) {
    return (
      <div className="text-center py-8">
        <Award className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune évaluation</h3>
        <p className="text-gray-600">
          Cet employé n'a pas encore d'évaluations de projet finalisées.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {evaluations.map(evaluation => {
        const isExpanded = expandedEvaluations.has(evaluation.evaluation_id);
        const isDetailed = detailedView.has(evaluation.evaluation_id);
        
        return (
          <div key={evaluation.evaluation_id} className="bg-gray-50 rounded-lg border p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {evaluation.projet_titre}
                  </h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${getEvaluationStatusColor(evaluation.statut)}`}>
                    {getEvaluationStatusLabel(evaluation.statut)}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mt-1">
                  Client: {evaluation.nom_client}
                </p>
                
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${getScoreBadgeColor(evaluation.note_finale)}`}>
                    Note finale: {evaluation.note_finale.toFixed(1)}/5
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => toggleDetailedView(evaluation.evaluation_id, e)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200"
                  title={isDetailed ? "Masquer les détails" : "Voir les détails complets"}
                >
                  {isDetailed ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => toggleEvaluationExpansion(evaluation.evaluation_id)}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-blue-800">Auto-évaluation</span>
                      <span className="text-sm font-bold text-blue-800">{evaluation.score_auto_evaluation}/5</span>
                    </div>
                    <div className="flex">
                      {getScoreStars(evaluation.score_auto_evaluation)}
                    </div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-green-800">Évaluation référent</span>
                      <span className="text-sm font-bold text-green-800">{evaluation.score_referent}/5</span>
                    </div>
                    <div className="flex">
                      {getScoreStars(evaluation.score_referent)}
                    </div>
                  </div>
                </div>
                
                {isDetailed && evaluation.objectifs && (
                  <div className="mt-4 space-y-4">
                    <h4 className="font-medium text-gray-900">Détails de l'évaluation</h4>
                    
                    {evaluation.objectifs.map((objective: any, index: number) => {
                      const autoEval = evaluation.auto_evaluation?.evaluations?.[index];
                      const referentEval = evaluation.evaluation_referent?.evaluations?.[index];
                      
                      return (
                        <div key={index} className="bg-white rounded-lg p-4 border">
                          <div className="mb-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                {objective.theme_name}
                              </span>
                            </div>
                            <h5 className="font-medium text-gray-900">
                              {index + 1}. {objective.skill_description}
                            </h5>
                            <p className="text-sm text-gray-700 mt-1">{objective.smart_objective}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Auto-évaluation */}
                            {autoEval && (
                              <div className="bg-blue-50 rounded p-3">
                                <h6 className="text-sm font-medium text-blue-800 mb-2">Auto-évaluation</h6>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="flex">
                                    {getScoreStars(autoEval.auto_evaluation_score)}
                                  </div>
                                  <span className="text-sm text-blue-700">({autoEval.auto_evaluation_score}/5)</span>
                                </div>
                                <p className="text-sm text-blue-700">{autoEval.auto_evaluation_comment}</p>
                                {autoEval.achievements && (
                                  <p className="text-sm text-blue-700 mt-1">
                                    <strong>Réalisations:</strong> {autoEval.achievements}
                                  </p>
                                )}
                              </div>
                            )}
                            
                            {/* Évaluation référent */}
                            {referentEval && (
                              <div className="bg-green-50 rounded p-3">
                                <h6 className="text-sm font-medium text-green-800 mb-2">Évaluation référent</h6>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="flex">
                                    {getScoreStars(referentEval.referent_score)}
                                  </div>
                                  <span className="text-sm text-green-700">({referentEval.referent_score}/5)</span>
                                </div>
                                <p className="text-sm text-green-700">{referentEval.referent_comment}</p>
                                {referentEval.observed_achievements && (
                                  <p className="text-sm text-green-700 mt-1">
                                    <strong>Observations:</strong> {referentEval.observed_achievements}
                                  </p>
                                )}
                                {referentEval.development_recommendations && (
                                  <p className="text-sm text-green-700 mt-1">
                                    <strong>Recommandations:</strong> {referentEval.development_recommendations}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div className="text-xs text-gray-500 mt-2">
                  <span>Soumise le {format(new Date(evaluation.date_soumission), 'dd/MM/yyyy', { locale: fr })}</span>
                </div>
                
                {!isDetailed && (
                  <button
                    onClick={(e) => toggleDetailedView(evaluation.evaluation_id, e)}
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    Voir les détails complets
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProjectEvaluationsList;