import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import GeminiObjectiveGenerator from './GeminiObjectiveGenerator';

interface CreateObjectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (objectives: any[]) => void;
  selectedEmployee?: any;
  user?: any;
  year: number;
}

const CreateObjectiveModal: React.FC<CreateObjectiveModalProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedEmployee,
  user,
  year
}) => {
  const { t } = useTranslation();
  const [objectives, setObjectives] = useState<any[]>([]);
  const [careerPathways, setCareerPathways] = useState<any[]>([]);
  const [careerLevels, setCareerLevels] = useState<any[]>([]);
  const [pathwaySkills, setPathwaySkills] = useState<any[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCareerData();
    }
  }, [isOpen]);

  const fetchCareerData = async () => {
    try {
      const [pathwaysRes, levelsRes, skillsRes] = await Promise.all([
        supabase.from('career_areas').select('*').eq('is_active', true),
        supabase.from('career_levels').select('*').eq('is_active', true),
        supabase.from('pathway_skills').select('*, development_themes(*), career_levels(*)').order('sort_order')
      ]);

      if (pathwaysRes.data) setCareerPathways(pathwaysRes.data);
      if (levelsRes.data) setCareerLevels(levelsRes.data);
      if (skillsRes.data) setPathwaySkills(skillsRes.data);
    } catch (error) {
      console.error('Error fetching career data:', error);
    }
  };

  const handleSkillSelection = (skillId: string) => {
    setSelectedSkills(prev => {
      if (prev.includes(skillId)) {
        return prev.filter(id => id !== skillId);
      } else if (prev.length < 4) {
        return [...prev, skillId];
      }
      return prev;
    });
  };

  const createObjectivesFromSkills = () => {
    const newObjectives = selectedSkills.map(skillId => {
      const skill = pathwaySkills.find(s => s.id === skillId);
      return {
        id: Date.now() + Math.random(),
        title: `Développer: ${skill?.skill_description || ''}`,
        description: skill?.examples || '',
        specific: '',
        measurable: '',
        achievable: '',
        relevant: skill?.requirements || '',
        timeBound: '',
        weight: 25,
        skillId: skillId
      };
    });
    setObjectives(newObjectives);
  };

  const handleObjectiveChange = (index: number, field: string, value: string | number) => {
    setObjectives(prev => prev.map((obj, i) => 
      i === index ? { ...obj, [field]: value } : obj
    ));
  };

  const addCustomObjective = () => {
    const newObjective = {
      id: Date.now() + Math.random(),
      title: '',
      description: '',
      specific: '',
      measurable: '',
      achievable: '',
      relevant: '',
      timeBound: '',
      weight: 25,
      skillId: null
    };
    setObjectives(prev => [...prev, newObjective]);
  };

  const removeObjective = (index: number) => {
    setObjectives(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (objectives.length === 0) {
      alert(t('objectives.pleaseAddObjectives'));
      return;
    }

    const totalWeight = objectives.reduce((sum, obj) => sum + (obj.weight || 0), 0);
    if (totalWeight !== 100) {
      alert(t('objectives.totalWeightMustBe100'));
      return;
    }

    setLoading(true);
    try {
      await onSave(objectives);
      onClose();
    } catch (error) {
      console.error('Error saving objectives:', error);
      alert(t('objectives.errorSaving'));
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratedObjective = (generatedObjective: any, index: number) => {
    handleObjectiveChange(index, 'specific', generatedObjective.specific);
    handleObjectiveChange(index, 'measurable', generatedObjective.measurable);
    handleObjectiveChange(index, 'achievable', generatedObjective.achievable);
    handleObjectiveChange(index, 'relevant', generatedObjective.relevant);
    handleObjectiveChange(index, 'timeBound', generatedObjective.timeBound);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('objectives.createAnnualObjectives')} {year}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Skill Selection */}
          {selectedSkills.length === 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('objectives.selectSkills')} (max 4)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pathwaySkills.map(skill => (
                  <div
                    key={skill.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedSkills.includes(skill.id)
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleSkillSelection(skill.id)}
                  >
                    <h4 className="font-medium text-gray-900">{skill.skill_description}</h4>
                    <p className="text-sm text-gray-600 mt-1">{skill.examples}</p>
                  </div>
                ))}
              </div>
              
              {selectedSkills.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={createObjectivesFromSkills}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                  >
                    {t('objectives.createObjectivesFromSkills')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Objectives Form */}
          {objectives.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {t('objectives.defineObjectives')}
                </h3>
                <button
                  onClick={addCustomObjective}
                  className="flex items-center text-indigo-600 hover:text-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {t('objectives.addCustomObjective')}
                </button>
              </div>

              <div className="space-y-6">
                {objectives.map((objective, index) => (
                  <div key={objective.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">
                        {t('objectives.objective')} {index + 1}
                      </h4>
                      <button
                        onClick={() => removeObjective(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('objectives.title')}
                        </label>
                        <input
                          type="text"
                          value={objective.title}
                          onChange={(e) => handleObjectiveChange(index, 'title', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('objectives.weight')} (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={objective.weight}
                          onChange={(e) => handleObjectiveChange(index, 'weight', parseInt(e.target.value))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('objectives.description')}
                        </label>
                        <textarea
                          value={objective.description}
                          onChange={(e) => handleObjectiveChange(index, 'description', e.target.value)}
                          rows={2}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('objectives.specific')}
                        </label>
                        <textarea
                          value={objective.specific}
                          onChange={(e) => handleObjectiveChange(index, 'specific', e.target.value)}
                          rows={2}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('objectives.measurable')}
                        </label>
                        <textarea
                          value={objective.measurable}
                          onChange={(e) => handleObjectiveChange(index, 'measurable', e.target.value)}
                          rows={2}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('objectives.achievable')}
                        </label>
                        <textarea
                          value={objective.achievable}
                          onChange={(e) => handleObjectiveChange(index, 'achievable', e.target.value)}
                          rows={2}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('objectives.relevant')}
                        </label>
                        <textarea
                          value={objective.relevant}
                          onChange={(e) => handleObjectiveChange(index, 'relevant', e.target.value)}
                          rows={2}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('objectives.timeBound')}
                        </label>
                        <textarea
                          value={objective.timeBound}
                          onChange={(e) => handleObjectiveChange(index, 'timeBound', e.target.value)}
                          rows={2}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                    </div>

                    {/* Gemini AI Generator */}
                    <div className="mt-4">
                      <GeminiObjectiveGenerator
                        userProfile={selectedEmployee || user}
                        careerPathway={selectedEmployee?.career_pathway}
                        careerLevel={selectedEmployee?.career_level}
                        skill={objective.skillId ? pathwaySkills.find(s => s.id === objective.skillId) : null}
                        onGenerated={(generated) => handleGeneratedObjective(generated, index)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={loading || objectives.length === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateObjectiveModal;