import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, User, Building, Target, CheckCircle, Clock, AlertCircle, X, UserPlus } from 'lucide-react';
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
  const [editingProjet, setEditingProjet] = useState<Projet | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);

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

  const openEditForm = (projet: Projet, e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la propagation du clic
    
    if (!canEditProject(projet)) {
      setError('Vous n\'avez pas les droits pour modifier ce projet');
      return;
    }

    setEditingProjet(projet);
    setShowEditForm(true);
  };

  const handleProjectClick = (projet: Projet) => {
    // Pour l'instant, on ouvre le formulaire d'édition si l'utilisateur peut modifier
    if (canEditProject(projet)) {
      setEditingProjet(projet);
      setShowEditForm(true);
    }
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

  const getPrioriteColor = (priorite: string) => {
    return prioriteOptions.find(p => p.value === priorite)?.color || 'bg-gray-100 text-gray-600';
  };

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
              Tous les utilisateurs peuvent créer des projets. Vous devenez automatiquement le référent du projet que vous créez. Cliquez sur un projet pour le modifier.
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
            onClick={() => handleProjectClick(projet)}
            className={`bg-white rounded-lg shadow-sm border hover:shadow-lg transition-all duration-200 ${
              canEditProject(projet) ? 'cursor-pointer hover:border-indigo-300' : 'cursor-default'
            }`}
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
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Client:</strong> {projet.nom_client}
                  </p>
                </div>
                
                {/* Actions en overlay */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Bouton Terminer le projet */}
                  {canTerminateProject(projet) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTerminateProject(projet);
                      }}
                      className="text-green-600 hover:text-green-900 p-2 rounded hover:bg-green-50 flex items-center gap-1"
                      title="Marquer le projet comme terminé"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}
                  
                  {/* Indicateur projet terminé */}
                  {projet.statut === 'termine' && (
                    <div className="flex items-center gap-1 text-green-600 p-2">
                      <CheckCircle className="h-4 w-4" />
                    </div>
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

              {/* Indicateur de modification possible */}
              {canEditProject(projet) && (
                <div className="text-xs text-indigo-600 font-medium">
                  Cliquez pour modifier
                </div>
              )}
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
          onTerminateProject={handleTerminateProject}
          canTerminate={canTerminateProject(editingProjet)}
        />
      )}
    </div>
  );
};

export default Projets;