import React, { useState, useEffect } from 'react';
import { X, Save, Target, BookOpen, User, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DevelopmentTheme {
  id: string;
  name: string;
  description: string;
}

interface ObjectiveForm {
  theme_id: string;
  theme_name: string;
  smart_objective: string;
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  time_bound: string;
}

interface CreateObjectiveModalProps {
  user: any;
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const CreateObjectiveModal: React.FC<CreateObjectiveModalProps> = ({
  user,
  onClose,
  onSuccess,
  onError
}) => {
  const [step, setStep] = useState<'employee' | 'themes' | 'objectives'>('employee');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [availableThemes, setAvailableThemes] = useState<DevelopmentTheme[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [objectives, setObjectives] = useState<ObjectiveForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [canSelectEmployee, setCanSelectEmployee] = useState(false);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    checkUserPermissions();
  }, [user]);

  useEffect(() => {
    if (selectedEmployee) {
      fetchAvailableThemes();
    }
  }, [selectedEmployee]);

  useEffect(() => {
    if (selectedThemes.length > 0) {
      initializeObjectives();
    }
  }, [selectedThemes]);

  const checkUserPermissions = async () => {
    // Vérifier si l'utilisateur peut sélectionner d'autres employés
    const canSelect = ['admin', 'direction', 'coach_rh'].includes(user.role);
    setCanSelectEmployee(canSelect);

    if (canSelect) {
      await fetchEmployees();
      setStep('employee');
    } else {
      // L'utilisateur ne peut créer que ses propres objectifs
      setSelectedEmployee(user);
      setStep('themes');
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          full_name,
          role,
          department,
          career_pathway_id,
          career_level_id,
          career_pathway:career_areas!career_pathway_id(name, color),
          career_level:career_levels!career_level_id(name, color)
        `)
        .eq('is_active', true)
        .not('career_pathway_id', 'is', null)
        .not('career_level_id', 'is', null)
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      onError('Erreur lors du chargement des employés');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableThemes = async () => {
    if (!selectedEmployee?.career_pathway_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('development_themes')
        .select('id, name, description')
        .eq('career_area_id', selectedEmployee.career_pathway_id)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setAvailableThemes(data || []);
    } catch (err) {
      onError('Erreur lors du chargement des thèmes de développement');
    } finally {
      setLoading(false);
    }
  };

  const initializeObjectives = () => {
    const newObjectives = selectedThemes.map(themeId => {
      const theme = availableThemes.find(t => t.id === themeId);
      return {
        theme_id: themeId,
        theme_name: theme?.name || '',
        smart_objective: '',
        specific: '',
        measurable: '',
        achievable: '',
        relevant: '',
        time_bound: ''
      };
    });
    setObjectives(newObjectives);
  };

  const handleEmployeeSelect = (employee: any) => {
    setSelectedEmployee(employee);
    setStep('themes');
  };

  const handleThemeToggle = (themeId: string) => {
    setSelectedThemes(prev => {
      if (prev.includes(themeId)) {
        return prev.filter(id => id !== themeId);
      } else if (prev.length < 4) {
        return [...prev, themeId];
      }
      return prev;
    });
  };

  const handleObjectiveChange = (index: number, field: keyof ObjectiveForm, value: string) => {
    setObjectives(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const validateObjectives = () => {
    return objectives.every(obj => 
      obj.smart_objective.trim() !== '' &&
      obj.specific.trim() !== '' &&
      obj.measurable.trim() !== '' &&
      obj.achievable.trim() !== '' &&
      obj.relevant.trim() !== '' &&
      obj.time_bound.trim() !== ''
    );
  };

  const handleSubmit = async () => {
    if (!validateObjectives()) {
      onError('Veuillez remplir tous les champs SMART pour chaque objectif');
      return;
    }

    try {
      setSubmitting(true);

      const objectiveData = {
        employee_id: selectedEmployee.id,
        year: currentYear,
        career_pathway_id: selectedEmployee.career_pathway_id,
        career_level_id: selectedEmployee.career_level_id,
        selected_themes: selectedThemes,
        objectives: objectives,
        status: 'draft'
      };

      const { error } = await supabase
        .from('annual_objectives')
        .insert([objectiveData]);

      if (error) throw error;

      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erreur lors de la création des objectifs');
    } finally {
      setSubmitting(false);
    }
  };

  const renderEmployeeSelection = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <User className="mx-auto h-12 w-12 text-indigo-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">Sélectionner un employé</h3>
        <p className="text-sm text-gray-600">Choisissez l'employé pour lequel créer des objectifs annuels</p>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-2">
        {employees.map((employee) => (
          <div
            key={employee.id}
            onClick={() => handleEmployeeSelect(employee)}
            className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{employee.full_name}</h4>
                <p className="text-sm text-gray-600">{employee.role} • {employee.department}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {employee.career_level?.name}
                  </span>
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    {employee.career_pathway?.name}
                  </span>
                </div>
              </div>
              <div className="text-indigo-600">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderThemeSelection = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <BookOpen className="mx-auto h-12 w-12 text-indigo-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">Sélectionner 4 thèmes de développement</h3>
        <p className="text-sm text-gray-600">
          Basé sur le parcours <strong>{selectedEmployee?.career_pathway?.name}</strong> 
          au niveau <strong>{selectedEmployee?.career_level?.name}</strong>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Sélectionnez exactement 4 thèmes ({selectedThemes.length}/4 sélectionnés)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {availableThemes.map((theme) => {
          const isSelected = selectedThemes.includes(theme.id);
          const isDisabled = !isSelected && selectedThemes.length >= 4;
          
          return (
            <div
              key={theme.id}
              onClick={() => !isDisabled && handleThemeToggle(theme.id)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50'
                  : isDisabled
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                  : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{theme.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{theme.description}</p>
                </div>
                {isSelected && (
                  <CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 ml-2" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between pt-4">
        {canSelectEmployee && (
          <button
            onClick={() => setStep('employee')}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Retour
          </button>
        )}
        <button
          onClick={() => setStep('objectives')}
          disabled={selectedThemes.length !== 4}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
        >
          Définir les objectifs SMART
        </button>
      </div>
    </div>
  );

  const renderObjectiveForm = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Target className="mx-auto h-12 w-12 text-indigo-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">Définir les objectifs SMART</h3>
        <p className="text-sm text-gray-600">
          Créez un objectif SMART pour chacun des 4 thèmes sélectionnés
        </p>
      </div>

      <div className="space-y-8">
        {objectives.map((objective, index) => (
          <div key={objective.theme_id} className="border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              {index + 1}. {objective.theme_name}
            </h4>

            <div className="space-y-4">
              {/* Objectif SMART global */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Objectif SMART *
                </label>
                <textarea
                  rows={3}
                  value={objective.smart_objective}
                  onChange={(e) => handleObjectiveChange(index, 'smart_objective', e.target.value)}
                  placeholder="Décrivez votre objectif de manière claire et concise..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Critères SMART */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Spécifique (S) *
                  </label>
                  <textarea
                    rows={2}
                    value={objective.specific}
                    onChange={(e) => handleObjectiveChange(index, 'specific', e.target.value)}
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
                    onChange={(e) => handleObjectiveChange(index, 'measurable', e.target.value)}
                    placeholder="Comment allez-vous mesurer le succès ?"
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
                    onChange={(e) => handleObjectiveChange(index, 'achievable', e.target.value)}
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
                    onChange={(e) => handleObjectiveChange(index, 'relevant', e.target.value)}
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
                  onChange={(e) => handleObjectiveChange(index, 'time_bound', e.target.value)}
                  placeholder="Quelle est l'échéance pour atteindre cet objectif ?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-6 border-t">
        <button
          onClick={() => setStep('themes')}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Retour aux thèmes
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || !validateObjectives()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {submitting ? 'Création...' : 'Créer les objectifs'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Créer des objectifs annuels {currentYear}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Définissez 4 objectifs SMART basés sur votre parcours de carrière
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              {step === 'employee' && renderEmployeeSelection()}
              {step === 'themes' && renderThemeSelection()}
              {step === 'objectives' && renderObjectiveForm()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateObjectiveModal;