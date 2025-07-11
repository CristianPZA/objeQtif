import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Target, BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import GeminiObjectiveGenerator from './GeminiObjectiveGenerator';

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
  is_custom?: boolean;
  objective_type?: string;
}

interface CreateObjectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (objectives: any) => void;
  onError: (error: string) => void;
  selectedObjective?: any;
  user: any;
  year: number;
}

const CreateObjectiveModal: React.FC<CreateObjectiveModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onError,
  selectedObjective,
  user,
  year
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [objectives, setObjectives] = useState<ObjectiveDetail[]>([]);
  const [pathwaySkills, setPathwaySkills] = useState<any[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [objectiveTypeSelection, setObjectiveTypeSelection] = useState<string>('smart');
  const [formData, setFormData] = useState({
    year: year,
    career_pathway_id: user?.career_pathway_id || '',
    career_level_id: user?.career_level_id || '',
    selected_themes: [] as string[],
    objectives: [] as ObjectiveDetail[]
  });

  useEffect(() => {
    if (isOpen) {
      fetchAvailableSkills();
      
      // If editing an existing objective
      if (selectedObjective) {
        setFormData({
          year: selectedObjective.year,
          career_pathway_id: selectedObjective.career_pathway_id,
          career_level_id: selectedObjective.career_level_id,
          selected_themes: selectedObjective.selected_themes || [],
          objectives: selectedObjective.objectives || []
        });
        setObjectives(selectedObjective.objectives || []);
      } else {
        // New objective
        setFormData({
          year: year,
          career_pathway_id: user?.career_pathway_id || '',
          career_level_id: user?.career_level_id || '',
          selected_themes: [],
          objectives: []
        });
        setObjectives([]);
      }
    }
  }, [isOpen, selectedObjective, user, year]);

  const fetchAvailableSkills = async () => {
    try {
      setLoading(true);
      
      if (!user?.career_pathway_id || !user?.career_level_id) {
        onError(t('objectives.errorLoadingProfile'));
        return;
      }
      
      // First, fetch the development theme IDs for the career pathway
      const { data: themeData, error: themeError } = await supabase
        .from('development_themes')
        .select('id, name')
        .eq('career_area_id', user.career_pathway_id)
        .eq('is_active', true);

      if (themeError) throw themeError;

      // Extract the theme IDs into a flat array
      const themeIds = (themeData || []).map(theme => theme.id);

      if (themeIds.length === 0) {
        setPathwaySkills([]);
        onError(t('objectives.noThemesFound'));
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
            id,
            name,
            description
          )
        `)
        .eq('career_level_id', user.career_level_id)
        .in('development_theme_id', themeIds);

      if (error) throw error;
      
      // Filter skills that have valid themes
      const validSkills = (data || []).filter(skill => skill.development_theme);
      setPathwaySkills(validSkills);
      
      if (validSkills.length === 0) {
        onError(t('objectives.noSkillsFound'));
      }
    } catch (err) {
      console.error('Error fetching skills:', err);
      onError(t('objectives.errorLoadingSkills'));
    } finally {
      setLoading(false);
    }
  };

  const handleSkillSelect = (skillId: string) => {
    // Toggle skill selection (max 4)
    if (selectedSkills.includes(skillId)) {
      setSelectedSkills(prev => prev.filter(id => id !== skillId));
    } else if (selectedSkills.length < 4) {
      setSelectedSkills(prev => [...prev, skillId]);
    } else {
      onError('Vous pouvez sélectionner au maximum 4 compétences');
    }
  };

  const createObjectivesFromSkills = () => {
    // Create objectives from selected skills
    const newObjectives = selectedSkills.map(skillId => {
      const skill = pathwaySkills.find(s => s.id === skillId);
      
      return {
        skill_id: skillId,
        skill_description: skill?.skill_description || '',
        theme_name: skill?.development_theme?.name || t('objectives.undefinedTheme'),
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
    setFormData(prev => ({
      ...prev,
      selected_themes: selectedSkills,
      objectives: newObjectives
    }));
  };

  const addCustomObjective = () => {
    const newObjective: ObjectiveDetail = {
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
      objective_type: objectiveTypeSelection
    };

    setObjectives(prev => [...prev, newObjective]);
    setFormData(prev => ({
      ...prev,
      objectives: [...prev.objectives, newObjective]
    }));
  };

  const updateObjective = (index: number, field: keyof ObjectiveDetail, value: string) => {
    const updatedObjectives = [...objectives];
    updatedObjectives[index] = { ...updatedObjectives[index], [field]: value };
    setObjectives(updatedObjectives);
    setFormData(prev => ({
      ...prev,
      objectives: updatedObjectives
    }));
  };

  const removeObjective = (index: number) => {
    const updatedObjectives = [...objectives];
    updatedObjectives.splice(index, 1);
    setObjectives(updatedObjectives);
    setFormData(prev => ({
      ...prev,
      objectives: updatedObjectives
    }));
  };

  const validateObjectives = () => {
    if (objectives.length === 0) {
      onError(t('objectives.addAtLeastOne'));
      return false;
    }

    // Check that all required fields are filled
    const isValid = objectives.every(obj => {
      // Check skill description for all objectives
      if (!obj.skill_description.trim()) return false;
      
      // For SMART objectives, check all SMART fields
      if (!obj.is_custom || (obj.is_custom && obj.objective_type === 'smart')) {
        return obj.smart_objective.trim() !== '' &&
               obj.specific.trim() !== '' &&
               obj.measurable.trim() !== '' &&
               obj.achievable.trim() !== '' &&
               obj.relevant.trim() !== '' &&
               obj.time_bound.trim() !== '';
      }
      
      // For other objective types, just check the main objective
      return obj.smart_objective.trim() !== '';
    });

    if (!isValid) {
      onError(t('objectives.fillAllFields'));
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateObjectives()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare data for saving
      const objectiveData = {
        employee_id: user.id,
        year: formData.year,
        career_pathway_id: formData.career_pathway_id,
        career_level_id: formData.career_level_id,
        selected_themes: formData.selected_themes,
        objectives: objectives,
        status: 'draft'
      };

      if (selectedObjective) {
        // Update existing objective
        const { error } = await supabase
          .from('annual_objectives')
          .update(objectiveData)
          .eq('id', selectedObjective.id);

        if (error) throw error;
      } else {
        // Create new objective
        const { error } = await supabase
          .from('annual_objectives')
          .insert([objectiveData]);

        if (error) throw error;
      }

      onSave(objectiveData);
    } catch (err) {
      onError(err instanceof Error ? err.message : t('objectives.errorSavingObjectives'));
    } finally {
      setLoading(false);
    }
  };

  // Render skill selection section
  const renderSkillSelection = () => {
    if (objectives.length > 0) return null;
    
    return (
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Sélectionnez jusqu'à 4 compétences pour vos objectifs annuels
        </h3>
        
        {user?.career_pathway && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">{t('objectives.yourCareerPathway')}</h3>
                <p className="text-sm text-blue-700">
                  {user.career_pathway.name} - {t('annualObjectives.careerLevel')}: {user.career_level?.name || 'Non défini'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {pathwaySkills.map(skill => (
            <div
              key={skill.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedSkills.includes(skill.id)
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => handleSkillSelect(skill.id)}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  {skill.development_theme?.name || 'Thème non défini'}
                </span>
              </div>
              <h4 className="font-medium text-gray-900">{skill.skill_description}</h4>
              {skill.examples && (
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Exemples:</strong> {skill.examples}
                </p>
              )}
            </div>
          ))}
        </div>
        
        {pathwaySkills.length === 0 && !loading && (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">Aucune compétence disponible pour votre niveau et parcours de carrière</p>
          </div>
        )}
        
        {selectedSkills.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={createObjectivesFromSkills}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              Créer des objectifs à partir des compétences sélectionnées
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render objectives form
  const renderObjectiveForm = () => {
    if (objectives.length === 0) return null;
    
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Définir vos objectifs annuels ({objectives.length})
          </h3>
          <div className="flex gap-2">
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
              onClick={addCustomObjective}
              className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              {t('objectives.addCustomObjective')}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {objectives.map((objective, index) => (
            <div key={objective.skill_id} className="border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-1 rounded ${objective.is_custom ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                      {objective.theme_name}
                    </span>
                    {objective.is_custom && (
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {t('objectives.customized')}
                      </span>
                    )}
                    {objective.is_custom && objective.objective_type && (
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
                  
                  {objective.is_custom ? (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('objectives.skillToImprove')} *
                      </label>
                      <input
                        type="text"
                        value={objective.skill_description}
                        onChange={(e) => updateObjective(index, 'skill_description', e.target.value)}
                        placeholder="Ex: Communication client, Gestion de projet..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  ) : (
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {objective.skill_description}
                    </h3>
                  )}
                </div>
                <button
                  onClick={() => removeObjective(index)}
                  className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Render fields based on objective type */}
              {(!objective.is_custom || (objective.is_custom && objective.objective_type === 'smart')) && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('objectives.smartObjective')} *
                    </label>
                    <textarea
                      rows={3}
                      value={objective.smart_objective}
                      onChange={(e) => updateObjective(index, 'smart_objective', e.target.value)}
                      placeholder={t('objectives.smartObjective')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('objectives.specific')} *
                      </label>
                      <textarea
                        rows={2}
                        value={objective.specific}
                        onChange={(e) => updateObjective(index, 'specific', e.target.value)}
                        placeholder={t('objectives.specific')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('objectives.measurable')} *
                      </label>
                      <textarea
                        rows={2}
                        value={objective.measurable}
                        onChange={(e) => updateObjective(index, 'measurable', e.target.value)}
                        placeholder={t('objectives.measurable')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('objectives.achievable')} *
                      </label>
                      <textarea
                        rows={2}
                        value={objective.achievable}
                        onChange={(e) => updateObjective(index, 'achievable', e.target.value)}
                        placeholder={t('objectives.achievable')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('objectives.relevant')} *
                      </label>
                      <textarea
                        rows={2}
                        value={objective.relevant}
                        onChange={(e) => updateObjective(index, 'relevant', e.target.value)}
                        placeholder={t('objectives.relevant')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('objectives.timeBound')} *
                    </label>
                    <textarea
                      rows={2}
                      value={objective.time_bound}
                      onChange={(e) => updateObjective(index, 'time_bound', e.target.value)}
                      placeholder={t('objectives.timeBound')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  {/* Gemini AI Generator */}
                  <GeminiObjectiveGenerator
                    userProfile={user}
                    careerPathway={user?.career_pathway}
                    careerLevel={user?.career_level}
                    skillDescription={objective.skill_description}
                    themeName={objective.theme_name}
                    onGeneratedObjective={(generatedObjective) => {
                      updateObjective(index, 'smart_objective', generatedObjective.smart_objective);
                      updateObjective(index, 'specific', generatedObjective.specific);
                      updateObjective(index, 'measurable', generatedObjective.measurable);
                      updateObjective(index, 'achievable', generatedObjective.achievable);
                      updateObjective(index, 'relevant', generatedObjective.relevant);
                      updateObjective(index, 'time_bound', generatedObjective.time_bound);
                    }}
                  />
                </div>
              )}
              
              {/* Formation objective */}
              {objective.is_custom && objective.objective_type === 'formation' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Objectif de formation *
                  </label>
                  <textarea
                    rows={4}
                    value={objective.smart_objective}
                    onChange={(e) => updateObjective(index, 'smart_objective', e.target.value)}
                    placeholder="Décrivez la formation que vous souhaitez suivre et ses objectifs"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              )}
              
              {/* Custom simple objective */}
              {objective.is_custom && objective.objective_type === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Objectif personnalisé *
                  </label>
                  <textarea
                    rows={4}
                    value={objective.smart_objective}
                    onChange={(e) => updateObjective(index, 'smart_objective', e.target.value)}
                    placeholder="Décrivez votre objectif personnalisé"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedObjective ? 'Modifier les objectifs annuels' : `Objectifs annuels ${year}`}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Définissez vos objectifs de développement pour l'année
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
            <div className="space-y-6">
              {renderSkillSelection()}
              {renderObjectiveForm()}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {t('common.cancel')}
          </button>
          
          {objectives.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? t('common.loading') : t('common.save')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateObjectiveModal;