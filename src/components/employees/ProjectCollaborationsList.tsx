import React from 'react';
import { Briefcase, ChevronDown, ChevronRight } from 'lucide-react';
import { ProjectCollaboration } from './types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface ProjectCollaborationsListProps {
  collaborations: ProjectCollaboration[];
  expandedProjects: Set<string>;
  toggleProjectExpansion: (id: string) => void;
  getProjectStatusColor: (status: string) => string;
  getProjectStatusLabel: (status: string) => string;
  handleViewProject: (id: string) => void;
}

const ProjectCollaborationsList: React.FC<ProjectCollaborationsListProps> = ({
  collaborations,
  expandedProjects,
  toggleProjectExpansion,
  getProjectStatusColor,
  getProjectStatusLabel,
  handleViewProject
}) => {
  const { t } = useTranslation();
  
  if (collaborations.length === 0) {
    return (
      <div className="text-center py-8">
        <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('projects.noProjects')}</h3>
        <p className="text-gray-600">
          {t('projectSheets.noProjectsAssignedForEmployee')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {collaborations.map(collab => {
        const isExpanded = expandedProjects.has(collab.id);
        
        return (
          <div 
            key={collab.id} 
            className="bg-gray-50 rounded-lg border p-4 cursor-pointer"
            onClick={() => handleViewProject(collab.projet_id)}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {collab.projet.titre}
                  </h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${getProjectStatusColor(collab.projet.statut)}`}>
                    {getProjectStatusLabel(collab.projet.statut)}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mt-1">
                  Client: {collab.projet.nom_client}
                </p>
                
                <p className="text-sm text-gray-600 mt-1">
                  {t('projectSheets.role')}: {collab.role_projet}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleProjectExpansion(collab.id);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            
            {isExpanded && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg border">
                    <h4 className="font-medium text-gray-900 mb-2">{t('projects.projectInfo')}</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-gray-500">{t('projectSheets.referent')}:</span> {collab.projet.referent_nom}</p>
                      <p><span className="text-gray-500">{t('projects.startDate')}:</span> {format(new Date(collab.projet.date_debut), 'dd/MM/yyyy', { locale: fr })}</p>
                      {collab.projet.date_fin_prevue && (
                        <p><span className="text-gray-500">{t('projects.endDate')}:</span> {format(new Date(collab.projet.date_fin_prevue), 'dd/MM/yyyy', { locale: fr })}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg border">
                    <h4 className="font-medium text-gray-900 mb-2">{t('objectives.objectivesAndEvaluations')}</h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-gray-500">{t('objectives.myDevelopmentObjectives')}:</span> {collab.objectifs ? t('common.defined') : t('objectives.notDefined')}
                      </p>
                      <p>
                        <span className="text-gray-500">{t('evaluation.evaluation')}:</span> {collab.evaluation ? getProjectStatusLabel(collab.evaluation.statut) : t('evaluation.notEvaluated')}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 mt-2">
                  <span>{t('projects.assignedOn')} {format(new Date(collab.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProjectCollaborationsList;