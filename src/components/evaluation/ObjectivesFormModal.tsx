import React from 'react';
import { Save } from 'lucide-react';

interface ObjectiveDetail {
  skill_id: string;
  skill_description: string;
  theme_name: string;
  smart_objective: string;
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  time_bound: string;
}

interface ObjectivesFormModalProps {
  collaboration: any;
  objectivesForm: ObjectiveDetail[];
  submitting: boolean;
  onUpdateObjective: (index: number, field: keyof ObjectiveDetail, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

const ObjectivesFormModal: React.FC<ObjectivesFormModalProps> = ({
  collaboration,
  objectivesForm,
  submitting,
  onUpdateObjective,
  onSave,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {collaboration.objectifs ? 'Modifier mes objectifs' : 'Définir mes objectifs'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Définissez 4 objectifs SMART pour votre développement sur ce projet
          </p>
        </div>

        <div className="p-6 space-y-6">
          {objectivesForm.map((objective, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Objectif {index + 1}
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Compétence à développer *
                    </label>
                    <input
                      type="text"
                      value={objective.skill_description}
                      onChange={(e) => onUpdateObjective(index, 'skill_description', e.target.value)}
                      placeholder="Ex: Gestion de projet, Communication client..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Thème
                    </label>
                    <input
                      type="text"
                      value={objective.theme_name}
                      onChange={(e) => onUpdateObjective(index, 'theme_name', e.target.value)}
                      placeholder="Ex: Management, Technique..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Objectif SMART *
                  </label>
                  <textarea
                    rows={3}
                    value={objective.smart_objective}
                    onChange={(e) => onUpdateObjective(index, 'smart_objective', e.target.value)}
                    placeholder="Décrivez votre objectif de développement..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Spécifique (S) *
                    </label>
                    <textarea
                      rows={2}
                      value={objective.specific}
                      onChange={(e) => onUpdateObjective(index, 'specific', e.target.value)}
                      placeholder="Que voulez-vous accomplir exactement ?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mesurable (M) *
                    </label>
                    <textarea
                      rows={2}
                      value={objective.measurable}
                      onChange={(e) => onUpdateObjective(index, 'measurable', e.target.value)}
                      placeholder="Comment allez-vous mesurer votre progression ?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Atteignable (A) *
                    </label>
                    <textarea
                      rows={2}
                      value={objective.achievable}
                      onChange={(e) => onUpdateObjective(index, 'achievable', e.target.value)}
                      placeholder="Pourquoi cet objectif est-il réalisable ?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pertinent (R) *
                    </label>
                    <textarea
                      rows={2}
                      value={objective.relevant}
                      onChange={(e) => onUpdateObjective(index, 'relevant', e.target.value)}
                      placeholder="En quoi cet objectif est-il important ?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temporellement défini (T) *
                  </label>
                  <textarea
                    rows={2}
                    value={objective.time_bound}
                    onChange={(e) => onUpdateObjective(index, 'time_bound', e.target.value)}
                    placeholder="Quelle est l'échéance pour atteindre cet objectif ?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onSave}
            disabled={submitting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {submitting ? 'Sauvegarde...' : 'Sauvegarder les objectifs'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ObjectivesFormModal;