import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Target, 
  BookOpen, 
  Plus, 
  Trash2, 
  Save, 
  X,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import GeminiObjectiveGenerator from '../components/objectives/GeminiObjectiveGenerator';

interface PathwaySkill {
  id: string;
  development_theme_id: string;
  career_level_id: string;
  skill_description: string;
  examples: string | null;
  requirements: string | null;
  theme?: {
    name: string;
    description: string;
  };
  level?: {
    name: string;
    color: string;
  };
}

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

interface UserProfile {
  id: string;
  full_name: string;
  career_pathway_id: string | null;
  career_level_id: string | null;
  career_pathway: {
    name: string;
    color: string;
  } | null;
  career_level: {
    name: string;
    color: string;
  } | null;
}

interface CollaborationInfo {
  id: string;
  projet: {
    id: string;
    titre: string;
    nom_client: string;
  };
}

const ObjectiveDefinition = () => {
  const { collaborationId } = useParams<{ collaborationId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [collaboration, setCollaboration] = useState<CollaborationInfo | null>(null);
  const [availableSkills, setAvailableSkills] = useState<PathwaySkill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<PathwaySkill | null>(null);
  const [objectives, setObjectives] = useState<ObjectiveDetail[]>([]);
  const [existingObjectives, setExistingObjectives] = useState<ObjectiveDetail[] | null>(null);
  
  // État pour l'objectif en cours d'édition
  const [currentObjective, setCurrentObjective] = useState<ObjectiveDetail | null>(null);
  const [objectiveTypeSelection, setObjectiveTypeSelection] = useState<string>('smart');
  
  // Grouper les compétences par thème
  const [skillsByTheme, setSkillsByTheme] = useState<Record<string, PathwaySkill[]>>({});
  
  useEffect(() => {
    if (collaborationId) {
      fetchUserProfile();
      fetchCollaborationInfo();
      fetchExistingObjectives();
    }
  }, [collaborationId]);
  
  useEffect(() => {
    if (userProfile?.career_pathway_id && userProfile?.career_level_id) {
      fetchAvailableSkills();
    }
  }, [userProfile]);
  
  useEffect(() => {
    // Grouper les compétences par thème
    const groupedSkills: Record<string, PathwaySkill[]> = {};
    
    availableSkills.forEach(skill => {
      const themeName = skill.theme?.name || 'Autres';
      if (!groupedSkills[themeName]) {
        groupedSkills[themeName] = [];
      }
      groupedSkills[themeName].push(skill);
    });
    
    setSkillsByTheme(groupedSkills);
  }, [availableSkills]);
  
  const fetchUserProfile = async () => {
    try {
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
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement du profil');
    }
  };
  
  const fetchCollaborationInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('projet_collaborateurs')
        .select(`
          id,
          projet:projets!inner(
            id,
            nom_client,
            titre
          )
        `)
        .eq('id', collaborationId)
        .single();
      
      if (error) throw error;
      setCollaboration(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des informations du projet');
    }
  };
  
  const fetchExistingObjectives = async () => {
    try {
      const { data, error } = await supabase
        .from('objectifs_collaborateurs')
        .select('*')
        .eq('collaboration_id', collaborationId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setExistingObjectives(data.objectifs);
        setObjectives(data.objectifs);
      }
      
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des objectifs existants');
      setLoading(false);
    }
  };
  
  const fetchAvailableSkills = async () => {
    try {
      if (!userProfile?.career_pathway_id || !userProfile?.career_level_id) return;
      
      // Récupérer les thèmes de développement pour le career pathway
      const { data: themeData, error: themeError } = await supabase
        .from('development_themes')
        .select('id')
        .eq('career_area_id', userProfile.career_pathway_id)
        .eq('is_active', true);
      
      if (themeError) throw themeError;
      
      // Extraire les IDs des thèmes
      const themeIds = (themeData || []).map(theme => theme.id);
      
      if (themeIds.length === 0) {
        setAvailableSkills([]);
        setError('Aucun thème de développement trouvé pour ce parcours de carrière');
        return;
      }
      
      // Récupérer les compétences avec les thèmes et niveaux
      const { data, error } = await supabase
        .from('pathway_skills')
        .select(`
          id,
          development_theme_id,
          career_level_id,
          skill_description,
          examples,
          requirements,
          theme:development_themes!development_theme_id(
            name,
            description
          ),
          level:career_levels!career_level_id(
            name,
            color
          )
        `)
        .eq('career_level_id', userProfile.career_level_id)
        .in('development_theme_id', themeIds);
      
      if (error) throw error;
      
      // Filtrer les compétences qui ont des thèmes valides
      const validSkills = (data || []).filter(skill => skill.theme);
      setAvailableSkills(validSkills);
      
      if (validSkills.length === 0) {
        setError('Aucune compétence trouvée pour ce niveau et ce parcours de carrière');
      }
    } catch (err) {
      console.error('Error fetching skills:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des compétences');
    }
  };
  
  const handleSkillSelect = (skill: PathwaySkill) => {
    setSelectedSkill(skill);
    
    // Vérifier si cette compétence est déjà dans les objectifs
    const existingObjective = objectives.find(obj => obj.skill_id === skill.id);
    
    if (existingObjective) {
      setCurrentObjective(existingObjective);
    } else {
      // Créer un nouvel objectif basé sur cette compétence
      setCurrentObjective({
        skill_id: skill.id,
        skill_description: skill.skill_description,
        theme_name: skill.theme?.name || 'Thème non défini',
        smart_objective: '',
        specific: '',
        measurable: '',
        achievable: '',
        relevant: '',
        time_bound: '',
        is_custom: false
      });
    }
  };
  
  const handleAddCustomObjective = () => {
    const newCustomObjective: ObjectiveDetail = {
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
    };
    
    setSelectedSkill(null);
    setCurrentObjective(newCustomObjective);
  };
  
  const handleObjectiveChange = (field: keyof ObjectiveDetail, value: string) => {
    if (!currentObjective) return;
    
    setCurrentObjective({
      ...currentObjective,
      [field]: value
    });
  };
  
  const handleSaveCurrentObjective = () => {
    if (!currentObjective) return;
    
    // Valider que tous les champs obligatoires sont remplis
    if (currentObjective.is_custom && !currentObjective.skill_description) {
      setError('Veuillez définir la compétence à développer');
      return;
    }
    
    // Validation selon le type d'objectif
    if (!currentObjective.is_custom || (currentObjective.is_custom && currentObjective.objective_type === 'smart')) {
      if (!currentObjective.smart_objective || 
          !currentObjective.specific || 
          !currentObjective.measurable || 
          !currentObjective.achievable || 
          !currentObjective.relevant || 
          !currentObjective.time_bound) {
        setError('Veuillez remplir tous les champs SMART');
        return;
      }
    } else if (currentObjective.is_custom && 
              (currentObjective.objective_type === 'formation' || currentObjective.objective_type === 'custom')) {
      if (!currentObjective.smart_objective) {
        setError('Veuillez définir l\'objectif');
        return;
      }
    }
    
    // Vérifier si cet objectif existe déjà
    const existingIndex = objectives.findIndex(obj => obj.skill_id === currentObjective.skill_id);
    
    if (existingIndex >= 0) {
      // Mettre à jour l'objectif existant
      const updatedObjectives = [...objectives];
      updatedObjectives[existingIndex] = currentObjective;
      setObjectives(updatedObjectives);
    } else {
      // Ajouter le nouvel objectif
      setObjectives([...objectives, currentObjective]);
    }
    
    // Réinitialiser l'objectif courant
    setCurrentObjective(null);
    setSelectedSkill(null);
    setSuccess('Objectif ajouté avec succès');
    
    // Effacer le message de succès après 3 secondes
    setTimeout(() => setSuccess(null), 3000);
  };
  
  const handleRemoveObjective = (skillId: string) => {
    setObjectives(objectives.filter(obj => obj.skill_id !== skillId));
  };
  
  const handleEditObjective = (objective: ObjectiveDetail) => {
    setCurrentObjective(objective);
    
    // Si c'est un objectif basé sur une compétence existante, sélectionner cette compétence
    if (!objective.is_custom) {
      const skill = availableSkills.find(s => s.id === objective.skill_id);
      if (skill) {
        setSelectedSkill(skill);
      }
    } else {
      setSelectedSkill(null);
      // Si c'est un objectif personnalisé, définir le type d'objectif
      if (objective.objective_type) {
        setObjectiveTypeSelection(objective.objective_type);
      }
    }
  };
  
  const handleCancelEdit = () => {
    setCurrentObjective(null);
    setSelectedSkill(null);
  };
  
  const handleSubmitObjectives = async () => {
    if (objectives.length === 0) {
      setError('Veuillez définir au moins un objectif');
      return;
    }
    
    setSubmitting(true);
    
    try {
      if (existingObjectives) {
        // Mettre à jour les objectifs existants
        const { error } = await supabase
          .from('objectifs_collaborateurs')
          .update({
            objectifs: objectives
          })
          .eq('collaboration_id', collaborationId);
        
        if (error) throw error;
      } else {
        // Créer de nouveaux objectifs
        const { error } = await supabase
          .from('objectifs_collaborateurs')
          .insert([{
            collaboration_id: collaborationId,
            objectifs: objectives
          }]);
        
        if (error) throw error;
      }
      
      setSuccess('Objectifs sauvegardés avec succès');
      
      // Rediriger vers la page de détail de la fiche projet
      setTimeout(() => {
        navigate(`/fiche-projet/${collaborationId}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde des objectifs');
    } finally {
      setSubmitting(false);
    }
  };
  
  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      'green': 'bg-green-100 text-green-800',
      'blue': 'bg-blue-100 text-blue-800',
      'purple': 'bg-purple-100 text-purple-800',
      'orange': 'bg-orange-100 text-orange-800',
      'red': 'bg-red-100 text-red-800',
      'indigo': 'bg-indigo-100 text-indigo-800',
      'gray': 'bg-gray-100 text-gray-800'
    };
    return colorMap[color] || 'bg-gray-100 text-gray-800';
  };
  
  // Fonction pour rendre les champs SMART en fonction du type d'objectif
  const renderObjectiveFields = () => {
    if (!currentObjective) return null;
    
    // Si ce n'est pas un objectif personnalisé ou si c'est un objectif SMART
    if (!currentObjective.is_custom || (currentObjective.is_custom && currentObjective.objective_type === 'smart')) {
      return (
        <>
          {/* Objectif SMART */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objectif SMART *
            </label>
            <textarea
              rows={3}
              value={currentObjective.smart_objective}
              onChange={(e) => handleObjectiveChange('smart_objective', e.target.value)}
              placeholder="Décrivez votre objectif de développement de manière Spécifique, Mesurable, Atteignable, Pertinent et Temporellement défini"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          {/* Critères SMART */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                Un objectif SMART est Spécifique, Mesurable, Atteignable, Pertinent et Temporellement défini. Remplissez chaque critère ci-dessous pour créer un objectif efficace.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Spécifique (S) *
              </label>
              <textarea
                rows={2}
                value={currentObjective.specific}
                onChange={(e) => handleObjectiveChange('specific', e.target.value)}
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
                value={currentObjective.measurable}
                onChange={(e) => handleObjectiveChange('measurable', e.target.value)}
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
                value={currentObjective.achievable}
                onChange={(e) => handleObjectiveChange('achievable', e.target.value)}
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
                value={currentObjective.relevant}
                onChange={(e) => handleObjectiveChange('relevant', e.target.value)}
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
              value={currentObjective.time_bound}
              onChange={(e) => handleObjectiveChange('time_bound', e.target.value)}
              placeholder="Quelle est l'échéance pour atteindre cet objectif ?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </>
      );
    } 
    // Si c'est un objectif de formation
    else if (currentObjective.is_custom && currentObjective.objective_type === 'formation') {
      return (
        <div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-orange-700">
                Décrivez la formation que vous souhaitez suivre, ses objectifs et comment elle contribuera à votre développement professionnel.
              </p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objectif de formation *
            </label>
            <textarea
              rows={4}
              value={currentObjective.smart_objective}
              onChange={(e) => handleObjectiveChange('smart_objective', e.target.value)}
              placeholder="Décrivez la formation que vous souhaitez suivre, ses objectifs et comment elle contribuera à votre développement professionnel."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      );
    }
    // Si c'est un objectif personnalisable simple
    else if (currentObjective.is_custom && currentObjective.objective_type === 'custom') {
      return (
        <div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
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
              value={currentObjective.smart_objective}
              onChange={(e) => handleObjectiveChange('smart_objective', e.target.value)}
              placeholder="Décrivez librement votre objectif personnel ou professionnel."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header avec bouton retour */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/fiche-projet/${collaborationId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour à la fiche projet</span>
        </button>
        
        <button
          onClick={handleSubmitObjectives}
          disabled={submitting || objectives.length === 0}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {submitting ? 'Sauvegarde...' : 'Sauvegarder tous les objectifs'}
        </button>
      </div>
      
      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Erreur</p>
            <p>{error}</p>
          </div>
          <button 
            onClick={() => setError(null)} 
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Succès</p>
            <p>{success}</p>
          </div>
          <button 
            onClick={() => setSuccess(null)} 
            className="ml-auto text-green-500 hover:text-green-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      
      {/* Titre et informations du projet */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Définir mes objectifs de développement</h1>
        {collaboration && (
          <div className="text-gray-600">
            <p>Projet: <span className="font-medium">{collaboration.projet.titre}</span></p>
            <p>Client: <span className="font-medium">{collaboration.projet.nom_client}</span></p>
          </div>
        )}
        
        {/* Informations sur le career pathway */}
        {userProfile?.career_pathway && userProfile?.career_level && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">Votre parcours de carrière</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getColorClasses(userProfile.career_pathway.color)}`}>
                    {userProfile.career_pathway.name}
                  </span>
                  <span className="text-sm text-blue-700">•</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getColorClasses(userProfile.career_level.color)}`}>
                    {userProfile.career_level.name}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Layout principal en deux colonnes */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Colonne de gauche: Liste des objectifs */}
        <div className="w-full lg:w-1/3 space-y-4">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Mes objectifs ({objectives.length})</h2>
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
                  onClick={handleAddCustomObjective}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg flex items-center gap-1 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Personnalisé
                </button>
              </div>
            </div>
            
            {objectives.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600">Aucun objectif défini</p>
                <p className="text-sm text-gray-500 mt-2">
                  Sélectionnez des compétences dans la liste ou créez des objectifs personnalisés
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {objectives.map((objective) => (
                  <div 
                    key={objective.skill_id} 
                    className={`p-4 rounded-lg border ${
                      currentObjective?.skill_id === objective.skill_id 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : objective.is_custom 
                          ? 'border-purple-200 hover:border-purple-300' 
                          : 'border-gray-200 hover:border-gray-300'
                    } cursor-pointer`}
                    onClick={() => handleEditObjective(objective)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-1 rounded ${
                            objective.is_custom ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {objective.theme_name}
                          </span>
                          {objective.is_custom && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              Personnalisé
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
                               'Libre'}
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900 line-clamp-2">{objective.skill_description}</h4>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveObjective(objective.skill_id);
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {objective.smart_objective && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {objective.smart_objective}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Liste des compétences disponibles */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Compétences disponibles</h2>
            
            {Object.entries(skillsByTheme).length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600">Aucune compétence disponible</p>
                <p className="text-sm text-gray-500 mt-2">
                  Votre parcours de carrière ou niveau n'est pas configuré correctement
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(skillsByTheme).map(([themeName, skills]) => (
                  <div key={themeName}>
                    <h3 className="text-md font-medium text-gray-800 mb-2 border-b pb-1">{themeName}</h3>
                    <div className="space-y-2">
                      {skills.map((skill) => {
                        const isSelected = selectedSkill?.id === skill.id;
                        const isAlreadyAdded = objectives.some(obj => obj.skill_id === skill.id);
                        
                        return (
                          <div 
                            key={skill.id} 
                            className={`p-3 rounded-lg border ${
                              isSelected 
                                ? 'border-indigo-500 bg-indigo-50' 
                                : isAlreadyAdded
                                  ? 'border-green-200 bg-green-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            } cursor-pointer`}
                            onClick={() => handleSkillSelect(skill)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">{skill.skill_description}</p>
                                {skill.level && (
                                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getColorClasses(skill.level.color)}`}>
                                    {skill.level.name}
                                  </span>
                                )}
                              </div>
                              {isAlreadyAdded && !isSelected && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
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
        
        {/* Colonne de droite: Formulaire d'objectif SMART */}
        <div className="w-full lg:w-2/3">
          {currentObjective ? (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {currentObjective.is_custom ? 'Objectif personnalisé' : 'Objectif basé sur une compétence'}
                  </h2>
                  {!currentObjective.is_custom && selectedSkill && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-600">
                        {selectedSkill.theme?.name}
                      </span>
                      {selectedSkill.level && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getColorClasses(selectedSkill.level.color)}`}>
                            {selectedSkill.level.name}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Compétence à développer (seulement pour les objectifs personnalisés) */}
                {currentObjective.is_custom && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Compétence à développer *
                    </label>
                    <input
                      type="text"
                      value={currentObjective.skill_description}
                      onChange={(e) => handleObjectiveChange('skill_description', e.target.value)}
                      placeholder="Ex: Leadership, Communication, Gestion de projet..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                )}
                
                {/* Compétence sélectionnée (pour les objectifs basés sur le career pathway) */}
                {!currentObjective.is_custom && selectedSkill && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-medium text-gray-900 mb-2">Compétence sélectionnée</h3>
                    <p className="text-gray-700">{selectedSkill.skill_description}</p>
                    
                    {selectedSkill.examples && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-700">Exemples:</h4>
                        <p className="text-sm text-gray-600 mt-1">{selectedSkill.examples}</p>
                      </div>
                    )}
                    
                    {selectedSkill.requirements && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-700">Prérequis:</h4>
                        <p className="text-sm text-gray-600 mt-1">{selectedSkill.requirements}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Champs d'objectif selon le type */}
                {renderObjectiveFields()}
                
                {/* Gemini AI Generator */}
                {(!currentObjective?.is_custom || (currentObjective?.is_custom && currentObjective?.objective_type === 'smart')) && (
                  <GeminiObjectiveGenerator
                    userProfile={userProfile}
                    careerPathway={userProfile?.career_pathway}
                    careerLevel={userProfile?.career_level}
                    skillDescription={currentObjective?.skill_description || ''}
                    themeName={currentObjective?.theme_name || ''}
                    onGeneratedObjective={(generatedObjective) => {
                      if (!currentObjective) return;
                      
                      handleObjectiveChange('smart_objective', generatedObjective.smart_objective);
                      handleObjectiveChange('specific', generatedObjective.specific);
                      handleObjectiveChange('measurable', generatedObjective.measurable);
                      handleObjectiveChange('achievable', generatedObjective.achievable);
                      handleObjectiveChange('relevant', generatedObjective.relevant);
                      handleObjectiveChange('time_bound', generatedObjective.time_bound);
                    }}
                  />
                )}
                
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveCurrentObjective}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Ajouter cet objectif
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-6 h-full flex flex-col justify-center items-center">
              <Target className="h-16 w-16 text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Définissez vos objectifs</h2>
              <p className="text-gray-500 text-center max-w-md mb-6">
                Sélectionnez une compétence dans la liste à gauche ou créez un objectif personnalisé pour commencer à définir vos objectifs de développement.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAddCustomObjective}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Créer un objectif personnalisé
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ObjectiveDefinition;