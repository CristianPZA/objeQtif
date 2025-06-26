import React, { useState, useEffect } from 'react';
import { X, Save, Building, Calendar, Euro, Users, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CollaboratorSection from './CollaboratorSection';
import { ProjectFormData, UserProfile, Collaborator } from './types';

interface ProjectFormProps {
  isEdit?: boolean;
  initialData?: Partial<ProjectFormData>;
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
  users: UserProfile[];
  onTerminateProject?: (projet: any) => void;
  canTerminate?: boolean;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  isEdit = false,
  initialData,
  onClose,
  onSuccess,
  onError,
  users,
  onTerminateProject,
  canTerminate = false
}) => {
  const [loading, setLoading] = useState(false);
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>({
    nom_client: '',
    titre: '',
    description: '',
    date_debut: '',
    date_fin_prevue: '',
    budget_estime: '',
    priorite: 'normale',
    objectifs: [],
    risques: [],
    notes: '',
    collaborateurs: []
  });

  const prioriteOptions = [
    { value: 'basse', label: 'Basse', color: 'bg-gray-100 text-gray-600', icon: '⬇️' },
    { value: 'normale', label: 'Normale', color: 'bg-blue-100 text-blue-600', icon: '➡️' },
    { value: 'haute', label: 'Haute', color: 'bg-orange-100 text-orange-600', icon: '⬆️' },
    { value: 'urgente', label: 'Urgente', color: 'bg-red-100 text-red-600', icon: '🚨' }
  ];

  useEffect(() => {
    if (initialData) {
      setFormData({
        nom_client: initialData.nom_client || '',
        titre: initialData.titre || '',
        description: initialData.description || '',
        date_debut: initialData.date_debut || '',
        date_fin_prevue: initialData.date_fin_prevue || '',
        budget_estime: initialData.budget_estime?.toString() || '',
        priorite: initialData.priorite || 'normale',
        objectifs: initialData.objectifs || [],
        risques: initialData.risques || [],
        notes: initialData.notes || '',
        collaborateurs: initialData.collaborateurs || []
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Préparer les données du projet
      const projectData = {
        nom_client: formData.nom_client,
        titre: formData.titre,
        description: formData.description || 'Description à compléter',
        date_debut: formData.date_debut,
        date_fin_prevue: formData.date_fin_prevue || null,
        budget_estime: formData.budget_estime ? parseFloat(formData.budget_estime) : null,
        referent_projet_id: user.id,
        auteur_id: user.id,
        priorite: formData.priorite,
        objectifs: [], // Toujours vide maintenant
        risques: [], // Toujours vide maintenant
        notes: formData.notes || null
      };

      let projetId: string;

      if (isEdit && initialData?.id) {
        // Mise à jour du projet existant
        const { error: updateError } = await supabase
          .from('projets')
          .update(projectData)
          .eq('id', initialData.id);

        if (updateError) throw updateError;
        projetId = initialData.id;
      } else {
        // Création d'un nouveau projet
        const { data: projetData, error: projetError } = await supabase
          .from('projets')
          .insert([projectData])
          .select()
          .single();

        if (projetError) throw projetError;
        projetId = projetData.id;
      }

      // Ajouter les collaborateurs si c'est une création
      if (!isEdit && formData.collaborateurs.length > 0) {
        const collaborateursData = formData.collaborateurs.map(collab => ({
          projet_id: projetId,
          employe_id: collab.employe_id,
          role_projet: collab.role_projet,
          taux_allocation: collab.taux_allocation,
          responsabilites: collab.responsabilites || null,
          date_debut: collab.date_debut || null,
          date_fin: collab.date_fin || null
        }));

        const { error: collabError } = await supabase
          .from('projet_collaborateurs')
          .insert(collaborateursData);

        if (collabError) throw collabError;
      }

      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde du projet');
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateProject = () => {
    if (onTerminateProject && initialData) {
      onTerminateProject(initialData);
      setShowTerminateConfirm(false);
      onClose(); // Fermer le modal après avoir terminé le projet
    }
  };

  const addCollaborator = (collaborator: Collaborator) => {
    setFormData(prev => ({
      ...prev,
      collaborateurs: [...prev.collaborateurs, collaborator]
    }));
  };

  const removeCollaborator = (index: number) => {
    setFormData(prev => ({
      ...prev,
      collaborateurs: prev.collaborateurs.filter((_, i) => i !== index)
    }));
  };

  const canSubmit = () => {
    // Seuls les champs obligatoires : nom client, titre et date de début
    return formData.nom_client.trim() && 
           formData.titre.trim() && 
           formData.date_debut;
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-xl">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">
                  {isEdit ? 'Modifier le projet' : 'Nouveau projet'}
                </h2>
                <p className="text-indigo-100 mt-1">
                  {isEdit ? 'Modifiez les informations de votre projet' : 'Créez un nouveau projet rapidement'}
                </p>
              </div>
              <button
                onClick={onClose}
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
                      <div className="text-2xl mb-2">{option.icon}</div>
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
            {!isEdit && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <CollaboratorSection
                  collaborators={formData.collaborateurs}
                  users={users}
                  onAddCollaborator={addCollaborator}
                  onRemoveCollaborator={removeCollaborator}
                  isEditMode={false}
                />
              </div>
            )}

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

            {/* Info message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-blue-600">ℹ️</div>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Information importante</p>
                  <p>Vous devenez automatiquement le référent de ce projet. Les collaborateurs peuvent être ajoutés maintenant ou plus tard depuis la page de gestion des projets.</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              {/* Bouton Finir le projet (seulement en mode édition) */}
              {isEdit && canTerminate && (
                <button
                  type="button"
                  onClick={() => setShowTerminateConfirm(true)}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all font-medium shadow-lg flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Finir le projet
                </button>
              )}

              <div className={`flex gap-3 ${isEdit && canTerminate ? '' : 'ml-auto'}`}>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={loading || !canSubmit()}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? (isEdit ? 'Modification...' : 'Création...') : (isEdit ? 'Modifier le projet' : 'Créer le projet')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

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
                Êtes-vous sûr de vouloir marquer ce projet comme terminé ? Cette action déclenchera automatiquement les auto-évaluations pour tous les collaborateurs du projet.
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
    </>
  );
};

export default ProjectForm;