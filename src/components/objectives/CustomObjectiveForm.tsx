import React, { useState, useEffect } from 'react';
import { Plus, Save, Target, Trash2, BookOpen, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';

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
  objective_type?: string; // Type d'objectif personnalisé
}

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

interface CustomObjectiveFormProps {
  collaboration: any;
  existingObjectives: ObjectiveDetail[] | null;
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const CustomObjectiveForm: React.FC<CustomObjectiveFormProps> = ({
  collaboration,
  existingObjectives,
  onClose,
  onSuccess,
  onError
}) => {
  const { t } = useTranslation();
  const [objectives, setObjectives] = useState<ObjectiveDetail[]>(existingObjectives || []);
  const [availableSkills, setAvailableSkills] = useState<PathwaySkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [objectiveTypeSelection, setObjectiveTypeSelection] = useState<string>('smart');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userProfile?.career_pathway_id && userProfile?.career_level_id) {
      fetchAvailableSkills();
    }
  }, [userProfile]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('common.error'));

      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          full_name,
          career_pathway_id,
          career_level_id,
          career_pathway:career_areas!career_pathway_id(name, color),
          career_level:career_levels!career_level_id(name, color)
        `)
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (err) {
      onError(t('objectives.errorLoadingProfile'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSkills = async () => {
    try {
      setLoading(true);
      
      // First, fetch the development theme IDs for the career pathway
      const { data: themeData, error: themeError } = await supabase
        .from('development_themes')
        .select('id')
        .eq('career_area_id', userProfile.career_pathway_id)
        .eq('is_active', true);

      if (themeError) throw themeError;

      // Extract the theme IDs into a flat array
      const themeIds = (themeData || []).map(theme => theme.id);

      if (themeIds.length === 0) {
        setAvailableSkills([]);
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
            name,
            description
          )
        `)
        .eq('career_level_id', userProfile.career_level_id)
        .in('development_theme_id', themeIds);

      if (error) throw error;
      
      // Filtrer les compétences qui ont des thèmes valides
      const validSkills = (data || []).filter(skill => skill.development_theme);
      setAvailableSkills(validSkills);
      
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

  const addPathwayObjective = (skill: PathwaySkill) => {
    // Vérifier si cette compétence est déjà dans les objectifs
    const exists = objectives.some(obj => obj.skill_id === skill.id);
    if (exists) {
      onError(t('objectives.skillAlreadyAdded'));
      return;
    }

    const newObjective: ObjectiveDetail = {
      skill_id: skill.id,
      skill_description: skill.skill_description,
      theme_name: skill.development_theme?.name || t('objectives.undefinedTheme'),
      smart_objective: '',
      specific: '',
      measurable: '',
      achievable: '',
      relevant: '',
      time_bound: '',
      is_custom: false
    };

    setObjectives([...objectives, newObjective]);
  };

  const addCustomObjective = () => {
    const newObjective: ObjectiveDetail = {
      skill_id: `custom_${Date.now()}`,
      skill_description: '',
      theme_name: t('objectives.customObjective'),
      smart_objective: '',
      specific: '',
      measurable: '',
      achievable: '',
      relevant: '',
      time_bound: '',
      is_custom: true,
      objective_type: objectiveTypeSelection // Ajouter le type d'objectif sélectionné
    };

    setObjectives([...objectives, newObjective]);
  };

  const removeObjective = (index: number) => {
    const updatedObjectives = [...objectives];
    updatedObjectives.splice(index, 1);
    setObjectives(updatedObjectives);
  };

  const updateObjective = (index: number, field: keyof ObjectiveDetail, value: string) => {
    const updatedObjectives = [...objectives];
    updatedObjectives[index] = { ...updatedObjectives[index], [field]: value };
    setObjectives(updatedObjectives);
  };

  const validateObjectives = () => {
    return objectives.every(obj => {
      // Vérifier que la description de compétence est remplie pour tous les objectifs
      if (!obj.skill_description.trim()) return false;
      
      // Pour les objectifs SMART, vérifier tous les champs SMART
      if (!obj.is_custom || (obj.is_custom && obj.objective_type === 'smart')) {
        return obj.smart_objective.trim() !== '' &&
               obj.specific.trim() !== '' &&
               obj.measurable.trim() !== '' &&
               obj.achievable.trim() !== '' &&
               obj.relevant.trim() !== '' &&
               obj.time_bound.trim() !== '';
      }
      
      // Pour les objectifs de formation, vérifier seulement l'objectif principal
      if (obj.is_custom && obj.objective_type === 'formation') {
        return obj.smart_objective.trim() !== '';
      }
      
      // Pour les objectifs personnalisables, vérifier seulement l'objectif principal
      if (obj.is_custom && obj.objective_type === 'custom') {
        return obj.smart_objective.trim() !== '';
      }
      
      return true;
    });
  };

  const handleSubmit = async () => {
    if (!validateObjectives()) {
      onError(t('objectives.fillAllFields'));
      return;
    }

    if (objectives.length === 0) {
      onError(t('objectives.addAtLeastOne'));
      return;
    }

    setSubmitting(true);
    setLoading(true);

    try {
      if (collaboration.objectifs) {
        // Mettre à jour les objectifs existants
        const { error } = await supabase
          .from('objectifs_collaborateurs')
          .update({
            objectifs: objectives
          })
          .eq('id', collaboration.objectifs.id);

        if (error) throw error;
      } else {
        // Créer de nouveaux objectifs
        const { error } = await supabase
          .from('objectifs_collaborateurs')
          .insert([{
            collaboration_id: collaboration.id,
            objectifs: objectives
          }]);

        if (error) throw error;
      }

      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : t('objectives.errorSavingObjectives'));
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  // Fonction pour rendre les champs SMART en fonction du type d'objectif
  const renderObjectiveFields = (objective: ObjectiveDetail, index: number) => {
    // Si ce n'est pas un objectif personnalisé ou si c'est un objectif SMART
    if (!objective.is_custom || (objective.is_custom && objective.objective_type === 'smart')) {
      return (
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
        </div>
      );
    } 
    // Si c'est un objectif de formation
    else if (objective.is_custom && objective.objective_type === 'formation') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objectif de formation *
            </label>
            <textarea
              rows={3}
              value={objective.smart_objective}
              onChange={(e) => updateObjective(index, 'smart_objective', e.target.value)}
              placeholder="Décrivez la formation que vous souhaitez suivre et ses objectifs"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      );
    }
    // Si c'est un objectif personnalisable simple
    else if (objective.is_custom && objective.objective_type === 'custom') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objectif personnalisé *
            </label>
            <textarea
              rows={3}
              value={objective.smart_objective}
              onChange={(e) => updateObjective(index, 'smart_objective', e.target.value)}
              placeholder="Décrivez votre objectif personnalisé"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {existingObjectives ? t('objectives.editObjectives') : t('objectives.defineObjectives')}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('objectives.defineSMARTObjectives')}
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
          {loading && !submitting ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Informations sur le career pathway */}
              {userProfile?.career_pathway && userProfile?.career_level && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-800">{t('objectives.yourCareerPathway')}</h3>
                      <p className="text-sm text-blue-700">
                        {userProfile.career_pathway.name} - {t('annualObjectives.careerLevel')}: {userProfile.career_level.name}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-blue-700">
                    {t('objectives.careerPathwayInfo')}
                  </p>
                </div>
              )}

              {/* Objectifs actuels */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('objectives.myDevelopmentObjectives')} ({objectives.length})
                  </h3>
                  <div className="flex gap-2">
                    {/* Sélection du type d'objectif personnalisé */}
                    <div className="flex items-center mr-2">
                      <select
                        value={objectiveTypeSelection}
                        onChange={(e) => setObjectiveTypeSelection(e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      >
                        <option value="smart">Objectif SMART</option>
                        <option value="formation">Objectif de formation</option>
                        <option value="custom">Objectif personnalisable</option>
                      </select>
                    </div>
                    <button
                      onClick={addCustomObjective}
                      className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      {t('objectives.addCustomObjective')}
                    </button>
                  </div>
                </div>

                {objectives.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600">{t('objectives.noObjectivesDefined')}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {t('objectives.addObjectivesInfo')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {objectives.map((objective, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-6">
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

                        {renderObjectiveFields(objective, index)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Compétences disponibles du career pathway */}
              {userProfile?.career_pathway && availableSkills.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {t('objectives.availableSkills')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableSkills.map((skill) => {
                      const isAlreadySelected = objectives.some(obj => obj.skill_id === skill.id);
                      
                      return (
                        <div 
                          key={skill.id} 
                          className={`p-4 border rounded-lg ${
                            isAlreadySelected 
                              ? 'border-green-300 bg-green-50' 
                              : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                          } transition-colors`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                  {skill.development_theme.name}
                                </span>
                              </div>
                              <h4 className="font-medium text-gray-900 mb-2">{skill.skill_description}</h4>
                              {skill.examples && (
                                <p className="text-sm text-gray-600 mb-1">
                                  <strong>{t('common.examples')}:</strong> {skill.examples}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => addPathwayObjective(skill)}
                              disabled={isAlreadySelected}
                              className={`px-2 py-1 rounded text-sm ${
                                isAlreadySelected
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                              }`}
                            >
                              {isAlreadySelected ? t('objectives.alreadySelected') : t('objectives.add')}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t mt-8">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || objectives.length === 0 || !validateObjectives()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {submitting ? t('common.loading') : t('objectives.saveObjectives')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomObjectiveForm;