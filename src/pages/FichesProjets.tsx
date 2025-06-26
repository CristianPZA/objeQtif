import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, User, Building, Target, Edit, Trash2, Users, Lock, UserPlus, X, CheckCircle, Clock, AlertCircle, Archive, FolderOpen } from 'lucide-react';
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

const FichesProjets = () => {
  const [activeTab, setActiveTab] = useState<'actifs' | 'archives'>('actifs');
  const [projets, setProjets] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    checkUserAccess();
    fetchProjets();
  }, []);

  const checkUserAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');
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

  // Filtrer les projets selon l'onglet actif
  const getFilteredProjets = () => {
    const userProjets = projets.filter(projet => 
      projet.collaborateurs.some(collab => collab.employe_id === currentUserId) ||
      projet.auteur_id === currentUserId ||
      projet.referent_projet_id === currentUserId
    );

    if (activeTab === 'archives') {
      // Projets terminés, suspendus ou annulés
      return userProjets.filter(projet => 
        ['termine', 'suspendu', 'annule'].includes(projet.statut)
      );
    } else {
      // Projets actifs (brouillon, en_cours)
      return userProjets.filter(projet => 
        ['brouillon', 'en_cours'].includes(projet.statut)
      );
    }
  };

  const filteredProjets = getFilteredProjets().filter(projet =>
    projet.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    projet.nom_client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    projet.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    projet.referent_nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatutColor = (statut: string) => {
    const statutOptions = {
      'brouillon': 'bg-gray-100 text-gray-800',
      'en_cours': 'bg-blue-100 text-blue-800',
      'termine': 'bg-green-100 text-green-800',
      'suspendu': 'bg-yellow-100 text-yellow-800',
      'annule': 'bg-red-100 text-red-800'
    };
    return statutOptions[statut as keyof typeof statutOptions] || 'bg-gray-100 text-gray-800';
  };

  const getStatutLabel = (statut: string) => {
    const statutLabels = {
      'brouillon': 'Brouillon',
      'en_cours': 'En cours',
      'termine': 'Terminé',
      'suspendu': 'Suspendu',
      'annule': 'Annulé'
    };
    return statutLabels[statut as keyof typeof statutLabels] || statut;
  };

  const getPrioriteColor = (priorite: string) => {
    const prioriteOptions = {
      'basse': 'bg-gray-100 text-gray-600',
      'normale': 'bg-blue-100 text-blue-600',
      'haute': 'bg-orange-100 text-orange-600',
      'urgente': 'bg-red-100 text-red-600'
    };
    return prioriteOptions[priorite as keyof typeof prioriteOptions] || 'bg-gray-100 text-gray-600';
  };

  const getPrioriteLabel = (priorite: string) => {
    const prioriteLabels = {
      'basse': 'Basse',
      'normale': 'Normale',
      'haute': 'Haute',
      'urgente': 'Urgente'
    };
    return prioriteLabels[priorite as keyof typeof prioriteLabels] || priorite;
  };

  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case 'brouillon':
        return <Edit className="w-4 h-4" />;
      case 'en_cours':
        return <Clock className="w-4 h-4" />;
      case 'termine':
        return <CheckCircle className="w-4 h-4" />;
      case 'suspendu':
        return <AlertCircle className="w-4 h-4" />;
      case 'annule':
        return <X className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
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
          <h1 className="text-3xl font-bold text-gray-900">Mes objectifs projets</h1>
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

      {/* Onglets */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('actifs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'actifs'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Projets actifs
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                activeTab === 'actifs' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {projets.filter(p => 
                  (p.collaborateurs.some(c => c.employe_id === currentUserId) || 
                   p.auteur_id === currentUserId || 
                   p.referent_projet_id === currentUserId) &&
                  ['brouillon', 'en_cours'].includes(p.statut)
                ).length}
              </span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('archives')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'archives'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5" />
              Archives
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                activeTab === 'archives' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {projets.filter(p => 
                  (p.collaborateurs.some(c => c.employe_id === currentUserId) || 
                   p.auteur_id === currentUserId || 
                   p.referent_projet_id === currentUserId) &&
                  ['termine', 'suspendu', 'annule'].includes(p.statut)
                ).length}
              </span>
            </div>
          </button>
        </nav>
      </div>

      {/* Info message selon l'onglet */}
      <div className={`border rounded-lg p-4 ${
        activeTab === 'archives' 
          ? 'bg-amber-50 border-amber-200' 
          : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-center gap-3">
          {activeTab === 'archives' ? (
            <Archive className="w-5 h-5 text-amber-600" />
          ) : (
            <Target className="w-5 h-5 text-blue-600" />
          )}
          <div>
            <h3 className={`text-sm font-medium ${
              activeTab === 'archives' ? 'text-amber-800' : 'text-blue-800'
            }`}>
              {activeTab === 'archives' ? 'Projets archivés' : 'Projets actifs'}
            </h3>
            <p className={`text-sm mt-1 ${
              activeTab === 'archives' ? 'text-amber-700' : 'text-blue-700'
            }`}>
              {activeTab === 'archives' 
                ? 'Consultez vos projets terminés, suspendus ou annulés. Vous pouvez toujours accéder aux évaluations et objectifs.'
                : 'Gérez vos objectifs et évaluations pour les projets en cours ou en brouillon.'
              }
            </p>
          </div>
        </div>
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
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getStatutColor(projet.statut)} gap-1`}>
                        {getStatutIcon(projet.statut)}
                        {getStatutLabel(projet.statut)}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPrioriteColor(projet.priorite)} flex-shrink-0`}>
                        {getPrioriteLabel(projet.priorite)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Client:</strong> {projet.nom_client}
                  </p>
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
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          collab.employe_id === currentUserId 
                            ? 'bg-indigo-100 text-indigo-700 font-medium' 
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {collab.employe_nom}
                        {collab.employe_id === currentUserId && ' (Vous)'}
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

              {/* Barre de progression */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Avancement</span>
                  <span className="text-sm text-gray-600">{projet.taux_avancement}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      projet.statut === 'termine' ? 'bg-green-600' : 
                      projet.statut === 'suspendu' ? 'bg-yellow-600' :
                      projet.statut === 'annule' ? 'bg-red-600' :
                      'bg-indigo-600'
                    }`}
                    style={{ width: `${projet.taux_avancement}%` }}
                  ></div>
                </div>
              </div>

              {/* Actions selon le statut */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  {activeTab === 'archives' ? (
                    <span>Archivé le {format(new Date(projet.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
                  ) : (
                    <span>Créé le {format(new Date(projet.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {activeTab === 'actifs' ? (
                    <button className="text-indigo-600 hover:text-indigo-900 text-sm font-medium hover:bg-indigo-50 px-3 py-1 rounded transition-colors">
                      Gérer les objectifs
                    </button>
                  ) : (
                    <button className="text-gray-600 hover:text-gray-900 text-sm font-medium hover:bg-gray-50 px-3 py-1 rounded transition-colors">
                      Voir les évaluations
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredProjets.length === 0 && (
          <div className="col-span-full text-center py-12">
            {activeTab === 'archives' ? (
              <Archive className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            ) : (
              <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            )}
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab === 'archives' ? 'Aucun projet archivé' : 'Aucun projet actif'}
            </h3>
            <p className="text-gray-600">
              {searchTerm ? (
                'Aucun projet ne correspond à vos critères de recherche.'
              ) : activeTab === 'archives' ? (
                'Vous n\'avez pas encore de projets terminés, suspendus ou annulés.'
              ) : (
                'Vous n\'avez pas encore de projets en cours ou en brouillon.'
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FichesProjets;