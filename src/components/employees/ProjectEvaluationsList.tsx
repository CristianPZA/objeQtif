import React, { useState, useEffect } from 'react';
import { Award, ChevronDown, ChevronRight, Star, ExternalLink, Eye, EyeOff, Tag, BarChart2, PieChart, TrendingUp, Lightbulb } from 'lucide-react';
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
  const [themeStats, setThemeStats] = useState<Record<string, { count: number, totalScore: number, objectives: any[] }>>({});
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  // Calculer les statistiques des thèmes travaillés
  useEffect(() => {
    const stats: Record<string, { count: number, totalScore: number, objectives: any[] }> = {};
    
    evaluations.forEach(evaluation => {
      if (evaluation.objectifs) {
        evaluation.objectifs.forEach((objective: any, index: number) => {
          // Normaliser le nom du thème pour regrouper les thèmes similaires
          let themeName = objective.theme_name || 'Non catégorisé';
          
          // Extraire le thème de base (avant le tiret) pour regrouper les spécialités
          const baseThemeMatch = themeName.match(/^([^-]+)(?:\s*-\s*.+)?$/);
          if (baseThemeMatch) {
            themeName = baseThemeMatch[1].trim();
          }
          
          if (!stats[themeName]) {
            stats[themeName] = { count: 0, totalScore: 0, objectives: [] };
          }
          
          stats[themeName].count += 1;
          
          // Ajouter l'objectif à la liste des objectifs pour ce thème
          const objectiveWithEvaluation = {
            ...objective,
            evaluation: evaluation,
            evaluationIndex: index
          };
          stats[themeName].objectives.push(objectiveWithEvaluation);
          
          // Ajouter le score si disponible
          const referentEval = evaluation.evaluation_referent?.evaluations?.[index];
          
          if (referentEval && referentEval.referent_score) {
            stats[themeName].totalScore += referentEval.referent_score;
          }
        });
      }
    });
    
    setThemeStats(stats);
  }, [evaluations]);

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

  const handleThemeClick = (theme: string) => {
    setSelectedTheme(selectedTheme === theme ? null : theme);
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

  // Synthèse des thématiques travaillées
  const renderThemesSummary = () => {
    if (Object.keys(themeStats).length === 0) return null;
    
    // Trier les thèmes par nombre d'objectifs (décroissant)
    const sortedThemes = Object.entries(themeStats).sort((a, b) => b[1].count - a[1].count);
    
    return (
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">Synthèse des thématiques travaillées</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedThemes.map(([theme, stats]) => {
            const avgScore = stats.count > 0 ? stats.totalScore / stats.count : 0;
            const isSelected = selectedTheme === theme;
            
            return (
              <div 
                key={theme} 
                className={`${isSelected ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50 hover:bg-gray-100'} rounded-lg p-3 border cursor-pointer transition-colors`}
                onClick={() => handleThemeClick(theme)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-indigo-600" />
                    <span className="font-medium text-gray-900">{theme}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${getScoreBadgeColor(avgScore)}`}>
                    {avgScore.toFixed(1)}/5
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {stats.count} objectif{stats.count > 1 ? 's' : ''} évalué{stats.count > 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Détails des objectifs pour le thème sélectionné */}
        {selectedTheme && themeStats[selectedTheme] && (
          <div className="mt-4 border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-indigo-600" />
              <h4 className="text-lg font-semibold text-gray-900">Objectifs du thème: {selectedTheme}</h4>
            </div>
            
            <div className="space-y-3">
              {themeStats[selectedTheme].objectives.map((objective, index) => {
                const evaluation = objective.evaluation;
                const evalIndex = objective.evaluationIndex;
                const autoEval = evaluation.auto_evaluation?.evaluations?.[evalIndex];
                const referentEval = evaluation.evaluation_referent?.evaluations?.[evalIndex];
                
                return (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                          {objective.theme_name}
                        </span>
                        {objective.is_custom && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            Personnalisé
                          </span>
                        )}
                        {objective.objective_type && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            objective.objective_type === 'smart' ? 'bg-green-100 text-green-800' : 
                            objective.objective_type === 'formation' ? 'bg-orange-100 text-orange-800' : 
                            'bg-indigo-100 text-indigo-800'
                          }`}>
                            {objective.objective_type === 'smart' ? 'SMART' : 
                             objective.objective_type === 'formation' ? 'Formation' : 
                             'Personnalisé'}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-medium text-gray-900">
                            {objective.skill_description}
                          </h5>
                          <p className="text-sm text-gray-700 mt-1">{objective.smart_objective}</p>
                        </div>
                        <div className="text-xs text-gray-500">
                          Projet: {evaluation.projet_titre}
                        </div>
                      </div>
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
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Synthèse des thématiques */}
      {renderThemesSummary()}
      
      {/* Liste des évaluations */}
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
                  <span className="text-xs text-gray-500">
                    {format(new Date(evaluation.date_soumission), 'dd/MM/yyyy', { locale: fr })}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleEvaluationExpansion(evaluation.evaluation_id);
                  }}
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
                {/* Résumé des scores */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-blue-800">Auto-évaluation</span>
                      <span className="text-sm font-bold text-blue-800">{evaluation.score_auto_evaluation.toFixed(1)}/5</span>
                    </div>
                    <div className="flex">
                      {getScoreStars(evaluation.score_auto_evaluation)}
                    </div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-green-800">Évaluation référent</span>
                      <span className="text-sm font-bold text-green-800">{evaluation.score_referent.toFixed(1)}/5</span>
                    </div>
                    <div className="flex">
                      {getScoreStars(evaluation.score_referent)}
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-purple-800">Note finale</span>
                      <span className="text-sm font-bold text-purple-800">{evaluation.note_finale.toFixed(1)}/5</span>
                    </div>
                    <div className="flex">
                      {getScoreStars(evaluation.note_finale)}
                    </div>
                  </div>
                </div>
                
                {/* Analyse des écarts */}
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-medium text-gray-900 mb-2">Analyse de l'évaluation</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Écart auto-évaluation / référent:</p>
                      <div className="flex items-center gap-2 mt-1">
                        <TrendingUp className="w-4 h-4 text-gray-500" />
                        <span className={`text-sm ${
                          Math.abs(evaluation.score_auto_evaluation - evaluation.score_referent) > 1 
                            ? 'text-red-600 font-medium' 
                            : 'text-green-600 font-medium'
                        }`}>
                          {(evaluation.score_referent - evaluation.score_auto_evaluation).toFixed(1)} points
                        </span>
                        <span className="text-xs text-gray-500">
                          {evaluation.score_auto_evaluation > evaluation.score_referent 
                            ? '(surestimation)' 
                            : evaluation.score_auto_evaluation < evaluation.score_referent 
                              ? '(sous-estimation)' 
                              : '(aligné)'}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700">Référent:</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-900">{evaluation.referent_nom || 'Non spécifié'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Détails des objectifs et évaluations */}
                {isDetailed && evaluation.objectifs && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Détails des objectifs évalués</h4>
                    
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
                              {objective.is_custom && (
                                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                  Personnalisé
                                </span>
                              )}
                              {objective.objective_type && (
                                <span className={`text-xs px-2 py-1 rounded ${
                                  objective.objective_type === 'smart' ? 'bg-green-100 text-green-800' : 
                                  objective.objective_type === 'formation' ? 'bg-orange-100 text-orange-800' : 
                                  'bg-indigo-100 text-indigo-800'
                                }`}>
                                  {objective.objective_type === 'smart' ? 'SMART' : 
                                   objective.objective_type === 'formation' ? 'Formation' : 
                                   'Personnalisé'}
                                </span>
                              )}
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
                                {autoEval.learnings && (
                                  <p className="text-sm text-blue-700 mt-1">
                                    <strong>Apprentissages:</strong> {autoEval.learnings}
                                  </p>
                                )}
                                {autoEval.difficulties && (
                                  <p className="text-sm text-blue-700 mt-1">
                                    <strong>Difficultés:</strong> {autoEval.difficulties}
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
                                {referentEval.areas_for_improvement && (
                                  <p className="text-sm text-green-700 mt-1">
                                    <strong>Axes d'amélioration:</strong> {referentEval.areas_for_improvement}
                                  </p>
                                )}
                                {referentEval.overall_performance && (
                                  <p className="text-sm text-green-700 mt-1">
                                    <strong>Performance globale:</strong> {referentEval.overall_performance}
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
                
                {!isDetailed && (
                  <button
                    onClick={(e) => toggleDetailedView(evaluation.evaluation_id, e)}
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    Voir les détails complets des objectifs
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