import React from 'react';
import { ChevronLeft, User, Mail, Phone, Building, Target, BookOpen, Flag, Users } from 'lucide-react';
import { UserProfile } from './types';
import { useTranslation } from 'react-i18next';

interface EmployeeDetailProps {
  employee: UserProfile;
  onBackToList: () => void;
  getCareerLevelBadge: (level: { name: string, color: string }) => string;
}

const EmployeeDetail: React.FC<EmployeeDetailProps> = ({ 
  employee, 
  onBackToList,
  getCareerLevelBadge
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Header avec bouton retour */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="flex justify-between items-center">
          <button
            onClick={onBackToList}
            className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>{t('common.backToList')}</span>
          </button>
          <div className="text-right">
            <h2 className="text-2xl font-bold">{employee.full_name}</h2>
            <p className="text-indigo-100">{employee.fiche_poste || t('administration.positionNotDefined')}</p>
          </div>
        </div>
      </div>

      {/* Informations de base */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">{t('settings.personalInfo')}</h3>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('auth.email')}</p>
                <p className="font-medium">{employee.email}</p>
              </div>
            </div>
            
            {employee.phone && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('common.phone')}</p>
                  <p className="font-medium">{employee.phone}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Flag className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('common.country')}</p>
                <p className="font-medium">
                  {employee.country === 'france' ? '🇫🇷 ' + t('common.france') : '🇪🇸 ' + t('common.spain')}
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">{t('administration.professionalInfo')}</h3>
            
            {employee.department && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Building className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('administration.department')}</p>
                  <p className="font-medium">{employee.department}</p>
                </div>
              </div>
            )}
            
            {employee.manager && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <User className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('administration.manager')}</p>
                  <p className="font-medium">{employee.manager.full_name}</p>
                </div>
              </div>
            )}
            
            {employee.coach && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <Users className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('administration.coach')}</p>
                  <p className="font-medium">{employee.coach.full_name}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">{t('profile.careerInfo')}</h3>
            
            {employee.career_level && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Target className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('annualObjectives.careerLevel')}</p>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCareerLevelBadge(employee.career_level)}`}>
                      {employee.career_level.name}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {employee.career_pathway && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <BookOpen className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('annualObjectives.careerPathway')}</p>
                  <p className="font-medium">{employee.career_pathway.name}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetail;