import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, User, Building, Target, Edit, Trash2, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Projet {
  id: string;
  nom_client: string;
  date_debut: string;
  description: string;
  referent_projet_id: string;
  created_at: string;
  referent: {
    full_name: string;
  };
  collaborateurs: ProjetCollaborateur[];
}

interface ProjetCollaborateur {
  id: string;
  projet_id: string;
  employe_id: string;
  role_projet: string;
  employe: {
    full_name: string;
    role: string;
  };
}

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  department: string | null;
}

interface CollaborateurForm {
  employe_id: string;
  role_projet: string;
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

  // Form state
  const [formData, setFormData] = useState({
    nom_client: '',
    date_debut: '',
    description: '',
    referent_projet_id: '',
    collaborateurs: [{ employe_id: '', role_projet: '' }] as CollaborateurForm[]
  });

  const rolesProjet = [
    'Chef de projet',
    'Développeur Senior',
    'Développeur Junior',
    'Designer',
    'Analyste',
    'Testeur',
    'Consultant',
    'Support technique',
    'Coordinateur',
    'Autre'
  ];

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

      if (!profile || !['direction', 'referent_projet', 'admin'].includes(profile.role)) {
        throw new Error('Accès non autorisé');
      }

      setCurrentUserRole(profile.role);
    } catch (err) {
      setError('Vous n\'avez pas les droits pour accéder à cette page');
      setLoading(false);
    }
  };

  const fetchProjets = async () => {
    try {
      const { data, error } = await supabase
        .from('projets')
        .select(`
          id,
          nom_client,
          date_debut,
          description,
          referent_projet_id,
          created_at,
          referent:user_profiles!referent_projet_id(full_name),
          collaborateurs:projet_collaborateurs(
            id,
            employe_id,
            role_projet,
            employe:user_profiles!employe_id(full_name, role)
          )
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Créer le projet
      const { data: projetData, error: projetError } = await supabase
        .from('projets')
        .insert([{
          nom_client: formData.nom_client,
          date_debut: formData.date_debut,
          description: formData.description,
          referent_projet_id: formData.referent_projet_id,
          created_by: user.id
        }])
        .select()
        .single();

      if (projetError) throw projetError;

      // Ajouter les collaborateurs
      const collaborateursData = formData.collaborateurs
        .filter(collab => collab.employe_id && collab.role_projet)
        .map(collab => ({
          projet_id: projetData.id,
          employe_id: collab.employe_id,
          role_projet: collab.role_projet
        }));

      if (collaborateursData.length > 0) {
        const { error: collabError } = await supabase
          .from('projet_collaborateurs')
          .insert(collaborateursData);

        if (collabError) throw collabError;
      }

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
    if (!editingProjet) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Mettre à jour le projet
      const { error: projetError } = await supabase
        .from('projets')
        .update({
          nom_client: formData.nom_client,
          date_debut: formData.date_debut,
          description: formData.description,
          referent_projet_id: formData.referent_projet_id
        })
        .eq('id', editingProjet.id);

      if (projetError) throw projetError;

      // Supprimer les anciens collaborateurs
      const { error: deleteError } = await supabase
        .from('projet_collaborateurs')
        .delete()
        .eq('projet_id', editingProjet.id);

      if (deleteError) throw deleteError;

      // Ajouter les nouveaux collaborateurs
      const collaborateursData = formData.collaborateurs
        .filter(collab => collab.employe_id && collab.role_projet)
        .map(collab => ({
          projet_id: editingProjet.id,
          employe_id: collab.employe_id,
          role_projet: collab.role_projet
        }));

      if (collaborateursData.length > 0) {
        const { error: collabError } = await supabase
          .from('projet_collaborateurs')
          .insert(collaborateursData);

        if (collabError) throw collabError;
      }

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

  const handleDelete = async (projetId: string, nomClient: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le projet "${nomClient}" ? Cette action est irréversible.`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('projets')
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
    setEditingProjet(projet);
    setFormData({
      nom_client: projet.nom_client,
      date_debut: projet.date_debut,
      description: projet.description,
      referent_projet_id: projet.referent_projet_id,
      collaborateurs: projet.collaborateurs.length > 0 
        ? projet.collaborateurs.map(collab => ({
            employe_id: collab.employe_id,
            role_projet: collab.role_projet
          }))
        : [{ employe_id: '', role_projet: '' }]
    });
    setShowEditForm(true);
  };

  const resetForm = () => {
    setFormData({
      nom_client: '',
      date_debut: '',
      description: '',
      referent_projet_id: '',
      collaborateurs: [{ employe_id: '', role_projet: '' }]
    });
  };

  const addCollaborateur = () => {
    setFormData(prev => ({
      ...prev,
      collaborateurs: [...prev.collaborateurs, { employe_id: '', role_projet: '' }]
    }));
  };

  const removeCollaborateur = (index: number) => {
    setFormData(prev => ({
      ...prev,
      collaborateurs: prev.collaborateurs.filter((_, i) => i !== index)
    }));
  };

  const updateCollaborateur = (index: number, field: keyof CollaborateurForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      collaborateurs: prev.collaborateurs.map((collab, i) => 
        i === index ? { ...collab, [field]: value } : collab
      )
    }));
  };

  const filteredProjets = projets.filter(projet =>
    projet.nom_client.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  if (error && !projets.length) {
    return (
      <div className="text-center py-12">
        <Target className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Accès refusé</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Projets</h1>
          <p className="text-gray-600 mt-1">Créez et gérez les projets clients avec leurs équipes</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouveau projet
        </button>
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

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher par client, description ou référent..."
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
                    <h3 className="text-xl font-semibold text-gray-900">{projet.nom_client}</h3>
                  </div>
                  <p className="text-gray-600 mb-3">{projet.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditForm(projet)}
                    className="text-indigo-600 hover:text-indigo-900 p-2 rounded hover:bg-indigo-50"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(projet.id, projet.nom_client)}
                    className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Début: {format(new Date(projet.date_debut), 'dd/MM/yyyy', { locale: fr })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>Référent: {projet.referent?.full_name}</span>
                </div>
              </div>

              {projet.collaborateurs.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Équipe projet ({projet.collaborateurs.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {projet.collaborateurs.map((collab) => (
                      <div key={collab.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-900">
                          {collab.employe.full_name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {collab.role_projet}
                        </div>
                        <div className="text-xs text-gray-500">
                          {collab.employe.role}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                : 'Commencez par créer votre premier projet.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {(showCreateForm || showEditForm) && (
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
                      Nom du client *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nom_client}
                      onChange={(e) => setFormData(prev => ({ ...prev, nom_client: e.target.value }))}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Référent projet *
                  </label>
                  <select
                    required
                    value={formData.referent_projet_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, referent_projet_id: e.target.value }))}
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

              {/* Équipe projet */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Équipe projet</h3>
                  <button
                    type="button"
                    onClick={addCollaborateur}
                    className="text-indigo-600 hover:text-indigo-700 text-sm flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un collaborateur
                  </button>
                </div>

                {formData.collaborateurs.map((collab, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Collaborateur
                      </label>
                      <select
                        value={collab.employe_id}
                        onChange={(e) => updateCollaborateur(index, 'employe_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Sélectionner un employé</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.full_name} ({user.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rôle dans le projet
                        </label>
                        <select
                          value={collab.role_projet}
                          onChange={(e) => updateCollaborateur(index, 'role_projet', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Sélectionner un rôle</option>
                          {rolesProjet.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </div>
                      {formData.collaborateurs.length > 1 && (
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeCollaborateur(index)}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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