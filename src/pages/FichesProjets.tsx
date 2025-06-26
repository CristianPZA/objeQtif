import React, { useState, useEffect } from 'react';
import { Plus, Target, Calendar, User, BookOpen, CheckCircle, Clock, AlertCircle, Edit, Trash2, Eye, EyeOff, ChevronDown, ChevronRight, Save, X, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import AutoEvaluationModal from '../components/objectives/AutoEvaluationModal';
import ReferentEvaluationModal from '../components/objectives/ReferentEvaluationModal';

interface Collaboration {
  id: string;
  projet_id: string;
  employe_id: string;
  role_projet: string;
  taux_allocation: number;
  responsabilites: string | null;
  date_debut: string | null;
  date_fin: string | null;
  is_active: boolean;
  projet: {
    titre: string;
    nom_client: string;
    description: string;
    statut: string;
    date_debut: string;
    date_fin_prevue: string | null;
    auteur_nom: string;
    referent_nom: string;
    referent_projet_id: string;
    auteur_id: string;
  };
  objectifs?: {
    id: string;
    objectifs: ObjectiveDetail[];
    created_at: string;
  };
  evaluation?: {
    id: string;
    auto_evaluation: any;
    evaluation_referent: any;
    evaluation_coach: any;
    statut: string;
    date_soumission: string | null;
    created_at: string;
    updated_at: string;
  };
}

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
}

interface PathwaySkill {
  id: string;
  skill_description: string;
  examples: string | null;
  requirements: string | null;
  development_theme: {
    name: string;
    description: string;
  };
}

const FichesProjets = () => {
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'mes_objectifs' | 'mes_projets' | 'mes_evaluations' | 'evaluations_a_faire'>('mes_objectifs');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showCreateObjectiveModal, setShowCreateObjectiveModal] = useState(false);
  const [showAutoEvaluationModal, setShowAutoEvaluationModal] = useState(false);
  const [showReferentEvaluationModal, setShowReferentEvaluationModal] = useState(false);
  const [selectedCollaboration, setSelectedCollaboration] = useState<Collaboration | null>(null);
  const [availableSkills, setAvailableSkills] = useState<PathwaySkill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [objectives, setObjectives] = useState<ObjectiveDetail[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [expandedEvaluations, setExpandedEvaluations] = useState<Set<string>>(new Set());
  const [evaluationsToReview, setEvaluationsToReview] = useState<any[]>([]);

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
      await fetchCollaborations();
      await fetchEvaluationsToReview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchCollaborations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('projet_collaborateurs')
        .select(`
          *,
          projet:projets!inner(
            titre,
            nom_client,
            description,
            statut,
            date_debut,
            date_fin_prevue,
            referent_projet_id,
            auteur_id,
            auteur:user_profiles!auteur_id(full_name),
            referent:user_profiles!referent_projet_id(full_name)
          )
        `)
        .eq('employe_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrichir avec les objectifs et évaluations
      const enrichedCollaborations = await Promise.all(
        (data || []).map(async (collab) => {
          // Récupérer les objectifs
          const { data: objectifsData } = await supabase
            .from('objectifs_collaborateurs')
            .select('*')
            .eq('collaboration_id', collab.id)
            .maybeSingle();

          // Récupérer l'évaluation si elle existe
          let evaluationData = null;
          if (objectifsData) {
            const { data: evalData } = await supabase
              .from('evaluations_objectifs')
              .select('*')
              .eq('objectifs_id', objectifsData.id)
              .maybeSingle();
            evaluationData = evalData;
          }

          return {
            ...collab,
            projet: {
              ...collab.projet,
              auteur_nom: collab.projet.auteur?.full_name || 'Inconnu',
              referent_nom: collab.projet.referent?.full_name || 'Inconnu'
            },
            objectifs: objectifsData,
            evaluation: evaluationData
          };
        })
      );

      setCollaborations(enrichedCollaborations);
    } catch (err) {
      console.error('Error fetching collaborations:', err);
      setError('Erreur lors du chargement des collaborations');
    }
  };

  const fetchEvaluationsToReview = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer les évaluations en attente pour les projets où l'utilisateur est référent
      const { data, error } = await supabase
        .from('v_auto_evaluations_completes')
        .select('*')
        .eq('referent_projet_id', user.id)
        .eq('statut', 'en_attente_referent')
        .order('date_soumission', { ascending: false });

      if (error) throw error;
      setEvaluationsToReview(data || []);
    } catch (err) {
      console.error('Error fetching evaluations to review:', err);
    }
  };

  const fetchAvailableSkills = async (collaboration: Collaboration) => {
    if (!currentUser?.career_pathway_id || !currentUser?.career_level_id) {
      setError('Votre profil doit avoir un Career Pathway et un niveau de carrière configurés pour créer des objectifs');
      return;
    }

    try {
      setLoading(true);
      
      // Récupérer les thèmes de développement pour le career pathway
      const { data: themeData, error: themeError } = await supabase
        .from('development_themes')
        .select('id')
        .eq('career_area_id', currentUser.career_pathway_id)
        .eq('is_active', true);

      if (themeError) throw themeError;

      const themeIds = (themeData || []).map(theme => theme.id);

      if (themeIds.length === 0) {
        setAvailableSkills([]);
        setError('Aucun thème de développement trouvé pour votre parcours de carrière');
        return;
      }

      // Récupérer les compétences pour le niveau actuel
      const { data, error } = await supabase
        .from('pathway_skills')
        .select(`
          id,
          skill_description,
          examples,
          requirements,
          development_theme:development_themes!development_theme_id(
            name,
            description
          )
        `)
        .eq('career_level_id', currentUser.career_level_id)
        .in('development_theme_id', themeIds);

      if (error) throw error;
      
      const validSkills = (data || []).filter(skill => skill.development_theme);
      setAvailableSkills(validSkills);
      
      if (validSkills.length === 0) {
        setError('Aucune compétence trouvée pour votre niveau et parcours de carrière');
      }
    } catch (err) {
      console.error('Error fetching skills:', err);
      setError('Erreur lors du chargement des compétences');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateObjectives = async (collaboration: Collaboration) => {
    setSelectedCollaboration(collaboration);
    setSelectedSkills([]);
    setObjectives([]);
    await fetchAvailableSkills(collaboration);
    setShowCreateObjectiveModal(true);
  };

  const handleAutoEvaluation = (collaboration: Collaboration) => {
    setSelectedCollaboration(collaboration);
    setShowAutoEvaluationModal(true);
  };

  const handleReferentEvaluation = (evaluation: any) => {
    setSelectedCollaboration(evaluation);
    setShowReferentEvaluationModal(true);
  };

  const handleSkillToggle = (skillId: string) => {
    setSelectedSkills(prev => {
      if (prev.includes(skillId)) {
        return prev.filter(id => id !== skillId);
      } else if (prev.length < 4) {
        return [...prev, skillId];
      }
      return prev;
    });
  };

  const initializeObjectives = () => {
    const newObjectives = selectedSkills.map(skillId => {
      const skill = availableSkills.find(s => s.id === skillId);
      return {
        skill_id: skillId,
        skill_description: skill?.skill_description || '',
        theme_name: skill?.development_theme?.name || '',
        smart_objective: '',
        specific: '',
        measurable: '',
        achievable: '',
        relevant: '',
        time_bound: ''
      };
    });
    setObjectives(newObjectives);
  };

  useEffect(() => {
    if (selectedSkills.length > 0) {
      initializeObjectives();
    } else {
      setObjectives([]);
    }
  }, [selectedSkills, availableSkills]);

  const handleObjectiveChange = (index: number, field: keyof ObjectiveDetail, value: string) => {
    setObjectives(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const validateObjectives = () => {
    return objectives.every(obj => 
      obj.smart_objective.trim() !== '' &&
      obj.specific.trim() !== '' &&
      obj.measurable.trim() !== '' &&
      obj.achievable.trim() !== '' &&
      obj.relevant.trim() !== '' &&
      obj.time_bound.trim() !== ''
    );
  };

  const handleSubmitObjectives = async () => {
    if (!selectedCollaboration || !validateObjectives()) {
      setError('Veuillez remplir tous les champs SMART pour chaque objectif');
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('objectifs_collaborateurs')
        .insert([{
          collaboration_id: selectedCollaboration.id,
          objectifs: objectives
        }]);

      if (error) throw error;

      setSuccess('Objectifs créés avec succès');
      setShowCreateObjectiveModal(false);
      setSelectedCollaboration(null);
      setSelectedSkills([]);
      setObjectives([]);
      fetchCollaborations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création des objectifs');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'brouillon':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'soumise':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'en_attente_referent':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'evaluee_referent':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'finalisee':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejetee':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'brouillon':
        return 'Brouillon';
      case 'soumise':
        return 'Soumise';
      case 'en_attente_referent':
        return 'En attente référent';
      case 'evaluee_referent':
        return 'Évaluée par référent';
      case 'finalisee':
        return 'Finalisée';
      case 'rejetee':
        return 'Rejetée';
      default:
        return 'Inconnu';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'brouillon':
        return 'bg-gray-100 text-gray-800';
      case 'soumise':
        return 'bg-blue-100 text-blue-800';
      case 'en_attente_referent':
        return 'bg-orange-100 text-orange-800';
      case 'evaluee_referent':
        return 'bg-green-100 text-green-800';
      case 'finalisee':
        return 'bg-green-100 text-green-800';
      case 'rejetee':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canCreateObjectives = () => {
    return currentUser && currentUser.career_pathway_id && currentUser.career_level_id;
  };

  const canDoAutoEvaluation = (collaboration: Collaboration) => {
    return collaboration.objectifs && 
           collaboration.projet.statut === 'termine' && 
           (!collaboration.evaluation || collaboration.evaluation.statut === 'brouillon');
  };

  const canDoReferentEvaluation = (evaluation: any) => {
    return evaluation.statut === 'en_attente_referent' && 
           evaluation.referent_projet_id === currentUser?.id;
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

  if (loading && !showCreateObjectiveModal && !showAutoEvaluationModal && !showReferentEvaluationModal) {
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
          <h1 className="text-3xl font-bold text-gray-900">Mes Fiches Projets</h1>
          <p className="text-gray-600 mt-1">Gérez vos objectifs et évaluations de projets</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg border border-green-200">
          {success}
        </div>
      )}

      {/* Info pour les utilisateurs sans career pathway */}
      {!canCreateObjectives() && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Configuration requise</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Pour créer des objectifs de projet, vous devez avoir un Career Pathway et un niveau de carrière assignés. 
                Contactez votre administrateur ou votre coach pour configurer votre profil.
              </p>
              <div className="mt-2 text-xs text-yellow-600">
                <p>• Career Pathway: {currentUser?.career_pathway_id ? '✓ Configuré' : '✗ Non configuré'}</p>
                <p>• Niveau de carrière: {currentUser?.career_level_id ? '✓ Configuré' : '✗ Non configuré'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('mes_objectifs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'mes_objectifs'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Mes objectifs projets
            </div>
          </button>
          <button
            onClick={() => setActiveTab('mes_evaluations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'mes_evaluations'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Mes auto-évaluations
            </div>
          </button>
          {evaluationsToReview.length > 0 && (
            <button
              onClick={() => setActiveTab('evaluations_a_faire')}
              className={`py-2 px-1 border-b-2 font-medium text-sm relative ${
                activeTab === 'evaluations_a_faire'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Évaluations à faire
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 ml-1">
                  {evaluationsToReview.length}
                </span>
              </div>
            </button>
          )}
          <button
            onClick={() => setActiveTab('mes_projets')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'mes_projets'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Mes projets
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'mes_objectifs' && (
        <div className="space-y-4">
          {collaborations.filter(c => c.objectifs).length > 0 ? (
            collaborations
              .filter(c => c.objectifs)
              .map((collaboration) => (
                <div key={collaboration.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Target className="w-5 h-5 text-indigo-600" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            {collaboration.projet.titre}
                          </h3>
                          {collaboration.evaluation && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(collaboration.evaluation.statut)}`}>
                              {getStatusIcon(collaboration.evaluation.statut)}
                              <span className="ml-1">{getStatusLabel(collaboration.evaluation.statut)}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Client:</strong> {collaboration.projet.nom_client}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Rôle:</strong> {collaboration.role_projet}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {canDoAutoEvaluation(collaboration) && (
                          <button
                            onClick={() => handleAutoEvaluation(collaboration)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-1 transition-colors"
                          >
                            <Star className="w-3 h-3" />
                            Auto-évaluation
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Objectifs */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Objectifs définis ({collaboration.objectifs?.objectifs.length || 0})</h4>
                      {collaboration.objectifs?.objectifs.map((objective: ObjectiveDetail, index: number) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          <div className="mb-2">
                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                              {objective.theme_name}
                            </span>
                          </div>
                          <h5 className="font-medium text-gray-900 mb-2">
                            {index + 1}. {objective.skill_description}
                          </h5>
                          <p className="text-sm text-gray-700">
                            <strong>Objectif:</strong> {objective.smart_objective}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-500 mt-4 pt-4 border-t">
                      <span>
                        Objectifs créés le {collaboration.objectifs && format(new Date(collaboration.objectifs.created_at), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun objectif défini</h3>
              <p className="text-gray-600">
                Vous n'avez pas encore défini d'objectifs pour vos projets.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'evaluations_a_faire' && (
        <div className="space-y-4">
          {evaluationsToReview.length > 0 ? (
            evaluationsToReview.map((evaluation) => (
              <div key={evaluation.evaluation_id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CheckCircle className="w-5 h-5 text-orange-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          Évaluation de {evaluation.employe_nom}
                        </h3>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          En attente de votre évaluation
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Projet:</strong> {evaluation.projet_titre} - {evaluation.nom_client}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Soumise le:</strong> {format(new Date(evaluation.date_soumission), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleReferentEvaluation(evaluation)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Évaluer
                    </button>
                  </div>

                  {/* Résumé de l'auto-évaluation */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">
                      Auto-évaluation de l'employé (Score moyen: {evaluation.score_moyen}/5)
                    </h4>
                    <div className="flex">
                      {getScoreStars(evaluation.score_moyen)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune évaluation en attente</h3>
              <p className="text-gray-600">
                Aucune auto-évaluation n'attend votre évaluation en tant que référent.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'mes_evaluations' && (
        <div className="space-y-4">
          {collaborations.filter(c => c.evaluation).length > 0 ? (
            collaborations
              .filter(c => c.evaluation)
              .map((collaboration) => {
                const isExpanded = expandedEvaluations.has(collaboration.evaluation!.id);
                
                return (
                  <div key={collaboration.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Star className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-lg font-semibold text-gray-900">
                              {collaboration.projet.titre}
                            </h3>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(collaboration.evaluation!.statut)}`}>
                              {getStatusIcon(collaboration.evaluation!.statut)}
                              <span className="ml-1">{getStatusLabel(collaboration.evaluation!.statut)}</span>
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Client:</strong> {collaboration.projet.nom_client}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Rôle:</strong> {collaboration.role_projet}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleEvaluationExpansion(collaboration.evaluation!.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </div>

                      {/* Résumé de l'évaluation */}
                      {collaboration.evaluation?.auto_evaluation?.evaluations && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">
                            Résumé de votre auto-évaluation ({collaboration.evaluation.auto_evaluation.evaluations.length} objectifs)
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {collaboration.evaluation.auto_evaluation.evaluations.map((evalItem: any, index: number) => (
                              <div key={index} className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                                <span className="text-xs text-gray-600">Obj. {index + 1}:</span>
                                <div className="flex">
                                  {getScoreStars(evalItem.auto_evaluation_score)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Détails de l'évaluation */}
                      {isExpanded && collaboration.evaluation?.auto_evaluation?.evaluations && (
                        <div className="border-t pt-4 space-y-4">
                          {collaboration.evaluation.auto_evaluation.evaluations.map((evalItem: any, index: number) => {
                            const objective = collaboration.objectifs?.objectifs[index];
                            
                            return (
                              <div key={index} className="bg-gray-50 rounded-lg p-4">
                                <div className="mb-3">
                                  <h5 className="font-medium text-gray-900 mb-1">
                                    {index + 1}. {objective?.skill_description || 'Objectif non trouvé'}
                                  </h5>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">Score:</span>
                                    <div className="flex">
                                      {getScoreStars(evalItem.auto_evaluation_score)}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-2 text-sm">
                                  {evalItem.auto_evaluation_comment && (
                                    <div>
                                      <strong className="text-gray-700">Commentaire:</strong>
                                      <p className="text-gray-600 mt-1">{evalItem.auto_evaluation_comment}</p>
                                    </div>
                                  )}
                                  {evalItem.achievements && (
                                    <div>
                                      <strong className="text-gray-700">Réalisations:</strong>
                                      <p className="text-gray-600 mt-1">{evalItem.achievements}</p>
                                    </div>
                                  )}
                                  {evalItem.learnings && (
                                    <div>
                                      <strong className="text-gray-700">Apprentissages:</strong>
                                      <p className="text-gray-600 mt-1">{evalItem.learnings}</p>
                                    </div>
                                  )}
                                  {evalItem.difficulties && (
                                    <div>
                                      <strong className="text-gray-700">Difficultés:</strong>
                                      <p className="text-gray-600 mt-1">{evalItem.difficulties}</p>
                                    </div>
                                  )}
                                  {evalItem.next_steps && (
                                    <div>
                                      <strong className="text-gray-700">Prochaines étapes:</strong>
                                      <p className="text-gray-600 mt-1">{evalItem.next_steps}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex justify-between items-center text-xs text-gray-500 mt-4 pt-4 border-t">
                        <span>
                          Évaluation soumise le {collaboration.evaluation?.date_soumission && format(new Date(collaboration.evaluation.date_soumission), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <Star className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune auto-évaluation</h3>
              <p className="text-gray-600">
                Vous n'avez pas encore réalisé d'auto-évaluation. Les auto-évaluations sont disponibles lorsque vos projets sont terminés.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'mes_projets' && (
        <div className="space-y-4">
          {collaborations.length > 0 ? (
            collaborations.map((collaboration) => (
              <div key={collaboration.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {collaboration.projet.titre}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          collaboration.projet.statut === 'termine' ? 'bg-green-100 text-green-800' :
                          collaboration.projet.statut === 'en_cours' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {collaboration.projet.statut === 'termine' ? 'Terminé' :
                           collaboration.projet.statut === 'en_cours' ? 'En cours' :
                           collaboration.projet.statut}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Client:</strong> {collaboration.projet.nom_client}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Rôle:</strong> {collaboration.role_projet}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Référent:</strong> {collaboration.projet.referent_nom}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!collaboration.objectifs && canCreateObjectives() && collaboration.projet.statut === 'en_cours' && (
                        <button
                          onClick={() => handleCreateObjectives(collaboration)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Créer objectifs
                        </button>
                      )}
                      {collaboration.objectifs && !collaboration.evaluation && collaboration.projet.statut === 'en_cours' && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm">
                          ✓ Objectifs définis
                        </span>
                      )}
                      {collaboration.objectifs && collaboration.projet.statut === 'termine' && (
                        <div className="flex gap-2">
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm">
                            ✓ Objectifs définis
                          </span>
                          {canDoAutoEvaluation(collaboration) && (
                            <button
                              onClick={() => handleAutoEvaluation(collaboration)}
                              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm flex items-center gap-1 transition-colors"
                            >
                              <Star className="w-3 h-3" />
                              Auto-évaluation requise
                            </button>
                          )}
                          {collaboration.evaluation && (
                            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-sm">
                              ✓ Auto-évaluation terminée
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Début: {format(new Date(collaboration.projet.date_debut), 'dd/MM/yyyy', { locale: fr })}</span>
                    </div>
                    {collaboration.projet.date_fin_prevue && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Fin prévue: {format(new Date(collaboration.projet.date_fin_prevue), 'dd/MM/yyyy', { locale: fr })}</span>
                      </div>
                    )}
                  </div>

                  {collaboration.responsabilites && (
                    <div className="mt-3 text-sm text-gray-600">
                      <strong>Responsabilités:</strong> {collaboration.responsabilites}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun projet assigné</h3>
              <p className="text-gray-600">
                Vous n'êtes actuellement assigné à aucun projet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal de création d'objectifs */}
      {showCreateObjectiveModal && selectedCollaboration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Créer des objectifs pour le projet</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedCollaboration.projet.titre} - {selectedCollaboration.projet.nom_client}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateObjectiveModal(false);
                  setSelectedCollaboration(null);
                  setSelectedSkills([]);
                  setObjectives([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {availableSkills.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune compétence disponible</h3>
                  <p className="text-gray-600">
                    Aucune compétence n'est définie pour votre niveau et parcours de carrière.
                    Contactez votre administrateur pour configurer les compétences.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Sélection des compétences */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Sélectionner jusqu'à 4 compétences à développer
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Compétences de votre niveau pour le parcours {currentUser?.career_pathway?.name}
                      ({selectedSkills.length}/4 sélectionnées)
                    </p>

                    <div className="space-y-3">
                      {availableSkills.map((skill) => {
                        const isSelected = selectedSkills.includes(skill.id);
                        const isDisabled = !isSelected && selectedSkills.length >= 4;
                        
                        return (
                          <div
                            key={skill.id}
                            onClick={() => !isDisabled && handleSkillToggle(skill.id)}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-50'
                                : isDisabled
                                ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                                : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                    {skill.development_theme.name}
                                  </span>
                                  {isSelected && (
                                    <CheckCircle className="w-4 h-4 text-indigo-600" />
                                  )}
                                </div>
                                <h4 className="font-medium text-gray-900 mb-2">{skill.skill_description}</h4>
                                {skill.examples && (
                                  <p className="text-sm text-gray-600 mb-1">
                                    <strong>Exemples:</strong> {skill.examples}
                                  </p>
                                )}
                                {skill.requirements && (
                                  <p className="text-sm text-gray-600">
                                    <strong>Prérequis:</strong> {skill.requirements}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Formulaire des objectifs SMART */}
                  {objectives.length > 0 && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Définir les objectifs SMART
                      </h3>

                      {objectives.map((objective, index) => (
                        <div key={objective.skill_id} className="border border-gray-200 rounded-lg p-6">
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {objective.theme_name}
                              </span>
                            </div>
                            <h4 className="text-lg font-semibold text-gray-900">
                              {index + 1}. {objective.skill_description}
                            </h4>
                          </div>

                          <div className="space-y-4">
                            {/* Objectif SMART global */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Objectif SMART *
                              </label>
                              <textarea
                                rows={3}
                                value={objective.smart_objective}
                                onChange={(e) => handleObjectiveChange(index, 'smart_objective', e.target.value)}
                                placeholder="Décrivez votre objectif de développement pour cette compétence..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </div>

                            {/* Critères SMART */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Spécifique (S) *
                                </label>
                                <textarea
                                  rows={2}
                                  value={objective.specific}
                                  onChange={(e) => handleObjectiveChange(index, 'specific', e.target.value)}
                                  placeholder="Que voulez-vous accomplir exactement ?"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Mesurable (M) *
                                </label>
                                <textarea
                                  rows={2}
                                  value={objective.measurable}
                                  onChange={(e) => handleObjectiveChange(index, 'measurable', e.target.value)}
                                  placeholder="Comment allez-vous mesurer votre progression ?"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Atteignable (A) *
                                </label>
                                <textarea
                                  rows={2}
                                  value={objective.achievable}
                                  onChange={(e) => handleObjectiveChange(index, 'achievable', e.target.value)}
                                  placeholder="Pourquoi cet objectif est-il réalisable ?"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Pertinent (R) *
                                </label>
                                <textarea
                                  rows={2}
                                  value={objective.relevant}
                                  onChange={(e) => handleObjectiveChange(index, 'relevant', e.target.value)}
                                  placeholder="En quoi cette compétence est-elle importante ?"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Temporellement défini (T) *
                              </label>
                              <textarea
                                rows={2}
                                value={objective.time_bound}
                                onChange={(e) => handleObjectiveChange(index, 'time_bound', e.target.value)}
                                placeholder="Quelle est l'échéance pour développer cette compétence ?"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-6 border-t">
                    <button
                      onClick={() => {
                        setShowCreateObjectiveModal(false);
                        setSelectedCollaboration(null);
                        setSelectedSkills([]);
                        setObjectives([]);
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSubmitObjectives}
                      disabled={submitting || selectedSkills.length === 0 || !validateObjectives()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {submitting ? 'Création...' : 'Créer les objectifs'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal d'auto-évaluation */}
      {showAutoEvaluationModal && selectedCollaboration && selectedCollaboration.objectifs && (
        <AutoEvaluationModal
          collaboration={selectedCollaboration}
          objectives={selectedCollaboration.objectifs.objectifs}
          onClose={() => {
            setShowAutoEvaluationModal(false);
            setSelectedCollaboration(null);
          }}
          onSuccess={() => {
            setSuccess('Auto-évaluation soumise avec succès');
            setShowAutoEvaluationModal(false);
            setSelectedCollaboration(null);
            fetchCollaborations();
          }}
          onError={(error) => {
            setError(error);
            setTimeout(() => setError(null), 5000);
          }}
        />
      )}

      {/* Modal d'évaluation référent */}
      {showReferentEvaluationModal && selectedCollaboration && (
        <ReferentEvaluationModal
          evaluation={selectedCollaboration}
          objectives={selectedCollaboration.objectifs || []}
          autoEvaluations={selectedCollaboration.auto_evaluation?.evaluations || []}
          onClose={() => {
            setShowReferentEvaluationModal(false);
            setSelectedCollaboration(null);
          }}
          onSuccess={() => {
            setSuccess('Évaluation référent soumise avec succès');
            setShowReferentEvaluationModal(false);
            setSelectedCollaboration(null);
            fetchEvaluationsToReview();
            fetchCollaborations();
          }}
          onError={(error) => {
            setError(error);
            setTimeout(() => setError(null), 5000);
          }}
        />
      )}
    </div>
  );
};

export default FichesProjets;