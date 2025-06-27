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
  Flag
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';

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
  const [collaborations, setCollaborations] = useState<ProjectCollaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUserCollaborations();
  }, [userCountry]);

  const fetchUserCollaborations = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

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
            referent_nom:user_profiles!referent_projet_id(full_name),
            auteur_nom:user_profiles!auteur_id(full_name)
          )
        `)
        .eq('employe_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (collaborationsError) throw collaborationsError;

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
              referent_nom: collaboration.projet.referent_nom?.full_name || 'Non défini',
              auteur_nom: collaboration.projet.auteur_nom?.full_name || 'Non défini'
            },
            objectifs: objectifsData,
            evaluation: evaluationData
          };
        })
      );

      setCollaborations(enrichedCollaborations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
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
        return 'Basse';
      case 'normale':
        return 'Normale';
      case 'haute':
        return 'Haute';
      case 'urgente':
        return 'Urgente';
      default:
        return priorite;
    }
  };

  const getObjectifsStatus = (collaboration: ProjectCollaboration) => {
    if (!collaboration.objectifs) {
      return { status: 'not_defined', label: 'Objectifs à définir', color: 'bg-gray-100 text-gray-800', icon: Clock };
    }
    
    if (!collaboration.evaluation) {
      return { status: 'to_evaluate', label: 'Auto-évaluation à faire', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle };
    }

    switch (collaboration.evaluation.statut) {
      case 'brouillon':
        return { status: 'draft', label: 'Brouillon', color: 'bg-gray-100 text-gray-800', icon: Clock };
      case 'soumise':
        return { status: 'submitted', label: 'Soumise', color: 'bg-blue-100 text-blue-800', icon: Clock };
      case 'en_attente_referent':
        return { status: 'waiting_referent', label: 'En attente référent', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
      case 'evaluee_referent':
        return { status: 'evaluated_referent', label: 'Évaluée par référent', color: 'bg-purple-100 text-purple-800', icon: CheckCircle };
      case 'finalisee':
        return { status: 'finalized', label: 'Finalisée', color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'rejetee':
        return { status: 'rejected', label: 'Rejetée', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
      default:
        return { status: 'unknown', label: 'Statut inconnu', color: 'bg-gray-100 text-gray-800', icon: Clock };
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Fiche Projet</h1>
          <p className="text-gray-600 mt-1">Gérez vos objectifs et auto-évaluations pour chaque projet</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              {userCountry === 'france' ? '🇫🇷 France' : '🇪🇸 Espagne'}
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

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Target className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Projets assignés</p>
              <p className="text-2xl font-bold text-gray-900">{collaborations.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Projets terminés</p>
              <p className="text-2xl font-bold text-gray-900">
                {collaborations.filter(c => c.projet.statut === 'termine').length}
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
              <p className="text-sm font-medium text-gray-600">En cours</p>
              <p className="text-2xl font-bold text-gray-900">
                {collaborations.filter(c => c.projet.statut === 'en_cours').length}
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
              <p className="text-sm font-medium text-gray-600">À évaluer</p>
              <p className="text-2xl font-bold text-gray-900">
                {collaborations.filter(c => {
                  const status = getObjectifsStatus(c);
                  return status.status === 'to_evaluate' || status.status === 'not_defined';
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des projets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {collaborations.map((collaboration) => {
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
                      <strong>Client:</strong> {collaboration.projet.nom_client}
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
                    <span>Début: {format(new Date(collaboration.projet.date_debut), 'dd/MM/yyyy', { locale: fr })}</span>
                  </div>
                  
                  {collaboration.projet.date_fin_prevue && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>Fin prévue: {format(new Date(collaboration.projet.date_fin_prevue), 'dd/MM/yyyy', { locale: fr })}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4 flex-shrink-0" />
                    <span>Référent: {collaboration.projet.referent_nom}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4 flex-shrink-0" />
                    <span>Rôle: {collaboration.role_projet}</span>
                  </div>
                </div>

                {/* Statut des objectifs */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Objectifs:</span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${objectifsStatus.color}`}>
                      {objectifsStatus.label}
                    </span>
                  </div>
                  
                  {collaboration.objectifs && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-500">
                        {collaboration.objectifs.objectifs.length} objectif{collaboration.objectifs.objectifs.length > 1 ? 's' : ''} défini{collaboration.objectifs.objectifs.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                </div>

                {/* Avancement du projet */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-gray-600">Avancement</span>
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
                    Cliquez pour gérer vos objectifs
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {collaborations.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun projet assigné</h3>
            <p className="text-gray-600">
              Vous n'êtes actuellement assigné à aucun projet. Contactez votre manager pour être ajouté à des projets.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FichesProjets;