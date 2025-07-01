import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, 
  Calendar, 
  User, 
  Building, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  Users,
  Star,
  Flag,
  Filter
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
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
    referent_nom: string;
    auteur_nom: string;
    referent_projet_id: string;
    auteur_id: string;
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
}

const FichesProjets = () => {
  const navigate = useNavigate();
  const { userCountry } = useAuth();
  const { t } = useTranslation();
  const [collaborations, setCollaborations] = useState<ProjectCollaboration[]>([]);
  const [referentCollaborations, setReferentCollaborations] = useState<ProjectCollaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'own' | 'referent'>('own');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchUserCollaborations();
  }, [userCountry]);

  const fetchUserCollaborations = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('common.notLoggedIn'));

      setCurrentUserId(user.id);

      // Récupérer toutes les collaborations de l'utilisateur avec les détails du projet
      const { data: collaborationsData, error: collaborationsError } = await supabase
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
        .eq('employe_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (collaborationsError) throw collaborationsError;

      // Récupérer les collaborations où l'utilisateur est référent ou auteur
      const { data: referentData, error: referentError } = await supabase
        .from('projets')
        .select(`
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
        `)
        .or(`referent_projet_id.eq.${user.id},auteur_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (referentError) throw referentError;

      // Pour chaque projet où l'utilisateur est référent, récupérer les collaborations
      const allReferentCollaborations: ProjectCollaboration[] = [];
      
      if (referentData && referentData.length > 0) {
        for (const projet of referentData) {
          const { data: projectCollabs, error: projectCollabsError } = await supabase
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
            .eq('projet_id', projet.id)
            .eq('is_active', true)
            .neq('employe_id', user.id); // Exclure l'utilisateur lui-même

          if (!projectCollabsError && projectCollabs) {
            allReferentCollaborations.push(...projectCollabs);
          }
        }
      }

      // Pour chaque collaboration, récupérer les objectifs et évaluations
      const enrichedCollaborations = await Promise.all(
        (collaborationsData || []).map(async (collaboration) => {
          // Récupérer les objectifs
          const { data: objectifsData } = await supabase
            .from('objectifs_collaborateurs')
            .select('*')
            .eq('collaboration_id', collaboration.id)
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
            ...collaboration,
            projet: {
              ...collaboration.projet,
              referent_nom: collaboration.projet.referent_nom?.full_name || t('common.undefined'),
              auteur_nom: collaboration.projet.auteur_nom?.full_name || t('common.undefined')
            },
            objectifs: objectifsData,
            evaluation: evaluationData
          };
        })
      );

      // Enrichir les collaborations référent
      const enrichedReferentCollaborations = await Promise.all(
        allReferentCollaborations.map(async (collaboration) => {
          // Récupérer les objectifs
          const { data: objectifsData } = await supabase
            .from('objectifs_collaborateurs')
            .select('*')
            .eq('collaboration_id', collaboration.id)
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
            ...collaboration,
            projet: {
              ...collaboration.projet,
              referent_nom: collaboration.projet.referent_nom?.full_name || t('common.undefined'),
              auteur_nom: collaboration.projet.auteur_nom?.full_name || t('common.undefined')
            },
            objectifs: objectifsData,
            evaluation: evaluationData
          };
        })
      );

      setCollaborations(enrichedCollaborations);
      setReferentCollaborations(enrichedReferentCollaborations);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.loadingError'));
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (collaboration: ProjectCollaboration) => {
    // Naviguer vers la page de détail de la fiche projet
    navigate(`/fiche-projet/${collaboration.id}`);
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

  const getPrioriteColor = (priorite: string) => {
    switch (priorite) {
      case 'basse':
        return 'bg-gray-100 text-gray-600';
      case 'normale':
        return 'bg-blue-100 text-blue-600';
      case 'haute':
        return 'bg-orange-100 text-orange-600';
      case 'urgente':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getPrioriteLabel = (priorite: string) => {
    switch (priorite) {
      case 'basse':
        return t('projects.priorities.low');
      case 'normale':
        return t('projects.priorities.normal');
      case 'haute':
        return t('projects.priorities.high');
      case 'urgente':
        return t('projects.priorities.urgent');
      default:
        return priorite;
    }
  };

  const getObjectifsStatus = (collaboration: ProjectCollaboration) => {
    if (!collaboration.objectifs) {
      return { status: 'not_defined', label: t('projectSheets.objectivesStatus.notDefined'), color: 'bg-gray-100 text-gray-800', icon: Clock };
    }
    
    if (!collaboration.evaluation) {
      if (collaboration.projet.statut === 'termine') {
        return { status: 'to_evaluate', label: t('projectSheets.objectivesStatus.toEvaluate'), color: 'bg-orange-100 text-orange-800', icon: AlertTriangle };
      }
      return { status: 'defined', label: 'Objectifs définis', color: 'bg-blue-100 text-blue-800', icon: CheckCircle };
    }

    switch (collaboration.evaluation.statut) {
      case 'brouillon':
        return { status: 'draft', label: t('projectSheets.objectivesStatus.draft'), color: 'bg-gray-100 text-gray-800', icon: Clock };
      case 'soumise':
        return { status: 'submitted', label: t('projectSheets.objectivesStatus.submitted'), color: 'bg-blue-100 text-blue-800', icon: Clock };
      case 'en_attente_referent':
        return { status: 'waiting_referent', label: t('projectSheets.objectivesStatus.waitingReferent'), color: 'bg-yellow-100 text-yellow-800', icon: Clock };
      case 'evaluee_referent':
        return { status: 'evaluated_referent', label: t('projectSheets.objectivesStatus.evaluatedReferent'), color: 'bg-purple-100 text-purple-800', icon: CheckCircle };
      case 'finalisee':
        return { status: 'finalized', label: t('projectSheets.objectivesStatus.finalized'), color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'rejetee':
        return { status: 'rejected', label: t('projectSheets.objectivesStatus.rejected'), color: 'bg-red-100 text-red-800', icon: AlertTriangle };
      default:
        return { status: 'unknown', label: t('projectSheets.objectivesStatus.unknown'), color: 'bg-gray-100 text-gray-800', icon: Clock };
    }
  };

  // Filtrer les collaborations en fonction du statut sélectionné
  const getFilteredCollaborations = () => {
    const collabsToFilter = activeTab === 'own' ? collaborations : referentCollaborations;
    
    if (!filterStatus) return collabsToFilter;
    
    return collabsToFilter.filter(collab => {
      if (filterStatus === 'en_cours') {
        return collab.projet.statut === 'en_cours';
      } else if (filterStatus === 'termine') {
        return collab.projet.statut === 'termine';
      } else if (filterStatus === 'to_evaluate') {
        const status = getObjectifsStatus(collab);
        return status.status === 'to_evaluate';
      } else if (filterStatus === 'evaluated') {
        const status = getObjectifsStatus(collab);
        return ['evaluated_referent', 'finalized'].includes(status.status);
      }
      return true;
    });
  };

  const filteredCollaborations = getFilteredCollaborations();

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
          <h1 className="text-3xl font-bold text-gray-900">{t('projectSheets.title')}</h1>
          <p className="text-gray-600 mt-1">{t('projectSheets.subtitle')}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              {userCountry === 'france' ? '🇫🇷 ' + t('common.france') : '🇪🇸 ' + t('common.spain')}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Onglets */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('own')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'own'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Mes fiches projet
              <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                {collaborations.length}
              </span>
            </div>
          </button>
          
          {referentCollaborations.length > 0 && (
            <button
              onClick={() => setActiveTab('referent')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'referent'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Fiches de mes collaborateurs
                <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                  {referentCollaborations.length}
                </span>
              </div>
            </button>
          )}
        </nav>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtrer par:</span>
          </div>
          
          <button
            onClick={() => setFilterStatus(null)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              !filterStatus 
                ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' 
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            Tous
          </button>
          
          <button
            onClick={() => setFilterStatus('en_cours')}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              filterStatus === 'en_cours' 
                ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            En cours
          </button>
          
          <button
            onClick={() => setFilterStatus('termine')}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              filterStatus === 'termine' 
                ? 'bg-green-100 text-green-800 border border-green-300' 
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            Terminés
          </button>
          
          <button
            onClick={() => setFilterStatus('to_evaluate')}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              filterStatus === 'to_evaluate' 
                ? 'bg-orange-100 text-orange-800 border border-orange-300' 
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            À évaluer
          </button>
          
          <button
            onClick={() => setFilterStatus('evaluated')}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              filterStatus === 'evaluated' 
                ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            Évalués
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Target className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('projectSheets.assignedProjects')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeTab === 'own' ? collaborations.length : referentCollaborations.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('projectSheets.completedProjects')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeTab === 'own' 
                  ? collaborations.filter(c => c.projet.statut === 'termine').length
                  : referentCollaborations.filter(c => c.projet.statut === 'termine').length
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('projectSheets.inProgress')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeTab === 'own' 
                  ? collaborations.filter(c => c.projet.statut === 'en_cours').length
                  : referentCollaborations.filter(c => c.projet.statut === 'en_cours').length
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('projectSheets.toEvaluate')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeTab === 'own' 
                  ? collaborations.filter(c => {
                      const status = getObjectifsStatus(c);
                      return status.status === 'to_evaluate' || status.status === 'not_defined';
                    }).length
                  : referentCollaborations.filter(c => {
                      const status = getObjectifsStatus(c);
                      return status.status === 'to_evaluate' || status.status === 'not_defined';
                    }).length
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des projets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCollaborations.map((collaboration) => {
          const objectifsStatus = getObjectifsStatus(collaboration);
          const StatusIcon = objectifsStatus.icon;
          
          return (
            <div 
              key={collaboration.id} 
              className="bg-white rounded-lg shadow-sm border hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => handleProjectClick(collaboration)}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Building className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                        {collaboration.projet.titre}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>{t('projectSheets.client')}:</strong> {collaboration.projet.nom_client}
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatutColor(collaboration.projet.statut)}`}>
                        {getStatutLabel(collaboration.projet.statut)}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPrioriteColor(collaboration.projet.priorite)}`}>
                        {getPrioriteLabel(collaboration.projet.priorite)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-indigo-600 ml-4">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Informations du projet */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>{t('projects.startDate')}: {format(new Date(collaboration.projet.date_debut), 'dd/MM/yyyy', { locale: fr })}</span>
                  </div>
                  
                  {collaboration.projet.date_fin_prevue && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>{t('projects.endDate')}: {format(new Date(collaboration.projet.date_fin_prevue), 'dd/MM/yyyy', { locale: fr })}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4 flex-shrink-0" />
                    <span>{t('projectSheets.referent')}: {collaboration.projet.referent_nom}</span>
                  </div>

                  {activeTab === 'referent' && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <span>Collaborateur: {collaboration.employe_nom || 'Non défini'}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4 flex-shrink-0" />
                    <span>{t('projectSheets.role')}: {collaboration.role_projet}</span>
                  </div>
                </div>

                {/* Statut des objectifs */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">{t('projectSheets.objectives')}:</span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${objectifsStatus.color}`}>
                      {objectifsStatus.label}
                    </span>
                  </div>
                  
                  {collaboration.objectifs && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-500">
                        {collaboration.objectifs.objectifs.length} {t('projectSheets.objectives').toLowerCase()}{collaboration.objectifs.objectifs.length > 1 ? 's' : ''} {t('common.defined')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Avancement du projet */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-gray-600">{t('projectSheets.progress')}</span>
                    <span className="text-xs text-gray-600">{collaboration.projet.taux_avancement}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        collaboration.projet.statut === 'termine' ? 'bg-green-600' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${collaboration.projet.taux_avancement}%` }}
                    ></div>
                  </div>
                </div>

                {/* Call to action */}
                <div className="mt-4 text-center">
                  <span className="text-xs text-indigo-600 font-medium">
                    {activeTab === 'own' 
                      ? t('projectSheets.clickToManage')
                      : 'Cliquez pour consulter et évaluer'
                    }
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredCollaborations.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('projectSheets.noProjectsAssigned')}</h3>
            <p className="text-gray-600">
              {activeTab === 'own' 
                ? t('projectSheets.contactManager')
                : 'Aucun collaborateur n\'a de fiche projet à évaluer.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FichesProjets;