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

    const searchFiltered = userProjets.filter(projet =>
      projet.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projet.nom_client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projet.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (activeTab === 'actifs') {
      return searchFiltered.filter(projet => 
        projet.statut !== 'termine' && projet.statut !== 'annule'
      );
    } else {
      return searchFiltered.filter(projet => 
        projet.statut === 'termine' || projet.statut === 'annule'
      );
    }
  };

  const filteredProjets = getFilteredProjets();

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
          <p className="text-gray-600 mt-1">Consultez vos projets et gérez vos objectifs</p>
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
            onClick={() => setActiveTab('actifs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'actifs'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Projets actifs
            </div>
          </button>
          <button
            onClick={() => setActiveTab('archives')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'archives'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5" />
              Archives
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
            placeholder="Rechercher par titre, client ou description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Projects List */}
      <div className="grid gap-6">
        {filteredProjets.map((projet) => (
          <div key={projet.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Building className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-xl font-semibold text-gray-900">{projet.titre}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatutColor(projet.statut)}`}>
                      {projet.statut === 'brouillon' && 'Brouillon'}
                      {projet.statut === 'en_cours' && 'En cours'}
                      {projet.statut === 'termine' && 'Terminé'}
                      {projet.statut === 'suspendu' && 'Suspendu'}
                      {projet.statut === 'annule' && 'Annulé'}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getPrioriteColor(projet.priorite)}`}>
                      {projet.priorite === 'basse' && 'Basse'}
                      {projet.priorite === 'normale' && 'Normale'}
                      {projet.priorite === 'haute' && 'Haute'}
                      {projet.priorite === 'urgente' && 'Urgente'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Client:</strong> {projet.nom_client}
                  </p>
                  <p className="text-gray-600 mb-3">{projet.description}</p>
                </div>
              </div>

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

              {projet.budget_estime && (
                <div className="mb-4 text-sm text-gray-600">
                  <strong>Budget estimé:</strong> {projet.budget_estime.toLocaleString('fr-FR')} €
                </div>
              )}

              {projet.collaborateurs.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Collaborateurs:</h4>
                  <div className="flex flex-wrap gap-2">
                    {projet.collaborateurs.map((collab) => (
                      <span
                        key={collab.id}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                      >
                        {collab.employe_nom} ({collab.role_projet})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Créé par: {projet.auteur_nom}
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
          <div className="text-center py-12">
            {activeTab === 'actifs' ? (
              <>
                <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun projet actif</h3>
                <p className="text-gray-600">
                  {searchTerm 
                    ? 'Aucun projet actif ne correspond à vos critères de recherche.'
                    : 'Vous n\'avez aucun projet actif pour le moment.'
                  }
                </p>
              </>
            ) : (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FichesProjets;