import React from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EmployeeFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filterRole: string | null;
  setFilterRole: (value: string | null) => void;
  filterDepartment: string | null;
  setFilterDepartment: (value: string | null) => void;
  roles: string[];
  departments: string[];
}

const EmployeeFilters: React.FC<EmployeeFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  filterRole,
  setFilterRole,
  filterDepartment,
  setFilterDepartment,
  roles,
  departments
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Recherche */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('administration.searchEmployee')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Filtre par rôle */}
        <div>
          <select
            value={filterRole || ''}
            onChange={(e) => setFilterRole(e.target.value || null)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">{t('administration.allRoles')}</option>
            {roles.map(role => (
              <option key={role} value={role}>
                {role === 'admin' ? 'Administrateur' : 
                 role === 'employe' ? 'Employé' : 
                 role === 'referent_projet' ? 'Référent Projet' : role}
              </option>
            ))}
          </select>
        </div>

        {/* Filtre par département */}
        <div>
          <select
            value={filterDepartment || ''}
            onChange={(e) => setFilterDepartment(e.target.value || null)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">{t('administration.allDepartments')}</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* Bouton de réinitialisation */}
        {(searchTerm || filterRole || filterDepartment) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterRole(null);
              setFilterDepartment(null);
            }}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-1"
          >
            {t('administration.resetFilters')}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmployeeFilters;