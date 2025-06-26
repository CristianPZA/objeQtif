import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, User, Building, Target, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [projets, setProjets] = useState<Projet[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
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
    priorite: 'normale',
    notes: '',
    collaborateurs: [] as any[]
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
    
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Créer le projet avec l'utilisateur actuel comme auteur ET référent
      const { data: projetData, error: projetError } = await supabase
        .from('projets')
        .insert([{
          nom_client: formData.nom_client,
          titre: formData.titre,
          description: formData.description || 'Description à compléter',
          date_debut: formData.date_debut,
          date_fin_prevue: formData.date_fin_prevue || null,
          budget_estime: formData.budget_estime ? parseFloat(formData.budget_estime) : null,
          referent_projet_id: user.id, // L'auteur devient automatiquement le référent
          auteur_id: user.id,
          priorite: formData.priorite,
          objectifs: [],
          risques: [],
          notes: formData.notes || null,
          statut: 'en_cours' // Directement en cours, plus de brouillon
        }])
        .select()
        .single();

      if (projetError) throw projetError;

      // Ajouter les collaborateurs
      if (formData.collaborateurs.length > 0) {
        const collaborateursData = formData.collaborateurs.map(collab => ({
          projet_id: projetData.id,
          employe_id: collab.employe_id,
          role_projet: 'Collaborateur',
          taux_allocation: 100,
          responsabilites: null,
          date_debut: null,
          date_fin: null
        }));

        const { error: collabError } = await supabase
          .from('projet_collaborateurs')
          .insert(collaborateursData);

        if (collabError) throw collabError;
      }

      setSuccess('Projet créé avec succès. Vous êtes automatiquement désigné comme référent du projet.');
      resetForm();
      setShowCreateForm(false);
      fetchProjets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du projet');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (projet: Projet) => {
    // Naviguer vers la page de détail du projet
    navigate(`/projet/${projet.id}`);
  };

  const resetForm = () => {
    setFormData({
      nom_client: '',
      titre: '',
      description: '',
      date_debut: '',
      date_fin_prevue: '',
      budget_estime: '',
      priorite: 'normale',
      notes: '',
      collaborateurs: []
    });
  };

  const addCollaborator = () => {
    if (!collaborateurForm.employe_id) return;

    const selectedUser = users.find(u => u.id === collaborateurForm.employe_id);
    if (!selectedUser) return;

    const newCollaborator = {
      employe_id: collaborateurForm.employe_id,
      employe_nom: selectedUser.full_name
    };

    setFormData(prev => ({
      ...prev,
      collaborateurs: [...prev.collaborateurs, newCollaborator]
    }));

    setCollaborateurForm({
      employe_id: '',
      role_projet: '',
      taux_allocation: '100',
      responsabilites: '',
      date_debut: '',
      date_fin: ''
    });
  };

  const removeCollaborator = (index: number) => {
    setFormData(prev => ({
      ...prev,
      collaborateurs: prev.collaborateurs.filter((_, i) => i !== index)
    }));
  };

  const filteredProjets = projets.filter(projet =>
    projet.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    projet.nom_client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    projet.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    projet.referent_nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPrioriteColor = (priorite: string) => {
    return prioriteOptions.find(p => p.value === priorite)?.color || 'bg-gray-100 text-gray-600';
  };

  const availableUsers = users.filter(user => 
    !formData.collaborateurs.some(collab => collab.employe_id === user.id)
  );

  if (loading && !showCreateForm) {
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
              Tous les utilisateurs peuvent créer des projets. Vous devenez automatiquement le référent du projet que vous créez. Cliquez sur un projet pour voir ses détails.
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

      {/* Projects Grid - Optimisé en 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProjets.map((projet) => (
          <div 
            key={projet.id} 
            className="bg-white rounded-lg shadow-sm border hover:shadow-lg transition-all duration-200"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => handleProjectClick(projet)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Building className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{projet.titre}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getPrioriteColor(projet.priorite)} flex-shrink-0`}>
                      {prioriteOptions.find(p => p.value === projet.priorite)?.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Client:</strong> {projet.nom_client}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {/* Bouton Finir le projet - À GAUCHE du bouton modifier */}
                  {canTerminateProject(projet) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTerminateProject(projet);
                      }}
                      className="text-green-600 hover:text-green-900 p-2 rounded-lg hover:bg-green-50 flex items-center gap-1 transition-colors"
                      title="Finir le projet"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs hidden sm:inline">Finir</span>
                    </button>
                  )}

                  {/* Bouton Modifier */}
                  {canEditProject(projet) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProjectClick(projet);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-50 flex items-center gap-1 transition-colors"
                      title="Voir les détails et modifier"
                    >
                      <Target className="h-4 w-4" />
                      <span className="text-xs hidden sm:inline">Détails</span>
                    </button>
                  )}
                  
                  {/* Indicateur projet terminé */}
                  {projet.statut === 'termine' && (
                    <div className="flex items-center gap-1 text-green-600 p-2">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs hidden sm:inline">Terminé</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Informations principales */}
              <div 
                className="space-y-3 mb-4 cursor-pointer"
                onClick={() => handleProjectClick(projet)}
              >
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
                <div 
                  className="mb-4 cursor-pointer"
                  onClick={() => handleProjectClick(projet)}
                >
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

              {/* Alerte pour les projets terminés avec collaborateurs */}
              {projet.statut === 'termine' && projet.collaborateurs.length > 0 && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-amber-800 font-medium">Projet terminé</p>
                      <p className="text-amber-700 mt-1">
                        Les collaborateurs ont été notifiés pour compléter leur auto-évaluation.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Indicateur de clic */}
              <div 
                className="text-xs text-indigo-600 font-medium cursor-pointer"
                onClick={() => handleProjectClick(projet)}
              >
                Cliquez pour voir les détails
              </div>
            </div>
          </div>
        ))}

        {filteredProjets.length === 0 && (
          <div className="col-span-full text-center py-12">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-xl">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Nouveau projet</h2>
                  <p className="text-indigo-100 mt-1">Créez un nouveau projet rapidement</p>
                </div>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  className="text-white hover:text-gray-200 p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              {/* Informations de base */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Building className="w-5 h-5 mr-2 text-indigo-600" />
                  Informations de base
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom du client *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nom_client}
                      onChange={(e) => setFormData(prev => ({ ...prev, nom_client: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="Ex: Entreprise ABC"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titre du projet *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.titre}
                      onChange={(e) => setFormData(prev => ({ ...prev, titre: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="Ex: Refonte du site web"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description du projet
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Décrivez le contexte, les enjeux et les objectifs généraux du projet..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Planification */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
                  Planification
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de début *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date_debut}
                      onChange={(e) => setFormData(prev => ({ ...prev, date_debut: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de fin prévue
                    </label>
                    <input
                      type="date"
                      value={formData.date_fin_prevue}
                      onChange={(e) => setFormData(prev => ({ ...prev, date_fin_prevue: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Budget estimé (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.budget_estime}
                      onChange={(e) => setFormData(prev => ({ ...prev, budget_estime: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Priorité du projet
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {prioriteOptions.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, priorite: option.value }))}
                        className={`p-4 rounded-lg border-2 transition-all text-center hover:shadow-md ${
                          formData.priorite === option.value
                            ? 'border-indigo-500 bg-indigo-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`text-sm font-medium ${
                          formData.priorite === option.value ? 'text-indigo-700' : 'text-gray-700'
                        }`}>
                          {option.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Équipe du projet */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <UserPlus className="w-5 h-5 mr-2 text-indigo-600" />
                  Équipe du projet
                </h4>

                {/* Liste des collaborateurs */}
                {formData.collaborateurs.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {formData.collaborateurs.map((collaborator, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{collaborator.employe_nom}</p>
                            <p className="text-sm text-gray-600">Collaborateur</p>
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => removeCollaborator(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Retirer ce collaborateur"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ajouter un collaborateur */}
                {availableUsers.length > 0 && (
                  <div className="flex gap-3">
                    <select
                      value={collaborateurForm.employe_id}
                      onChange={(e) => setCollaborateurForm(prev => ({ ...prev, employe_id: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Sélectionner un collaborateur</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.role})
                        </option>
                      ))}
                    </select>
                    
                    <button
                      type="button"
                      onClick={addCollaborator}
                      disabled={!collaborateurForm.employe_id}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter
                    </button>
                  </div>
                )}

                {formData.collaborateurs.length === 0 && (
                  <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <UserPlus className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm">Aucun collaborateur assigné</p>
                    <p className="text-xs text-gray-400 mt-1">Les collaborateurs peuvent être ajoutés maintenant ou plus tard</p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Notes additionnelles
                </h4>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Informations complémentaires, contraintes particulières, remarques..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Création...' : 'Créer le projet'}
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