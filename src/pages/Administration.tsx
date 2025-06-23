import React, { useState, useEffect } from 'react';
import { Plus, Users, Settings, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import UserTable from '../components/administration/UserTable';
import UserFilters from '../components/administration/UserFilters';
import UserForm from '../components/administration/UserForm';
import FieldConfiguration from '../components/administration/FieldConfiguration';

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

const Administration = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [managers, setManagers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'config'>('users');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateUserForm>({
    email: '',
    full_name: '',
    phone: '',
    department: '',
    role: 'employe',
    manager_id: '',
    date_naissance: '',
    fiche_poste: ''
  });

  // Configuration des champs
  const [fieldConfig, setFieldConfig] = useState({
    email: { enabled: true, required: true, label: 'Email' },
    full_name: { enabled: true, required: true, label: 'Nom complet' },
    phone: { enabled: true, required: false, label: 'Téléphone' },
    department: { enabled: true, required: false, label: 'Département' },
    role: { enabled: true, required: true, label: 'Rôle' },
    manager_id: { enabled: true, required: true, label: 'Manager (N+1)' },
    date_naissance: { enabled: true, required: true, label: 'Date de naissance' },
    fiche_poste: { enabled: true, required: false, label: 'Fiche de poste' }
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
    loadFieldConfiguration();
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
          fiche_poste,
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

  const loadFieldConfiguration = () => {
    const savedConfig = localStorage.getItem('admin_field_config');
    if (savedConfig) {
      try {
        setFieldConfig(JSON.parse(savedConfig));
      } catch (err) {
        console.error('Erreur lors du chargement de la configuration:', err);
      }
    }
  };

  const saveFieldConfiguration = (config: typeof fieldConfig) => {
    setFieldConfig(config);
    localStorage.setItem('admin_field_config', JSON.stringify(config));
    setSuccess('Configuration des champs sauvegardée avec succès');
    setTimeout(() => setSuccess(null), 3000);
  };

  const generatePasswordFromBirthdate = (birthdate: string): string => {
    const date = new Date(birthdate);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    return `${day}${month}${year}`;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('=== STARTING USER CREATION ===');
      console.log('Form data:', formData);

      // Validation côté client
      if (!formData.email || !formData.full_name || !formData.role) {
        throw new Error('Les champs obligatoires doivent être remplis');
      }

      if (!formData.date_naissance) {
        throw new Error('La date de naissance est requise pour générer le mot de passe');
      }

      if (!formData.manager_id) {
        throw new Error('Le manager est requis');
      }

      const password = generatePasswordFromBirthdate(formData.date_naissance);
      console.log('Generated password length:', password.length);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session non trouvée');
      }

      console.log('Session found, making request to edge function...');

      const requestBody = {
        email: formData.email.trim(),
        password: password,
        userData: {
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          department: formData.department || null,
          role: formData.role,
          manager_id: formData.manager_id,
          date_naissance: formData.date_naissance,
          fiche_poste: formData.fiche_poste.trim() || null,
          is_active: true
        }
      };

      console.log('Request body:', requestBody);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('Response text:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error(`Invalid response from server: ${responseText}`);
      }

      if (!response.ok) {
        console.error('Request failed:', result);
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('User created successfully:', result);

      setSuccess(`Utilisateur créé avec succès. Mot de passe généré: ${password}`);
      resetForm();
      setShowCreateForm(false);
      fetchUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de l\'utilisateur');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          department: formData.department || null,
          role: formData.role,
          manager_id: formData.manager_id || null,
          date_naissance: formData.date_naissance,
          fiche_poste: formData.fiche_poste || null
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      setSuccess('Utilisateur modifié avec succès');
      setShowEditForm(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification de l\'utilisateur');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${userName}" ? Cette action est irréversible.`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: false })
        .eq('id', userId);

      if (error) throw error;

      setSuccess('Utilisateur désactivé avec succès');
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression de l\'utilisateur');
    } finally {
      setLoading(false);
    }
  };

  const openEditForm = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      phone: user.phone || '',
      department: user.department || '',
      role: user.role,
      manager_id: user.manager_id || '',
      date_naissance: user.date_naissance || '',
      fiche_poste: user.fiche_poste || ''
    });
    setShowEditForm(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      phone: '',
      department: '',
      role: 'employe',
      manager_id: '',
      date_naissance: '',
      fiche_poste: ''
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === 'all' || user.department === departmentFilter;
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesDepartment && matchesRole;
  });

  if (loading && !showCreateForm && !showEditForm) {
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
          <p className="text-gray-600 mt-1">Gestion des profils employés et des droits d'accès</p>
        </div>
        {activeTab === 'users' && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouvel employé
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

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-blue-50 text-blue-700 p-4 rounded-lg text-sm">
          <strong>Debug Info:</strong><br />
          Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? 'Configuré' : 'Manquant'}<br />
          Edge Function URL: {import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user
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
            onClick={() => setActiveTab('config')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'config'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configuration des champs
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <UserFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            departmentFilter={departmentFilter}
            setDepartmentFilter={setDepartmentFilter}
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            departments={departments}
            roles={roles}
          />

          <UserTable
            users={filteredUsers}
            roles={roles}
            onEdit={openEditForm}
            onDelete={handleDeleteUser}
          />
        </div>
      )}

      {activeTab === 'config' && (
        <FieldConfiguration
          fieldConfig={fieldConfig}
          onSave={saveFieldConfiguration}
        />
      )}

      {/* User Forms */}
      <UserForm
        isOpen={showCreateForm}
        onClose={() => {
          setShowCreateForm(false);
          resetForm();
        }}
        onSubmit={handleCreateUser}
        formData={formData}
        setFormData={setFormData}
        editingUser={null}
        managers={managers}
        departments={departments}
        roles={roles}
        loading={loading}
        fieldConfig={fieldConfig}
      />

      <UserForm
        isOpen={showEditForm}
        onClose={() => {
          setShowEditForm(false);
          setEditingUser(null);
          resetForm();
        }}
        onSubmit={handleEditUser}
        formData={formData}
        setFormData={setFormData}
        editingUser={editingUser}
        managers={managers}
        departments={departments}
        roles={roles}
        loading={loading}
        fieldConfig={fieldConfig}
      />
    </div>
  );
};

export default Administration;