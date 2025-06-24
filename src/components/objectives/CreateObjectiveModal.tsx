import React, { useState, useEffect } from 'react';
import { X, Save, Target, BookOpen, User, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PathwaySkill {
  id: string;
  skill_description: string;
  examples: string | null;
  requirements: string | null;
  development_theme: {
    name: string;
    description: string;
  };
}

interface ObjectiveForm {
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
  const [step, setStep] = useState<'employee' | 'skills' | 'objectives'>('employee');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [availableSkills, setAvailableSkills] = useState<PathwaySkill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
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
      fetchAvailableSkills();
    }
  }, [selectedEmployee]);

  useEffect(() => {
    if (selectedSkills.length > 0) {
      initializeObjectives();
    }
  }, [selectedSkills]);

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
      setStep('skills');
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

  const fetchAvailableSkills = async () => {
    if (!selectedEmployee?.career_pathway_id || !selectedEmployee?.career_level_id) return;

    try {
      setLoading(true);
      
      // First, fetch the development theme IDs for the career pathway
      const { data: themeData, error: themeError } = await supabase
        .from('development_themes')
        .select('id')
        .eq('career_area_id', selectedEmployee.career_pathway_id)
        .eq('is_active', true);

      if (themeError) throw themeError;

      // Extract the theme IDs into a flat array
      const themeIds = (themeData || []).map(theme => theme.id);

      if (themeIds.length === 0) {
        setAvailableSkills([]);
        onError('Aucun thème de développement trouvé pour ce parcours de carrière');
        return;
      }

      // Now fetch the pathway skills using the theme IDs
      const { data, error } = await supabase
        .from('pathway_skills')
        .select(`
          id,
          skill_description,
          examples,
          requirements,
          development_theme:development_themes!development_theme_id(
            name,
            description
          )
        `)
        .eq('career_level_id', selectedEmployee.career_level_id)
        .in('development_theme_id', themeIds);

      if (error) throw error;
      
      // Filtrer les compétences qui ont des thèmes valides
      const validSkills = (data || []).filter(skill => skill.development_theme);
      setAvailableSkills(validSkills);
      
      if (validSkills.length === 0) {
        onError('Aucune compétence trouvée pour ce niveau et ce parcours de carrière');
      }
    } catch (err) {
      console.error('Error fetching skills:', err);
      onError('Erreur lors du chargement des compétences');
    } finally {
      setLoading(false);
    }
  };

  const initializeObjectives = () => {
    const newObjectives = selectedSkills.map(skillId => {
      const skill = availableSkills.find(s => s.id === skillId);
      return {
        skill_id: skillId,
        skill_description: skill?.skill_description || '',
        theme_name: skill?.development_theme?.name || '',
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
    setStep('skills');
  };

  const handleSkillToggle = (skillId: string) => {
    setSelectedSkills(prev => {
      if (prev.includes(skillId)) {
        return prev.filter(id => id !== skillId);
      } else if (prev.length < 4) {
        return [...prev, skillId];
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
        selected_themes: selectedSkills, // On stocke les IDs des compétences sélectionnées
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

  const renderSkillSelection = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Target className="mx-auto h-12 w-12 text-indigo-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">Sélectionner 4 compétences à développer</h3>
        <p className="text-sm text-gray-600">
          Compétences du niveau <strong>{selectedEmployee?.career_level?.name}</strong> 
          pour le parcours <strong>{selectedEmployee?.career_pathway?.name}</strong>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Sélectionnez exactement 4 compétences ({selectedSkills.length}/4 sélectionnées)
        </p>
      </div>

      {availableSkills.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune compétence disponible</h3>
          <p className="text-gray-600">
            Aucune compétence n'est définie pour ce niveau et ce parcours de carrière.
            Contactez votre administrateur pour configurer les compétences.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {availableSkills.map((skill) => {
            const isSelected = selectedSkills.includes(skill.id);
            const isDisabled = !isSelected && selectedSkills.length >= 4;
            
            return (
              <div
                key={skill.id}
                onClick={() => !isDisabled && handleSkillToggle(skill.id)}
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
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {skill.development_theme.name}
                      </span>
                      {isSelected && (
                        <CheckCircle className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                    <h4 className="font-medium text-gray-900 mb-2">{skill.skill_description}</h4>
                    {skill.examples && (
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Exemples:</strong> {skill.examples}
                      </p>
                    )}
                    {skill.requirements && (
                      <p className="text-sm text-gray-600">
                        <strong>Prérequis:</strong> {skill.requirements}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
          disabled={selectedSkills.length !== 4}
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
          Créez un objectif SMART pour chacune des 4 compétences sélectionnées
        </p>
      </div>

      <div className="space-y-8">
        {objectives.map((objective, index) => (
          <div key={objective.skill_id} className="border border-gray-200 rounded-lg p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  {objective.theme_name}
                </span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900">
                {index + 1}. {objective.skill_description}
              </h4>
            </div>

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
                  placeholder="Décrivez votre objectif de développement pour cette compétence..."
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
                    placeholder="Que voulez-vous accomplir exactement pour cette compétence ?"
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
                    placeholder="En quoi cette compétence est-elle importante pour votre carrière ?"
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
                  placeholder="Quelle est l'échéance pour développer cette compétence ?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-6 border-t">
        <button
          onClick={() => setStep('skills')}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Retour aux compétences
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
              Définissez 4 objectifs SMART basés sur les compétences de votre niveau
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
              {step === 'skills' && renderSkillSelection()}
              {step === 'objectives' && renderObjectiveForm()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateObjectiveModal;