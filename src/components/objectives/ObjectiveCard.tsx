import React, { useState } from 'react';
import { Calendar, User, BookOpen, Target, Edit, Trash2, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ObjectiveCardProps {
  objective: any;
  onDelete: (id: string) => void;
  currentUserId: string;
  userRole: string | null;
}

const ObjectiveCard: React.FC<ObjectiveCardProps> = ({
  objective,
  onDelete,
  currentUserId,
  userRole
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const canEdit = () => {
    return objective.employee_id === currentUserId || 
           ['admin', 'direction', 'coach_rh'].includes(userRole || '');
  };

  const canDelete = () => {
    return objective.status === 'draft' && canEdit();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return '📝';
      case 'submitted':
        return '⏳';
      case 'approved':
        return '✅';
      case 'rejected':
        return '❌';
      default:
        return '📝';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Brouillon';
      case 'submitted':
        return 'Soumis';
      case 'approved':
        return 'Approuvé';
      case 'rejected':
        return 'Rejeté';
      default:
        return 'Inconnu';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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

  return (
    <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Objectifs {objective.year}
                </h3>
              </div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(objective.status)}`}>
                {getStatusIcon(objective.status)} {getStatusLabel(objective.status)}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{objective.employee.full_name}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getCareerLevelColor(objective.career_level.color)}`}>
                  {objective.career_level.name}
                </span>
              </div>
            </div>

            <div className="mt-2">
              <div className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border ${getCareerPathwayColor(objective.career_pathway.color)}`}>
                <BookOpen className="w-4 h-4 mr-2" />
                {objective.career_pathway.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
              title={showDetails ? "Masquer les détails" : "Voir les détails"}
            >
              {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            {canEdit() && (
              <button
                className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-50"
                title="Modifier"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}

            {canDelete() && (
              <button
                onClick={() => onDelete(objective.id)}
                className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Résumé des thèmes */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {objective.objectives.length} objectifs définis
            </span>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-400 hover:text-gray-600"
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {objective.objectives.map((obj: any, index: number) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800"
              >
                {obj.theme_name}
              </span>
            ))}
          </div>
        </div>

        {/* Détails des objectifs */}
        {expanded && (
          <div className="border-t pt-4 space-y-4">
            {objective.objectives.map((obj: any, index: number) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  {index + 1}. {obj.theme_name}
                </h4>
                <p className="text-sm text-gray-700 mb-3">
                  <strong>Objectif:</strong> {obj.smart_objective}
                </p>

                {showDetails && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <strong className="text-gray-600">Spécifique:</strong>
                      <p className="text-gray-700 mt-1">{obj.specific}</p>
                    </div>
                    <div>
                      <strong className="text-gray-600">Mesurable:</strong>
                      <p className="text-gray-700 mt-1">{obj.measurable}</p>
                    </div>
                    <div>
                      <strong className="text-gray-600">Atteignable:</strong>
                      <p className="text-gray-700 mt-1">{obj.achievable}</p>
                    </div>
                    <div>
                      <strong className="text-gray-600">Pertinent:</strong>
                      <p className="text-gray-700 mt-1">{obj.relevant}</p>
                    </div>
                    <div className="md:col-span-2">
                      <strong className="text-gray-600">Temporellement défini:</strong>
                      <p className="text-gray-700 mt-1">{obj.time_bound}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center text-xs text-gray-500 mt-4 pt-4 border-t">
          <span>
            Créé le {format(new Date(objective.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
          </span>
          {objective.updated_at !== objective.created_at && (
            <span>
              Modifié le {format(new Date(objective.updated_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ObjectiveCard;