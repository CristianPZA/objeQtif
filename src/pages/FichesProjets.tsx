import React, { useState, useEffect } from 'react';
import { Target, Archive, Plus, Search, Calendar, User, Building, CheckCircle, Clock, AlertCircle, Edit, Trash2, Eye, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface FicheProjet {
  id: string;
  collaboration_id: string;
  contenu: string;
  statut: string;
  created_at: string;
  updated_at: string;
  projet: {
    id: string;
    titre: string;
    nom_client: string;
    statut: string;
    date_debut: string;
    date_fin_prevue: string | null;
  };
  employe: {
    full_name: string;
  };
  role_projet: string;
}

interface ObjectifCollaborateur {
  id: string;
  collaboration_id: string;
  objectifs: any[];
  created_at: string;
  updated_at: string;
  projet: {
    id: string;
    titre: string;
    nom_client: string;
    statut: string;
  };
  employe: {
    full_name: string;
  };
  role_projet: string;
}

const FichesProjets = () => {
  const [activeTab, setActiveTab] = useState<'actives' | 'archives'>('actives');
  const [fiches, setFiches] = useState<FicheProjet[]>([]);
  const [objectifs, setObjectifs] = useState<ObjectifCollaborateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      setCurrentUserId(user.id);
      await Promise.all([fetchFiches(), fetchObjectifs()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchFiches = async () => {
    try {
      const { data, error } = await supabase
        .from('fiches_collaborateurs')
        .select(`
          *,
          collaboration:projet_collaborateurs!collaboration_id(
            role_projet,
            employe:user_profiles!employe_id(full_name),
            projet:projets!projet_id(id, titre, nom_client, statut, date_debut, date_fin_prevue)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transformer les données pour correspondre à notre interface
      const transformedFiches = (data || []).map(fiche => ({
        id: fiche.id,
        collaboration_id: fiche.collaboration_id,
        contenu: fiche.contenu,
        statut: fiche.statut,
        created_at: fiche.created_at,
        updated_at: fiche.updated_at,
        projet: fiche.collaboration.projet,
        employe: fiche.collaboration.employe,
        role_projet: fiche.collaboration.role_projet
      }));

      setFiches(transformedFiches);
    } catch (err) {
      console.error('Error fetching fiches:', err);
    }
  };

  const fetchObjectifs = async () => {
    try {
      const { data, error } = await supabase
        .from('objectifs_collaborateurs')
        .select(`
          *,
          collaboration:projet_collaborateurs!collaboration_id(
            role_projet,
            employe:user_profiles!employe_id(full_name),
            projet:projets!projet_id(id, titre, nom_client, statut)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transformer les données pour correspondre à notre interface
      const transformedObjectifs = (data || []).map(objectif => ({
        id: objectif.id,
        collaboration_id: objectif.collaboration_id,
        objectifs: objectif.objectifs,
        created_at: objectif.created_at,
        updated_at: objectif.updated_at,
        projet: objectif.collaboration.projet,
        employe: objectif.collaboration.employe,
        role_projet: objectif.collaboration.role_projet
      }));

      setObjectifs(transformedObjectifs);
    } catch (err) {
      console.error('Error fetching objectifs:', err);
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'brouillon':
        return 'bg-gray-100 text-gray-800';
      case 'soumise':
        return 'bg-blue-100 text-blue-800';
      case 'validee':
        return 'bg-green-100 text-green-800';
      case 'rejetee':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'brouillon':
        return 'Brouillon';
      case 'soumise':
        return 'Soumise';
      case 'validee':
        return 'Validée';
      case 'rejetee':
        return 'Rejetée';
      default:
        return 'Inconnu';
    }
  };

  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case 'brouillon':
        return <Edit className="w-4 h-4" />;
      case 'soumise':
        return <Clock className="w-4 h-4" />;
      case 'validee':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejetee':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getProjetStatutColor = (statut: string) => {
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

  // Filtrer les données selon l'onglet actif
  const filteredFiches = fiches.filter(fiche => {
    const matchesSearch = fiche.projet.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fiche.projet.nom_client.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'actives') {
      // Onglet actif : projets en cours ou récemment terminés
      return matchesSearch && ['en_cours', 'termine'].includes(fiche.projet.statut);
    } else {
      // Onglet archives : projets suspendus, annulés ou anciens
      return matchesSearch && ['suspendu', 'annule', 'brouillon'].includes(fiche.projet.statut);
    }
  });

  const filteredObjectifs = objectifs.filter(objectif => {
    const matchesSearch = objectif.projet.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         objectif.projet.nom_client.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'actives') {
      return matchesSearch && ['en_cours', 'termine'].includes(objectif.projet.statut);
    } else {
      return matchesSearch && ['suspendu', 'annule', 'brouillon'].includes(objectif.projet.statut);
    }
  });

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
          <p className="text-gray-600 mt-1">Gérez vos objectifs et fiches de projets</p>
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
            onClick={() => setActiveTab('actives')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'actives'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Objectifs et fiches actifs
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
            placeholder="Rechercher par titre de projet ou client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
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
              <p className="text-sm font-medium text-gray-600">Total Objectifs</p>
              <p className="text-2xl font-bold text-gray-900">{objectifs.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Fiches</p>
              <p className="text-2xl font-bold text-gray-900">{fiches.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Validées</p>
              <p className="text-2xl font-bold text-gray-900">
                {fiches.filter(f => f.statut === 'validee').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">En attente</p>
              <p className="text-2xl font-bold text-gray-900">
                {fiches.filter(f => f.statut === 'soumise').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Objectifs Section */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Target className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Objectifs de projets</h2>
                  <p className="text-sm text-gray-600">
                    {activeTab === 'actives' ? 'Objectifs des projets actifs' : 'Objectifs archivés'}
                  </p>
                </div>
              </div>
              <span className="text-sm text-gray-500">
                {filteredObjectifs.length} objectif{filteredObjectifs.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="p-6">
            {filteredObjectifs.length > 0 ? (
              <div className="grid gap-4">
                {filteredObjectifs.map((objectif) => (
                  <div key={objectif.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Building className="w-4 h-4 text-gray-500" />
                          <h3 className="font-semibold text-gray-900">{objectif.projet.titre}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${getProjetStatutColor(objectif.projet.statut)}`}>
                            {objectif.projet.statut}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Client:</strong> {objectif.projet.nom_client}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Rôle:</strong> {objectif.role_projet}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Objectifs définis:</h4>
                      {objectif.objectifs && objectif.objectifs.length > 0 ? (
                        <ul className="space-y-1">
                          {objectif.objectifs.slice(0, 3).map((obj: any, index: number) => (
                            <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-indigo-600 mt-1">•</span>
                              <span>{typeof obj === 'string' ? obj : obj.description || 'Objectif défini'}</span>
                            </li>
                          ))}
                          {objectif.objectifs.length > 3 && (
                            <li className="text-sm text-gray-500 italic">
                              +{objectif.objectifs.length - 3} autres objectifs...
                            </li>
                          )}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500 italic">Aucun objectif défini</p>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>
                        Créé le {format(new Date(objectif.created_at), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                      {objectif.updated_at !== objectif.created_at && (
                        <span>
                          Modifié le {format(new Date(objectif.updated_at), 'dd/MM/yyyy', { locale: fr })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {activeTab === 'actives' ? 'Aucun objectif actif' : 'Aucun objectif archivé'}
                </h3>
                <p className="text-gray-600">
                  {activeTab === 'actives' 
                    ? 'Vos objectifs de projets actifs apparaîtront ici.'
                    : 'Vos objectifs de projets archivés apparaîtront ici.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Fiches Section */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Fiches de projets</h2>
                  <p className="text-sm text-gray-600">
                    {activeTab === 'actives' ? 'Fiches des projets actifs' : 'Fiches archivées'}
                  </p>
                </div>
              </div>
              <span className="text-sm text-gray-500">
                {filteredFiches.length} fiche{filteredFiches.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="p-6">
            {filteredFiches.length > 0 ? (
              <div className="grid gap-4">
                {filteredFiches.map((fiche) => (
                  <div key={fiche.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Building className="w-4 h-4 text-gray-500" />
                          <h3 className="font-semibold text-gray-900">{fiche.projet.titre}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${getProjetStatutColor(fiche.projet.statut)}`}>
                            {fiche.projet.statut}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Client:</strong> {fiche.projet.nom_client}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Rôle:</strong> {fiche.role_projet}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatutColor(fiche.statut)}`}>
                          {getStatutIcon(fiche.statut)}
                          <span className="ml-1">{getStatutLabel(fiche.statut)}</span>
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Contenu de la fiche:</h4>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {fiche.contenu || 'Aucun contenu défini'}
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>
                        Créée le {format(new Date(fiche.created_at), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                      {fiche.updated_at !== fiche.created_at && (
                        <span>
                          Modifiée le {format(new Date(fiche.updated_at), 'dd/MM/yyyy', { locale: fr })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {activeTab === 'actives' ? 'Aucune fiche active' : 'Aucune fiche archivée'}
                </h3>
                <p className="text-gray-600">
                  {activeTab === 'actives' 
                    ? 'Vos fiches de projets actifs apparaîtront ici.'
                    : 'Vos fiches de projets archivés apparaîtront ici.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-600">ℹ️</div>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">À propos de cette page</p>
            <p>
              {activeTab === 'actives' 
                ? 'Cet onglet affiche vos objectifs et fiches pour les projets en cours et récemment terminés. Vous pouvez définir vos objectifs et remplir vos fiches d\'évaluation ici.'
                : 'Cet onglet contient vos objectifs et fiches pour les projets suspendus, annulés ou en brouillon. Ces éléments sont conservés pour référence historique.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FichesProjets;