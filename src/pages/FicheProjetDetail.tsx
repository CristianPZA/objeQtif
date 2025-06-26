import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building, 
  Calendar, 
  User, 
  Users, 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Save,
  Plus,
  Edit,
  Star
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import AutoEvaluationModal from '../components/objectives/AutoEvaluationModal';

interface ProjectCollaboration {
  id: string;
  projet_id: string;
  employe_id: string;
  role_projet: string;
  taux_allocation: number;
  responsabilites: string | null;
  date_debut: string | null;
  date_fin: string | null;
  is_active: boolean;
  created_at: string;
  projet: {
    id: string;
    nom_client: string;
    titre: string;
    description: string;
    date_debut: string;
    date_fin_prevue: string | null;
    statut: string;
    priorite: string;
    taux_avancement: number;
    referent_nom: string;
    auteur_nom: string;
  };
  objectifs?: {
    id: string;
    objectifs: ObjectiveDetail[];
  };
  evaluation?: {
    id: string;
    statut: string;
    auto_evaluation: any;
    evaluation_referent: any;
    date_soumission: string;
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

const FicheProjetDetail = () => {
  const { collaborationId } = useParams<{ collaborationId: string }>();
  const navigate = useNavigate();
  
  const [collaboration, setCollaboration] = useState<ProjectCollaboration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showObjectivesForm, setShowObjectivesForm] = useState(false);
  const [showAutoEvaluationModal, setShowAutoEvaluationModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'objectives' | 'evaluation'>('objectives');

  // Form state pour les objectifs
  const [objectivesForm, setObjectivesForm] = useState<ObjectiveDetail[]>([]);

  useEffect(() => {
    if (collaborationId) {
      fetchCollaborationDetail();
    }
  }, [collaborationId]);

  const fetchCollaborationDetail = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      setCurrentUserId(user.id);

      // Récupérer les détails de la collaboration
      const { data: collaborationData, error: collaborationError } = await supabase
        .from('projet_collaborateurs')
        .select(`
          *,
          projet:projets!inner(
            id,
            nom_client,
            titre,
            description,
            date_debut,
            date_fin_prevue,
            statut,
            priorite,
            taux_avancement,
            referent_nom:user_profiles!referent_projet_id(full_name),
            auteur_nom:user_profiles!auteur_id(full_name)
          )
        `)
        .eq('id', collaborationId)
        .eq('employe_id', user.id)
        .single();

      if (collaborationError) throw collaborationError;

      // Récupérer les objectifs
      const { data: objectifsData } = await supabase
        .from('objectifs_collaborateurs')
        .select('*')
        .eq('collaboration_id', collaborationId)
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

      const enrichedCollaboration = {
        ...collaborationData,
        projet: {
          ...collaborationData.projet,
          referent_nom: collaborationData.projet.referent_nom?.full_name || 'Non défini',
          auteur_nom: collaborationData.projet.auteur_nom?.full_name || 'Non défini'
        },
        objectifs: objectifsData,
        evaluation: evaluationData
      };

      setCollaboration(enrichedCollaboration);

      // Initialiser le formulaire d'objectifs si ils existent
      if (objectifsData && objectifsData.objectifs) {
        setObjectivesForm(objectifsData.objectifs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateObjectives = () => {
    // Initialiser avec 4 objectifs vides
    const emptyObjectives: ObjectiveDetail[] = Array.from({ length: 4 }, (_, index) => ({
      skill_id: `temp_${index}`,
      skill_description: '',
      theme_name: '',
      smart_objective: '',
      specific: '',
      measurable: '',
      achievable: '',
      relevant: '',
      time_bound: ''
    }));
    
    setObjectivesForm(emptyObjectives);
    setShowObjectivesForm(true);
  };

  const handleEditObjectives = () => {
    if (collaboration?.objectifs) {
      setObjectivesForm(collaboration.objectifs.objectifs);
      setShowObjectivesForm(true);
    }
  };

  const handleSaveObjectives = async () => {
    if (!collaboration || !collaborationId) return;

    // Validation
    const isValid = objectivesForm.every(obj => 
      obj.skill_description.trim() !== '' &&
      obj.smart_objective.trim() !== '' &&
      obj.specific.trim() !== '' &&
      obj.measurable.trim() !== '' &&
      obj.achievable.trim() !== '' &&
      obj.relevant.trim() !== '' &&
      obj.time_bound.trim() !== ''
    );

    if (!isValid) {
      setError('Veuillez remplir tous les champs pour chaque objectif');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (collaboration.objectifs) {
        // Mettre à jour les objectifs existants
        const { error } = await supabase
          .from('objectifs_collaborateurs')
          .update({
            objectifs: objectivesForm
          })
          .eq('id', collaboration.objectifs.id);

        if (error) throw error;
      } else {
        // Créer de nouveaux objectifs
        const { error } = await supabase
          .from('objectifs_collaborateurs')
          .insert([{
            collaboration_id: collaborationId,
            objectifs: objectivesForm
          }]);

        if (error) throw error;
      }

      setSuccess('Objectifs sauvegardés avec succès');
      setShowObjectivesForm(false);
      fetchCollaborationDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartAutoEvaluation = () => {
    setShowAutoEvaluationModal(true);
  };

  const handleAutoEvaluationSuccess = () => {
    setShowAutoEvaluationModal(false);
    setSuccess('Auto-évaluation soumise avec succès');
    fetchCollaborationDetail();
  };

  const updateObjective = (index: number, field: keyof ObjectiveDetail, value: string) => {
    setObjectivesForm(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'en_cours':
        return 'bg-blue-100 text-blue-800';
      case 'termine':
        return 'bg-green-100 text-green-800';
      case 'suspendu':
        return 'bg-yellow-100 text-yellow-800';
      case 'annule':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'en_cours':
        return 'En cours';
      case 'termine':
        return 'Terminé';
      case 'suspendu':
        return 'Suspendu';
      case 'annule':
        return 'Annulé';
      default:
        return statut;
    }
  };

  const canDefineObjectives = () => {
    return collaboration && collaboration.projet.statut !== 'annule';
  };

  const canAutoEvaluate = () => {
    return collaboration && 
           collaboration.objectifs && 
           collaboration.projet.statut === 'termine' &&
           (!collaboration.evaluation || collaboration.evaluation.statut === 'brouillon');
  };

  const getEvaluationStatusBadge = () => {
    if (!collaboration?.evaluation) {
      if (collaboration?.projet.statut === 'termine') {
        return { text: 'À faire', color: 'bg-orange-100 text-orange-800' };
      }
      return { text: 'En attente', color: 'bg-gray-100 text-gray-800' };
    }

    switch (collaboration.evaluation.statut) {
      case 'brouillon':
        return { text: 'Brouillon', color: 'bg-gray-100 text-gray-800' };
      case 'soumise':
        return { text: 'Soumise', color: 'bg-blue-100 text-blue-800' };
      case 'en_attente_referent':
        return { text: 'En attente référent', color: 'bg-yellow-100 text-yellow-800' };
      case 'evaluee_referent':
        return { text: 'Évaluée par référent', color: 'bg-purple-100 text-purple-800' };
      case 'finalisee':
        return { text: 'Finalisée', color: 'bg-green-100 text-green-800' };
      case 'rejetee':
        return { text: 'Rejetée', color: 'bg-red-100 text-red-800' };
      default:
        return { text: 'Statut inconnu', color: 'bg-gray-100 text-gray-800' };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && !collaboration) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg max-w-md mx-auto">
          <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
          <p className="font-medium">Erreur de chargement</p>
          <p className="text-sm mt-1">{error}</p>
          <button 
            onClick={() => navigate('/fiches-projets')}
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md transition-colors text-sm"
          >
            Retour aux fiches projets
          </button>
        </div>
      </div>
    );
  }

  if (!collaboration) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-50 text-gray-700 p-4 rounded-lg max-w-md mx-auto">
          <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
          <p className="font-medium">Fiche projet non trouvée</p>
          <button 
            onClick={() => navigate('/fiches-projets')}
            className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-sm"
          >
            Retour aux fiches projets
          </button>
        </div>
      </div>
    );
  }

  const evaluationBadge = getEvaluationStatusBadge();

  return (
    <div className="space-y-6">
      {/* Header avec bouton retour */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/fiches-projets')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour aux fiches projets</span>
          </button>
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

      {/* Informations du projet */}
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <Building className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{collaboration.projet.titre}</h1>
                <p className="text-lg text-gray-600 mt-1">Client: {collaboration.projet.nom_client}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 text-sm rounded-full ${getStatutColor(collaboration.projet.statut)}`}>
                {getStatutLabel(collaboration.projet.statut)}
              </span>
            </div>
          </div>

          {/* Indicateur projet terminé */}
          {collaboration.projet.statut === 'termine' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
              <CheckCircle className="h-6 w-6" />
              <span className="font-medium">Projet terminé</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
          <p className="text-gray-700 leading-relaxed">{collaboration.projet.description}</p>
        </div>

        {/* Informations principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Date de début</p>
              <p className="font-medium text-gray-900">
                {format(new Date(collaboration.projet.date_debut), 'dd/MM/yyyy', { locale: fr })}
              </p>
            </div>
          </div>

          {collaboration.projet.date_fin_prevue && (
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Date de fin prévue</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(collaboration.projet.date_fin_prevue), 'dd/MM/yyyy', { locale: fr })}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Référent projet</p>
              <p className="font-medium text-gray-900">{collaboration.projet.referent_nom}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Votre rôle</p>
              <p className="font-medium text-gray-900">{collaboration.role_projet}</p>
            </div>
          </div>
        </div>

        {/* Avancement */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Avancement du projet</span>
            <span className="text-sm text-gray-600">{collaboration.projet.taux_avancement}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                collaboration.projet.statut === 'termine' ? 'bg-green-600' : 'bg-indigo-600'
              }`}
              style={{ width: `${collaboration.projet.taux_avancement}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('objectives')}
              className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'objectives'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Mes objectifs de développement
                {collaboration.objectifs && (
                  <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                    {collaboration.objectifs.objectifs.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('evaluation')}
              className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'evaluation'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Auto-évaluation
                <span className={`text-xs px-2 py-1 rounded-full ${evaluationBadge.color}`}>
                  {evaluationBadge.text}
                </span>
              </div>
            </button>
          </nav>
        </div>

        {/* Contenu des onglets */}
        <div className="p-6">
          {activeTab === 'objectives' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Mes objectifs de développement</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Définissez vos objectifs SMART pour ce projet
                  </p>
                </div>
                {canDefineObjectives() && (
                  <div className="flex gap-2">
                    {collaboration.objectifs ? (
                      <button
                        onClick={handleEditObjectives}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        Modifier les objectifs
                      </button>
                    ) : (
                      <button
                        onClick={handleCreateObjectives}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Définir mes objectifs
                      </button>
                    )}
                  </div>
                )}
              </div>

              {collaboration.objectifs ? (
                <div className="space-y-4">
                  {collaboration.objectifs.objectifs.map((objective, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                      <div className="mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                            {objective.theme_name || `Objectif ${index + 1}`}
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-900">
                          {index + 1}. {objective.skill_description}
                        </h4>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">
                        <strong>Objectif SMART:</strong> {objective.smart_objective}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <strong className="text-gray-600">Spécifique:</strong>
                          <p className="text-gray-700 mt-1">{objective.specific}</p>
                        </div>
                        <div>
                          <strong className="text-gray-600">Mesurable:</strong>
                          <p className="text-gray-700 mt-1">{objective.measurable}</p>
                        </div>
                        <div>
                          <strong className="text-gray-600">Atteignable:</strong>
                          <p className="text-gray-700 mt-1">{objective.achievable}</p>
                        </div>
                        <div>
                          <strong className="text-gray-600">Pertinent:</strong>
                          <p className="text-gray-700 mt-1">{objective.relevant}</p>
                        </div>
                        <div className="md:col-span-2">
                          <strong className="text-gray-600">Temporellement défini:</strong>
                          <p className="text-gray-700 mt-1">{objective.time_bound}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun objectif défini</h3>
                  <p className="text-gray-600 mb-4">
                    Commencez par définir vos objectifs de développement pour ce projet.
                  </p>
                  {canDefineObjectives() && (
                    <button
                      onClick={handleCreateObjectives}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 mx-auto transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Définir mes objectifs
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'evaluation' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Auto-évaluation</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Évaluez l'atteinte de vos objectifs une fois le projet terminé
                  </p>
                </div>
                {canAutoEvaluate() && (
                  <button
                    onClick={handleStartAutoEvaluation}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Star className="w-4 h-4" />
                    Commencer l'auto-évaluation
                  </button>
                )}
              </div>

              {!collaboration.objectifs ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <div>
                      <h3 className="text-sm font-medium text-yellow-800">Objectifs requis</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Vous devez d'abord définir vos objectifs de développement avant de pouvoir faire une auto-évaluation.
                      </p>
                    </div>
                  </div>
                </div>
              ) : collaboration.evaluation ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <h3 className="text-sm font-medium text-green-800">Auto-évaluation complétée</h3>
                        <p className="text-sm text-green-700 mt-1">
                          Soumise le {format(new Date(collaboration.evaluation.date_soumission), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                        </p>
                        <p className="text-sm text-green-700">
                          Statut: {collaboration.evaluation.statut}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Affichage des résultats de l'auto-évaluation */}
                  {collaboration.evaluation.auto_evaluation && collaboration.evaluation.auto_evaluation.evaluations && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Résultats de votre auto-évaluation</h3>
                      {collaboration.evaluation.auto_evaluation.evaluations.map((evalItem: any, index: number) => {
                        const objective = collaboration.objectifs?.objectifs[index];
                        return (
                          <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                            <div className="mb-3">
                              <h4 className="font-medium text-gray-900">
                                {index + 1}. {objective?.skill_description}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-gray-600">Score:</span>
                                <div className="flex">
                                  {Array.from({ length: 5 }, (_, i) => (
                                    <Star 
                                      key={i} 
                                      className={`w-4 h-4 ${i < evalItem.auto_evaluation_score ? 'fill-current text-yellow-400' : 'text-gray-300'}`} 
                                    />
                                  ))}
                                </div>
                                <span className="text-sm text-gray-600">({evalItem.auto_evaluation_score}/5)</span>
                              </div>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div>
                                <strong className="text-gray-600">Commentaire:</strong>
                                <p className="text-gray-700 mt-1">{evalItem.auto_evaluation_comment}</p>
                              </div>
                              <div>
                                <strong className="text-gray-600">Réalisations:</strong>
                                <p className="text-gray-700 mt-1">{evalItem.achievements}</p>
                              </div>
                              {evalItem.learnings && (
                                <div>
                                  <strong className="text-gray-600">Apprentissages:</strong>
                                  <p className="text-gray-700 mt-1">{evalItem.learnings}</p>
                                </div>
                              )}
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
                      <h3 className="text-sm font-medium text-orange-800">Auto-évaluation requise</h3>
                      <p className="text-sm text-orange-700 mt-1">
                        Le projet est terminé. Vous pouvez maintenant évaluer l'atteinte de vos objectifs.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-800">En attente de la fin du projet</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        L'auto-évaluation sera disponible une fois le projet terminé.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de définition des objectifs */}
      {showObjectivesForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                {collaboration.objectifs ? 'Modifier mes objectifs' : 'Définir mes objectifs'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Définissez 4 objectifs SMART pour votre développement sur ce projet
              </p>
            </div>

            <div className="p-6 space-y-6">
              {objectivesForm.map((objective, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Objectif {index + 1}
                  </h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Compétence à développer *
                        </label>
                        <input
                          type="text"
                          value={objective.skill_description}
                          onChange={(e) => updateObjective(index, 'skill_description', e.target.value)}
                          placeholder="Ex: Gestion de projet, Communication client..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Thème
                        </label>
                        <input
                          type="text"
                          value={objective.theme_name}
                          onChange={(e) => updateObjective(index, 'theme_name', e.target.value)}
                          placeholder="Ex: Management, Technique..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Objectif SMART *
                      </label>
                      <textarea
                        rows={3}
                        value={objective.smart_objective}
                        onChange={(e) => updateObjective(index, 'smart_objective', e.target.value)}
                        placeholder="Décrivez votre objectif de développement..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Spécifique (S) *
                        </label>
                        <textarea
                          rows={2}
                          value={objective.specific}
                          onChange={(e) => updateObjective(index, 'specific', e.target.value)}
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
                          onChange={(e) => updateObjective(index, 'measurable', e.target.value)}
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
                          onChange={(e) => updateObjective(index, 'achievable', e.target.value)}
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
                          onChange={(e) => updateObjective(index, 'relevant', e.target.value)}
                          placeholder="En quoi cet objectif est-il important ?"
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
                        onChange={(e) => updateObjective(index, 'time_bound', e.target.value)}
                        placeholder="Quelle est l'échéance pour atteindre cet objectif ?"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => setShowObjectivesForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveObjectives}
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {submitting ? 'Sauvegarde...' : 'Sauvegarder les objectifs'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'auto-évaluation */}
      {showAutoEvaluationModal && collaboration && collaboration.objectifs && (
        <AutoEvaluationModal
          collaboration={collaboration}
          objectives={collaboration.objectifs.objectifs}
          onClose={() => setShowAutoEvaluationModal(false)}
          onSuccess={handleAutoEvaluationSuccess}
          onError={(error) => {
            setError(error);
            setTimeout(() => setError(null), 5000);
          }}
        />
      )}
    </div>
  );
};

export default FicheProjetDetail;