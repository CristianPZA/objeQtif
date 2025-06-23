import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw } from 'lucide-react';

interface FieldConfig {
  enabled: boolean;
  required: boolean;
  label: string;
}

interface FieldConfigurationProps {
  fieldConfig: Record<string, FieldConfig>;
  onSave: (config: Record<string, FieldConfig>) => void;
}

const FieldConfiguration: React.FC<FieldConfigurationProps> = ({ fieldConfig, onSave }) => {
  const [config, setConfig] = useState(fieldConfig);
  const [hasChanges, setHasChanges] = useState(false);

  const defaultConfig = {
    email: { enabled: true, required: true, label: 'Email' },
    full_name: { enabled: true, required: true, label: 'Nom complet' },
    phone: { enabled: true, required: false, label: 'Téléphone' },
    department: { enabled: true, required: false, label: 'Département' },
    role: { enabled: true, required: true, label: 'Rôle' },
    manager_id: { enabled: true, required: false, label: 'Manager (N+1)' },
    date_naissance: { enabled: true, required: true, label: 'Date de naissance' },
    fiche_poste: { enabled: true, required: false, label: 'Fiche de poste' }
  };

  useEffect(() => {
    const hasChanged = JSON.stringify(config) !== JSON.stringify(fieldConfig);
    setHasChanges(hasChanged);
  }, [config, fieldConfig]);

  const updateField = (fieldName: string, property: keyof FieldConfig, value: boolean | string) => {
    setConfig(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        [property]: value
      }
    }));
  };

  const handleSave = () => {
    onSave(config);
    setHasChanges(false);
  };

  const handleReset = () => {
    setConfig(defaultConfig);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuration des champs
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Configurez les champs disponibles dans le formulaire de création/modification d'employé
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Enregistrer
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Champ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Libellé
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activé
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Obligatoire
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(config).map(([fieldName, fieldConfig]) => (
                <tr key={fieldName} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 capitalize">
                      {fieldName.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={fieldConfig.label}
                      onChange={(e) => updateField(fieldName, 'label', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <input
                      type="checkbox"
                      checked={fieldConfig.enabled}
                      onChange={(e) => updateField(fieldName, 'enabled', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <input
                      type="checkbox"
                      checked={fieldConfig.required}
                      disabled={!fieldConfig.enabled}
                      onChange={(e) => updateField(fieldName, 'required', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Settings className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Modifications non sauvegardées
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Vous avez des modifications non sauvegardées. N'oubliez pas de cliquer sur "Enregistrer" pour les appliquer.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldConfiguration;