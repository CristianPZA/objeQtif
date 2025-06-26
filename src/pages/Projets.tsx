import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, User, Building, Target, Edit, Trash2, CheckCircle, Clock, AlertCircle, X, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ProjectForm from '../components/projects/ProjectForm';
import { Projet, UserProfile } from '../components/projects/types';

const Projets = () => {
  const [projets, setProjets] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showCollaborateursModal, setShowCollaborateursModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [editingProjet, setEditingProjet] = useState<Projet | null>(null);
  const [selectedProjet, setSelectedProjet] = useState<Projet | null>(null);
  const [terminatingProjet, setTerminatingProjet] = useState<Projet | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Collaborateur form state
  const [collaborateurForm, setCollaborateurForm] = useState({
    employe_id: '',
    role_projet: '',
    taux_allocation: '100',
    responsabilites: '',
    date_debut: '',
    date_fin: ''
  });

  const statutOptions = [
    { value: 'brouillon', label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
    { value: 'en_cours', label: 'En cours', color: 'bg-blue-100 text-blue-800' },
    { value: 'termine', label: 'Terminé', color: 'bg-green-100 text-green-800' },
    { value: 'suspendu', label: 'Suspendu', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'annule', label: 'Annulé', color: 'bg-red-100 text-red-800' }
  ];

  const prioriteOptions = [
    { value: 'basse', label: 'Basse', color: 'bg-gray-100 text-gray-600' },
    { value: 'normale', label: 'Normale', color: 'bg-blue-100 text-blue-600' },
    { value: 'haute', label: 'Haute', color: 'bg-orange-100 text-orange-600' },
    { value: 'urgente', label: 'Urgente', color: 'bg-red-100 text-red-600' }
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

  const canEditProject = (projet: Projet) => {
    if (!currentUserRole || !currentUserId) return false;
    
    // Admin peut tout modifier
    if (currentUserRole === 'admin') return true;
    
    // L'auteur ou le référent peuvent modifier
    if (projet.auteur_id === currentUserId || projet.referent_projet_id === currentUserId) return true;
    
    return false;
  };

  const canTerminateProject = (projet: Projet) => {
    if (!currentUserRole || !currentUserId) return false;
    
    // Le projet doit être en cours pour pouvoir être terminé
    if (projet.statut !== 'en_cours') return false;
    
    // Admin peut terminer tous les projets
    if (currentUserRole === 'admin') return true;
    
    // L'auteur ou le référent peuvent terminer
    if (projet.auteur_id === currentUserId || projet.referent_projet_id === currentUserId) return true;
    
    return false;
  };

  const openTerminateModal = (projet: Projet) => {
    setTerminatingProjet(projet);
    setShowTerminateModal(true);
  };

  const handleTerminateProject = async () => {
    if (!terminatingProjet || !canTerminateProject(terminatingProjet)) {
      setError('Vous n\'avez pas les droits pour terminer ce projet');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Marquer le projet comme terminé
      const { error: updateError } = await supabase
        .from('projets')
        .update({
          statut: 'termine',
          taux_avancement: 100,
          updated_at: new Date().toISOString()
        })
        .eq('id', terminatingProjet.id);

      if (updateError) throw updateError;

      // Créer les notifications pour les collaborateurs
      const collaborateurIds = terminatingProjet.collaborateurs.map(c => c.employe_id);
      
      if (collaborateurIds.length > 0) {
        const notifications = collaborateurIds.map(employeId => ({
          destinataire_id: employeId,
          expediteur_id: currentUserId,
          titre: 'Projet terminé - Auto-évaluation requise',
          message: `Le projet "${terminatingProjet.titre}" est maintenant terminé. Veuillez compléter votre auto-évaluation des objectifs dans la section "Fiches Projets".`,
          type: 'reminder',
          priority: 2,
          action_url: '/fiches-projets',
          metadata: {
            projet_id: terminatingProjet.id,
            projet_titre: terminatingProjet.titre,
            action_type: 'auto_evaluation_required'
          }
        }));

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notificationError) {
          console.error('Erreur lors de la création des notifications:', notificationError);
          // Ne pas faire échouer l'opération pour les notifications
        }
      }

      setSuccess(`Projet "${terminatingProjet.titre}" marqué comme terminé. Les collaborateurs ont été notifiés pour compléter leur auto-évaluation.`);
      setShowTerminateModal(false);
      setTerminatingProjet(null);
      fetchProjets(); // Recharger les projets
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la finalisation du projet');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projetId: string, titre: string) => {
    const projet = projets.find(p => p.id === projetId);
    if (!projet || !canEditProject(projet)) {
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

  const handleAddCollaborateur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjet) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('projet_collaborateurs')
        .insert([{
          projet_id: selectedProjet.id,
          employe_id: collaborateurForm.employe_id,
          role_projet: collaborateurForm.role_projet,
          taux_allocation: parseFloat(collaborateurForm.taux_allocation),
          responsabilites: collaborateurForm.responsabilites || null,
          date_debut: collaborateurForm.date_debut || null,
          date_fin: collaborateurForm.date_fin || null
        }]);

      if (error) throw error;

      setSuccess('Collaborateur ajouté avec succès');
      resetCollaborateurForm();
      fetchProjets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout du collaborateur');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborateur = async (collaborateurId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer ce collaborateur du projet ?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('projet_collaborateurs')
        .delete()
        .eq('id', collaborateurId);

      if (error) throw error;

      setSuccess('Collaborateur retiré avec succès');
      fetchProjets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du retrait du collaborateur');
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
    setShowEditForm(true);
  };

  const openCollaborateursModal = (projet: Projet) => {
    setSelectedProjet(projet);
    setShowCollaborateursModal(true);
  };

  const resetCollaborateurForm = () => {
    setCollaborateurForm({
      employe_id: '',
      role_projet: '',
      taux_allocation: '100',
      responsabilites: '',
      date_debut: '',
      date_fin: ''
    });
  };

  const handleProjectSuccess = () => {
    setShowCreateForm(false);
    setShowEditForm(false);
    setEditingProjet(null);
    fetchProjets();
    setSuccess(showEditForm ? 'Projet modifié avec succès' : 'Projet créé avec succès. Vous êtes automatiquement désigné comme référent du projet.');
    setTimeout(() => setSuccess(null), 5000);
  };

  const handleProjectError = (errorMessage: string) => {
    setError(errorMessage);
    setTimeout(() => setError(null), 5000);
  };

  const filteredProjets = projets.filter(projet =>
    projet.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    projet.nom_client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    projet.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    projet.referent_nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatutColor = (statut: string) => {
    return statutOptions.find(s => s.value === statut)?.color || 'bg-gray-100 text-gray-800';
  };

  const getPrioriteColor = (priorite: string) => {
    return prioriteOptions.find(p => p.value === priorite)?.color || 'bg-gray-100 text-gray-600';
  };

  if (loading && !showCreateForm && !showEditForm && !showCollaborateursModal) {
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
          <p className="text-gray-600 mt-1">Créez et gérez vos projets clients</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all shadow-lg font-medium"
        >
          <Plus className="w-5 h-5" />
          Nouveau projet
        </button>
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

      {/* Info message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">Création de projets</h3>
            <p className="text-sm text-blue-700 mt-1">
              Tous les utilisateurs peuvent créer des projets. Vous devenez automatiquement le référent du projet que vous créez.
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
                      {statutOptions.find(s => s.value === projet.statut)?.label}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getPrioriteColor(projet.priorite)}`}>
                      {prioriteOptions.find(p => p.value === projet.priorite)?.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Client:</strong> {projet.nom_client}
                  </p>
                  <p className="text-gray-600 mb-3">{projet.description}</p>
                </div>
                <div className="flex gap-2">
                  {/* Bouton Terminer le projet */}
                  {canTerminateProject(projet) && (
                    <button
                      onClick={() => openTerminateModal(projet)}
                      className="text-green-600 hover:text-green-900 p-2 rounded hover:bg-green-50 flex items-center gap-1"
                      title="Marquer le projet comme terminé"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs hidden sm:inline">Terminer</span>
                    </button>
                  )}
                  
                  {/* Indicateur projet terminé */}
                  {projet.statut === 'termine' && (
                    <div className="flex items-center gap-1 text-green-600 p-2">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs hidden sm:inline">Terminé</span>
                    </div>
                  )}

                  {/* Bouton unique pour modifier infos et collaborateurs */}
                  {canEditProject(projet) && (
                    <button
                      onClick={() => openCollaborateursModal(projet)}
                      className="text-indigo-600 hover:text-indigo-900 p-2 rounded hover:bg-indigo-50"
                      title="Modifier le projet et gérer les collaborateurs"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}

                  {canEditProject(projet) && (
                    <button
                      onClick={() => handleDelete(projet.id, projet.titre)}
                      className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50"
                      title="Supprimer le projet"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
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

              {/* Alerte pour les projets terminés avec collaborateurs */}
              {projet.statut === 'termine' && projet.collaborateurs.length > 0 && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-amber-800 font-medium">Projet terminé</p>
                      <p className="text-amber-700 mt-1">
                        Les collaborateurs ont été notifiés pour compléter leur auto-évaluation des objectifs.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Créé par: {projet.auteur_nom}
                </div>
                {/* Suppression de la barre de progression */}
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

      {/* Create Form Modal */}
      {showCreateForm && (
        <ProjectForm
          isEdit={false}
          users={users}
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleProjectSuccess}
          onError={handleProjectError}
        />
      )}

      {/* Edit Form Modal */}
      {showEditForm && editingProjet && (
        <ProjectForm
          isEdit={true}
          initialData={editingProjet}
          users={users}
          onClose={() => {
            setShowEditForm(false);
            setEditingProjet(null);
          }}
          onSuccess={handleProjectSuccess}
          onError={handleProjectError}
        />
      )}

      {/* Modal de confirmation pour terminer le projet */}
      {showTerminateModal && terminatingProjet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Terminer le projet</h3>
              </div>
              
              <p className="text-gray-600 mb-4">
                Êtes-vous sûr de vouloir marquer le projet <strong>"{terminatingProjet.titre}"</strong> comme terminé ?
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Cette action va :</strong>
                </p>
                <ul className="text-sm text-blue-700 mt-1 list-disc list-inside">
                  <li>Marquer le projet comme terminé</li>
                  <li>Notifier tous les collaborateurs</li>
                  <li>Déclencher les auto-évaluations</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowTerminateModal(false);
                    setTerminatingProjet(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleTerminateProject}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {loading ? 'Finalisation...' : 'Terminer le projet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collaborateurs Modal */}
      {showCollaborateursModal && selectedProjet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                Modifier le projet - {selectedProjet.titre}
              </h2>
              <button
                onClick={() => {
                  setShowCollaborateursModal(false);
                  setSelectedProjet(null);
                  resetCollaborateurForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Bouton pour modifier les informations du projet */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900">Informations du projet</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Modifiez les détails du projet (nom, dates, budget, etc.)
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCollaborateursModal(false);
                      openEditForm(selectedProjet);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Modifier les infos
                  </button>
                </div>
              </div>

              {/* Liste des collaborateurs existants */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Collaborateurs actuels</h3>
                {selectedProjet.collaborateurs.length > 0 ? (
                  <div className="space-y-3">
                    {selectedProjet.collaborateurs.map((collab) => (
                      <div key={collab.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div>
                              <h4 className="font-medium text-gray-900">{collab.employe_nom}</h4>
                              <p className="text-sm text-gray-600">
                                {collab.role_projet} • {collab.taux_allocation}% • {collab.employe_role}
                                {collab.employe_department && ` • ${collab.employe_department}`}
                              </p>
                              {collab.responsabilites && (
                                <p className="text-sm text-gray-500 mt-1">{collab.responsabilites}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        {canEditProject(selectedProjet) && (
                          <button
                            onClick={() => handleRemoveCollaborateur(collab.id)}
                            className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50"
                            title="Retirer du projet"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Aucun collaborateur assigné</p>
                )}
              </div>

              {/* Formulaire d'ajout de collaborateur */}
              {canEditProject(selectedProjet) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Ajouter un collaborateur</h3>
                  <form onSubmit={handleAddCollaborateur} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Employé *
                        </label>
                        <select
                          required
                          value={collaborateurForm.employe_id}
                          onChange={(e) => setCollaborateurForm(prev => ({ ...prev, employe_id: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Sélectionner un employé</option>
                          {users
                            .filter(user => !selectedProjet.collaborateurs.some(c => c.employe_id === user.id))
                            .map(user => (
                              <option key={user.id} value={user.id}>
                                {user.full_name} ({user.role})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rôle dans le projet *
                        </label>
                        <input
                          type="text"
                          required
                          value={collaborateurForm.role_projet}
                          onChange={(e) => setCollaborateurForm(prev => ({ ...prev, role_projet: e.target.value }))}
                          placeholder="Ex: Développeur, Chef de projet, Designer..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Taux d'allocation (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={collaborateurForm.taux_allocation}
                          onChange={(e) => setCollaborateurForm(prev => ({ ...prev, taux_allocation: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date de début
                        </label>
                        <input
                          type="date"
                          value={collaborateurForm.date_debut}
                          onChange={(e) => setCollaborateurForm(prev => ({ ...prev, date_debut: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date de fin
                        </label>
                        <input
                          type="date"
                          value={collaborateurForm.date_fin}
                          onChange={(e) => setCollaborateurForm(prev => ({ ...prev, date_fin: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Responsabilités
                      </label>
                      <textarea
                        rows={3}
                        value={collaborateurForm.responsabilites}
                        onChange={(e) => setCollaborateurForm(prev => ({ ...prev, responsabilites: e.target.value }))}
                        placeholder="Décrivez les responsabilités de ce collaborateur sur le projet..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        {loading ? 'Ajout...' : 'Ajouter le collaborateur'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projets;