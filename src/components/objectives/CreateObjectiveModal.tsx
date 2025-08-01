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
  is_custom?: boolean;
  objective_type?: string; // Type d'objectif personnalisé
}

interface CreateObjectiveModalProps {
  user: any;
  selectedObjective?: AnnualObjective | null;
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const CreateObjectiveModal: React.FC<CreateObjectiveModalProps> = ({
  user,
  selectedObjective,
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
  const [customObjectives, setCustomObjectives] = useState<ObjectiveForm[]>([]);
  const [objectiveTypeSelection, setObjectiveTypeSelection] = useState<string>('smart');

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    checkUserPermissions();
  }, [user, selectedObjective]);

  useEffect(() => {
    if (selectedEmployee) {
      fetchAvailableSkills();
      
      // Si on est en mode édition et qu'on a des objectifs, initialiser les objectifs
      if (selectedObjective && selectedObjective.objectives) {
        // Séparer les objectifs du career pathway et les objectifs personnalisés
        const pathwayObjectives = selectedObjective.objectives.filter((obj: any) => !obj.is_custom);
        const customObjectives = selectedObjective.objectives.filter((obj: any) => obj.is_custom);
        
        setObjectives(pathwayObjectives);
        setCustomObjectives(customObjectives);
        
        // Extraire les skill_ids des objectifs du career pathway
        const skillIds = pathwayObjectives.map((obj: any) => obj.skill_id);
        setSelectedSkills(skillIds);
      }
    }
  }, [selectedEmployee]);

  useEffect(() => {
    if (selectedSkills.length > 0 && !selectedObjective) {
      initializeObjectives();
    }
  }, [selectedSkills]);

  const checkUserPermissions = async () => {
    // Vérifier si l'utilisateur peut sélectionner d'autres employés
    const canSelect = ['admin', 'direction', 'coach'].includes(user.role);
    const isEditing = selectedObjective !== null && selectedObjective !== undefined;
    setCanSelectEmployee(canSelect);

    if (canSelect) {
      await fetchEmployees();
      
      // Si on est en mode édition, passer directement à l'étape des objectifs
      if (isEditing && selectedObjective) {
        // Sélectionner l'employé correspondant à l'objectif
        const employee = {
          id: selectedObjective.employee_id,
          full_name: selectedObjective.employee.full_name,
          career_pathway_id: selectedObjective.career_pathway_id,
          career_level_id: selectedObjective.career_level_id,
          career_pathway: selectedObjective.career_pathway,
          career_level: selectedObjective.career_level
        };
        setSelectedEmployee(employee);
        setStep('objectives');
      } else {
        setStep('employee');
      }
    } else {
      // L'utilisateur ne peut créer que ses propres objectifs
      setSelectedEmployee(user);
      
      // Si on est en mode édition, passer directement à l'étape des objectifs
      if (isEditing && selectedObjective) {
        setStep('objectives');
      } else {
        setStep('skills');
      }
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
    // Ne pas réinitialiser si on est en mode édition
    if (selectedObjective) return;
    
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
        time_bound: '',
        is_custom: false
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
      } else {
        return [...prev, skillId];
      }
    });
  };

  const handleObjectiveChange = (index: number, field: keyof ObjectiveForm, value: string) => {
    setObjectives(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleCustomObjectiveChange = (index: number, field: keyof ObjectiveForm, value: string) => {
    setCustomObjectives(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addCustomObjective = () => {
    setCustomObjectives(prev => [
      ...prev,
      {
        skill_id: `custom_${Date.now()}`,
        skill_description: '',
        theme_name: 'Objectif personnalisé',
        smart_objective: '',
        specific: '',
        measurable: '',
        achievable: '',
        relevant: '',
        time_bound: '',
        is_custom: true,
        objective_type: objectiveTypeSelection // Ajouter le type d'objectif sélectionné
      }
    ]);
  };

  const removeCustomObjective = (index: number) => {
    setCustomObjectives(prev => prev.filter((_, i) => i !== index));
  };

  const validateObjectives = () => {
    // Valider les objectifs du career pathway
    const pathwayValid = objectives.every(obj => 
      obj.smart_objective.trim() !== '' &&
      obj.specific.trim() !== '' &&
      obj.measurable.trim() !== '' &&
      obj.achievable.trim() !== '' &&
      obj.relevant.trim() !== '' &&
      obj.time_bound.trim() !== ''
    );

    // Valider les objectifs personnalisés selon leur type
    const customValid = customObjectives.every(obj => {
      // Vérifier que la description de compétence est remplie pour tous les objectifs
      if (!obj.skill_description.trim()) return false;
      
      // Pour les objectifs SMART, vérifier tous les champs SMART
      if (obj.objective_type === 'smart') {
        return obj.smart_objective.trim() !== '' &&
               obj.specific.trim() !== '' &&
               obj.measurable.trim() !== '' &&
               obj.achievable.trim() !== '' &&
               obj.relevant.trim() !== '' &&
               obj.time_bound.trim() !== '';
      }
      
      // Pour les objectifs de formation et personnalisables, vérifier seulement l'objectif principal
      return obj.smart_objective.trim() !== '';
    });

    // Au moins un objectif doit être défini (pathway ou personnalisé)
    const hasValidPathwayObjectives = objectives.length > 0 && pathwayValid;
    const hasValidCustomObjectives = customObjectives.length > 0 && customValid;
    
    return hasValidPathwayObjectives || hasValidCustomObjectives;
  };

  const handleSubmit = async () => {
    if (!validateObjectives()) {
      onError('Veuillez remplir tous les champs requis pour chaque objectif');
      return;
    }

    await saveObjectives('submitted');
  };

  const handleSaveDraft = async () => {
    if (!validateObjectives()) {
      onError('Veuillez remplir tous les champs requis pour chaque objectif');
      return;
    }

    await saveObjectives('draft');
  };

  const saveObjectives = async (status: 'draft' | 'submitted') => {
    try {
      setSubmitting(true);
      
      // Déterminer si c'est une création ou une mise à jour
      const isUpdate = !!selectedObjective;

      // Combiner les objectifs du career pathway et les objectifs personnalisés
      const allObjectives = [...objectives, ...customObjectives];

      const objectiveData = {
        employee_id: selectedEmployee.id,
        year: selectedObjective?.year || currentYear,
        career_pathway_id: selectedEmployee.career_pathway_id,
        career_level_id: selectedEmployee.career_level_id,
        selected_themes: selectedSkills, // On stocke les IDs des compétences sélectionnées
        objectives: allObjectives,
        status: status
      };

      let error;
      
      if (isUpdate) {
        // Mise à jour d'un objectif existant
        const { error: updateError } = await supabase
          .from('annual_objectives')
          .update(objectiveData)
          .eq('id', selectedObjective.id);
        
        error = updateError;
      } else {
        // Création d'un nouvel objectif
        const { error: insertError } = await supabase
          .from('annual_objectives')
          .insert([objectiveData]);
        
        error = insertError;
      }

      if (error) throw error;

      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erreur lors de la création des objectifs');
    } finally {
      setSubmitting(false);
    }
  };

  // Fonction pour rendre les champs SMART en fonction du type d'objectif
  const renderCustomObjectiveFields = (objective: ObjectiveForm, index: number) => {
    // Si c'est un objectif SMART
    if (objective.objective_type === 'smart') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objectif SMART *
            </label>
            <textarea
              rows={3}
              value={objective.smart_objective}
              onChange={(e) => handleCustomObjectiveChange(index, 'smart_objective', e.target.value)}
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
                onChange={(e) => handleCustomObjectiveChange(index, 'specific', e.target.value)}
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
                onChange={(e) => handleCustomObjectiveChange(index, 'measurable', e.target.value)}
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
                onChange={(e) => handleCustomObjectiveChange(index, 'achievable', e.target.value)}
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
                onChange={(e) => handleCustomObjectiveChange(index, 'relevant', e.target.value)}
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
              onChange={(e) => handleCustomObjectiveChange(index, 'time_bound', e.target.value)}
              placeholder="Quelle est l'échéance pour atteindre cet objectif ?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      );
    } 
    // Si c'est un objectif de formation
    else if (objective.objective_type === 'formation') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objectif de formation *
            </label>
            <textarea
              rows={4}
              value={objective.smart_objective}
              onChange={(e) => handleCustomObjectiveChange(index, 'smart_objective', e.target.value)}
              placeholder="Décrivez la formation que vous souhaitez suivre, ses objectifs et comment elle contribuera à votre développement professionnel."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      );
    }
    // Si c'est un objectif personnalisable simple
    else if (objective.objective_type === 'custom') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objectif personnalisé *
            </label>
            <textarea
              rows={4}
              value={objective.smart_objective}
              onChange={(e) => handleCustomObjectiveChange(index, 'smart_objective', e.target.value)}
              placeholder="Décrivez librement votre objectif personnel ou professionnel."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      );
    }
    
    return null;
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
        <h3 className="text-lg font-semibold text-gray-900">Sélectionner des compétences à développer</h3>
        <p className="text-sm text-gray-600">
          Compétences du niveau <strong>{selectedEmployee?.career_level?.name}</strong> 
          pour le parcours <strong>{selectedEmployee?.career_pathway?.name}</strong>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Sélectionnez les compétences que vous souhaitez développer ({selectedSkills.length} sélectionnées)
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
            
            return (
              <div
                key={skill.id}
                onClick={() => handleSkillToggle(skill.id)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50'
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
        <div className="flex gap-3 ml-auto">
          <button
            onClick={() => setStep('objectives')}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Passer (objectifs personnalisés uniquement)
          </button>
          <button
            onClick={() => {
              initializeObjectives();
              setStep('objectives');
            }}
            disabled={selectedSkills.length === 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Définir les objectifs SMART
          </button>
        </div>
      </div>
    </div>
  );

  const renderObjectiveForm = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Target className="mx-auto h-12 w-12 text-indigo-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">Définir les objectifs SMART</h3>
        <p className="text-sm text-gray-600">
          Créez un objectif SMART pour chacune des compétences sélectionnées
        </p>
      </div>

      {/* Section pour ajouter des compétences du Career Pathway en mode édition */}
      {selectedObjective && availableSkills.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-blue-800 mb-3">Ajouter des compétences du Career Pathway</h4>
          <p className="text-sm text-blue-700 mb-4">
            Vous pouvez ajouter des compétences supplémentaires de votre parcours de carrière
          </p>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {availableSkills
              .filter(skill => !selectedSkills.includes(skill.id))
              .map((skill) => (
                <div
                  key={skill.id}
                  onClick={() => {
                    setSelectedSkills(prev => [...prev, skill.id]);
                    // Ajouter immédiatement un objectif vide pour cette compétence
                    const newObjective: ObjectiveForm = {
                      skill_id: skill.id,
                      skill_description: skill.skill_description,
                      theme_name: skill.development_theme?.name || '',
                      smart_objective: '',
                      specific: '',
                      measurable: '',
                      achievable: '',
                      relevant: '',
                      time_bound: '',
                      is_custom: false
                    };
                    setObjectives(prev => [...prev, newObjective]);
                  }}
                  className="p-3 border border-blue-200 rounded-lg hover:border-blue-300 hover:bg-blue-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {skill.development_theme.name}
                        </span>
                      </div>
                      <h5 className="font-medium text-gray-900 text-sm">{skill.skill_description}</h5>
                      {skill.examples && (
                        <p className="text-xs text-gray-600 mt-1">
                          <strong>Exemples:</strong> {skill.examples}
                        </p>
                      )}
                    </div>
                    <div className="text-blue-600 ml-2">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
          </div>
          
          {availableSkills.filter(skill => !selectedSkills.includes(skill.id)).length === 0 && (
            <p className="text-sm text-blue-600 italic">
              Toutes les compétences disponibles ont déjà été ajoutées
            </p>
          )}
        </div>
      )}

      {/* Objectifs du Career Pathway */}
      {objectives.length > 0 && (
        <div className="space-y-8">
        <h4 className="font-semibold text-gray-800 border-b pb-2">Objectifs basés sur le Career Pathway</h4>
        {objectives.map((objective, index) => (
          <div key={objective.skill_id} className="border border-gray-200 rounded-lg p-6 relative">
            {/* Bouton pour supprimer un objectif en mode édition */}
            {selectedObjective && (
              <button
                type="button"
                onClick={() => {
                  // Supprimer l'objectif et la compétence sélectionnée
                  setObjectives(prev => prev.filter((_, i) => i !== index));
                  setSelectedSkills(prev => prev.filter(id => id !== objective.skill_id));
                }}
                className="absolute top-4 right-4 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                title="Supprimer cet objectif"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            
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
      )}

      {/* Objectifs personnalisés */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-800 border-b pb-2">Objectifs personnalisés</h4>
          <div className="flex items-center gap-2">
            {/* Sélection du type d'objectif personnalisé */}
            <select
              value={objectiveTypeSelection}
              onChange={(e) => setObjectiveTypeSelection(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              <option value="smart">Objectif SMART</option>
              <option value="formation">Objectif de formation</option>
              <option value="custom">Objectif personnalisable</option>
            </select>
            <button
              type="button"
              onClick={addCustomObjective}
              className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
            >
              Ajouter un objectif personnalisé
            </button>
          </div>
        </div>

        {customObjectives.length === 0 ? (
          <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500">Aucun objectif personnalisé défini</p>
            <p className="text-xs text-gray-400 mt-1">Vous pouvez ajouter des objectifs spécifiques qui ne sont pas liés à votre Career Pathway</p>
          </div>
        ) : (
          <div className="space-y-6">
            {customObjectives.map((objective, index) => (
              <div key={objective.skill_id} className={`border rounded-lg p-6 ${
                objective.objective_type === 'smart' ? 'bg-purple-50 border-purple-200' : 
                objective.objective_type === 'formation' ? 'bg-orange-50 border-orange-200' : 
                'bg-indigo-50 border-indigo-200'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      Objectif personnalisé
                    </span>
                    {objective.objective_type && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        objective.objective_type === 'smart' ? 'bg-green-100 text-green-800' : 
                        objective.objective_type === 'formation' ? 'bg-orange-100 text-orange-800' : 
                        'bg-indigo-100 text-indigo-800'
                      }`}>
                        {objective.objective_type === 'smart' ? 'SMART' : 
                         objective.objective_type === 'formation' ? 'Formation' : 
                         'Personnalisé'}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCustomObjective(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Compétence personnalisée */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Compétence à développer *
                    </label>
                    <input
                      type="text"
                      value={objective.skill_description}
                      onChange={(e) => handleCustomObjectiveChange(index, 'skill_description', e.target.value)}
                      placeholder="Ex: Leadership, Communication, Gestion de projet..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  {/* Champs spécifiques selon le type d'objectif */}
                  {renderCustomObjectiveFields(objective, index)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-6 border-t">
        <button
          onClick={() => setStep('skills')}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Retour aux compétences
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleSaveDraft}
            disabled={submitting || !validateObjectives()}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {submitting ? 'Sauvegarde...' : 'Enregistrer brouillon'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !validateObjectives()}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {submitting ? 'Soumission...' : 'Soumettre'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              {selectedObjective ? 'Modifier' : 'Créer'} des objectifs annuels {selectedObjective?.year || currentYear}
              {selectedObjective && (
                <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {selectedObjective.employee?.full_name}
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Définissez des objectifs SMART basés sur les compétences de votre niveau et vos objectifs personnels
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