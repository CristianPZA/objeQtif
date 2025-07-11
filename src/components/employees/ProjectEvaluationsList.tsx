import React, { useState, useEffect } from 'react';
import { Award, ChevronDown, ChevronRight, Star, Eye, EyeOff, Tag, BarChart2, TrendingUp, Lightbulb, AlertCircle, CheckCircle, User, Briefcase } from 'lucide-react';
import { Evaluation } from './types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const [detailedView, setDetailedView] = useState<Set<string>>(new Set());
  const [themeStats, setThemeStats] = useState<Record<string, { count: number, totalScore: number, objectives: any[] }>>({});
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [objectiveDetails, setObjectiveDetails] = useState<Record<string, boolean>>({});

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
            evaluationIndex: index,
            objectiveId: `${evaluation.evaluation_id}-${index}`
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

  const toggleObjectiveDetail = (objectiveId: string) => {
    setObjectiveDetails(prev => ({
      ...prev,
      [objectiveId]: !prev[objectiveId]
    }));
  };

  if (evaluations.length === 0) {
    return (
      <div className="text-center py-8">
        <Award className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('coaching.noEvaluationsAvailable')}</h3>
        <p className="text-gray-600">
          {t('coaching.noEvaluationsForCoachee')}
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
          <h3 className="text-lg font-semibold text-gray-900">{t('coaching.thematicSummary')}</h3>
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
                  {stats.count} {t('common.skill', { count: stats.count })} {t('coaching.evaluated')}
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
              <h4 className="text-lg font-semibold text-gray-900">{t('coaching.themeObjectives')}: {selectedTheme}</h4>
            </div>
            
            <div className="space-y-3">
              {themeStats[selectedTheme].objectives.map((objective) => {
                const evaluation = objective.evaluation;
                const evalIndex = objective.evaluationIndex;
                const objectiveId = objective.objectiveId;
                const autoEval = evaluation.auto_evaluation?.evaluations?.[evalIndex];
                const referentEval = evaluation.evaluation_referent?.evaluations?.[evalIndex];
                const isDetailExpanded = objectiveDetails[objectiveId] || false;
                
                return (
                  <div key={objectiveId} className="bg-white rounded-lg p-4 border">
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
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
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
                          
                          {isDetailExpanded && (
                            <div className="mt-2 pt-2 border-t border-blue-200">
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
                              {autoEval.next_steps && (
                                <p className="text-sm text-blue-700 mt-1">
                                  <strong>Prochaines étapes:</strong> {autoEval.next_steps}
                                </p>
                              )}
                            </div>
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
                          
                          {isDetailExpanded && (
                            <div className="mt-2 pt-2 border-t border-green-200">
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
                      )}
                    </div>
                    
                    <div className="mt-2 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleObjectiveDetail(objectiveId);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                      >
                        {isDetailExpanded ? (
                          <>
                            <EyeOff className="w-3 h-3" />
                            {t('common.hideDetails')}
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            {t('common.viewMoreDetails')}
                          </>
                        )}
                      </button>
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
        
        // Calculer l'écart entre auto-évaluation et évaluation référent
        const scoreDifference = evaluation.score_referent - evaluation.score_auto_evaluation;
        const hasSignificantGap = Math.abs(scoreDifference) > 1;
        const isOverestimation = scoreDifference < 0;
        const isUnderestimation = scoreDifference > 0;
        
        return (
          <div key={evaluation.evaluation_id} className="bg-white rounded-lg border shadow-sm p-4">
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
              <div className="mt-4 space-y-4">
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
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <h4 className="font-medium text-gray-900 mb-3">Analyse de l'évaluation</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Écart auto-évaluation / référent:</p>
                      <div className="flex items-center gap-2 mt-1">
                        <TrendingUp className="w-4 h-4 text-gray-500" />
                        <span className={`text-sm ${
                          hasSignificantGap 
                            ? 'text-red-600 font-medium' 
                            : 'text-green-600 font-medium'
                        }`}>
                          {scoreDifference.toFixed(1)} points
                        </span>
                        <span className="text-xs text-gray-500">
                          {isOverestimation 
                            ? '(surestimation)' 
                            : isUnderestimation 
                              ? '(sous-estimation)' 
                              : '(aligné)'}
                        </span>
                      </div>
                      
                      {hasSignificantGap && (
                        <div className="mt-2 text-xs">
                          {isOverestimation ? (
                            <div className="flex items-start gap-1 text-orange-700">
                              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span>L'employé a tendance à surestimer ses compétences par rapport à l'évaluation du référent.</span>
                            </div>
                          ) : (
                            <div className="flex items-start gap-1 text-blue-700">
                              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span>L'employé a tendance à sous-estimer ses compétences par rapport à l'évaluation du référent.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700">Référent:</p>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-900">{evaluation.referent_nom || 'Non spécifié'}</span>
                      </div>
                      
                      <div className="mt-2 text-xs">
                        {!hasSignificantGap ? (
                          <div className="flex items-start gap-1 text-green-700">
                            <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>Bonne cohérence entre l'auto-évaluation et l'évaluation du référent.</span>
                          </div>
                        ) : null}
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
                      const objectiveId = `${evaluation.evaluation_id}-${index}`;
                      const isDetailExpanded = objectiveDetails[objectiveId] || false;
                      
                      return (
                        <div key={objectiveId} className="bg-gray-50 rounded-lg p-4 border">
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
                                
                                {isDetailExpanded && (
                                  <div className="mt-2 pt-2 border-t border-blue-200">
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
                                    {autoEval.next_steps && (
                                      <p className="text-sm text-blue-700 mt-1">
                                        <strong>Prochaines étapes:</strong> {autoEval.next_steps}
                                      </p>
                                    )}
                                  </div>
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
                                
                                {isDetailExpanded && (
                                  <div className="mt-2 pt-2 border-t border-green-200">
                                    {referentEval.observed_achievements && (
                                      <p className="text-sm text-green-700 mt-1">
                                        <strong>Observations:</strong> {referentEval.observed_achievements}
                                      </p>
                                    )}
                                    {referentEval.development_recommendations && (
                                <strong>{t('common.observations')}:</strong> {referentEval.observed_achievements}
                                        <strong>Recommandations:</strong> {referentEval.development_recommendations}
                                      </p>
                                    )}
                                    {referentEval.areas_for_improvement && (
                                <strong>{t('evaluation.recommendations')}:</strong> {referentEval.development_recommendations}
                                        <strong>Axes d'amélioration:</strong> {referentEval.areas_for_improvement}
                                      </p>
                                    )}
                                    {referentEval.overall_performance && (
                                <strong>{t('coaching.areasForImprovement')}:</strong> {referentEval.areas_for_improvement}
                                        <strong>Performance globale:</strong> {referentEval.overall_performance}
                                      </p>
                                    )}
                                  </div>
                                <strong>{t('coaching.overallPerformance')}:</strong> {referentEval.overall_performance}
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-2 text-center">
                            <button
                              onClick={() => toggleObjectiveDetail(objectiveId)}
                              className="text-xs text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                            >
                              {isDetailExpanded ? (
                                <>
                                  <EyeOff className="w-3 h-3" />
                                  Masquer les détails
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3" />
                                  Voir plus de détails
                                </>
                              )}
                            </button>
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