import React, { useState, useEffect } from 'react';
import { Plus, Save, Target, Trash2, BookOpen, X, Info, AlertCircle, CheckCircle, Edit, Eye, EyeOff } from 'lucide-react';
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
  objective_type?: string;
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
  const [currentEditingIndex, setCurrentEditingIndex] = useState<number | null>(null);
  const [showSkillsPanel, setShowSkillsPanel] = useState(false);
  const [expandedObjectives, setExpandedObjectives] = useState<Set<number>>(new Set());
  const [isDraft, setIsDraft] = useState(false);

  // Grouper les compétences par thème
  const [skillsByTheme, setSkillsByTheme] = useState<Record<string, PathwaySkill[]>>({});

  useEffect(() => {
    fetchUserProfile();
    
    // Vérifier si les objectifs existants sont en mode brouillon
    if (existingObjectives && existingObjectives.length > 0) {
      // Si on a des objectifs existants, on considère qu'ils sont en mode édition
      setIsDraft(true);
    }
  }, []);

  useEffect(() => {
    if (userProfile?.career_pathway_id && userProfile?.career_level_id) {
      fetchAvailableSkills();
    }
  }, [userProfile]);

  useEffect(() => {
    // Grouper les compétences par thème
    const groupedSkills: Record<string, PathwaySkill[]> = {};
    
    availableSkills.forEach(skill => {
      const themeName = skill.development_theme?.name || 'Autres';
      if (!groupedSkills[themeName]) {
        groupedSkills[themeName] = [];
      }
      groupedSkills[themeName].push(skill);
    });
    
    setSkillsByTheme(groupedSkills);
  }, [availableSkills]);

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
      
      const { data: themeData, error: themeError } = await supabase
        .from('development_themes')
        .select('id')
        .eq('career_area_id', userProfile.career_pathway_id)
        .eq('is_active', true);

      if (themeError) throw themeError;

      const themeIds = (themeData || []).map(theme => theme.id);

      if (themeIds.length === 0) {
        setAvailableSkills([]);
        return;
      }

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
      
      const validSkills = (data || []).filter(skill => skill.development_theme);
      setAvailableSkills(validSkills);
    } catch (err) {
      console.error('Error fetching skills:', err);
    } finally {
      setLoading(false);
    }
  };

  const addPathwayObjective = (skill: PathwaySkill) => {
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
    setCurrentEditingIndex(objectives.length);
    setShowSkillsPanel(false);
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
      objective_type: objectiveTypeSelection
    };

    setObjectives([...objectives, newObjective]);
    setCurrentEditingIndex(objectives.length);
  };

  const removeObjective = (index: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet objectif ?')) {
      return;
    }
    
    const updatedObjectives = [...objectives];
    updatedObjectives.splice(index, 1);
    setObjectives(updatedObjectives);
    
    // Réajuster l'index d'édition si nécessaire
    if (currentEditingIndex === index) {
      setCurrentEditingIndex(null);
    } else if (currentEditingIndex !== null && currentEditingIndex > index) {
      setCurrentEditingIndex(currentEditingIndex - 1);
    }
  };

  const updateObjective = (index: number, field: keyof ObjectiveDetail, value: string) => {
    const updatedObjectives = [...objectives];
    updatedObjectives[index] = { ...updatedObjectives[index], [field]: value };
    setObjectives(updatedObjectives);
  };

  const toggleObjectiveExpansion = (index: number) => {
    const newExpanded = new Set(expandedObjectives);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedObjectives(newExpanded);
  };

  const validateObjectives = () => {
    return objectives.every(obj => {
      if (!obj.skill_description.trim()) return false;
      
      if (!obj.is_custom || (obj.is_custom && obj.objective_type === 'smart')) {
        return obj.smart_objective.trim() !== '' &&
               obj.specific.trim() !== '' &&
               obj.measurable.trim() !== '' &&
               obj.achievable.trim() !== '' &&
               obj.relevant.trim() !== '' &&
               obj.time_bound.trim() !== '';
      }
      
      return obj.smart_objective.trim() !== '';
    });
  };

  const validateForDraft = () => {
    // Pour les brouillons, on vérifie juste qu'il y a au moins un objectif avec une description
    return objectives.length > 0 && objectives.some(obj => obj.skill_description.trim() !== '');
  };

  const handleSaveDraft = async () => {
    if (!validateForDraft()) {
      onError('Veuillez ajouter au moins un objectif avec une description avant de sauvegarder');
      return;
    }

    await saveObjectives(true);
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

    await saveObjectives(false);
  };

  const saveObjectives = async (asDraft: boolean) => {
    setSubmitting(true);
    setLoading(true);

    try {
      // Ajouter un indicateur de statut aux objectifs
      const objectivesWithStatus = objectives.map(obj => ({
        ...obj,
        status: asDraft ? 'draft' : 'submitted'
      }));

      if (collaboration.objectifs) {
        const { error } = await supabase
          .from('objectifs_collaborateurs')
          .update({
            objectifs: objectivesWithStatus
          })
          .eq('id', collaboration.objectifs.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('objectifs_collaborateurs')
          .insert([{
            collaboration_id: collaboration.id,
            objectifs: objectivesWithStatus
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

  const renderObjectiveFields = (objective: ObjectiveDetail, index: number) => {
    const isEditing = currentEditingIndex === index;
    const isExpanded = expandedObjectives.has(index);

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
              disabled={!isEditing}
            />
          </div>

          {(isEditing || isExpanded) && (
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
                  disabled={!isEditing}
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
                  disabled={!isEditing}
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
                  disabled={!isEditing}
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
                  disabled={!isEditing}
                />
              </div>
            </div>
          )}

          {(isEditing || isExpanded) && (
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
                disabled={!isEditing}
              />
            </div>
          )}
        </div>
      );
    } else if (objective.is_custom && objective.objective_type === 'formation') {
      return (
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-orange-700">
                Décrivez la formation que vous souhaitez suivre et ses objectifs.
              </p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objectif de formation *
            </label>
            <textarea
              rows={4}
              value={objective.smart_objective}
              onChange={(e) => updateObjective(index, 'smart_objective', e.target.value)}
              placeholder="Décrivez la formation que vous souhaitez suivre, ses objectifs et comment elle contribuera à votre développement professionnel."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={!isEditing}
            />
          </div>
        </div>
      );
    } else if (objective.is_custom && objective.objective_type === 'custom') {
      return (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-indigo-700">
                Décrivez librement votre objectif personnel ou professionnel.
              </p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objectif personnalisé *
            </label>
            <textarea
              rows={4}
              value={objective.smart_objective}
              onChange={(e) => updateObjective(index, 'smart_objective', e.target.value)}
              placeholder="Décrivez librement votre objectif personnel ou professionnel."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={!isEditing}
            />
          </div>
        </div>
      );
    }
    
    return null;
  };

  const getObjectiveTypeLabel = (objective: ObjectiveDetail) => {
    if (!objective.is_custom) return 'Career Pathway';
    
    switch (objective.objective_type) {
      case 'smart': return 'SMART personnalisé';
      case 'formation': return 'Formation';
      case 'custom': return 'Personnalisé';
      default: return 'Personnalisé';
    }
  };

  const getObjectiveTypeColor = (objective: ObjectiveDetail) => {
    if (!objective.is_custom) return 'bg-blue-100 text-blue-800';
    
    switch (objective.objective_type) {
      case 'smart': return 'bg-green-100 text-green-800';
      case 'formation': return 'bg-orange-100 text-orange-800';
      case 'custom': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-purple-100 text-purple-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">
                {existingObjectives ? 'Modifier mes objectifs' : 'Définir mes objectifs'}
              </h2>
              <p className="text-indigo-100 mt-1">
                Projet: {collaboration.projet.titre} - {collaboration.projet.nom_client}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex h-full max-h-[calc(95vh-120px)]">
          {/* Panneau de gauche: Liste des objectifs */}
          <div className="w-1/3 border-r border-gray-200 p-6 overflow-y-auto">
            <div className="space-y-4">
              {/* Header avec compteur */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Mes objectifs ({objectives.length})
                  </h3>
                  {isDraft && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      Mode brouillon
                    </span>
                  )}
                </div>
              </div>

              {/* Boutons d'ajout */}
              <div className="space-y-2">
                <button
                  onClick={() => setShowSkillsPanel(true)}
                  className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm flex items-center gap-2"
                >
                  <Target className="w-4 h-4" />
                  Ajouter depuis Career Pathway
                </button>
                
                <div className="flex gap-2">
                  <select
                    value={objectiveTypeSelection}
                    onChange={(e) => setObjectiveTypeSelection(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="smart">SMART</option>
                    <option value="formation">Formation</option>
                    <option value="custom">Libre</option>
                  </select>
                  <button
                    onClick={addCustomObjective}
                    className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Personnalisé
                  </button>
                </div>
              </div>

              {/* Liste des objectifs */}
              {objectives.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Target className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Aucun objectif défini</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Ajoutez des objectifs depuis votre Career Pathway ou créez des objectifs personnalisés
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {objectives.map((objective, index) => {
                    const isEditing = currentEditingIndex === index;
                    const isComplete = objective.skill_description.trim() !== '' && objective.smart_objective.trim() !== '';
                    
                    return (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isEditing 
                            ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                            : isComplete
                              ? 'border-green-200 bg-green-50 hover:border-green-300'
                              : 'border-orange-200 bg-orange-50 hover:border-orange-300'
                        }`}
                        onClick={() => setCurrentEditingIndex(isEditing ? null : index)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs px-2 py-1 rounded ${getObjectiveTypeColor(objective)}`}>
                                {getObjectiveTypeLabel(objective)}
                              </span>
                              {isComplete ? (
                                <CheckCircle className="w-3 h-3 text-green-600" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-orange-600" />
                              )}
                            </div>
                            <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                              {objective.skill_description || 'Compétence à définir'}
                            </h4>
                            {objective.smart_objective && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {objective.smart_objective}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            {!isEditing && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleObjectiveExpansion(index);
                                }}
                                className="text-gray-400 hover:text-gray-600 p-1"
                                title={expandedObjectives.has(index) ? "Masquer les détails" : "Voir les détails"}
                              >
                                {expandedObjectives.has(index) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeObjective(index);
                              }}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Supprimer cet objectif"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Panneau central: Formulaire d'édition */}
          <div className="flex-1 p-6 overflow-y-auto">
            {currentEditingIndex !== null && objectives[currentEditingIndex] ? (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Edit className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900">
                        Édition de l'objectif {currentEditingIndex + 1}
                      </h3>
                      <p className="text-sm text-blue-700">
                        Modifiez les détails de votre objectif de développement
                      </p>
                    </div>
                  </div>
                </div>

                {/* Compétence à développer (pour les objectifs personnalisés) */}
                {objectives[currentEditingIndex].is_custom && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Compétence à développer *
                    </label>
                    <input
                      type="text"
                      value={objectives[currentEditingIndex].skill_description}
                      onChange={(e) => updateObjective(currentEditingIndex, 'skill_description', e.target.value)}
                      placeholder="Ex: Leadership, Communication, Gestion de projet..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                )}

                {/* Compétence sélectionnée (pour les objectifs Career Pathway) */}
                {!objectives[currentEditingIndex].is_custom && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-medium text-gray-900 mb-2">Compétence du Career Pathway</h3>
                    <p className="text-gray-700">{objectives[currentEditingIndex].skill_description}</p>
                    <div className="mt-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {objectives[currentEditingIndex].theme_name}
                      </span>
                    </div>
                  </div>
                )}

                {/* Champs d'objectif selon le type */}
                {renderObjectiveFields(objectives[currentEditingIndex], currentEditingIndex)}

                {/* Actions pour l'objectif en cours d'édition */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => setCurrentEditingIndex(null)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Fermer l'édition
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-center">
                <Target className="h-16 w-16 text-gray-300 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Sélectionnez un objectif à modifier</h2>
                <p className="text-gray-500 max-w-md mb-6">
                  Cliquez sur un objectif dans la liste de gauche pour le modifier, ou ajoutez de nouveaux objectifs depuis votre Career Pathway ou en mode personnalisé.
                </p>
                
                {objectives.length === 0 && (
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowSkillsPanel(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Target className="w-4 h-4" />
                      Ajouter depuis Career Pathway
                    </button>
                    <button
                      onClick={addCustomObjective}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Créer un objectif personnalisé
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Panneau de droite: Compétences disponibles */}
          {showSkillsPanel && (
            <div className="w-1/3 border-l border-gray-200 p-6 overflow-y-auto bg-gray-50">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Compétences disponibles</h3>
                  <button
                    onClick={() => setShowSkillsPanel(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Informations sur le career pathway */}
                {userProfile?.career_pathway && userProfile?.career_level && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Votre parcours</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      {userProfile.career_pathway.name}
                    </p>
                    <p className="text-xs text-blue-600">
                      Niveau: {userProfile.career_level.name}
                    </p>
                  </div>
                )}

                {Object.entries(skillsByTheme).length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                    <AlertTriangle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Aucune compétence disponible</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Votre parcours de carrière n'est pas configuré
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(skillsByTheme).map(([themeName, skills]) => (
                      <div key={themeName} className="bg-white rounded-lg border border-gray-200 p-3">
                        <h4 className="text-sm font-medium text-gray-800 mb-2 border-b pb-1">
                          {themeName}
                        </h4>
                        <div className="space-y-2">
                          {skills.map((skill) => {
                            const isAlreadyAdded = objectives.some(obj => obj.skill_id === skill.id);
                            
                            return (
                              <div 
                                key={skill.id} 
                                className={`p-2 rounded border text-sm ${
                                  isAlreadyAdded
                                    ? 'border-green-200 bg-green-50 text-green-800'
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                                }`}
                                onClick={() => !isAlreadyAdded && addPathwayObjective(skill)}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900 leading-tight">
                                      {skill.skill_description}
                                    </p>
                                    {skill.examples && (
                                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                        <strong>Ex:</strong> {skill.examples}
                                      </p>
                                    )}
                                  </div>
                                  {isAlreadyAdded && (
                                    <CheckCircle className="w-4 h-4 text-green-600 ml-2 flex-shrink-0" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer avec actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {objectives.length > 0 && (
                <span>
                  {objectives.filter(obj => obj.skill_description.trim() !== '' && obj.smart_objective.trim() !== '').length} / {objectives.length} objectifs complétés
                </span>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {t('common.cancel')}
              </button>
              
              <button
                onClick={handleSaveDraft}
                disabled={submitting || !validateForDraft()}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {submitting ? 'Sauvegarde...' : 'Enregistrer brouillon'}
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={submitting || objectives.length === 0 || !validateObjectives()}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {submitting ? t('common.loading') : 'Finaliser et soumettre'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomObjectiveForm;