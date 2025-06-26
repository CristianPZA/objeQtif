import React, { useState } from 'react';
import { Plus, X, User, Users, UserPlus } from 'lucide-react';
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
  const [selectedUserId, setSelectedUserId] = useState('');

  const handleAddCollaborator = () => {
    if (!selectedUserId) return;

    const selectedUser = users.find(u => u.id === selectedUserId);
    if (!selectedUser) return;

    const collaboratorToAdd: Collaborator = {
      employe_id: selectedUserId,
      employe_nom: selectedUser.full_name,
      role_projet: 'Collaborateur', // Rôle par défaut simple
      taux_allocation: 100,
      responsabilites: '',
      date_debut: '',
      date_fin: ''
    };

    onAddCollaborator(collaboratorToAdd);
    setSelectedUserId(''); // Reset selection
  };

  const availableUsers = users.filter(user => 
    !collaborators.some(collab => collab.employe_id === user.id)
  );

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-gray-900 flex items-center">
        <Users className="w-5 h-5 mr-2 text-indigo-600" />
        Équipe du projet
      </h4>

      {/* Liste des collaborateurs */}
      {collaborators.length > 0 && (
        <div className="space-y-2">
          {collaborators.map((collaborator, index) => (
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
                onClick={() => onRemoveCollaborator(index)}
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
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
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
            onClick={handleAddCollaborator}
            disabled={!selectedUserId}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      )}

      {collaborators.length === 0 && (
        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <UserPlus className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm">Aucun collaborateur assigné</p>
          <p className="text-xs text-gray-400 mt-1">Les collaborateurs peuvent être ajoutés maintenant ou plus tard</p>
        </div>
      )}

      {availableUsers.length === 0 && collaborators.length > 0 && (
        <p className="text-sm text-gray-500 text-center py-2">
          Tous les utilisateurs disponibles ont été ajoutés
        </p>
      )}
    </div>
  );
};

export default CollaboratorSection;