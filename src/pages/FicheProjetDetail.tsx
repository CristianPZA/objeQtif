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
  Award,
  Star
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import AutoEvaluationModal from '../components/objectives/AutoEvaluationModal';
import ReferentEvaluationModal from '../components/objectives/ReferentEvaluationModal';
import ObjectivesTab from '../components/evaluation/ObjectivesTab';
import EvaluationTab from '../components/evaluation/EvaluationTab';
import CustomObjectiveForm from '../components/objectives/CustomObjectiveForm';
import { useTranslation } from 'react-i18next';

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
    referent_projet_id: string;
    auteur_id: string;
    referent_nom: string;
    auteur_nom: string;
  };
  objectifs?: {
    id: string;
    objectifs: any[];
  };
  evaluation?: {
    id: string;
    statut: string;
    auto_evaluation: any;
    evaluation_referent: any;
    date_soumission: string;
  };
  employe_nom?: string; // Nom de l'employé pour les référents
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
  is_custom?: boolean;
  objective_type?: string;
}

const FicheProjetDetail = () => {
  const { collaborationId } = useParams<{ collaborationId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [collaboration, setCollaboration] = useState<ProjectCollaboration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [showAutoEvaluationModal, setShowAutoEvaluationModal] = useState(false);
  const [showReferentEvaluationModal, setShowReferentEvaluationModal] = useState(false);
  const [showObjectivesForm, setShowObjectivesForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'objectives' | 'evaluation'>('objectives');
  const [isReferent, setIsReferent] = useState(false);

  useEffect(() => {
    if (collaborationId) {
      checkUserAccess();
    }
  }, [collaborationId]);

  const checkUserAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('common.notLoggedIn'));

      setCurrentUserId(user.id);

      // Récupérer le rôle de l'utilisateur
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile) {
        setCurrentUserRole(profile.role);
      }

      // Vérifier si l'utilisateur est l'employé associé à cette collaboration
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
            referent_projet_id,
            auteur_id,
            referent_nom:user_profiles!referent_projet_id(full_name),
            auteur_nom:user_profiles!auteur_id(full_name)
          )
        `)
        .eq('id', collaborationId)
        .maybeSingle();

      if (collaborationError) throw collaborationError;

      // Si la collaboration n'existe pas, vérifier si l'utilisateur est référent ou admin
      if (!collaborationData) {
        // Vérifier si l'utilisateur est référent ou admin
        if (profile.role === 'admin' || profile.role === 'referent_projet') {
          // Les admins et référents peuvent voir toutes les collaborations
          await fetchCollaborationDetail();
        } else {
          // Vérifier si l'utilisateur est référent de ce projet
          const { data: referentData, error: referentError } = await supabase
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
                referent_projet_id,
                auteur_id,
                referent_nom:user_profiles!referent_projet_id(full_name),
                auteur_nom:user_profiles!auteur_id(full_name)
              )
            `)
            .eq('id', collaborationId);

          if (referentError) throw referentError;

          if (referentData && referentData.length > 0) {
            const projet = referentData[0].projet;
            if (projet.referent_projet_id === user.id || projet.auteur_id === user.id) {
              setIsReferent(true);
              await fetchCollaborationDetail();
            } else {
              throw new Error('Vous n\'avez pas accès à cette fiche projet');
            }
          } else {
            throw new Error('Fiche projet non trouvée');
          }
        }
      } else {
        // L'utilisateur est l'employé associé à cette collaboration
        if (collaborationData.employe_id === user.id) {
          await fetchCollaborationDetail();
        } else {
          // Vérifier si l'utilisateur est référent ou auteur du projet
          const projet = collaborationData.projet;
          if (projet.referent_projet_id === user.id || projet.auteur_id === user.id || profile.role === 'admin' || profile.role === 'referent_projet') {
            setIsReferent(true);
            await fetchCollaborationDetail();
          } else {
            throw new Error('Vous n\'avez pas accès à cette fiche projet');
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.loadingError'));
      setLoading(false);
    }
  };

  const fetchCollaborationDetail = async () => {
    try {
      setLoading(true);
      
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
            referent_projet_id,
            auteur_id,
            referent_nom:user_profiles!referent_projet_id(full_name),
            auteur_nom:user_profiles!auteur_id(full_name)
          )
        `)
        .eq('id', collaborationId)
        .maybeSingle();

      if (collaborationError) throw collaborationError;

      // Check if collaboration exists
      if (!collaborationData) {
        setCollaboration(null);
        setLoading(false);
        return;
      }

      // Si c'est un référent, récupérer le nom de l'employé
      let employeNom = '';
      if (isReferent) {
        const { data: employeData } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', collaborationData.employe_id)
          .single();
        
        if (employeData) {
          employeNom = employeData.full_name;
        }
      }

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
        employe_nom: employeNom,
        projet: {
          ...collaborationData.projet,
          referent_nom: collaborationData.projet.referent_nom?.full_name || t('common.undefined'),
          auteur_nom: collaborationData.projet.auteur_nom?.full_name || t('common.undefined')
        },
        objectifs: objectifsData,
        evaluation: evaluationData
      };

      setCollaboration(enrichedCollaboration);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.loadingError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateObjectives = () => {
    setShowObjectivesForm(true);
  };

  const handleEditObjectives = () => {
    setShowObjectivesForm(true);
  };

  const handleStartAutoEvaluation = () => {
    setShowAutoEvaluationModal(true);
  };

  const handleStartReferentEvaluation = () => {
    setShowReferentEvaluationModal(true);
  };

  const handleAutoEvaluationSuccess = () => {
    setShowAutoEvaluationModal(false);
    setSuccess(t('evaluation.evaluationSubmitted'));
    fetchCollaborationDetail();
  };

  const handleReferentEvaluationSuccess = () => {
    setShowReferentEvaluationModal(false);
    setSuccess('Évaluation du référent soumise avec succès');
    fetchCollaborationDetail();
  };

  const handleObjectivesSuccess = () => {
    setShowObjectivesForm(false);
    setSuccess(t('objectives.objectivesSaved'));
    fetchCollaborationDetail();
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
        return t('projects.statuses.inProgress');
      case 'termine':
        return t('projects.statuses.completed');
      case 'suspendu':
        return t('projects.statuses.suspended');
      case 'annule':
        return t('projects.statuses.cancelled');
      default:
        return statut;
    }
  };

  const canDefineObjectives = () => {
    if (isReferent) return true;
    return collaboration && collaboration.projet.statut !== 'annule';
  };

  const canAutoEvaluate = () => {
    if (isReferent) return false;
    return collaboration && 
           collaboration.objectifs && 
           collaboration.projet.statut === 'termine' &&
           (!collaboration.evaluation || collaboration.evaluation.statut === 'brouillon');
  };

  const canReferentEvaluate = () => {
    if (!isReferent) return false;
    
    return collaboration && 
           collaboration.objectifs && 
           collaboration.projet.statut === 'termine' &&
           collaboration.evaluation && 
           (collaboration.evaluation.statut === 'en_attente_referent' || 
            collaboration.evaluation.statut === 'soumise') &&
           (!collaboration.evaluation.evaluation_referent || 
            !collaboration.evaluation.evaluation_referent.evaluations || 
            collaboration.evaluation.evaluation_referent.evaluations.length === 0);
  };

  const getEvaluationStatusBadge = () => {
    if (!collaboration?.evaluation) {
      if (collaboration?.projet.statut === 'termine') {
        return { text: t('projectSheets.objectivesStatus.toEvaluate'), color: 'bg-orange-100 text-orange-800' };
      }
      return { text: t('common.waiting'), color: 'bg-gray-100 text-gray-800' };
    }

    switch (collaboration.evaluation.statut) {
      case 'brouillon':
        return { text: t('projectSheets.objectivesStatus.draft'), color: 'bg-gray-100 text-gray-800' };
      case 'soumise':
        return { text: t('projectSheets.objectivesStatus.submitted'), color: 'bg-blue-100 text-blue-800' };
      case 'en_attente_referent':
        return { text: t('projectSheets.objectivesStatus.waitingReferent'), color: 'bg-yellow-100 text-yellow-800' };
      case 'evaluee_referent':
        return { text: t('projectSheets.objectivesStatus.evaluatedReferent'), color: 'bg-purple-100 text-purple-800' };
      case 'finalisee':
        return { text: t('projectSheets.objectivesStatus.finalized'), color: 'bg-green-100 text-green-800' };
      case 'rejetee':
        return { text: t('projectSheets.objectivesStatus.rejected'), color: 'bg-red-100 text-red-800' };
      default:
        return { text: t('projectSheets.objectivesStatus.unknown'), color: 'bg-gray-100 text-gray-800' };
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
          <p className="font-medium">{t('common.loadingError')}</p>
          <p className="text-sm mt-1">{error}</p>
          <button 
            onClick={() => navigate('/fiches-projets')}
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md transition-colors text-sm"
          >
            {t('common.back')} {t('common.projectSheets').toLowerCase()}
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
          <p className="font-medium">{t('projectSheets.projectSheetNotFound')}</p>
          <button 
            onClick={() => navigate('/fiches-projets')}
            className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-sm"
          >
            {t('common.back')} {t('common.projectSheets').toLowerCase()}
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
            <span>{t('common.back')} {t('common.projectSheets').toLowerCase()}</span>
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
                <p className="text-lg text-gray-600 mt-1">{t('projects.clientName')}: {collaboration.projet.nom_client}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 text-sm rounded-full ${getStatutColor(collaboration.projet.statut)}`}>
                {getStatutLabel(collaboration.projet.statut)}
              </span>
              
              {isReferent && (
                <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
                  Vous êtes référent
                </span>
              )}
            </div>
          </div>

          {/* Indicateur projet terminé */}
          {collaboration.projet.statut === 'termine' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
              <CheckCircle className="h-6 w-6" />
              <span className="font-medium">{t('projects.statuses.completed')}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('common.description')}</h3>
          <p className="text-gray-700 leading-relaxed">{collaboration.projet.description}</p>
        </div>

        {/* Informations principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">{t('projects.startDate')}</p>
              <p className="font-medium text-gray-900">
                {format(new Date(collaboration.projet.date_debut), 'dd/MM/yyyy', { locale: fr })}
              </p>
            </div>
          </div>

          {collaboration.projet.date_fin_prevue && (
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">{t('projects.endDate')}</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(collaboration.projet.date_fin_prevue), 'dd/MM/yyyy', { locale: fr })}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">{t('projectSheets.referent')}</p>
              <p className="font-medium text-gray-900">{collaboration.projet.referent_nom}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">{isReferent ? 'Collaborateur' : t('projectSheets.role')}</p>
              <p className="font-medium text-gray-900">{isReferent ? collaboration.employe_nom : collaboration.role_projet}</p>
            </div>
          </div>
        </div>

        {/* Avancement */}
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
                {t('objectives.myDevelopmentObjectives')}
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
                <Award className="w-5 h-5" />
                {t('evaluation.evaluation')}
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
            <ObjectivesTab
              collaboration={collaboration}
              canDefineObjectives={canDefineObjectives()}
              onCreateObjectives={handleCreateObjectives}
              onEditObjectives={handleEditObjectives}
            />
          )}

          {activeTab === 'evaluation' && (
            <EvaluationTab
              collaboration={collaboration}
              canAutoEvaluate={canAutoEvaluate()}
              onStartAutoEvaluation={handleStartAutoEvaluation}
              canReferentEvaluate={canReferentEvaluate()}
              onStartReferentEvaluation={handleStartReferentEvaluation}
              isReferent={isReferent}
            />
          )}
        </div>
      </div>

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

      {/* Modal d'évaluation référent */}
      {showReferentEvaluationModal && collaboration && collaboration.objectifs && collaboration.evaluation && (
        <ReferentEvaluationModal
          evaluation={collaboration.evaluation}
          objectives={collaboration.objectifs.objectifs}
          autoEvaluations={collaboration.evaluation.auto_evaluation.evaluations}
          onClose={() => setShowReferentEvaluationModal(false)}
          onSuccess={handleReferentEvaluationSuccess}
          onError={(error) => {
            setError(error);
            setTimeout(() => setError(null), 5000);
          }}
        />
      )}

      {/* Modal de définition d'objectifs */}
      {showObjectivesForm && (
        <CustomObjectiveForm
          collaboration={collaboration}
          existingObjectives={collaboration.objectifs?.objectifs || null}
          onClose={() => setShowObjectivesForm(false)}
          onSuccess={handleObjectivesSuccess}
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