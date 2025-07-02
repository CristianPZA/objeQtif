import React from 'react';
import { Award, ChevronDown, ChevronRight, Star } from 'lucide-react';
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
                
                <div className="text-xs text-gray-500 mt-2">
                  <span>Soumise le {format(new Date(evaluation.date_soumission), 'dd/MM/yyyy', { locale: fr })}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProjectEvaluationsList;