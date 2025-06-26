import React, { useState } from 'react';
import { Plus, Trash2, User, Calendar, Percent, FileText, UserPlus, Users } from 'lucide-react';
import { Collaborator, UserProfile } from './types';

interface CollaboratorSectionProps {
  collaborators: Collaborator[];
  users: UserProfile[];
  onAddCollaborator: (collaborator: Collaborator) => void;
  onRemoveCollaborator: (index: number) => void;
  isEditMode: boolean;
}

const CollaboratorSection: React.FC<CollaboratorSectionProps> = ({
  collaborators,
  users,
  onAddCollaborator,
  onRemoveCollaborator,
  isEditMode
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCollaborator, setNewCollaborator] = useState<Collaborator>({
    employe_id: '',
    employe_nom: '',
    role_projet: '',
    taux_allocation: 100,
    responsabilites: '',
    date_debut: '',
    date_fin: ''
  });

  const rolesSuggestions = [
    'Chef de projet',
    'Développeur Frontend',
    'Développeur Backend',
    'Designer UI/UX',
    'Analyste métier',
    'Testeur QA',
    'DevOps',
    'Product Owner',
    'Scrum Master',
    'Consultant',
    'Architecte technique'
  ];

  const handleAddCollaborator = () => {
    if (!newCollaborator.employe_id || !newCollaborator.role_projet) return;

    const selectedUser = users.find(u => u.id === newCollaborator.employe_id);
    if (!selectedUser) return;

    const collaboratorToAdd: Collaborator = {
      ...newCollaborator,
      employe_nom: selectedUser.full_name
    };

    onAddCollaborator(collaboratorToAdd);
    
    // Reset form
    setNewCollaborator({
      employe_id: '',
      employe_nom: '',
      role_projet: '',
      taux_allocation: 100,
      responsabilites: '',
      date_debut: '',
      date_fin: ''
    });
    setShowAddForm(false);
  };

  const availableUsers = users.filter(user => 
    !collaborators.some(collab => collab.employe_id === user.id)
  );

  return (
    <div className="space-y-6">
      {/* Liste des collaborateurs existants */}
      {collaborators.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Collaborateurs assignés ({collaborators.length})
          </h4>
          <div className="space-y-3">
            {collaborators.map((collaborator, index) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{collaborator.employe_nom}</p>
                          <p className="text-sm text-indigo-600 font-medium">{collaborator.role_projet}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Percent className="w-4 h-4" />
                        <span>Allocation: {collaborator.taux_allocation}%</span>
                      </div>
                      {collaborator.date_debut && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>Début: {new Date(collaborator.date_debut).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      {collaborator.responsabilites && (
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{collaborator.responsabilites}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => onRemoveCollaborator(index)}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Retirer ce collaborateur"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bouton pour ajouter un collaborateur */}
      {!showAddForm && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium shadow-lg"
          >
            <UserPlus className="w-5 h-5" />
            Ajouter un collaborateur
          </button>
        </div>
      )}

      {/* Formulaire d'ajout de collaborateur */}
      {showAddForm && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center">
            <UserPlus className="w-5 h-5 mr-2" />
            Ajouter un collaborateur
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employé *
              </label>
              <select
                value={newCollaborator.employe_id}
                onChange={(e) => setNewCollaborator(prev => ({ ...prev, employe_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="">Sélectionner un employé</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rôle dans le projet *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={newCollaborator.role_projet}
                  onChange={(e) => setNewCollaborator(prev => ({ ...prev, role_projet: e.target.value }))}
                  placeholder="Ex: Développeur Frontend"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  list="roles-suggestions"
                  required
                />
                <datalist id="roles-suggestions">
                  {rolesSuggestions.map(role => (
                    <option key={role} value={role} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Taux d'allocation (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="5"
                value={newCollaborator.taux_allocation}
                onChange={(e) => setNewCollaborator(prev => ({ ...prev, taux_allocation: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de début
              </label>
              <input
                type="date"
                value={newCollaborator.date_debut}
                onChange={(e) => setNewCollaborator(prev => ({ ...prev, date_debut: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de fin
              </label>
              <input
                type="date"
                value={newCollaborator.date_fin}
                onChange={(e) => setNewCollaborator(prev => ({ ...prev, date_fin: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Responsabilités
            </label>
            <textarea
              rows={3}
              value={newCollaborator.responsabilites}
              onChange={(e) => setNewCollaborator(prev => ({ ...prev, responsabilites: e.target.value }))}
              placeholder="Décrivez les responsabilités de ce collaborateur sur le projet..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewCollaborator({
                  employe_id: '',
                  employe_nom: '',
                  role_projet: '',
                  taux_allocation: 100,
                  responsabilites: '',
                  date_debut: '',
                  date_fin: ''
                });
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleAddCollaborator}
              disabled={!newCollaborator.employe_id || !newCollaborator.role_projet}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>
        </div>
      )}

      {collaborators.length === 0 && !showAddForm && (
        <div className="text-center py-8 text-gray-500">
          <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-600 mb-2">Aucun collaborateur assigné</p>
          <p className="text-sm">Les collaborateurs peuvent être ajoutés maintenant ou plus tard</p>
        </div>
      )}
    </div>
  );
};

export default CollaboratorSection;