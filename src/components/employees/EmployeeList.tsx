import React from 'react';
import { User, Mail, Building, Target, BookOpen, Flag } from 'lucide-react';
import { UserProfile } from './types';
import { useTranslation } from 'react-i18next';

interface EmployeeListProps {
  employees: UserProfile[];
  onEmployeeClick: (employee: UserProfile) => void;
  getCareerLevelBadge: (level: { name: string, color: string }) => string;
}

const EmployeeList: React.FC<EmployeeListProps> = ({ 
  employees, 
  onEmployeeClick,
  getCareerLevelBadge
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {employees.map(employee => (
        <div
          key={employee.id}
          className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all cursor-pointer"
          onClick={() => onEmployeeClick(employee)}
        >
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{employee.full_name}</h3>
                <p className="text-gray-600">{employee.fiche_poste || t('administration.positionNotDefined')}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{employee.email}</span>
              </div>
              
              {employee.department && (
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{employee.department}</span>
                </div>
              )}
              
              {employee.career_level && (
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-gray-400" />
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCareerLevelBadge(employee.career_level)}`}>
                    {employee.career_level.name}
                  </span>
                </div>
              )}
              
              {employee.career_pathway && (
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{employee.career_pathway.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {employees.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border col-span-full">
          <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('administration.noEmployeesFound')}</h3>
          <p className="text-gray-600">
            {t('administration.noEmployeesMatchingCriteria')}
          </p>
        </div>
      )}
    </div>
  );
};

export default EmployeeList;