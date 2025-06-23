import React from 'react';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  role: string;
  manager_id: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  date_naissance: string | null;
  fiche_poste: string | null;
  manager: {
    full_name: string;
  } | null;
}

interface CreateUserForm {
  email: string;
  full_name: string;
  phone: string;
  department: string;
  role: string;
  manager_id: string;
  date_naissance: string;
  fiche_poste: string;
}

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: CreateUserForm;
  setFormData: React.Dispatch<React.SetStateAction<CreateUserForm>>;
  editingUser: UserProfile | null;
  managers: UserProfile[];
  departments: string[];
  roles: Array<{ value: string; label: string }>;
  loading: boolean;
  fieldConfig: any;
}

const UserForm: React.FC<UserFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  editingUser,
  managers,
  departments,
  roles,
  loading,
  fieldConfig
}) => {
  if (!isOpen) return null;

  const isEditing = !!editingUser;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Modifier l\'employé' : 'Nouvel employé'}
          </h2>
          {!isEditing && (
            <p className="text-sm text-gray-600 mt-1">
              Le mot de passe sera automatiquement généré à partir de la date de naissance (format: jjmmaaaa)
            </p>
          )}
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email */}
            {fieldConfig.email.enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {fieldConfig.email.label} {fieldConfig.email.required && '*'}
                </label>
                <input
                  type="email"
                  required={fieldConfig.email.required}
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={isEditing}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    isEditing ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                />
                {isEditing && (
                  <p className="text-xs text-gray-500 mt-1">L'email ne peut pas être modifié</p>
                )}
              </div>
            )}

            {/* Nom complet */}
            {fieldConfig.full_name.enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {fieldConfig.full_name.label} {fieldConfig.full_name.required && '*'}
                </label>
                <input
                  type="text"
                  required={fieldConfig.full_name.required}
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}

            {/* Date de naissance */}
            {fieldConfig.date_naissance.enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {fieldConfig.date_naissance.label} {fieldConfig.date_naissance.required && '*'}
                </label>
                <input
                  type="date"
                  required={fieldConfig.date_naissance.required}
                  value={formData.date_naissance}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_naissance: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {!isEditing && fieldConfig.date_naissance.enabled && (
                  <p className="text-xs text-gray-500 mt-1">
                    Utilisée pour générer le mot de passe automatiquement
                  </p>
                )}
              </div>
            )}

            {/* Téléphone */}
            {fieldConfig.phone.enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {fieldConfig.phone.label} {fieldConfig.phone.required && '*'}
                </label>
                <input
                  type="tel"
                  required={fieldConfig.phone.required}
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}

            {/* Département */}
            {fieldConfig.department.enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {fieldConfig.department.label} {fieldConfig.department.required && '*'}
                </label>
                <select
                  required={fieldConfig.department.required}
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Sélectionner un département</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Rôle */}
            {fieldConfig.role.enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {fieldConfig.role.label} {fieldConfig.role.required && '*'}
                </label>
                <select
                  required={fieldConfig.role.required}
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Manager */}
            {fieldConfig.manager_id.enabled && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {fieldConfig.manager_id.label} {fieldConfig.manager_id.required && '*'}
                </label>
                <select
                  required={fieldConfig.manager_id.required}
                  value={formData.manager_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, manager_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Sélectionner un manager</option>
                  {managers.filter(m => !isEditing || m.id !== editingUser?.id).map(manager => (
                    <option key={manager.id} value={manager.id}>{manager.full_name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Fiche de poste */}
          {fieldConfig.fiche_poste.enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {fieldConfig.fiche_poste.label} {fieldConfig.fiche_poste.required && '*'}
              </label>
              <textarea
                rows={4}
                required={fieldConfig.fiche_poste.required}
                value={formData.fiche_poste}
                onChange={(e) => setFormData(prev => ({ ...prev, fiche_poste: e.target.value }))}
                placeholder="Description du poste, missions, responsabilités..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (isEditing ? 'Modification...' : 'Création...') : (isEditing ? 'Modifier l\'employé' : 'Créer l\'employé')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;