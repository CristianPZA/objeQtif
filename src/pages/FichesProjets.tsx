import React, { useState, useEffect } from 'react';
import { Target, Calendar, User, Building, CheckCircle, Clock, AlertCircle, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Projet {
  id: string;
  nom_client: string;
  titre: string;
  description: string;
  date_debut: string;
  date_fin_prevue: string | null;
  budget_estime: number | null;
  statut: string;
  priorite: string;
  taux_avancement: number;
  referent_projet_id: string;
  auteur_id: string;
  objectifs: string[];
  risques: string[];
  notes: string | null;
  created_at: string;
  auteur_nom: string;
  referent_nom: string;
  referent_role: string;
  collaborateurs: Collaborateur[];
}

interface Collaborateur {
  id: string;
  employe_id: string;
  employe_nom: string;
  employe_role: string;
  employe_department: string | null;
  role_projet: string;
  taux_allocation: number;
  responsabilites: string | null;
  date_debut: string | null;
  date_fin: string | null;
  is_active: boolean;
}

interface ObjectifCollaborateur {
  id: string;
  collaboration_id: string;
  objectifs: any[];
  created_at: string;
  updated_at: string;
}

interface FicheCollaborateur {
  id: string;
  collaboration_id: string;
  contenu: string;
  statut: string;
  created_at: string;
  updated_at: string;
}

const FichesProjets = () => {
  const [projets, setProjets] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      setLoading(true);
      
      // Récupérer l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      setCurrentUserId(user.id);
      await fetchUserProjects(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProjects = async (userId: string) => {
    try {
      // Récupérer tous les projets où l'utilisateur est collaborateur
      const { data, error } = await supabase
        .from('v_projets_complets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filtrer les projets où l'utilisateur est collaborateur
      const userProjects = (data || []).filter(projet => 
        projet.collaborateurs.some((collab: Collaborateur) => collab.employe_id === userId)
      );

      setProjets(userProjects);
    } catch (err) {
      console.error('Error fetching user projects:', err);
      setError('Erreur lors du chargement des projets');
    }
  };

  const toggleProjectExpansion = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const getStatutColor = (statut: string) => {
    const statutOptions = [
      { value: 'brouillon', label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
      { value: 'en_cours', label: 'En cours', color: 'bg-blue-100 text-blue-800' },
      { value: 'termine', label: 'Terminé', color: 'bg-green-100 text-green-800' },
      { value: 'suspendu', label: 'Suspendu', color: 'bg-yellow-100 text-yellow-800' },
      { value: 'annule', label: 'Annulé', color: 'bg-red-100 text-red-800' }
    ];
    return statutOptions.find(s => s.value === statut)?.color || 'bg-gray-100 text-gray-800';
  };

  const getPrioriteColor = (priorite: string) => {
    const prioriteOptions = [
      { value: 'basse', label: 'Basse', color: 'bg-gray-100 text-gray-600' },
      { value: 'normale', label: 'Normale', color: 'bg-blue-100 text-blue-600' },
      { value: 'haute', label: 'Haute', color: 'bg-orange-100 text-orange-600' },
      { value: 'urgente', label: 'Urgente', color: 'bg-red-100 text-red-600' }
    ];
    return prioriteOptions.find(p => p.value === priorite)?.color || 'bg-gray-100 text-gray-600';
  };

  const getStatutLabel = (statut: string) => {
    const statutOptions = [
      { value: 'brouillon', label: 'Brouillon' },
      { value: 'en_cours', label: 'En cours' },
      { value: 'termine', label: 'Terminé' },
      { value: 'suspendu', label: 'Suspendu' },
      { value: 'annule', label: 'Annulé' }
    ];
    return statutOptions.find(s => s.value === statut)?.label || statut;
  };

  const getPrioriteLabel = (priorite: string) => {
    const prioriteOptions = [
      { value: 'basse', label: 'Basse' },
      { value: 'normale', label: 'Normale' },
      { value: 'haute', label: 'Haute' },
      { value: 'urgente', label: 'Urgente' }
    ];
    return prioriteOptions.find(p => p.value === priorite)?.label || priorite;
  };

  const getUserCollaboration = (projet: Projet) => {
    return projet.collaborateurs.find(collab => collab.employe_id === currentUserId);
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
          <h1 className="text-3xl font-bold text-gray-900">Mes objectifs projets</h1>
          <p className="text-gray-600 mt-1">Gérez vos objectifs et évaluations pour vos projets</p>
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

      {/* Onglet unique : Mes projets en cours */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Target className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Mes projets en cours</h2>
              <p className="text-sm text-gray-600">Projets où vous êtes collaborateur</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {projets.length > 0 ? (
            <div className="space-y-4">
              {projets.map((projet) => {
                const collaboration = getUserCollaboration(projet);
                const isExpanded = expandedProjects.has(projet.id);
                
                return (
                  <div key={projet.id} className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div className="p-6">
                      {/* Header du projet */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Building className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-lg font-semibold text-gray-900">{projet.titre}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatutColor(projet.statut)}`}>
                              {getStatutLabel(projet.statut)}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getPrioriteColor(projet.priorite)}`}>
                              {getPrioriteLabel(projet.priorite)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Client:</strong> {projet.nom_client}
                          </p>
                          <p className="text-gray-600 mb-3">{projet.description}</p>
                        </div>
                        
                        <button
                          onClick={() => toggleProjectExpansion(projet.id)}
                          className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                          title={isExpanded ? "Réduire" : "Développer"}
                        >
                          {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Informations de base */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>Début: {format(new Date(projet.date_debut), 'dd/MM/yyyy', { locale: fr })}</span>
                        </div>
                        {projet.date_fin_prevue && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>Fin prévue: {format(new Date(projet.date_fin_prevue), 'dd/MM/yyyy', { locale: fr })}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          <span>Référent: {projet.referent_nom}</span>
                        </div>
                      </div>

                      {/* Mon rôle dans le projet */}
                      {collaboration && (
                        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                          <h4 className="text-sm font-medium text-indigo-800 mb-1">Mon rôle dans ce projet</h4>
                          <div className="text-sm text-indigo-700">
                            <p><strong>Rôle:</strong> {collaboration.role_projet}</p>
                            <p><strong>Allocation:</strong> {collaboration.taux_allocation}%</p>
                            {collaboration.responsabilites && (
                              <p><strong>Responsabilités:</strong> {collaboration.responsabilites}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Détails étendus */}
                      {isExpanded && (
                        <div className="border-t pt-4 space-y-4">
                          {/* Budget */}
                          {projet.budget_estime && (
                            <div className="text-sm text-gray-600">
                              <strong>Budget estimé:</strong> {projet.budget_estime.toLocaleString('fr-FR')} €
                            </div>
                          )}

                          {/* Collaborateurs */}
                          {projet.collaborateurs.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Équipe du projet:</h4>
                              <div className="flex flex-wrap gap-2">
                                {projet.collaborateurs.map((collab) => (
                                  <span
                                    key={collab.id}
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                      collab.employe_id === currentUserId 
                                        ? 'bg-indigo-100 text-indigo-800 font-medium' 
                                        : 'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    {collab.employe_nom} ({collab.role_projet})
                                    {collab.employe_id === currentUserId && ' (Vous)'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {projet.notes && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Notes:</h4>
                              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{projet.notes}</p>
                            </div>
                          )}

                          {/* Avancement */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Avancement: {projet.taux_avancement}%</span>
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  projet.statut === 'termine' ? 'bg-green-600' : 'bg-indigo-600'
                                }`}
                                style={{ width: `${projet.taux_avancement}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions pour les projets terminés */}
                      {projet.statut === 'termine' && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-green-800 mb-1">Projet terminé</h4>
                              <p className="text-sm text-green-700 mb-3">
                                Ce projet est maintenant terminé. Vous pouvez définir vos objectifs et procéder à votre auto-évaluation.
                              </p>
                              <div className="flex gap-2">
                                <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors">
                                  Définir mes objectifs
                                </button>
                                <button className="px-3 py-1 bg-white hover:bg-green-50 text-green-700 border border-green-300 text-xs rounded-lg transition-colors">
                                  Auto-évaluation
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex justify-between items-center text-xs text-gray-500 mt-4 pt-4 border-t">
                        <span>
                          Créé le {format(new Date(projet.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                        </span>
                        <span>
                          Créé par: {projet.auteur_nom}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun projet assigné</h3>
              <p className="text-gray-600">
                Vous n'êtes actuellement collaborateur sur aucun projet. 
                Contactez votre responsable pour être assigné à des projets.
              </p>
            </div>
          )}
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
              <p className="text-sm font-medium text-gray-600">Total Projets</p>
              <p className="text-2xl font-bold text-gray-900">{projets.length}</p>
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
                {projets.filter(p => p.statut === 'en_cours').length}
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
              <p className="text-sm font-medium text-gray-600">Terminés</p>
              <p className="text-2xl font-bold text-gray-900">
                {projets.filter(p => p.statut === 'termine').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Priorité haute</p>
              <p className="text-2xl font-bold text-gray-900">
                {projets.filter(p => ['haute', 'urgente'].includes(p.priorite)).length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FichesProjets;