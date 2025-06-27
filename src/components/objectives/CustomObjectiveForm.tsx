import React, { useState, useEffect } from 'react';
import { Plus, Save, Target, Trash2, BookOpen, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
  const [objectives, setObjectives] = useState<ObjectiveDetail[]>(existingObjectives || []);
  const [availableSkills, setAvailableSkills] = useState<PathwaySkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

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
      if (!user) throw new Error('Non connecté');

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
      onError('Erreur lors du chargement du profil utilisateur');
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
        .eq('career_level_id', userProfile.career_level_id)
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

  const addPathwayObjective = (skill: PathwaySkill) => {
    // Vérifier si cette compétence est déjà dans les objectifs
    const exists = objectives.some(obj => obj.skill_id === skill.id);
    if (exists) {
      onError('Cette compétence est déjà dans vos objectifs');
      return;
    }

    const newObjective: ObjectiveDetail = {
      skill_id: skill.id,
      skill_description: skill.skill_description,
      theme_name: skill.development_theme?.name || 'Thème non défini',
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
      theme_name: 'Objectif personnalisé',
      smart_objective: '',
      specific: '',
      measurable: '',
      achievable: '',
      relevant: '',
      time_bound: '',
      is_custom: true
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
    return objectives.every(obj => 
      obj.skill_description.trim() !== '' &&
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
      onError('Veuillez remplir tous les champs pour chaque objectif');
      return;
    }

    if (objectives.length === 0) {
      onError('Veuillez ajouter au moins un objectif');
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
      onError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde des objectifs');
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {existingObjectives ? 'Modifier mes objectifs' : 'Définir mes objectifs'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Définissez vos objectifs SMART pour ce projet
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
                      <h3 className="text-sm font-medium text-blue-800">Votre parcours de carrière</h3>
                      <p className="text-sm text-blue-700">
                        {userProfile.career_pathway.name} - Niveau: {userProfile.career_level.name}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-blue-700">
                    Vous pouvez sélectionner des compétences de votre parcours de carrière ou créer des objectifs personnalisés.
                  </p>
                </div>
              )}

              {/* Objectifs actuels */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Vos objectifs ({objectives.length})
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={addCustomObjective}
                      className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter un objectif personnalisé
                    </button>
                  </div>
                </div>

                {objectives.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600">Aucun objectif défini</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Ajoutez des objectifs depuis votre parcours de carrière ou créez des objectifs personnalisés
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
                                  Personnalisé
                                </span>
                              )}
                            </div>
                            
                            {objective.is_custom ? (
                              <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Compétence à développer *
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

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Objectif SMART *
                            </label>
                            <textarea
                              rows={3}
                              value={objective.smart_objective}
                              onChange={(e) => updateObjective(index, 'smart_objective', e.target.value)}
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
                                onChange={(e) => updateObjective(index, 'specific', e.target.value)}
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
                                onChange={(e) => updateObjective(index, 'measurable', e.target.value)}
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
                                onChange={(e) => updateObjective(index, 'achievable', e.target.value)}
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
                                onChange={(e) => updateObjective(index, 'relevant', e.target.value)}
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
                              onChange={(e) => updateObjective(index, 'time_bound', e.target.value)}
                              placeholder="Quelle est l'échéance pour atteindre cet objectif ?"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Compétences disponibles du career pathway */}
              {userProfile?.career_pathway && availableSkills.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Compétences disponibles de votre parcours de carrière
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
                                  <strong>Exemples:</strong> {skill.examples}
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
                              {isAlreadySelected ? 'Ajouté' : 'Ajouter'}
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
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || objectives.length === 0 || !validateObjectives()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {submitting ? 'Sauvegarde...' : 'Sauvegarder les objectifs'}
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