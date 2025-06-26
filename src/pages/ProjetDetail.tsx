import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building, 
  Calendar, 
  User, 
  Users, 
  Euro, 
  Target, 
  AlertTriangle, 
  Edit, 
  CheckCircle, 
  Clock, 
  UserPlus, 
  X, 
  Save,
  Trash2
} from 'lucide-react';
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

const ProjetDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [projet, setProjet] = useState<Projet | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showCollaborateursModal, setShowCollaborateursModal] = useState(false);
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    nom_client: '',
    titre: '',
    description: '',
    date_debut: '',
    date_fin_prevue: '',
    budget_estime: '',
    priorite: 'normale',
    notes: ''
  });

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

  const statutOptions = [
    { value: 'brouillon', label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
    { value: 'en_cours', label: 'En cours', color: 'bg-blue-100 text-blue-800' },
    { value: 'termine', label: 'Terminé', color: 'bg-green-100 text-green-800' },
    { value: 'suspendu', label: 'Suspendu', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'annule', label: 'Annulé', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    if (id) {
      checkUserAccess();
      fetchProjet();
      fetchUsers();
    }
  }, [id]);

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
    }
  };

  const fetchProjet = async () => {
    try {
      const { data, error } = await supabase
        .from('v_projets_complets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (!data) {
        setError('Projet non trouvé');
        return;
      }

      setProjet(data);
      
      // Initialiser le formulaire avec les données du projet
      setFormData({
        nom_client: data.nom_client,
        titre: data.titre,
        description: data.description,
        date_debut: data.date_debut,
        date_fin_prevue: data.date_fin_prevue || '',
        budget_estime: data.budget_estime?.toString() || '',
        priorite: data.priorite,
        notes: data.notes || ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement du projet');
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

  const canEditProject = () => {
    if (!currentUserRole || !currentUserId || !projet) return false;
    
    // Admin peut tout modifier
    if (currentUserRole === 'admin') return true;
    
    // L'auteur ou le référent peuvent modifier
    if (projet.auteur_id === currentUserId || projet.referent_projet_id === currentUserId) return true;
    
    return false;
  };

  const canTerminateProject = () => {
    if (!currentUserRole || !currentUserId || !projet) return false;
    
    // Le projet doit être en cours pour pouvoir être terminé
    if (projet.statut !== 'en_cours') return false;
    
    // Admin peut terminer tous les projets
    if (currentUserRole === 'admin') return true;
    
    // L'auteur ou le référent peuvent terminer
    if (projet.auteur_id === currentUserId || projet.referent_projet_id === currentUserId) return true;
    
    return false;
  };

  const handleTerminateProject = async () => {
    if (!projet) return;

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
        }
      }

      setSuccess(`Projet "${projet.titre}" marqué comme terminé. Les collaborateurs ont été notifiés pour compléter leur auto-évaluation.`);
      setShowTerminateConfirm(false);
      fetchProjet(); // Recharger le projet
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la finalisation du projet');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projet || !canEditProject()) {
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
          priorite: formData.priorite,
          notes: formData.notes || null
        })
        .eq('id', projet.id);

      if (projetError) throw projetError;

      setSuccess('Projet modifié avec succès');
      setShowEditForm(false);
      fetchProjet();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification du projet');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCollaborateur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projet) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('projet_collaborateurs')
        .insert([{
          projet_id: projet.id,
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
      fetchProjet();
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
      fetchProjet();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du retrait du collaborateur');
    } finally {
      setLoading(false);
    }
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

  const getStatutColor = (statut: string) => {
    return statutOptions.find(s => s.value === statut)?.color || 'bg-gray-100 text-gray-800';
  };

  const getPrioriteColor = (priorite: string) => {
    return prioriteOptions.find(p => p.value === priorite)?.color || 'bg-gray-100 text-gray-600';
  };

  if (loading && !projet) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && !projet) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg max-w-md mx-auto">
          <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
          <p className="font-medium">Erreur de chargement</p>
          <p className="text-sm mt-1">{error}</p>
          <button 
            onClick={() => navigate('/projets')}
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md transition-colors text-sm"
          >
            Retour aux projets
          </button>
        </div>
      </div>
    );
  }

  if (!projet) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-50 text-gray-700 p-4 rounded-lg max-w-md mx-auto">
          <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
          <p className="font-medium">Projet non trouvé</p>
          <button 
            onClick={() => navigate('/projets')}
            className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-sm"
          >
            Retour aux projets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec bouton retour et actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/projets')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour aux projets</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Bouton Finir le projet - TOUJOURS VISIBLE EN HAUT */}
          {canTerminateProject() && (
            <button
              onClick={() => setShowTerminateConfirm(true)}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all font-medium shadow-lg flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Finir le projet
            </button>
          )}

          {canEditProject() && (
            <button
              onClick={() => setShowEditForm(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Modifier
            </button>
          )}
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

      {/* En-tête du projet */}
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <Building className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{projet.titre}</h1>
                <p className="text-lg text-gray-600 mt-1">Client: {projet.nom_client}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 text-sm rounded-full ${getStatutColor(projet.statut)}`}>
                {statutOptions.find(s => s.value === projet.statut)?.label}
              </span>
              <span className={`px-3 py-1 text-sm rounded-full ${getPrioriteColor(projet.priorite)}`}>
                Priorité {prioriteOptions.find(p => p.value === projet.priorite)?.label}
              </span>
            </div>
          </div>

          {/* Indicateur projet terminé */}
          {projet.statut === 'termine' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
              <CheckCircle className="h-6 w-6" />
              <span className="font-medium">Projet terminé</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
          <p className="text-gray-700 leading-relaxed">{projet.description}</p>
        </div>

        {/* Informations principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Date de début</p>
              <p className="font-medium text-gray-900">
                {format(new Date(projet.date_debut), 'dd/MM/yyyy', { locale: fr })}
              </p>
            </div>
          </div>

          {projet.date_fin_prevue && (
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Date de fin prévue</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(projet.date_fin_prevue), 'dd/MM/yyyy', { locale: fr })}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Référent projet</p>
              <p className="font-medium text-gray-900">{projet.referent_nom}</p>
            </div>
          </div>

          {projet.budget_estime && (
            <div className="flex items-center gap-3">
              <Euro className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Budget estimé</p>
                <p className="font-medium text-gray-900">
                  {projet.budget_estime.toLocaleString('fr-FR')} €
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Avancement */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Avancement du projet</span>
            <span className="text-sm text-gray-600">{projet.taux_avancement}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                projet.statut === 'termine' ? 'bg-green-600' : 'bg-indigo-600'
              }`}
              style={{ width: `${projet.taux_avancement}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Équipe du projet */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-indigo-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Équipe du projet</h2>
                <p className="text-sm text-gray-600">
                  {projet.collaborateurs.length} collaborateur{projet.collaborateurs.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {canEditProject() && (
              <button
                onClick={() => setShowCollaborateursModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Gérer l'équipe
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {projet.collaborateurs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projet.collaborateurs.map((collab) => (
                <div key={collab.id} className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{collab.employe_nom}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {collab.role_projet} • {collab.taux_allocation}%
                      </p>
                      <p className="text-sm text-gray-500">
                        {collab.employe_role}
                        {collab.employe_department && ` • ${collab.employe_department}`}
                      </p>
                      {collab.responsabilites && (
                        <p className="text-sm text-gray-600 mt-2">{collab.responsabilites}</p>
                      )}
                    </div>
                    {canEditProject() && (
                      <button
                        onClick={() => handleRemoveCollaborateur(collab.id)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Retirer du projet"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>Aucun collaborateur assigné à ce projet</p>
            </div>
          )}
        </div>
      </div>

      {/* Alerte pour les projets terminés avec collaborateurs */}
      {projet.statut === 'termine' && projet.collaborateurs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-medium text-amber-800">Projet terminé</h3>
              <p className="text-amber-700 mt-1">
                Les collaborateurs ont été notifiés pour compléter leur auto-évaluation des objectifs.
                Ils peuvent maintenant accéder à leurs fiches projets pour définir et évaluer leurs objectifs de développement.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notes additionnelles */}
      {projet.notes && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes additionnelles</h3>
          <p className="text-gray-700 leading-relaxed">{projet.notes}</p>
        </div>
      )}

      {/* Informations système */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations système</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Créé par:</span>
            <span className="ml-2 text-gray-900">{projet.auteur_nom}</span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Date de création:</span>
            <span className="ml-2 text-gray-900">
              {format(new Date(projet.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
            </span>
          </div>
        </div>
      </div>

      {/* Modal de modification */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Modifier le projet</h2>
            </div>

            <form onSubmit={handleEdit} className="p-6 space-y-6">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description du projet *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes additionnelles
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Modification...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de gestion des collaborateurs */}
      {showCollaborateursModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                Gérer l'équipe - {projet.titre}
              </h2>
              <button
                onClick={() => {
                  setShowCollaborateursModal(false);
                  resetCollaborateurForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Ajouter un collaborateur */}
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
                          .filter(user => !projet.collaborateurs.some(c => c.employe_id === user.id))
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
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation pour finir le projet */}
      {showTerminateConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Finir le projet
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Êtes-vous sûr de vouloir marquer le projet "{projet.titre}" comme terminé ? Cette action déclenchera automatiquement les auto-évaluations pour tous les collaborateurs du projet.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowTerminateConfirm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleTerminateProject}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjetDetail;