import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, User, Building, Target, Edit, Trash2, Users, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Projet {
  id: string;
  titre: string;
  date_debut: string;
  description: string;
  referent_id: string;
  created_at: string;
  referent: {
    full_name: string;
  };
  auteur: {
    full_name: string;
  };
  statut: string;
  taux_avancement: number;
}

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  department: string | null;
}

const Projets = () => {
  const [projets, setProjets] = useState<Projet[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingProjet, setEditingProjet] = useState<Projet | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    titre: '',
    date_debut: '',
    description: '',
    referent_id: '',
    objectifs: [] as string[],
    budget_estime: '',
    date_fin_prevue: ''
  });

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
        .from('fiches_projets')
        .select(`
          id,
          titre,
          date_debut,
          description,
          referent_id,
          auteur_id,
          created_at,
          statut,
          taux_avancement,
          referent:user_profiles!referent_id(full_name),
          auteur:user_profiles!auteur_id(full_name)
        `)
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

  const canCreateOrEdit = () => {
    return currentUserRole && ['direction', 'referent_projet', 'admin'].includes(currentUserRole);
  };

  const canEditProject = (projet: Projet) => {
    if (!currentUserRole || !currentUserId) return false;
    
    // Admin et direction peuvent tout modifier
    if (['admin', 'direction'].includes(currentUserRole)) return true;
    
    // Référent projet peut modifier ses projets
    if (currentUserRole === 'referent_projet' && projet.referent_id === currentUserId) return true;
    
    return false;
  };

  const canDeleteProject = (projet: Projet) => {
    return canEditProject(projet);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreateOrEdit()) {
      setError('Vous n\'avez pas les droits pour créer un projet');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Créer le projet
      const { data: projetData, error: projetError } = await supabase
        .from('fiches_projets')
        .insert([{
          titre: formData.titre,
          date_debut: formData.date_debut,
          description: formData.description,
          referent_id: formData.referent_id,
          auteur_id: user.id,
          objectifs: formData.objectifs,
          budget_estime: formData.budget_estime ? parseFloat(formData.budget_estime) : null,
          date_fin_prevue: formData.date_fin_prevue || null
        }])
        .select()
        .single();

      if (projetError) throw projetError;

      setSuccess('Projet créé avec succès');
      resetForm();
      setShowCreateForm(false);
      fetchProjets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du projet');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProjet || !canEditProject(editingProjet)) {
      setError('Vous n\'avez pas les droits pour modifier ce projet');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Mettre à jour le projet
      const { error: projetError } = await supabase
        .from('fiches_projets')
        .update({
          titre: formData.titre,
          date_debut: formData.date_debut,
          description: formData.description,
          referent_id: formData.referent_id,
          objectifs: formData.objectifs,
          budget_estime: formData.budget_estime ? parseFloat(formData.budget_estime) : null,
          date_fin_prevue: formData.date_fin_prevue || null
        })
        .eq('id', editingProjet.id);

      if (projetError) throw projetError;

      setSuccess('Projet modifié avec succès');
      setShowEditForm(false);
      setEditingProjet(null);
      fetchProjets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification du projet');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projetId: string, titre: string) => {
    const projet = projets.find(p => p.id === projetId);
    if (!projet || !canDeleteProject(projet)) {
      setError('Vous n\'avez pas les droits pour supprimer ce projet');
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer le projet "${titre}" ? Cette action est irréversible.`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('fiches_projets')
        .delete()
        .eq('id', projetId);

      if (error) throw error;

      setSuccess('Projet supprimé avec succès');
      fetchProjets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression du projet');
    } finally {
      setLoading(false);
    }
  };

  const openEditForm = (projet: Projet) => {
    if (!canEditProject(projet)) {
      setError('Vous n\'avez pas les droits pour modifier ce projet');
      return;
    }

    setEditingProjet(projet);
    setFormData({
      titre: projet.titre,
      date_debut: projet.date_debut,
      description: projet.description,
      referent_id: projet.referent_id,
      objectifs: [],
      budget_estime: '',
      date_fin_prevue: ''
    });
    setShowEditForm(true);
  };

  const resetForm = () => {
    setFormData({
      titre: '',
      date_debut: '',
      description: '',
      referent_id: '',
      objectifs: [],
      budget_estime: '',
      date_fin_prevue: ''
    });
  };

  const filteredProjets = projets.filter(projet =>
    projet.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    projet.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    projet.referent?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const referents = users.filter(user => 
    ['referent_projet', 'direction', 'admin'].includes(user.role)
  );

  if (loading && !showCreateForm && !showEditForm) {
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
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Projets</h1>
          <p className="text-gray-600 mt-1">Consultez et gérez les fiches projets</p>
        </div>
        {canCreateOrEdit() && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouveau projet
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg">
          {success}
        </div>
      )}

      {/* Access Info for non-privileged users */}
      {!canCreateOrEdit() && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Mode consultation</h3>
              <p className="text-sm text-blue-700 mt-1">
                Vous pouvez consulter les projets mais seuls les référents projet, la direction et les administrateurs peuvent créer ou modifier des projets.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher par titre, description ou référent..."
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
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      projet.statut === 'brouillon' ? 'bg-gray-100 text-gray-800' :
                      projet.statut === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
                      projet.statut === 'validee' ? 'bg-green-100 text-green-800' :
                      projet.statut === 'finalisee' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {projet.statut}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{projet.description}</p>
                </div>
                {(canEditProject(projet) || canDeleteProject(projet)) && (
                  <div className="flex gap-2">
                    {canEditProject(projet) && (
                      <button
                        onClick={() => openEditForm(projet)}
                        className="text-indigo-600 hover:text-indigo-900 p-2 rounded hover:bg-indigo-50"
                        title="Modifier le projet"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {canDeleteProject(projet) && (
                      <button
                        onClick={() => handleDelete(projet.id, projet.titre)}
                        className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50"
                        title="Supprimer le projet"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Début: {format(new Date(projet.date_debut), 'dd/MM/yyyy', { locale: fr })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>Référent: {projet.referent?.full_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Target className="w-4 h-4" />
                  <span>Avancement: {projet.taux_avancement || 0}%</span>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                Créé par: {projet.auteur?.full_name}
              </div>
            </div>
          </div>
        ))}

        {filteredProjets.length === 0 && (
          <div className="text-center py-12">
            <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun projet</h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'Aucun projet ne correspond à vos critères de recherche.'
                : 'Aucun projet n\'a encore été créé.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {(showCreateForm || showEditForm) && canCreateOrEdit() && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                {showEditForm ? 'Modifier le projet' : 'Nouveau projet'}
              </h2>
            </div>

            <form onSubmit={showEditForm ? handleEdit : handleSubmit} className="p-6 space-y-6">
              {/* Informations générales */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Informations générales</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Titre du projet *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.titre}
                      onChange={(e) => setFormData(prev => ({ ...prev, titre: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de début *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date_debut}
                      onChange={(e) => setFormData(prev => ({ ...prev, date_debut: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Référent projet *
                    </label>
                    <select
                      required
                      value={formData.referent_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, referent_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Sélectionner un référent</option>
                      {referents.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de fin prévue
                    </label>
                    <input
                      type="date"
                      value={formData.date_fin_prevue}
                      onChange={(e) => setFormData(prev => ({ ...prev, date_fin_prevue: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget estimé (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.budget_estime}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget_estime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description du projet *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description brève du projet, objectifs, contexte..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    if (showEditForm) {
                      setShowEditForm(false);
                      setEditingProjet(null);
                    } else {
                      setShowCreateForm(false);
                    }
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? (showEditForm ? 'Modification...' : 'Création...') : (showEditForm ? 'Modifier le projet' : 'Créer le projet')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projets;