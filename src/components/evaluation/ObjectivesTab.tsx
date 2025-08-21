import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { Plus, Edit3, Trash2, Save, Send, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import CustomObjectiveForm from '../objectives/CustomObjectiveForm';

interface ObjectivesTabProps {
  collaborationId: string | undefined;
  projectId: string;
  employeeId: string;
  isCurrentUser: boolean;
}

interface Objective {
  id: string;
  title: string;
  description: string;
  type: 'smart' | 'formation' | 'libre';
  status: 'draft' | 'submitted';
  specificMeasurable?: string;
  achievable?: string;
  relevant?: string;
  timeBound?: string;
  formationType?: string;
  duration?: string;
  provider?: string;
  customFields?: Record<string, any>;
}

interface ObjectivesData {
  id: string;
  collaboration_id: string;
  objectifs: Objective[];
  created_at: string;
  updated_at: string;
}

const ObjectivesTab: React.FC<ObjectivesTabProps> = ({
  collaborationId,
  projectId,
  employeeId,
  isCurrentUser
}) => {
  const { t } = useTranslation();
  const [objectivesData, setObjectivesData] = useState<ObjectivesData | null>(null);
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [showSkillsPanel, setShowSkillsPanel] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadObjectives();
  }, [collaborationId]);

  const loadObjectives = async () => {
    if (!collaborationId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('objectifs_collaborateurs')
        .select('*')
        .eq('collaboration_id', collaborationId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setObjectivesData(data || {
        id: '',
        collaboration_id: collaborationId,
        objectifs: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error loading objectives:', err);
      setError('Erreur lors du chargement des objectifs');
    } finally {
      setLoading(false);
    }
  };

  const saveObjectives = async (asDraft = true) => {
    if (!objectivesData) return;

    try {
      setSaving(true);
      setError(null);

      const updatedObjectives = objectivesData.objectifs.map(obj => ({
        ...obj,
        status: asDraft ? 'draft' : 'submitted'
      }));

      if (objectivesData.id) {
        const { error } = await supabase
          .from('objectifs_collaborateurs')
          .update({
            objectifs: updatedObjectives,
            updated_at: new Date().toISOString()
          })
          .eq('id', objectivesData.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('objectifs_collaborateurs')
          .insert({
            collaboration_id: collaborationId,
            objectifs: updatedObjectives
          })
          .select()
          .single();

        if (error) throw error;
        setObjectivesData(data);
      }

      await loadObjectives();
    } catch (err) {
      console.error('Error saving objectives:', err);
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const addObjective = (objective: Omit<Objective, 'id' | 'status'>) => {
    if (!objectivesData) return;

    const newObjective: Objective = {
      ...objective,
      id: crypto.randomUUID(),
      status: 'draft'
    };

    setObjectivesData({
      ...objectivesData,
      objectifs: [...objectivesData.objectifs, newObjective]
    });

    setSelectedObjective(newObjective);
    setShowCustomForm(false);
  };

  const updateObjective = (updatedObjective: Objective) => {
    if (!objectivesData) return;

    setObjectivesData({
      ...objectivesData,
      objectifs: objectivesData.objectifs.map(obj =>
        obj.id === updatedObjective.id ? updatedObjective : obj
      )
    });
  };

  const deleteObjective = (objectiveId: string) => {
    if (!objectivesData) return;

    setObjectivesData({
      ...objectivesData,
      objectifs: objectivesData.objectifs.filter(obj => obj.id !== objectiveId)
    });

    if (selectedObjective?.id === objectiveId) {
      setSelectedObjective(null);
    }
  };

  const getObjectiveCompletionStatus = (objective: Objective) => {
    const requiredFields = ['title', 'description'];
    
    if (objective.type === 'smart') {
      requiredFields.push('specificMeasurable', 'achievable', 'relevant', 'timeBound');
    } else if (objective.type === 'formation') {
      requiredFields.push('formationType', 'duration');
    }

    const isComplete = requiredFields.every(field => {
      const value = objective[field as keyof Objective];
      return value && value.toString().trim().length > 0;
    });

    return isComplete;
  };

  const getOverallStatus = () => {
    if (!objectivesData?.objectifs.length) return 'empty';
    
    const statuses = objectivesData.objectifs.map(obj => obj.status);
    const hasSubmitted = statuses.includes('submitted');
    const hasDraft = statuses.includes('draft');
    
    if (hasSubmitted && hasDraft) return 'mixed';
    if (hasSubmitted) return 'submitted';
    return 'draft';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'text-green-600 bg-green-50';
      case 'draft': return 'text-yellow-600 bg-yellow-50';
      case 'mixed': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted': return 'Objectifs soumis';
      case 'draft': return 'Brouillon';
      case 'mixed': return 'Statut mixte';
      case 'empty': return 'Aucun objectif';
      default: return 'Inconnu';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const overallStatus = getOverallStatus();
  const completedObjectives = objectivesData?.objectifs.filter(getObjectiveCompletionStatus).length || 0;
  const totalObjectives = objectivesData?.objectifs.length || 0;

  return (
    <div className="space-y-6">
      {/* Header avec statut et actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Objectifs du projet
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Définissez et gérez les objectifs spécifiques à ce projet
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(overallStatus)}`}>
              {getStatusText(overallStatus)}
            </span>
            {totalObjectives > 0 && (
              <span className="text-sm text-gray-500">
                {completedObjectives}/{totalObjectives} complets
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        {isCurrentUser && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCustomForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un objectif
            </button>
            
            <button
              onClick={() => saveObjectives(true)}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Sauvegarde...' : 'Enregistrer brouillon'}
            </button>

            <button
              onClick={() => saveObjectives(false)}
              disabled={saving || totalObjectives === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              <Send className="h-4 w-4 mr-2" />
              Finaliser et soumettre
            </button>

            <button
              onClick={() => setShowSkillsPanel(!showSkillsPanel)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              {showSkillsPanel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Interface principale */}
      <div className="grid grid-cols-12 gap-6">
        {/* Liste des objectifs */}
        <div className="col-span-4">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h4 className="font-medium text-gray-900">Objectifs ({totalObjectives})</h4>
            </div>
            <div className="divide-y divide-gray-200">
              {objectivesData?.objectifs.map((objective) => {
                const isComplete = getObjectiveCompletionStatus(objective);
                const isSelected = selectedObjective?.id === objective.id;
                
                return (
                  <div
                    key={objective.id}
                    onClick={() => setSelectedObjective(objective)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-indigo-50 border-r-2 border-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          {isComplete ? (
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            objective.status === 'submitted' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {objective.status === 'submitted' ? 'Soumis' : 'Brouillon'}
                          </span>
                        </div>
                        <h5 className="text-sm font-medium text-gray-900 truncate">
                          {objective.title || 'Objectif sans titre'}
                        </h5>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {objective.description || 'Aucune description'}
                        </p>
                        <span className="text-xs text-gray-400 mt-1 block">
                          {objective.type === 'smart' && 'SMART'}
                          {objective.type === 'formation' && 'Formation'}
                          {objective.type === 'libre' && 'Libre'}
                        </span>
                      </div>
                      {isCurrentUser && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Êtes-vous sûr de vouloir supprimer cet objectif ?')) {
                              deleteObjective(objective.id);
                            }
                          }}
                          className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {totalObjectives === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Aucun objectif défini</p>
                  {isCurrentUser && (
                    <button
                      onClick={() => setShowCustomForm(true)}
                      className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                    >
                      Créer le premier objectif
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Formulaire d'édition */}
        <div className={`${showSkillsPanel ? 'col-span-5' : 'col-span-8'}`}>
          {selectedObjective ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Édition de l'objectif</h4>
                <div className="flex items-center space-x-2">
                  {getObjectiveCompletionStatus(selectedObjective) ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    selectedObjective.status === 'submitted' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedObjective.status === 'submitted' ? 'Soumis' : 'Brouillon'}
                  </span>
                </div>
              </div>

              <CustomObjectiveForm
                objective={selectedObjective}
                onSave={(updated) => {
                  updateObjective(updated);
                  setSelectedObjective(updated);
                }}
                onCancel={() => setSelectedObjective(null)}
                readOnly={!isCurrentUser || selectedObjective.status === 'submitted'}
              />
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <div className="text-center text-gray-500">
                <Edit3 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Sélectionnez un objectif pour l'éditer</p>
                <p className="text-xs text-gray-400 mt-1">
                  Ou créez un nouvel objectif avec le bouton "Ajouter"
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Panneau des compétences (optionnel) */}
        {showSkillsPanel && (
          <div className="col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="font-medium text-gray-900 mb-3">Compétences suggérées</h4>
              <p className="text-xs text-gray-500 mb-4">
                Basées sur votre parcours de carrière
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-700">Leadership</p>
                  <p className="text-xs text-gray-500">Développer ses compétences de leadership</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-700">Communication</p>
                  <p className="text-xs text-gray-500">Améliorer la communication d'équipe</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-700">Gestion de projet</p>
                  <p className="text-xs text-gray-500">Maîtriser les outils de gestion</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de création d'objectif personnalisé */}
      {showCustomForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Créer un nouvel objectif
            </h3>
            <CustomObjectiveForm
              onSave={addObjective}
              onCancel={() => setShowCustomForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ObjectivesTab;