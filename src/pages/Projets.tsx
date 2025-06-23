import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, User, Building, Target, Edit, Trash2, Users, Lock, UserPlus, X, CheckCircle, Clock, AlertCircle } from 'lucide-react';
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
  const [showCollaborateursModal, setShowCollaborateursModal] = useState(false);
  const [editingProjet, setEditingProjet] = useState<Projet | null>(null);
  const [selectedProjet, setSelectedProjet] = useState<Projet | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nom_client: '',
    titre: '',
    description: '',
    date_debut: '',
    date_fin_prevue: '',
    budget_estime: '',
    referent_projet_id: '',
    priorite: 'normale',
    objectifs: [''],
    risques: [''],
    notes: ''
  });

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

  const canCreateOrEdit = () => {
    return currentUserRole && ['direction', 'referent_projet', 'admin'].includes(currentUserRole);
  };

  const canEditProject = (projet: Projet) => {
    if (!currentUserRole || !currentUserId) return false;
    
    // Admin et direction peuvent tout modifier
    if (['admin', 'direction'].includes(currentUserRole)) return true;
    
    // Référent projet peut modifier ses projets ou ceux dont il est référent
    if (currentUserRole === 'referent_projet' && 
        (projet.auteur_id === currentUserId || projet.referent_projet_id === currentUserId)) return true;
    
    return false;
  };

  const canTerminateProject = (projet: Projet) => {
    if (!currentUserRole || !currentUserId) return false;
    
    // Le projet doit être en cours pour pouvoir être terminé
    if (projet.statut !== 'en_cours') return false;
    
    // Admin et direction peuvent terminer tous les projets
    if (['admin', 'direction'].includes(currentUserRole)) return true;
    
    // Référent projet peut terminer ses projets ou ceux dont il est référent
    if (currentUserRole === 'referent_projet' && 
        (projet.auteur_id === currentUserId || projet.referent_projet_id === currentUserId)) return true;
    
    return false;
  };

  const handleTerminateProject = async (projet: Projet) => {
    if (!canTerminateProject(projet)) {
      setError('Vous n\'avez pas les droits pour terminer ce projet');
      return;
    }

    const confirmMessage = `Êtes-vous sûr de vouloir marquer le projet "${projet.titre}" comme terminé ?\n\nCela déclenchera automatiquement les auto-évaluations pour tous les collaborateurs du projet.`;
    
    if (!confirm(confirmMessage)) {
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
        .eq('id', projet.id);

      if (updateError) throw updateError;

      // Créer les notifications pour les collaborateurs
      const collaborateurIds = projet.collaborateurs.map(c => c.employe_id);
      
      if (collaborateurIds.length > 0) {
        const notifications = collaborateurIds.map(employeId => ({
          destinataire_id: employeId,
          expediteur_id: currentUserId,
          titre: 'Projet terminé - Auto-évaluation requise',
          message: `Le projet "${projet.titre}" est maintenant terminé. Veuillez compléter votre auto-évaluation des objectifs dans la section "Fiches Projets".`,
          type: 'reminder',
          priority: 2,
          action_url: '/fiches-projets',
          metadata: {
            projet_id: projet.id,
            projet_titre: projet.titre,
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

      setSuccess(`Projet "${projet.titre}" marqué comme terminé. Les collaborateurs ont été notifiés pour compléter leur auto-évaluation.`);
      fetchProjets(); // Recharger les projets
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la finalisation du projet');
    } finally {
      setLoading(false);
    }
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
        .from('projets')
        .insert([{
          nom_client: formData.nom_client,
          titre: formData.titre,
          description: formData.description,
          date_debut: formData.date_debut,
          date_fin_prevue: formData.date_fin_prevue || null,
          budget_estime: formData.budget_estime ? parseFloat(formData.budget_estime) : null,
          referent_projet_id: formData.referent_projet_id,
          auteur_id: user.id,
          priorite: formData.priorite,
          objectifs: formData.objectifs.filter(obj => obj.trim() !== ''),
          risques: formData.risques.filter(risk => risk.trim() !== ''),
          notes: formData.notes || null
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
      const { error: projetError } = await supabase
        .from('projets')
        .update({
          nom_client: formData.nom_client,
          titre: formData.titre,
          description: formData.description,
          date_debut: formData.date_debut,
          date_fin_prevue: formData.date_fin_prevue || null,
          budget_estime: formData.budget_estime ? parseFloat(formData.budget_estime) : null,
          referent_projet_id: formData.referent_projet_id,
          priorite: formData.priorite,
          objectifs: formData.objectifs.filter(obj => obj.trim() !== ''),
          risques: formData.risques.filter(risk => risk.trim() !== ''),
          notes: formData.notes || null
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
    setFormData({
      nom_client: projet.nom_client,
      titre: projet.titre,
      description: projet.description,
      date_debut: projet.date_debut,
      date_fin_prevue: projet.date_fin_prevue || '',
      budget_estime: projet.budget_estime?.toString() || '',
      referent_projet_id: projet.referent_projet_id,
      priorite: projet.priorite,
      objectifs: projet.objectifs.length > 0 ? projet.objectifs : [''],
      risques: projet.risques.length > 0 ? projet.risques : [''],
      notes: projet.notes || ''
    });
    setShowEditForm(true);
  };

  const openCollaborateursModal = (projet: Projet) => {
    setSelectedProjet(projet);
    setShowCollaborateursModal(true);
  };

  const resetForm = () => {
    setFormData({
      nom_client: '',
      titre: '',
      description: '',
      date_debut: '',
      date_fin_prevue: '',
      budget_estime: '',
      referent_projet_id: '',
      priorite: 'normale',
      objectifs: [''],
      risques: [''],
      notes: ''
    });
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

  const addArrayField = (field: 'objectifs' | 'risques') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const updateArrayField = (field: 'objectifs' | 'risques', index: number, value: string) => {
    setFormData(prev => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
  };

  const removeArrayField = (field: 'objectifs' | 'risques', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const filteredProjets = projets.filter(projet =>
    projet.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    projet.nom_client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    projet.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    projet.referent_nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const referents = users.filter(user => 
    ['referent_projet', 'direction', 'admin'].includes(user.role)
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
          <p className="text-gray-600 mt-1">Consultez et gérez les projets clients</p>
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
                      onClick={() => handleTerminateProject(projet)}
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

                  <button
                    onClick={() => openCollaborateursModal(projet)}
                    className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50"
                    title="Gérer les collaborateurs"
                  >
                    <Users className="h-4 w-4" />
                  </button>
                  {canEditProject(projet) && (
                    <>
                      <button
                        onClick={() => openEditForm(projet)}
                        className="text-indigo-600 hover:text-indigo-900 p-2 rounded hover:bg-indigo-50"
                        title="Modifier le projet"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(projet.id, projet.titre)}
                        className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50"
                        title="Supprimer le projet"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priorité
                    </label>
                    <select
                      value={formData.priorite}
                      onChange={(e) => setFormData(prev => ({ ...prev, priorite: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {prioriteOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    placeholder="Description détaillée du projet, contexte, enjeux..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Objectifs */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Objectifs</h3>
                {formData.objectifs.map((objectif, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={objectif}
                      onChange={(e) => updateArrayField('objectifs', index, e.target.value)}
                      placeholder={`Objectif ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {formData.objectifs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayField('objectifs', index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayField('objectifs')}
                  className="text-indigo-600 hover:text-indigo-700 text-sm"
                >
                  + Ajouter un objectif
                </button>
              </div>

              {/* Risques */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Risques identifiés</h3>
                {formData.risques.map((risque, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={risque}
                      onChange={(e) => updateArrayField('risques', index, e.target.value)}
                      placeholder={`Risque ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {formData.risques.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayField('risques', index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayField('risques')}
                  className="text-indigo-600 hover:text-indigo-700 text-sm"
                >
                  + Ajouter un risque
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes additionnelles
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notes, commentaires, informations complémentaires..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
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

      {/* Collaborateurs Modal */}
      {showCollaborateursModal && selectedProjet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                Collaborateurs - {selectedProjet.titre}
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