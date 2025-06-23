import React, { useState, useEffect } from 'react';
import { Edit, Users, Settings, AlertTriangle, CheckCircle, XCircle, Info, User, Building, Shield, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  date_entree_entreprise: string | null;
  poste: string | null;
  manager: {
    full_name: string;
  } | null;
}

interface EditUserForm {
  full_name: string;
  date_naissance: string;
  date_entree_entreprise: string;
  poste: string;
  manager_id: string;
  department: string;
}

const Administration = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [managers, setManagers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<EditUserForm>({
    full_name: '',
    date_naissance: '',
    date_entree_entreprise: '',
    poste: '',
    manager_id: '',
    department: ''
  });

  const roles = [
    { value: 'employe', label: 'Employé' },
    { value: 'referent_projet', label: 'Référent Projet' },
    { value: 'coach_rh', label: 'Coach RH' },
    { value: 'direction', label: 'Direction' },
    { value: 'admin', label: 'Administrateur' }
  ];

  const departments = [
    'Direction',
    'Ressources Humaines',
    'Informatique',
    'Commercial',
    'Marketing',
    'Finance',
    'Production',
    'Qualité',
    'Logistique'
  ];

  useEffect(() => {
    checkAdminAccess();
    fetchUsers();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['direction', 'admin'].includes(profile.role)) {
        throw new Error('Accès non autorisé');
      }
    } catch (err) {
      setError('Vous n\'avez pas les droits pour accéder à cette page');
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          department,
          role,
          manager_id,
          is_active,
          last_login,
          created_at,
          date_naissance,
          date_entree_entreprise,
          poste,
          manager:user_profiles!manager_id(full_name)
        `)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
      setManagers(data?.filter(user => ['direction', 'coach_rh', 'referent_projet'].includes(user.role)) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name,
          date_naissance: formData.date_naissance || null,
          date_entree_entreprise: formData.date_entree_entreprise || null,
          poste: formData.poste || null,
          manager_id: formData.manager_id || null,
          department: formData.department || null
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      setSuccess('Informations employé modifiées avec succès');
      setShowEditForm(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification des informations');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditForm = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || '',
      date_naissance: user.date_naissance || '',
      date_entree_entreprise: user.date_entree_entreprise || '',
      poste: user.poste || '',
      manager_id: user.manager_id || '',
      department: user.department || ''
    });
    setShowEditForm(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      date_naissance: '',
      date_entree_entreprise: '',
      poste: '',
      manager_id: '',
      department: ''
    });
  };

  const roleColors = {
    employe: 'bg-gray-100 text-gray-800',
    referent_projet: 'bg-blue-100 text-blue-800',
    coach_rh: 'bg-green-100 text-green-800',
    direction: 'bg-purple-100 text-purple-800',
    admin: 'bg-red-100 text-red-800'
  };

  if (loading && !showEditForm) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && !users.length) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
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
          <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-600 mt-1">Gestion des profils employés</p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">Gestion des employés</h3>
            <div className="mt-1 text-sm text-blue-700">
              <p>Les nouveaux employés doivent être créés via l'onglet "Authentication" de Supabase.</p>
              <p>Une fois créés, ils apparaîtront automatiquement dans ce tableau et vous pourrez modifier leurs informations.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <XCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Erreur</h3>
              <div className="mt-1 text-sm text-red-700">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-green-800">Succès</h3>
              <div className="mt-1 text-sm text-green-700">
                {success}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Responsable direct
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-indigo-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role as keyof typeof roleColors]}`}>
                      <Shield className="w-3 h-3 mr-1" />
                      {roles.find(r => r.value === user.role)?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.manager?.full_name || 'Aucun'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openEditForm(user)}
                      className="text-indigo-600 hover:text-indigo-900 p-2 rounded hover:bg-indigo-50 flex items-center gap-1"
                    >
                      <Edit className="h-4 w-4" />
                      Modifier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun employé trouvé</h3>
            <p className="text-gray-600">
              Les employés créés via Supabase Auth apparaîtront ici automatiquement.
            </p>
          </div>
        )}
      </div>

      {/* Edit Form Modal */}
      {showEditForm && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                Modifier les informations de {editingUser.full_name}
              </h2>
            </div>

            <form onSubmit={handleEditUser} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nom complet */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Date de naissance */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={formData.date_naissance}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_naissance: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Date d'entrée dans l'entreprise */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date d'entrée dans l'entreprise
                  </label>
                  <input
                    type="date"
                    value={formData.date_entree_entreprise}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_entree_entreprise: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Poste */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Poste
                  </label>
                  <input
                    type="text"
                    value={formData.poste}
                    onChange={(e) => setFormData(prev => ({ ...prev, poste: e.target.value }))}
                    placeholder="Ex: Développeur Senior, Chef de projet..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Département */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Département
                  </label>
                  <select
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

                {/* Responsable direct */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Responsable direct
                  </label>
                  <select
                    value={formData.manager_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, manager_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Sélectionner un responsable</option>
                    {managers.filter(m => m.id !== editingUser?.id).map(manager => (
                      <option key={manager.id} value={manager.id}>{manager.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Informations en lecture seule */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Informations système (lecture seule)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Email:</span>
                    <span className="ml-2 text-gray-900">{editingUser.email}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Rôle:</span>
                    <span className="ml-2 text-gray-900">{roles.find(r => r.value === editingUser.role)?.label}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Créé le:</span>
                    <span className="ml-2 text-gray-900">
                      {format(new Date(editingUser.created_at), 'dd/MM/yyyy', { locale: fr })}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Statut:</span>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      editingUser.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {editingUser.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Modification...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Administration;