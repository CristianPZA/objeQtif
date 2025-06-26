import React from 'react';
import { Target, Plus, Edit } from 'lucide-react';

interface ObjectivesTabProps {
  collaboration: any;
  canDefineObjectives: boolean;
  onCreateObjectives: () => void;
  onEditObjectives: () => void;
}

const ObjectivesTab: React.FC<ObjectivesTabProps> = ({
  collaboration,
  canDefineObjectives,
  onCreateObjectives,
  onEditObjectives
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Mes objectifs de développement</h2>
          <p className="text-sm text-gray-600 mt-1">
            Définissez vos objectifs SMART pour ce projet
          </p>
        </div>
        {canDefineObjectives && (
          <div className="flex gap-2">
            {collaboration.objectifs ? (
              <button
                onClick={onEditObjectives}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Modifier les objectifs
              </button>
            ) : (
              <button
                onClick={onCreateObjectives}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Définir mes objectifs
              </button>
            )}
          </div>
        )}
      </div>

      {collaboration.objectifs ? (
        <div className="space-y-4">
          {collaboration.objectifs.objectifs.map((objective: any, index: number) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4 border">
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                    {objective.theme_name || `Objectif ${index + 1}`}
                  </span>
                </div>
                <h4 className="font-medium text-gray-900">
                  {index + 1}. {objective.skill_description}
                </h4>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                <strong>Objectif SMART:</strong> {objective.smart_objective}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <strong className="text-gray-600">Spécifique:</strong>
                  <p className="text-gray-700 mt-1">{objective.specific}</p>
                </div>
                <div>
                  <strong className="text-gray-600">Mesurable:</strong>
                  <p className="text-gray-700 mt-1">{objective.measurable}</p>
                </div>
                <div>
                  <strong className="text-gray-600">Atteignable:</strong>
                  <p className="text-gray-700 mt-1">{objective.achievable}</p>
                </div>
                <div>
                  <strong className="text-gray-600">Pertinent:</strong>
                  <p className="text-gray-700 mt-1">{objective.relevant}</p>
                </div>
                <div className="md:col-span-2">
                  <strong className="text-gray-600">Temporellement défini:</strong>
                  <p className="text-gray-700 mt-1">{objective.time_bound}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun objectif défini</h3>
          <p className="text-gray-600 mb-4">
            Commencez par définir vos objectifs de développement pour ce projet.
          </p>
          {canDefineObjectives && (
            <button
              onClick={onCreateObjectives}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 mx-auto transition-colors"
            >
              <Plus className="w-4 h-4" />
              Définir mes objectifs
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ObjectivesTab;