import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, User, Building, Target, Edit, Trash2, Users, Lock, UserPlus, X, CheckCircle, Clock, AlertCircle, Archive } from 'lucide-react';
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
  is_archived: boolean;
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

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  department: string | null;
}

const FichesProjets = () => {
  const [projets, setProjets] = useState<Projet[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mes-projets' | 'collaborateur' | 'archive'>('mes-projets');

  useEffect(() => {
    checkUserAccess();
    fetchProjets();
    fetchUsers();
  }, []);

  const checkUserAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile) {
        throw new Error('Profil utilisateur non trouvé');
      }

      setCurrentUserRole(profile.role);
      setCurrentUserId(user.id);
    } catch (err) {
      setError('Erreur lors de la vérification des droits utilisateur');
      setLoading(false);
    }
  };

  const fetchProjets = async () => {
    try {
      const { data, error } = await supabase
        .from('v_projets_complets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjets(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des projets');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, role, department')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err);
    }
  };

  const handleArchiveProject = async (projetId: string, titre: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir archiver le projet "${titre}" ?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('projets')
        .update({ is_archived: true })
        .eq('id', projetId);

      if (error) throw error;

      setSuccess('Projet archivé avec succès');
      fetchProjets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'archivage du projet');
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchiveProject = async (projetId: string, titre: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir désarchiver le projet "${titre}" ?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('projets')
        .update({ is_archived: false })
        .eq('id', projetId);

      if (error) throw error;

      setSuccess('Projet désarchivé avec succès');
      fetchProjets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du désarchivage du projet');
    } finally {
      setLoading(false);
    }
  };

  const canEditProject = (projet: Projet) => {
    if (!currentUserRole || !currentUserId) return false;
    
    // Admin peut tout modifier
    if (currentUserRole === 'admin') return true;
    
    // L'auteur ou le référent peuvent modifier
    if (projet.auteur_id === currentUserId || projet.referent_projet_id === currentUserId) return true;
    
    return false;
  };

  const getFilteredProjets = () => {
    let filtered = projets.filter(projet => {
      // Filtrer par terme de recherche
      const matchesSearch = projet.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           projet.nom_client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           projet.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           projet.referent_nom.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      // Filtrer par onglet
      switch (activeTab) {
        case 'mes-projets':
          return !projet.is_archived && (projet.auteur_id === currentUserId || projet.referent_projet_id === currentUserId);
        case 'collaborateur':
          return !projet.is_archived && projet.collaborateurs.some(c => c.employe_id === currentUserId);
        case 'archive':
          return projet.is_archived && (
            projet.auteur_id === currentUserId || 
            projet.referent_projet_id === currentUserId ||
            projet.collaborateurs.some(c => c.employe_id === currentUserId)
          );
        default:
          return false;
      }
    });

    return filtered;
  };

  const getTabCount = (tab: 'mes-projets' | 'collaborateur' | 'archive') => {
    switch (tab) {
      case 'mes-projets':
        return projets.filter(p => !p.is_archived && (p.auteur_id === currentUserId || p.referent_projet_id === currentUserId)).length;
      case 'collaborateur':
        return projets.filter(p => !p.is_archived && p.collaborateurs.some(c => c.employe_id === currentUserId)).length;
      case 'archive':
        return projets.filter(p => p.is_archived && (
          p.auteur_id === currentUserId || 
          p.referent_projet_id === currentUserId ||
          p.collaborateurs.some(c => c.employe_id === currentUserId)
        )).length;
      default:
        return 0;
    }
  };

  const filteredProjets = getFilteredProjets();

  const prioriteOptions = [
    { value: 'basse', label: 'Basse', color: 'bg-gray-100 text-gray-600' },
    { value: 'normale', label: 'Normale', color: 'bg-blue-100 text-blue-600' },
    { value: 'haute', label: 'Haute', color: 'bg-orange-100 text-orange-600' },
    { value: 'urgente', label: 'Urgente', color: 'bg-red-100 text-red-600' }
  ];

  const statutOptions = [
    { value: 'brouillon', label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
    { value: 'en_cours', label: 'En cours', color: 'bg-blue-100 text-blue-800' },
    { value: 'termine', label: 'Terminé', color: 'bg-green-100 text-green-800' },
    { value: 'suspendu', label: 'Suspendu', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'annule', label: 'Annulé', color: 'bg-red-100 text-red-800' }
  ];

  const getPrioriteColor = (priorite: string) => {
    return prioriteOptions.find(p => p.value === priorite)?.color || 'bg-gray-100 text-gray-600';
  };

  const getStatutColor = (statut: string) => {
    return statutOptions.find(s => s.value === statut)?.color || 'bg-gray-100 text-gray-800';
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
          <h1 className="text-3xl font-bold text-gray-900">Mes fiches projets</h1>
          <p className="text-gray-600 mt-1">Gérez vos projets et collaborations</p>
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

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('mes-projets')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'mes-projets'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Mes projets ({getTabCount('mes-projets')})
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('collaborateur')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'collaborateur'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Mes projets collaborateur ({getTabCount('collaborateur')})
            </div>
          </button>

          <button
            onClick={() => setActiveTab('archive')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'archive'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5" />
              Archive ({getTabCount('archive')})
            </div>
          </button>
        </nav>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher par titre, client, description ou référent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProjets.map((projet) => (
          <div 
            key={projet.id} 
            className="bg-white rounded-lg shadow-sm border hover:shadow-lg transition-all duration-200"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Building className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{projet.titre}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getPrioriteColor(projet.priorite)} flex-shrink-0`}>
                      {prioriteOptions.find(p => p.value === projet.priorite)?.label}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatutColor(projet.statut)} flex-shrink-0`}>
                      {statutOptions.find(s => s.value === projet.statut)?.label}
                    </span>
                    {projet.is_archived && (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 flex-shrink-0">
                        Archivé
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Client:</strong> {projet.nom_client}
                  </p>
                </div>
                
                {/* Actions */}
                <div className="flex gap-1">
                  {activeTab === 'archive' ? (
                    <button
                      onClick={() => handleUnarchiveProject(projet.id, projet.titre)}
                      className="text-green-600 hover:text-green-900 p-2 rounded hover:bg-green-50"
                      title="Désarchiver le projet"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  ) : (
                    canEditProject(projet) && (
                      <button
                        onClick={() => handleArchiveProject(projet.id, projet.titre)}
                        className="text-gray-600 hover:text-gray-900 p-2 rounded hover:bg-gray-50"
                        title="Archiver le projet"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Informations principales */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>Début: {format(new Date(projet.date_debut), 'dd/MM/yyyy', { locale: fr })}</span>
                </div>
                
                {projet.date_fin_prevue && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>Fin prévue: {format(new Date(projet.date_fin_prevue), 'dd/MM/yyyy', { locale: fr })}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span>Référent: {projet.referent_nom}</span>
                </div>
              </div>

              {/* Collaborateurs */}
              {projet.collaborateurs.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Collaborateurs:</h4>
                  <div className="flex flex-wrap gap-1">
                    {projet.collaborateurs.slice(0, 3).map((collab) => (
                      <span
                        key={collab.id}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                      >
                        {collab.employe_nom}
                      </span>
                    ))}
                    {projet.collaborateurs.length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-600">
                        +{projet.collaborateurs.length - 3} autres
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Avancement */}
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Créé le {format(new Date(projet.created_at), 'dd/MM/yyyy', { locale: fr })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Avancement: {projet.taux_avancement}%</span>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        projet.statut === 'termine' ? 'bg-green-600' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${projet.taux_avancement}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredProjets.length === 0 && (
          <div className="col-span-full text-center py-12">
            {activeTab === 'archive' ? (
              <>
                <Archive className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun projet archivé</h3>
                <p className="text-gray-600">
                  {searchTerm 
                    ? 'Aucun projet archivé ne correspond à vos critères de recherche.'
                    : 'Vous n\'avez aucun projet archivé pour le moment.'
                  }
                </p>
              </>
            ) : (
              <>
                <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {activeTab === 'mes-projets' ? 'Aucun projet' : 'Aucune collaboration'}
                </h3>
                <p className="text-gray-600">
                  {searchTerm 
                    ? 'Aucun projet ne correspond à vos critères de recherche.'
                    : activeTab === 'mes-projets' 
                      ? 'Vous n\'avez créé aucun projet pour le moment.'
                      : 'Vous ne collaborez sur aucun projet pour le moment.'
                  }
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FichesProjets;