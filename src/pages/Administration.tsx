import React, { useState, useEffect } from 'react';
import { Plus, Users, Settings, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
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

interface DiagnosticInfo {
  supabaseConnection: boolean;
  edgeFunctionAvailable: boolean;
  userPermissions: string | null;
  lastError: string | null;
  timestamp: string;
}

const Administration = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [managers, setManagers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'config'>('users');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [diagnosticInfo, setDiagnosticInfo] = useState<DiagnosticInfo | null>(null);

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
    runDiagnostic();
  }, []);

  const runDiagnostic = async () => {
    console.log('=== RUNNING SYSTEM DIAGNOSTIC ===');
    const diagnostic: DiagnosticInfo = {
      supabaseConnection: false,
      edgeFunctionAvailable: false,
      userPermissions: null,
      lastError: null,
      timestamp: new Date().toISOString()
    };

    try {
      // Test 1: Connexion Supabase
      console.log('Testing Supabase connection...');
      const { data: testData, error: testError } = await supabase
        .from('user_profiles')
        .select('count')
        .limit(1);

      if (testError) {
        console.error('Supabase connection failed:', testError);
        diagnostic.lastError = `Connexion Supabase: ${testError.message}`;
      } else {
        console.log('✓ Supabase connection OK');
        diagnostic.supabaseConnection = true;
      }

      // Test 2: Permissions utilisateur
      console.log('Testing user permissions...');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch failed:', profileError);
          diagnostic.lastError = `Profil utilisateur: ${profileError.message}`;
        } else {
          console.log('✓ User profile OK, role:', profile.role);
          diagnostic.userPermissions = profile.role;
        }
      }

      // Test 3: Edge Function disponibilité
      console.log('Testing edge function availability...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const testResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
            method: 'OPTIONS',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            }
          });

          if (testResponse.ok) {
            console.log('✓ Edge function accessible');
            diagnostic.edgeFunctionAvailable = true;
          } else {
            console.error('Edge function not accessible:', testResponse.status);
            diagnostic.lastError = `Edge function: HTTP ${testResponse.status}`;
          }
        }
      } catch (fetchError) {
        console.error('Edge function test failed:', fetchError);
        diagnostic.lastError = `Edge function: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`;
      }

    } catch (err) {
      console.error('Diagnostic failed:', err);
      diagnostic.lastError = err instanceof Error ? err.message : 'Erreur de diagnostic inconnue';
    }

    console.log('=== DIAGNOSTIC COMPLETE ===', diagnostic);
    setDiagnosticInfo(diagnostic);
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

  const validateFormData = (data: CreateUserForm): string[] => {
    const errors: string[] = [];

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('Format d\'email invalide');
    }

    // Validation champs obligatoires
    if (!data.full_name.trim()) {
      errors.push('Le nom complet est requis');
    }

    if (!data.role) {
      errors.push('Le rôle est requis');
    }

    if (fieldConfig.manager_id.required && !data.manager_id) {
      errors.push('Le manager est requis');
    }

    if (!data.date_naissance) {
      errors.push('La date de naissance est requise');
    } else {
      // Validation date de naissance (pas dans le futur, âge raisonnable)
      const birthDate = new Date(data.date_naissance);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (birthDate > today) {
        errors.push('La date de naissance ne peut pas être dans le futur');
      }
      
      if (age < 16 || age > 100) {
        errors.push('L\'âge doit être compris entre 16 et 100 ans');
      }
    }

    return errors;
  };

  const getErrorMessage = (errorResponse: any): string => {
    // Check if it's a response from the Edge Function
    if (errorResponse.error) {
      const errorType = errorResponse.error;
      
      // Map specific error types to user-friendly French messages
      switch (errorType) {
        case 'A user with this email already exists':
          return 'Un utilisateur avec cet email existe déjà. Veuillez utiliser une autre adresse email.';
        
        case 'Invalid email format':
          return 'Le format de l\'email est invalide. Veuillez vérifier l\'adresse email saisie.';
        
        case 'Invalid password':
          return 'Le mot de passe ne respecte pas les critères de sécurité requis.';
        
        case 'Password must be at least 6 characters long':
          return 'Le mot de passe doit contenir au moins 6 caractères.';
        
        case 'Missing required fields':
          return 'Des champs obligatoires sont manquants. Veuillez vérifier le formulaire.';
        
        case 'Missing required user data fields (full_name, role)':
          return 'Le nom complet et le rôle sont obligatoires.';
        
        case 'Insufficient permissions':
          return 'Vous n\'avez pas les droits nécessaires pour créer un utilisateur.';
        
        case 'Authorization required':
        case 'Invalid authentication':
          return 'Votre session a expiré. Veuillez vous reconnecter.';
        
        case 'Failed to create authentication user':
          return 'Échec de la création du compte utilisateur. Veuillez réessayer.';
        
        case 'Failed to create user profile':
          return 'Échec de la création du profil utilisateur. Veuillez réessayer.';
        
        case 'Server configuration error':
          return 'Erreur de configuration du serveur. Veuillez contacter l\'administrateur système.';
        
        case 'Internal server error':
          return 'Erreur serveur temporaire. Veuillez réessayer dans quelques minutes.';
        
        default:
          // If we have details, include them
          if (errorResponse.details) {
            return `Erreur: ${errorResponse.details}`;
          }
          return `Erreur inattendue: ${errorType}`;
      }
    }
    
    // Fallback for other error types
    if (typeof errorResponse === 'string') {
      return errorResponse;
    }
    
    return 'Une erreur inattendue s\'est produite. Veuillez réessayer.';
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Empêcher les soumissions multiples
    if (submitting) {
      console.log('Submission already in progress, ignoring...');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    // Sauvegarde temporaire des données du formulaire
    const formBackup = { ...formData };

    try {
      console.log('=== STARTING USER CREATION PROCESS ===');
      console.log('Form data:', formData);

      // Validation côté client
      const validationErrors = validateFormData(formData);
      if (validationErrors.length > 0) {
        throw new Error(`Erreurs de validation: ${validationErrors.join(', ')}`);
      }

      // Vérification que l'utilisateur n'existe pas déjà
      const { data: existingUsers } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('email', formData.email.trim().toLowerCase());

      if (existingUsers && existingUsers.length > 0) {
        throw new Error('Un utilisateur avec cet email existe déjà');
      }

      const password = generatePasswordFromBirthdate(formData.date_naissance);
      console.log('Generated password length:', password.length);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      console.log('Session found, preparing request...');

      const requestBody = {
        email: formData.email.trim().toLowerCase(),
        password: password,
        userData: {
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || null,
          department: formData.department || null,
          role: formData.role,
          manager_id: formData.manager_id || null,
          date_naissance: formData.date_naissance,
          fiche_poste: formData.fiche_poste.trim() || null,
          is_active: true
        }
      };

      console.log('Request body prepared:', {
        ...requestBody,
        password: '[HIDDEN]'
      });

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      const responseText = await response.text();
      console.log('Response body:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error(`Réponse serveur invalide. Veuillez contacter l'administrateur système.`);
      }

      if (!response.ok) {
        console.error('Request failed with result:', result);
        
        // Use the improved error message function
        const userFriendlyMessage = getErrorMessage(result);
        throw new Error(userFriendlyMessage);
      }

      console.log('User created successfully:', result);

      setSuccess(`✅ Utilisateur créé avec succès ! 
      📧 Email: ${formData.email}
      🔑 Mot de passe temporaire: ${password}
      
      ⚠️ Communiquez ces informations à l'employé de manière sécurisée.`);
      
      resetForm();
      setShowCreateForm(false);
      fetchUsers();
      
      // Relancer le diagnostic après succès
      setTimeout(() => runDiagnostic(), 1000);

    } catch (err) {
      console.error('Error creating user:', err);
      
      // Restaurer les données du formulaire en cas d'erreur
      setFormData(formBackup);
      
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue lors de la création de l\'utilisateur';
      setError(errorMessage);
      
      // Relancer le diagnostic en cas d'erreur
      setTimeout(() => runDiagnostic(), 1000);
    } finally {
      setSubmitting(false);
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
      setSubmitting(false);
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
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Nouvel employé
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <XCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Erreur</h3>
              <div className="mt-1 text-sm text-red-700 whitespace-pre-line">
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
              <div className="mt-1 text-sm text-green-700 whitespace-pre-line">
                {success}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostic Info (Development only) */}
      {process.env.NODE_ENV === 'development' && diagnosticInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800">Diagnostic Système</h3>
              <div className="mt-2 text-sm text-blue-700 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${diagnosticInfo.supabaseConnection ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  Connexion Supabase: {diagnosticInfo.supabaseConnection ? 'OK' : 'Échec'}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${diagnosticInfo.edgeFunctionAvailable ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  Edge Function: {diagnosticInfo.edgeFunctionAvailable ? 'Disponible' : 'Indisponible'}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${diagnosticInfo.userPermissions ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  Permissions: {diagnosticInfo.userPermissions || 'Non définies'}
                </div>
                {diagnosticInfo.lastError && (
                  <div className="text-red-600 text-xs mt-2">
                    Dernière erreur: {diagnosticInfo.lastError}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  Dernière vérification: {new Date(diagnosticInfo.timestamp).toLocaleString('fr-FR')}
                </div>
              </div>
            </div>
            <button
              onClick={runDiagnostic}
              className="text-blue-600 hover:text-blue-800 text-xs underline"
            >
              Actualiser
            </button>
          </div>
        </div>
      )}

      {/* Loading indicator during submission */}
      {submitting && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-3"></div>
            <span className="text-sm text-yellow-800">Opération en cours, veuillez patienter...</span>
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
        loading={submitting}
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
        loading={submitting}
        fieldConfig={fieldConfig}
      />
    </div>
  );
};

export default Administration;