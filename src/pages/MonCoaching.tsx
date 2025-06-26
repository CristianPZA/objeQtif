import React, { useState, useEffect } from 'react';
import { Users, Target, Star, TrendingUp, Calendar, User, BookOpen, Award, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CoachingEvaluation {
  evaluation_id: string;
  objectifs_id: string;
  auto_evaluation: any;
  evaluation_referent: any;
  statut: string;
  date_soumission: string;
  created_at: string;
  updated_at: string;
  employe_id: string;
  employe_nom: string;
  employe_role: string;
  employe_department: string;
  coach_id: string;
  projet_id: string;
  projet_titre: string;
  nom_client: string;
  projet_statut: string;
  referent_projet_id: string;
  referent_nom: string;
  objectifs: any[];
  score_auto_evaluation: number;
  score_referent: number;
  note_finale: number;
}

const MonCoaching = () => {
  const [evaluations, setEvaluations] = useState<CoachingEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [expandedEvaluations, setExpandedEvaluations] = useState<Set<string>>(new Set());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('Profil utilisateur non trouvé');

      setCurrentUser(profile);
      await fetchCoachingEvaluations(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchCoachingEvaluations = async (coachId: string) => {
    try {
      const { data, error } = await supabase
        .from('v_coaching_evaluations')
        .select('*')
        .eq('coach_id', coachId)
        .order('date_soumission', { ascending: false });

      if (error) throw error;
      setEvaluations(data || []);
    } catch (err) {
      console.error('Error fetching coaching evaluations:', err);
      setError('Erreur lors du chargement des évaluations');
    }
  };

  const toggleEvaluationExpansion = (evaluationId: string) => {
    setExpandedEvaluations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(evaluationId)) {
        newSet.delete(evaluationId);
      } else {
        newSet.add(evaluationId);
      }
      return newSet;
    });
  };

  const getScoreStars = (score: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < score ? 'fill-current text-yellow-400' : 'text-gray-300'}`} 
      />
    ));
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 3.5) return 'text-blue-600';
    if (score >= 2.5) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 4.5) return 'bg-green-100 text-green-800';
    if (score >= 3.5) return 'bg-blue-100 text-blue-800';
    if (score >= 2.5) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getUniqueEmployees = () => {
    const employees = evaluations.reduce((acc, eval) => {
      if (!acc.find(emp => emp.id === eval.employe_id)) {
        acc.push({
          id: eval.employe_id,
          name: eval.employe_nom,
          role: eval.employe_role,
          department: eval.employe_department
        });
      }
      return acc;
    }, [] as any[]);
    return employees;
  };

  const filteredEvaluations = selectedEmployee 
    ? evaluations.filter(eval => eval.employe_id === selectedEmployee)
    : evaluations;

  const getEmployeeStats = (employeeId: string) => {
    const employeeEvals = evaluations.filter(eval => eval.employe_id === employeeId);
    const avgScore = employeeEvals.length > 0 
      ? employeeEvals.reduce((sum, eval) => sum + eval.note_finale, 0) / employeeEvals.length
      : 0;
    return {
      totalEvaluations: employeeEvals.length,
      averageScore: avgScore,
      lastEvaluation: employeeEvals[0]?.date_soumission
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mon Coaching</h1>
          <p className="text-gray-600 mt-1">Suivez les évaluations et le développement de vos coachés</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Coachés</p>
              <p className="text-2xl font-bold text-gray-900">{getUniqueEmployees().length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Évaluations</p>
              <p className="text-2xl font-bold text-gray-900">{evaluations.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Star className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Note moyenne</p>
              <p className="text-2xl font-bold text-gray-900">
                {evaluations.length > 0 
                  ? (evaluations.reduce((sum, eval) => sum + eval.note_finale, 0) / evaluations.length).toFixed(1)
                  : '0.0'
                }/5
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Projets</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(evaluations.map(eval => eval.projet_id)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtre par employé */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filtrer par coaché:</label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Tous les coachés</option>
            {getUniqueEmployees().map(employee => (
              <option key={employee.id} value={employee.id}>
                {employee.name} ({employee.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Vue d'ensemble des coachés */}
      {!selectedEmployee && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Vue d'ensemble des coachés</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getUniqueEmployees().map(employee => {
                const stats = getEmployeeStats(employee.id);
                return (
                  <div key={employee.id} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{employee.name}</h3>
                        <p className="text-sm text-gray-600">{employee.role}</p>
                        {employee.department && (
                          <p className="text-xs text-gray-500">{employee.department}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreBadgeColor(stats.averageScore)}`}>
                        {stats.averageScore.toFixed(1)}/5
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Évaluations:</span>
                        <span>{stats.totalEvaluations}</span>
                      </div>
                      {stats.lastEvaluation && (
                        <div className="flex justify-between">
                          <span>Dernière:</span>
                          <span>{format(new Date(stats.lastEvaluation), 'dd/MM/yyyy', { locale: fr })}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedEmployee(employee.id)}
                      className="mt-3 w-full px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-sm hover:bg-indigo-200 transition-colors"
                    >
                      Voir les détails
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Liste des évaluations */}
      <div className="space-y-4">
        {filteredEvaluations.length > 0 ? (
          filteredEvaluations.map((evaluation) => {
            const isExpanded = expandedEvaluations.has(evaluation.evaluation_id);
            
            return (
              <div key={evaluation.evaluation_id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Award className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {evaluation.projet_titre}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreBadgeColor(evaluation.note_finale)}`}>
                          Note finale: {evaluation.note_finale}/5
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{evaluation.employe_nom}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          <span>Client: {evaluation.nom_client}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>Évalué le {format(new Date(evaluation.date_soumission), 'dd/MM/yyyy', { locale: fr })}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleEvaluationExpansion(evaluation.evaluation_id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>

                  {/* Résumé des scores */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                        <span className="text-sm font-medium text-green-800">Éval. Référent</span>
                        <span className="text-sm font-bold text-green-800">{evaluation.score_referent}/5</span>
                      </div>
                      <div className="flex">
                        {getScoreStars(evaluation.score_referent)}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-purple-800">Note finale</span>
                        <span className="text-sm font-bold text-purple-800">{evaluation.note_finale}/5</span>
                      </div>
                      <div className="flex">
                        {getScoreStars(evaluation.note_finale)}
                      </div>
                    </div>
                  </div>

                  {/* Détails des évaluations */}
                  {isExpanded && (
                    <div className="border-t pt-4 space-y-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">
                          Objectifs évalués ({evaluation.objectifs.length})
                        </h4>
                        <div className="space-y-4">
                          {evaluation.objectifs.map((objective: any, index: number) => {
                            const autoEval = evaluation.auto_evaluation?.evaluations?.[index];
                            const referentEval = evaluation.evaluation_referent?.evaluations?.[index];
                            
                            return (
                              <div key={index} className="bg-gray-50 rounded-lg p-4">
                                <div className="mb-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                      {objective.theme_name}
                                    </span>
                                  </div>
                                  <h5 className="font-medium text-gray-900">
                                    {index + 1}. {objective.skill_description}
                                  </h5>
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
                                      <h6 className="text-sm font-medium text-green-800 mb-2">Évaluation Référent</h6>
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
                      </div>

                      {/* Synthèse pour le coaching */}
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h4 className="font-medium text-purple-800 mb-3">Synthèse pour le coaching</h4>
                        <div className="space-y-2 text-sm text-purple-700">
                          <div className="flex justify-between">
                            <span>Écart auto-évaluation / référent:</span>
                            <span className={`font-medium ${Math.abs(evaluation.score_auto_evaluation - evaluation.score_referent) > 1 ? 'text-red-600' : 'text-green-600'}`}>
                              {(evaluation.score_referent - evaluation.score_auto_evaluation).toFixed(1)} points
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tendance d'auto-évaluation:</span>
                            <span className={`font-medium ${evaluation.score_auto_evaluation > evaluation.score_referent ? 'text-orange-600' : evaluation.score_auto_evaluation < evaluation.score_referent ? 'text-blue-600' : 'text-green-600'}`}>
                              {evaluation.score_auto_evaluation > evaluation.score_referent ? 'Surévaluation' : 
                               evaluation.score_auto_evaluation < evaluation.score_referent ? 'Sous-évaluation' : 'Alignée'}
                            </span>
                          </div>
                          <div className="mt-3 p-3 bg-white rounded border-l-4 border-purple-400">
                            <p className="text-sm text-gray-700">
                              <strong>Points de coaching suggérés:</strong>
                              {Math.abs(evaluation.score_auto_evaluation - evaluation.score_referent) > 1 
                                ? " Discuter de l'écart important entre auto-évaluation et évaluation référent. Explorer les perceptions et attentes."
                                : " Féliciter pour l'alignement des perceptions. Identifier les prochaines étapes de développement."
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
            <Award className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune évaluation disponible</h3>
            <p className="text-gray-600">
              {selectedEmployee 
                ? 'Aucune évaluation finalisée pour ce coaché.'
                : 'Aucune évaluation finalisée de vos coachés n\'est encore disponible.'
              }
            </p>
            {selectedEmployee && (
              <button
                onClick={() => setSelectedEmployee('')}
                className="mt-4 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
              >
                Voir tous les coachés
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonCoaching;