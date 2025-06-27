import React, { useState, useEffect } from 'react';
import { Edit, User, Building, UserCheck, BookOpen, Flag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import UserEditModal from './UserEditModal';
import { UserProfile, Department, CareerLevel, CareerArea } from './types';

interface UserManagementProps {
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onError, onSuccess }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [managers, setManagers] = useState<UserProfile[]>([]);
  const [coaches, setCoaches] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [careerLevels, setCareerLevels] = useState<CareerLevel[]>([]);
  const [careerAreas, setCareerAreas] = useState<CareerArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [countryFilter, setCountryFilter] = useState<string>('all');

  const roles = [
    { value: 'employe', label: 'Employé' },
    { value: 'admin', label: 'Administrateur' }
  ];

  const countries = [
    { value: 'all', label: 'Tous les pays' },
    { value: 'france', label: 'France' },
    { value: 'espagne', label: 'Espagne' }
  ];

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchUsers(),
        fetchDepartments(),
        fetchCareerLevels(),
        fetchCareerAreas()
      ]);
    } catch (err) {
      onError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Non connecté');

      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*');

      if (usersError) throw usersError;

      if (!usersData || usersData.length === 0) {
        setUsers([]);
        setManagers([]);
        setCoaches([]);
        return;
      }

      const enrichedUsers = await Promise.all(
        usersData.map(async (user) => {
          let manager = null;
          let coach = null;
          let career_level = null;
          let career_pathway = null;

          if (user.manager_id) {
            try {
              const { data: managerData } = await supabase
                .from('user_profiles')
                .select('full_name')
                .eq('id', user.manager_id)
                .maybeSingle();
              manager = managerData;
            } catch (err) {
              console.warn(`Failed to fetch manager for user ${user.id}:`, err);
            }
          }

          if (user.coach_id) {
            try {
              const { data: coachData } = await supabase
                .from('user_profiles')
                .select('full_name')
                .eq('id', user.coach_id)
                .maybeSingle();
              coach = coachData;
            } catch (err) {
              console.warn(`Failed to fetch coach for user ${user.id}:`, err);
            }
          }

          if (user.career_level_id) {
            try {
              const { data: careerLevelData } = await supabase
                .from('career_levels')
                .select('name, color')
                .eq('id', user.career_level_id)
                .maybeSingle();
              career_level = careerLevelData;
            } catch (err) {
              console.warn(`Failed to fetch career level for user ${user.id}:`, err);
            }
          }

          if (user.career_pathway_id) {
            try {
              const { data: careerPathwayData } = await supabase
                .from('career_areas')
                .select('name, color')
                .eq('id', user.career_pathway_id)
                .maybeSingle();
              career_pathway = careerPathwayData;
            } catch (err) {
              console.warn(`Failed to fetch career pathway for user ${user.id}:`, err);
            }
          }

          return {
            ...user,
            manager,
            coach,
            career_level,
            career_pathway
          };
        })
      );

      setUsers(enrichedUsers);
      
      // Seuls les admins peuvent être managers
      const managerUsers = enrichedUsers.filter(user => 
        user.role === 'admin'
      );
      
      const coachUsers = enrichedUsers.filter(user => 
        user.is_active && user.full_name && user.full_name.trim() !== ''
      );
      
      setManagers(managerUsers);
      setCoaches(coachUsers);

      setDebugInfo({
        totalUsers: enrichedUsers.length,
        usersWithManagers: enrichedUsers.filter(u => u.manager?.full_name).length,
        usersWithCoaches: enrichedUsers.filter(u => u.coach?.full_name).length,
        usersWithCareerLevels: enrichedUsers.filter(u => u.career_level?.name).length,
        usersWithCareerPathways: enrichedUsers.filter(u => u.career_pathway?.name).length,
        availableManagers: managerUsers.length,
        availableCoaches: coachUsers.length,
        roles: enrichedUsers.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        countries: enrichedUsers.reduce((acc, user) => {
          acc[user.country || 'non défini'] = (acc[user.country || 'non défini'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error('Error in fetchUsers:', err);
      throw err;
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setDepartments(data || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
      throw err;
    }
  };

  const fetchCareerLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('career_levels')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setCareerLevels(data || []);
    } catch (err) {
      console.error('Error fetching career levels:', err);
      throw err;
    }
  };

  const fetchCareerAreas = async () => {
    try {
      const { data, error } = await supabase
        .from('career_areas')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setCareerAreas(data || []);
    } catch (err) {
      console.error('Error fetching career areas:', err);
      throw err;
    }
  };

  const openEditForm = (user: UserProfile) => {
    setEditingUser(user);
    setShowEditForm(true);
  };

  const handleUserUpdated = () => {
    setShowEditForm(false);
    setEditingUser(null);
    fetchUsers();
    onSuccess('Informations employé modifiées avec succès');
  };

  // Fonction pour formater le nom : Prénom + Initiale du nom
  const formatEmployeeName = (fullName: string) => {
    if (!fullName) return 'Non défini';
    
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length < 2) return fullName;
    
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    const lastNameInitial = lastName.charAt(0).toUpperCase();
    
    return `${firstName} ${lastNameInitial}.`;
  };

  const formatManagerName = (fullName: string) => {
    if (!fullName) return 'Aucun';
    return formatEmployeeName(fullName);
  };

  const getCareerLevelColor = (color: string) => {
    const colorMap: Record<string, string> = {
      green: 'bg-green-100 text-green-800',
      blue: 'bg-blue-100 text-blue-800',
      purple: 'bg-purple-100 text-purple-800',
      orange: 'bg-orange-100 text-orange-800',
      red: 'bg-red-100 text-red-800',
      indigo: 'bg-indigo-100 text-indigo-800',
      gray: 'bg-gray-100 text-gray-800'
    };
    return colorMap[color] || 'bg-gray-100 text-gray-800';
  };

  const getCareerPathwayColor = (color: string) => {
    const colorMap: Record<string, string> = {
      green: 'bg-green-50 text-green-700 border-green-200',
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200',
      red: 'bg-red-50 text-red-700 border-red-200',
      indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      gray: 'bg-gray-50 text-gray-700 border-gray-200'
    };
    return colorMap[color] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getCountryFlag = (country: string) => {
    switch (country) {
      case 'france':
        return '🇫🇷';
      case 'espagne':
        return '🇪🇸';
      default:
        return '🌍';
    }
  };

  // Fonction pour tronquer le texte
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return 'Non défini';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const filteredUsers = countryFilter === 'all' 
    ? users 
    : users.filter(user => user.country === countryFilter);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      {debugInfo && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">Statistiques</h3>
              <div className="mt-2 text-sm text-yellow-700 grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>Total: {debugInfo.totalUsers}</div>
                <div>Managers: {debugInfo.usersWithManagers}</div>
                <div>Coaches: {debugInfo.usersWithCoaches}</div>
                <div>Niveaux: {debugInfo.usersWithCareerLevels}</div>
                <div>Pathways: {debugInfo.usersWithCareerPathways}</div>
                <div>Départements: {departments.length}</div>
                <div>Niveaux dispo: {careerLevels.length}</div>
                <div>Pathways dispo: {careerAreas.length}</div>
              </div>
              {debugInfo.countries && (
                <div className="mt-2 text-sm text-yellow-700">
                  <div className="font-medium">Pays:</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(debugInfo.countries).map(([country, count]) => (
                      <div key={country}>{country}: {count}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={fetchUsers}
              className="text-yellow-600 hover:text-yellow-800 text-xs underline"
            >
              Actualiser
            </button>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filtrer par pays
            </label>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {countries.map(country => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 rounded-md transition-colors text-sm text-indigo-700 mt-auto"
          >
            Actualiser la liste
          </button>
        </div>
      </div>

      {/* Users Table - Sans affichage de l'email */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                  Employé
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  Département
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                  Pays
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                  Niveau
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                  Career Pathway
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                  Responsable
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                  Coach
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  {/* Employé - Sans email */}
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-indigo-600" />
                        </div>
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate" title={user.full_name}>
                          {user.full_name || 'Non défini'}
                        </div>
                        {user.fiche_poste && (
                          <div className="text-xs text-gray-500 truncate mt-1" title={user.fiche_poste}>
                            {truncateText(user.fiche_poste, 35)}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Département */}
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-900 truncate" title={user.department || 'Non défini'}>
                        {truncateText(user.department || 'Non défini', 15)}
                      </span>
                    </div>
                  </td>

                  {/* Pays */}
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <Flag className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-900 truncate">
                        {getCountryFlag(user.country || 'france')} {user.country || 'france'}
                      </span>
                    </div>
                  </td>

                  {/* Niveau */}
                  <td className="px-4 py-4">
                    {user.career_level ? (
                      <span 
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getCareerLevelColor(user.career_level.color)}`} 
                        title={user.career_level.name}
                      >
                        {user.career_level.name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 italic">Non défini</span>
                    )}
                  </td>

                  {/* Career Pathway */}
                  <td className="px-4 py-4">
                    {user.career_pathway ? (
                      <div 
                        className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border ${getCareerPathwayColor(user.career_pathway.color)}`} 
                        title={user.career_pathway.name}
                      >
                        <BookOpen className="w-3 h-3 mr-2 flex-shrink-0" />
                        <span className="truncate">
                          {truncateText(user.career_pathway.name, 20)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500 italic">Non défini</span>
                    )}
                  </td>

                  {/* Responsable */}
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-900 truncate" title={user.manager?.full_name ? formatManagerName(user.manager.full_name) : 'Aucun'}>
                        {formatManagerName(user.manager?.full_name || '')}
                      </span>
                    </div>
                  </td>

                  {/* Coach */}
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <UserCheck className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-900 truncate" title={user.coach?.full_name ? formatManagerName(user.coach.full_name) : 'Aucun'}>
                        {formatManagerName(user.coach?.full_name || '')}
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4">
                    <button
                      onClick={() => openEditForm(user)}
                      className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-50 flex items-center transition-colors"
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun employé trouvé</h3>
            <p className="text-gray-600 mb-4">
              {countryFilter !== 'all' 
                ? `Aucun employé trouvé pour le pays sélectionné.` 
                : `Les employés créés via Supabase Auth apparaîtront ici automatiquement.`}
            </p>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 rounded-md transition-colors text-sm text-indigo-700"
            >
              Actualiser la liste
            </button>
          </div>
        )}
      </div>

      {/* Edit Form Modal */}
      {showEditForm && editingUser && (
        <UserEditModal
          user={editingUser}
          departments={departments}
          careerLevels={careerLevels}
          careerAreas={careerAreas}
          managers={managers}
          coaches={coaches}
          roles={roles}
          onClose={() => {
            setShowEditForm(false);
            setEditingUser(null);
          }}
          onSuccess={handleUserUpdated}
          onError={onError}
        />
      )}
    </div>
  );
};

export default UserManagement;