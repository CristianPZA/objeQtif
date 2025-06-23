import React, { useState, useEffect } from 'react';
import { Edit, Users, Settings, AlertTriangle, CheckCircle, XCircle, Info, User, Building, Shield, Calendar, Plus, Trash2, Save } from 'lucide-react';
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
  fiche_poste: string | null;
  manager: {
    full_name: string;
  } | null;
}

interface EditUserForm {
  full_name: string;
  email: string;
  date_naissance: string;
  date_entree_entreprise: string;
  fiche_poste: string;
  manager_id: string;
  department: string;
}

const Administration = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [managers, setManagers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'settings'>('users');
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newDepartment, setNewDepartment] = useState('');

  const [formData, setFormData] = useState<EditUserForm>({
    full_name: '',
    email: '',
    date_naissance: '',
    date_entree_entreprise: '',
    fiche_poste: '',
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

  useEffect(() => {
    checkAdminAccess();
    fetchUsers();
    loadDepartments();
  }, []);

  const formatManagerName = (fullName: string) => {
    if (!fullName) return 'Aucun';
    
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length < 2) return fullName;
    
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    const lastNameInitial = lastName.charAt(0).toUpperCase();
    
    return `${firstName} ${lastNameInitial}.`;
  };

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
      console.log('Fetching users with manager information...');
      
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
          fiche_poste,
          manager:user_profiles!manager_id(
            full_name
          )
        `)
        .order('full_name');

      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }

      console.log('Fetched users:', data);
      setUsers(data || []);
      
      // Filtrer les managers (direction, coach_rh, referent_projet)
      const managerUsers = data?.filter(user => 
        ['direction', 'coach_rh', 'referent_projet'].includes(user.role)
      ) || [];
      
      console.log('Manager users:', managerUsers);
      setManagers(managerUsers);
    } catch (err) {
      console.error('Error in fetchUsers:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = () => {
    const savedDepartments = localStorage.getItem('company_departments');
    if (savedDepartments) {
      try {
        setDepartments(JSON.parse(savedDepartments));
      } catch (err) {
        console.error('Erreur lors du chargement des départements:', err);
        setDepartments([
          'Direction',
          'Ressources Humaines',
          'Informatique',
          'Commercial',
          'Marketing',
          'Finance',
          'Production',
          'Qualité',
          'Logistique'
        ]);
      }
    } else {
      setDepartments([
        'Direction',
        'Ressources Humaines',
        'Informatique',
        'Commercial',
        'Marketing',
        'Finance',
        'Production',
        'Qualité',
        'Logistique'
      ]);
    }
  };

  const saveDepartments = (newDepartments: string[]) => {
    setDepartments(newDepartments);
    localStorage.setItem('company_departments', JSON.stringify(newDepartments));
    setSuccess('Liste des départements mise à jour avec succès');
    setTimeout(() => setSuccess(null), 3000);
  };

  const addDepartment = () => {
    if (newDepartment.trim() && !departments.includes(newDepartment.trim())) {
      const updatedDepartments = [...departments, newDepartment.trim()].sort();
      saveDepartments(updatedDepartments);
      setNewDepartment('');
    }
  };

  const removeDepartment = (departmentToRemove: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le département "${departmentToRemove}" ?`)) {
      const updatedDepartments = departments.filter(dept => dept !== departmentToRemove);
      saveDepartments(updatedDepartments);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Mettre à jour le profil utilisateur
      const updateData: any = {
        full_name: formData.full_name,
        date_naissance: formData.date_naissance || null,
        date_entree_entreprise: formData.date_entree_entreprise || null,
        fiche_poste: formData.fiche_poste || null,
        manager_id: formData.manager_id || null,
        department: formData.department || null
      };

      console.log('Updating user with data:', updateData);

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', editingUser.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw profileError;
      }

      setSuccess('Informations employé modifiées avec succès');
      setShowEditForm(false);
      setEditingUser(null);
      fetchUsers(); // Recharger les données pour voir les changements
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification des informations');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditForm = (user: UserProfile) => {
    console.log('Opening edit form for user:', user);
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      date_naissance: user.date_naissance || '',
      date_entree_entreprise: user.date_entree_entreprise || user.created_at?.split('T')[0] || '',
      fiche_poste: user.fiche_poste || '',
      manager_id: user.manager_id || '',
      department: user.department || ''
    });
    setShowEditForm(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      date_naissance: '',
      date_entree_entreprise: '',
      fiche_poste: '',
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
          <p className="text-gray-600 mt-1">Gestion des profils employés et paramètres</p>
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

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Gestion des employés
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Paramètres
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">Gestion des employés</h3>
                <div className="mt-1 text-sm text-blue-700">
                  <p>Les nouveaux employés doivent être créés via l'onglet "Authentication" de Supabase.</p>
                  <p>Une fois créés, ils apparaîtront automatiquement dans ce tableau et vous pourrez modifier leurs informations.</p>
                  <p className="mt-2 font-medium">Note: La modification des emails doit être effectuée directement dans le tableau de bord Supabase pour des raisons de sécurité.</p>
                </div>
              </div>
            </div>
          </div>

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
                      Département
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
                            {user.phone && (
                              <div className="text-sm text-gray-500">{user.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{user.department || 'Non défini'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role as keyof typeof roleColors]}`}>
                          <Shield className="w-3 h-3 mr-1" />
                          {roles.find(r => r.value === user.role)?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.manager?.full_name ? formatManagerName(user.manager.full_name) : 'Aucun'}
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
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Gestion des départements */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Building className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Gestion des départements</h2>
                  <p className="text-sm text-gray-600">Ajoutez ou supprimez les départements de votre entreprise</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Ajouter un département */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Ajouter un département</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    placeholder="Nom du nouveau département"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    onKeyPress={(e) => e.key === 'Enter' && addDepartment()}
                  />
                  <button
                    onClick={addDepartment}
                    disabled={!newDepartment.trim() || departments.includes(newDepartment.trim())}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </button>
                </div>
              </div>

              {/* Liste des départements */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Départements existants</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {departments.map((department) => (
                    <div
                      key={department}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    >
                      <span className="text-sm font-medium text-gray-900">{department}</span>
                      <button
                        onClick={() => removeDepartment(department)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Supprimer ce département"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {departments.length === 0 && (
                  <p className="text-gray-500 text-center py-4">Aucun département configuré</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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

                {/* Email (lecture seule) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Pour modifier l'email, utilisez le tableau de bord Supabase
                  </p>
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
                    value={formData.fiche_poste}
                    onChange={(e) => setFormData(prev => ({ ...prev, fiche_poste: e.target.value }))}
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
                <div className="md:col-span-2">
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
                    <span className="font-medium text-gray-600">Dernière connexion:</span>
                    <span className="ml-2 text-gray-900">
                      {editingUser.last_login 
                        ? format(new Date(editingUser.last_login), 'dd/MM/yyyy à HH:mm', { locale: fr })
                        : 'Jamais'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Responsable actuel:</span>
                    <span className="ml-2 text-gray-900">
                      {editingUser.manager?.full_name ? formatManagerName(editingUser.manager.full_name) : 'Aucun'}
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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
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