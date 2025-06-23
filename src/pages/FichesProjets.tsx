import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, User, Target, AlertCircle, CheckCircle, Clock, Archive, Edit, Eye, FileText, Star, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface FicheProjet {
  id: string;
  titre: string;
  description: string;
  statut: 'brouillon' | 'en_attente' | 'validee' | 'finalisee' | 'archivee' | 'retour_demande';
  date_debut: string | null;
  date_fin_prevue: string | null;
  taux_avancement: number;
  budget_estime: number | null;
  created_at: string;
  auteur: {
    full_name: string;
    role: string;
  };
  referent: {
    full_name: string;
  } | null;
}

interface ProjetCollaborateur {
  id: string;
  projet_id: string;
  role_projet: string;
  taux_allocation: number;
  responsabilites: string | null;
  date_debut: string | null;
  date_fin: string | null;
  is_active: boolean;
  projet: {
    id: string;
    titre: string;
    nom_client: string;
    description: string;
    statut: string;
    date_debut: string;
    date_fin_prevue: string | null;
    referent_nom: string;
  };
  fiche_collaborateur: {
    id: string;
    contenu: string;
    statut: string;
    created_at: string;
    updated_at: string;
  } | null;
  objectifs_collaborateur: {
    id: string;
    objectifs: any[];
    created_at: string;
    updated_at: string;
  } | null;
  evaluation_objectifs: {
    id: string;
    auto_evaluation: any;
    evaluation_referent: any;
    evaluation_coach: any;
    statut: string;
    date_soumission: string | null;
    created_at: string;
    updated_at: string;
  } | null;
}

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
}

const FichesProjets = () => {
  const [fiches, setFiches] = useState<FicheProjet[]>([]);
  const [projetsCollaborateur, setProjetsCollaborateur] = useState<ProjetCollaborateur[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCollaborateurForm, setShowCollaborateurForm] = useState(false);
  const [showObjectifsForm, setShowObjectifsForm] = useState(false);
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [selectedProjet, setSelectedProjet] = useState<ProjetCollaborateur | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'mes_fiches' | 'mes_projets'>('mes_fiches');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // Form state pour nouvelle fiche
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    referent_id: '',
    objectifs: [''],
    date_debut: '',
    date_fin_prevue: '',
    budget_estime: '',
    ressources: {
      humaines: [''],
      materielles: [''],
      financieres: ''
    },
    risques: [''],
    indicateurs: ['']
  });

  // Form state pour fiche collaborateur
  const [ficheCollaborateurData, setFicheCollaborateurData] = useState({
    contenu: '',
    objectifs_personnels: [''],
    taches_realisees: [''],
    difficultes_rencontrees: [''],
    suggestions_amelioration: [''],
    competences_developpees: [''],
    temps_passe: '',
    satisfaction: 5
  });

  // Form state pour objectifs collaborateur
  const [objectifsData, setObjectifsData] = useState({
    objectifs: [{ titre: '', description: '', indicateurs: '', echeance: '' }]
  });

  // Form state pour évaluation
  const [evaluationData, setEvaluationData] = useState({
    auto_evaluation: {} as Record<string, { statut: string; commentaire: string; preuves: string }>,
    commentaires_generaux: ''
  });

  const statusLabels = {
    brouillon: 'Brouillon',
    en_attente: 'En attente',
    validee: 'Validée',
    finalisee: 'Finalisée',
    archivee: 'Archivée',
    retour_demande: 'Retour demandé'
  };

  const statusColors = {
    brouillon: 'bg-gray-100 text-gray-800',
    en_attente: 'bg-yellow-100 text-yellow-800',
    validee: 'bg-green-100 text-green-800',
    finalisee: 'bg-blue-100 text-blue-800',
    archivee: 'bg-purple-100 text-purple-800',
    retour_demande: 'bg-red-100 text-red-800'
  };

  const statusIcons = {
    brouillon: <AlertCircle className="w-4 h-4" />,
    en_attente: <Clock className="w-4 h-4" />,
    validee: <CheckCircle className="w-4 h-4" />,
    finalisee: <Target className="w-4 h-4" />,
    archivee: <Archive className="w-4 h-4" />,
    retour_demande: <AlertCircle className="w-4 h-4" />
  };

  const objectifStatusOptions = [
    { value: 'atteint', label: 'Atteint', color: 'text-green-600' },
    { value: 'partiellement_atteint', label: 'Partiellement atteint', color: 'text-yellow-600' },
    { value: 'non_atteint', label: 'Non atteint', color: 'text-red-600' },
    { value: 'pas_eu_occasion', label: 'Pas eu l\'occasion', color: 'text-gray-600' }
  ];

  useEffect(() => {
    getCurrentUser();
    fetchFiches();
    fetchUsers();
    fetchProjetsCollaborateur();
  }, []);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      setCurrentUserId(user.id);
      setCurrentUserRole(profile?.role || null);
    } catch (err) {
      setError('Erreur lors de la récupération des informations utilisateur');
    }
  };

  const fetchFiches = async () => {
    try {
      const { data, error } = await supabase
        .from('fiches_projets')
        .select(`
          id,
          titre,
          description,
          statut,
          date_debut,
          date_fin_prevue,
          taux_avancement,
          budget_estime,
          created_at,
          auteur:user_profiles!auteur_id(full_name, role),
          referent:user_profiles!referent_id(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiches(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des fiches');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjetsCollaborateur = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer les projets où l'utilisateur est collaborateur
      const { data: collaborations, error: collabError } = await supabase
        .from('projet_collaborateurs')
        .select(`
          id,
          projet_id,
          role_projet,
          taux_allocation,
          responsabilites,
          date_debut,
          date_fin,
          is_active,
          projets!inner(
            id,
            titre,
            nom_client,
            description,
            statut,
            date_debut,
            date_fin_prevue,
            referent_nom:user_profiles!referent_projet_id(full_name)
          )
        `)
        .eq('employe_id', user.id)
        .eq('is_active', true);

      if (collabError) throw collabError;

      // Pour chaque collaboration, vérifier les fiches et objectifs
      const collaborationsWithData = await Promise.all(
        (collaborations || []).map(async (collab) => {
          // Fiche collaborateur
          const { data: ficheCollab } = await supabase
            .from('fiches_collaborateurs')
            .select('id, contenu, statut, created_at, updated_at')
            .eq('collaboration_id', collab.id)
            .maybeSingle();

          // Objectifs collaborateur
          const { data: objectifsCollab } = await supabase
            .from('objectifs_collaborateurs')
            .select('id, objectifs, created_at, updated_at')
            .eq('collaboration_id', collab.id)
            .maybeSingle();

          // Évaluation des objectifs
          let evaluationObjectifs = null;
          if (objectifsCollab) {
            const { data: evalData } = await supabase
              .from('evaluations_objectifs')
              .select('id, auto_evaluation, evaluation_referent, evaluation_coach, statut, date_soumission, created_at, updated_at')
              .eq('objectifs_id', objectifsCollab.id)
              .maybeSingle();
            evaluationObjectifs = evalData;
          }

          return {
            ...collab,
            projet: collab.projets,
            fiche_collaborateur: ficheCollab,
            objectifs_collaborateur: objectifsCollab,
            evaluation_objectifs: evaluationObjectifs
          };
        })
      );

      setProjetsCollaborateur(collaborationsWithData);
    } catch (err) {
      console.error('Erreur lors du chargement des projets collaborateur:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, role')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err);
    }
  };

  const canCreateFiche = () => {
    return currentUserRole && ['referent_projet', 'direction', 'admin'].includes(currentUserRole);
  };

  const isProjetFini = (projet: ProjetCollaborateur) => {
    return projet.projet.statut === 'termine';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const ficheData = {
        titre: formData.titre,
        description: formData.description,
        auteur_id: user.id,
        referent_id: formData.referent_id || null,
        objectifs: formData.objectifs.filter(obj => obj.trim() !== ''),
        date_debut: formData.date_debut || null,
        date_fin_prevue: formData.date_fin_prevue || null,
        budget_estime: formData.budget_estime ? parseFloat(formData.budget_estime) : null,
        ressources: {
          humaines: formData.ressources.humaines.filter(r => r.trim() !== ''),
          materielles: formData.ressources.materielles.filter(r => r.trim() !== ''),
          financieres: formData.ressources.financieres
        },
        risques: formData.risques.filter(r => r.trim() !== ''),
        indicateurs: formData.indicateurs.filter(i => i.trim() !== ''),
        statut: 'brouillon'
      };

      const { error } = await supabase
        .from('fiches_projets')
        .insert([ficheData]);

      if (error) throw error;

      setSuccess('Fiche projet créée avec succès');
      resetForm();
      setShowCreateForm(false);
      fetchFiches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la fiche');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFicheCollaborateur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjet) return;

    setLoading(true);
    setError(null);

    try {
      const ficheData = {
        collaboration_id: selectedProjet.id,
        contenu: JSON.stringify({
          objectifs_personnels: ficheCollaborateurData.objectifs_personnels.filter(obj => obj.trim() !== ''),
          taches_realisees: ficheCollaborateurData.taches_realisees.filter(t => t.trim() !== ''),
          difficultes_rencontrees: ficheCollaborateurData.difficultes_rencontrees.filter(d => d.trim() !== ''),
          suggestions_amelioration: ficheCollaborateurData.suggestions_amelioration.filter(s => s.trim() !== ''),
          competences_developpees: ficheCollaborateurData.competences_developpees.filter(c => c.trim() !== ''),
          temps_passe: ficheCollaborateurData.temps_passe,
          satisfaction: ficheCollaborateurData.satisfaction,
          contenu_libre: ficheCollaborateurData.contenu
        }),
        statut: 'brouillon'
      };

      if (selectedProjet.fiche_collaborateur) {
        const { error } = await supabase
          .from('fiches_collaborateurs')
          .update(ficheData)
          .eq('id', selectedProjet.fiche_collaborateur.id);

        if (error) throw error;
        setSuccess('Fiche collaborateur mise à jour avec succès');
      } else {
        const { error } = await supabase
          .from('fiches_collaborateurs')
          .insert([ficheData]);

        if (error) throw error;
        setSuccess('Fiche collaborateur créée avec succès');
      }

      setShowCollaborateurForm(false);
      setSelectedProjet(null);
      resetFicheCollaborateurForm();
      fetchProjetsCollaborateur();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde de la fiche');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitObjectifs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjet) return;

    setLoading(true);
    setError(null);

    try {
      const objectifsFiltered = objectifsData.objectifs.filter(obj => 
        obj.titre.trim() !== '' && obj.description.trim() !== ''
      );

      const data = {
        collaboration_id: selectedProjet.id,
        objectifs: objectifsFiltered
      };

      if (selectedProjet.objectifs_collaborateur) {
        const { error } = await supabase
          .from('objectifs_collaborateurs')
          .update(data)
          .eq('id', selectedProjet.objectifs_collaborateur.id);

        if (error) throw error;
        setSuccess('Objectifs mis à jour avec succès');
      } else {
        const { error } = await supabase
          .from('objectifs_collaborateurs')
          .insert([data]);

        if (error) throw error;
        setSuccess('Objectifs créés avec succès');
      }

      setShowObjectifsForm(false);
      setSelectedProjet(null);
      resetObjectifsForm();
      fetchProjetsCollaborateur();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde des objectifs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjet?.objectifs_collaborateur) return;

    setLoading(true);
    setError(null);

    try {
      const data = {
        objectifs_id: selectedProjet.objectifs_collaborateur.id,
        auto_evaluation: evaluationData.auto_evaluation,
        statut: 'en_attente'
      };

      if (selectedProjet.evaluation_objectifs) {
        const { error } = await supabase
          .from('evaluations_objectifs')
          .update(data)
          .eq('id', selectedProjet.evaluation_objectifs.id);

        if (error) throw error;
        setSuccess('Auto-évaluation mise à jour et soumise pour validation');
      } else {
        const { error } = await supabase
          .from('evaluations_objectifs')
          .insert([data]);

        if (error) throw error;
        setSuccess('Auto-évaluation créée et soumise pour validation');
      }

      setShowEvaluationForm(false);
      setSelectedProjet(null);
      resetEvaluationForm();
      fetchProjetsCollaborateur();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde de l\'évaluation');
    } finally {
      setLoading(false);
    }
  };

  const openFicheCollaborateurForm = (projet: ProjetCollaborateur) => {
    setSelectedProjet(projet);
    
    if (projet.fiche_collaborateur) {
      try {
        const contenu = JSON.parse(projet.fiche_collaborateur.contenu);
        setFicheCollaborateurData({
          contenu: contenu.contenu_libre || '',
          objectifs_personnels: contenu.objectifs_personnels || [''],
          taches_realisees: contenu.taches_realisees || [''],
          difficultes_rencontrees: contenu.difficultes_rencontrees || [''],
          suggestions_amelioration: contenu.suggestions_amelioration || [''],
          competences_developpees: contenu.competences_developpees || [''],
          temps_passe: contenu.temps_passe || '',
          satisfaction: contenu.satisfaction || 5
        });
      } catch (err) {
        console.error('Erreur lors du parsing du contenu:', err);
        resetFicheCollaborateurForm();
      }
    } else {
      resetFicheCollaborateurForm();
    }
    
    setShowCollaborateurForm(true);
  };

  const openObjectifsForm = (projet: ProjetCollaborateur) => {
    setSelectedProjet(projet);
    
    if (projet.objectifs_collaborateur) {
      setObjectifsData({
        objectifs: projet.objectifs_collaborateur.objectifs.length > 0 
          ? projet.objectifs_collaborateur.objectifs 
          : [{ titre: '', description: '', indicateurs: '', echeance: '' }]
      });
    } else {
      resetObjectifsForm();
    }
    
    setShowObjectifsForm(true);
  };

  const openEvaluationForm = (projet: ProjetCollaborateur) => {
    setSelectedProjet(projet);
    
    if (projet.evaluation_objectifs && projet.objectifs_collaborateur) {
      // Préparer l'auto-évaluation existante
      const autoEval: Record<string, { statut: string; commentaire: string; preuves: string }> = {};
      
      projet.objectifs_collaborateur.objectifs.forEach((obj: any, index: number) => {
        const existingEval = projet.evaluation_objectifs?.auto_evaluation?.[index.toString()];
        autoEval[index.toString()] = existingEval || {
          statut: '',
          commentaire: '',
          preuves: ''
        };
      });
      
      setEvaluationData({
        auto_evaluation: autoEval,
        commentaires_generaux: ''
      });
    } else if (projet.objectifs_collaborateur) {
      // Créer une nouvelle auto-évaluation
      const autoEval: Record<string, { statut: string; commentaire: string; preuves: string }> = {};
      
      projet.objectifs_collaborateur.objectifs.forEach((_: any, index: number) => {
        autoEval[index.toString()] = {
          statut: '',
          commentaire: '',
          preuves: ''
        };
      });
      
      setEvaluationData({
        auto_evaluation: autoEval,
        commentaires_generaux: ''
      });
    }
    
    setShowEvaluationForm(true);
  };

  const resetForm = () => {
    setFormData({
      titre: '',
      description: '',
      referent_id: '',
      objectifs: [''],
      date_debut: '',
      date_fin_prevue: '',
      budget_estime: '',
      ressources: {
        humaines: [''],
        materielles: [''],
        financieres: ''
      },
      risques: [''],
      indicateurs: ['']
    });
  };

  const resetFicheCollaborateurForm = () => {
    setFicheCollaborateurData({
      contenu: '',
      objectifs_personnels: [''],
      taches_realisees: [''],
      difficultes_rencontrees: [''],
      suggestions_amelioration: [''],
      competences_developpees: [''],
      temps_passe: '',
      satisfaction: 5
    });
  };

  const resetObjectifsForm = () => {
    setObjectifsData({
      objectifs: [{ titre: '', description: '', indicateurs: '', echeance: '' }]
    });
  };

  const resetEvaluationForm = () => {
    setEvaluationData({
      auto_evaluation: {},
      commentaires_generaux: ''
    });
  };

  const addArrayField = (field: string, isCollabForm = false) => {
    if (isCollabForm) {
      setFicheCollaborateurData(prev => ({
        ...prev,
        [field]: [...(prev[field as keyof typeof prev] as string[]), '']
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field as keyof typeof prev] as string[]), '']
      }));
    }
  };

  const addObjectif = () => {
    setObjectifsData(prev => ({
      ...prev,
      objectifs: [...prev.objectifs, { titre: '', description: '', indicateurs: '', echeance: '' }]
    }));
  };

  const updateObjectif = (index: number, field: string, value: string) => {
    setObjectifsData(prev => ({
      ...prev,
      objectifs: prev.objectifs.map((obj, i) => 
        i === index ? { ...obj, [field]: value } : obj
      )
    }));
  };

  const removeObjectif = (index: number) => {
    setObjectifsData(prev => ({
      ...prev,
      objectifs: prev.objectifs.filter((_, i) => i !== index)
    }));
  };

  const updateEvaluation = (objectifIndex: string, field: string, value: string) => {
    setEvaluationData(prev => ({
      ...prev,
      auto_evaluation: {
        ...prev.auto_evaluation,
        [objectifIndex]: {
          ...prev.auto_evaluation[objectifIndex],
          [field]: value
        }
      }
    }));
  };

  const updateArrayField = (field: string, index: number, value: string, subField?: string, isCollabForm = false) => {
    if (isCollabForm) {
      setFicheCollaborateurData(prev => {
        const newArray = [...(prev[field as keyof typeof prev] as string[])];
        newArray[index] = value;
        return { ...prev, [field]: newArray };
      });
    } else if (subField) {
      setFormData(prev => {
        const newRessources = { ...prev.ressources };
        const newArray = [...(newRessources[subField as keyof typeof newRessources] as string[])];
        newArray[index] = value;
        newRessources[subField as keyof typeof newRessources] = newArray as never;
        return { ...prev, ressources: newRessources };
      });
    } else {
      setFormData(prev => {
        const newArray = [...(prev[field as keyof typeof prev] as string[])];
        newArray[index] = value;
        return { ...prev, [field]: newArray };
      });
    }
  };

  const removeArrayField = (field: string, index: number, subField?: string, isCollabForm = false) => {
    if (isCollabForm) {
      setFicheCollaborateurData(prev => ({
        ...prev,
        [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i) => i !== index)
      }));
    } else if (subField) {
      setFormData(prev => {
        const newRessources = { ...prev.ressources };
        const newArray = (newRessources[subField as keyof typeof newRessources] as string[]).filter((_, i) => i !== index);
        newRessources[subField as keyof typeof newRessources] = newArray as never;
        return { ...prev, ressources: newRessources };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i) => i !== index)
      }));
    }
  };

  const filteredFiches = fiches.filter(fiche => {
    const matchesSearch = fiche.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fiche.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || fiche.statut === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredProjetsCollaborateur = projetsCollaborateur.filter(projet => {
    return projet.projet.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
           projet.projet.nom_client.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading && !showCreateForm && !showCollaborateurForm && !showObjectifsForm && !showEvaluationForm) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fiches Projets</h1>
          <p className="text-gray-600 mt-1">Gérez vos projets et suivez votre participation</p>
        </div>
        {canCreateFiche() && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouvelle fiche projet
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('mes_fiches')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'mes_fiches'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Mes fiches projets
            </div>
          </button>
          <button
            onClick={() => setActiveTab('mes_projets')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'mes_projets'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Mes projets collaborateur ({projetsCollaborateur.length})
            </div>
          </button>
        </nav>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={activeTab === 'mes_fiches' ? "Rechercher par titre ou description..." : "Rechercher par projet ou client..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          {activeTab === 'mes_fiches' && (
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Tous les statuts</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'mes_fiches' ? (
        /* Mes Fiches Projets */
        <div className="grid gap-6">
          {filteredFiches.map((fiche) => (
            <div key={fiche.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{fiche.titre}</h3>
                    <p className="text-gray-600 mb-3">{fiche.description}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${statusColors[fiche.statut]}`}>
                    {statusIcons[fiche.statut]}
                    {statusLabels[fiche.statut]}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>Auteur: {fiche.auteur?.full_name}</span>
                  </div>
                  {fiche.referent && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span>Référent: {fiche.referent.full_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Créé le {format(new Date(fiche.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
                  </div>
                </div>

                {(fiche.date_debut || fiche.date_fin_prevue) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {fiche.date_debut && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Début:</span> {format(new Date(fiche.date_debut), 'dd/MM/yyyy', { locale: fr })}
                      </div>
                    )}
                    {fiche.date_fin_prevue && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Fin prévue:</span> {format(new Date(fiche.date_fin_prevue), 'dd/MM/yyyy', { locale: fr })}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Avancement:</span> {fiche.taux_avancement}%
                    </div>
                    {fiche.budget_estime && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Budget:</span> {fiche.budget_estime.toLocaleString('fr-FR')} €
                      </div>
                    )}
                  </div>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${fiche.taux_avancement}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredFiches.length === 0 && (
            <div className="text-center py-12">
              <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune fiche projet</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Aucune fiche ne correspond à vos critères de recherche.'
                  : canCreateFiche() 
                    ? 'Commencez par créer votre première fiche projet.'
                    : 'Aucune fiche projet disponible.'
                }
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Mes Projets Collaborateur */
        <div className="grid gap-6">
          {filteredProjetsCollaborateur.map((projet) => (
            <div key={projet.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{projet.projet.titre}</h3>
                      {isProjetFini(projet) && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Projet terminé
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Client:</strong> {projet.projet.nom_client}
                    </p>
                    <p className="text-gray-600 mb-3">{projet.projet.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>Rôle: {projet.role_projet}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Target className="w-4 h-4" />
                    <span>Allocation: {projet.taux_allocation}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Début: {format(new Date(projet.projet.date_debut), 'dd/MM/yyyy', { locale: fr })}</span>
                  </div>
                </div>

                {/* Status des différentes fiches */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Fiche collaborateur */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Fiche collaborateur</h4>
                      {projet.fiche_collaborateur ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600">
                      {projet.fiche_collaborateur ? 'Complétée' : 'À compléter'}
                    </p>
                  </div>

                  {/* Objectifs */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Objectifs</h4>
                      {projet.objectifs_collaborateur ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600">
                      {projet.objectifs_collaborateur ? 'Définis' : 'À définir'}
                    </p>
                  </div>

                  {/* Évaluation */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Auto-évaluation</h4>
                      {projet.evaluation_objectifs ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : isProjetFini(projet) && projet.objectifs_collaborateur ? (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600">
                      {projet.evaluation_objectifs ? 'Complétée' : 
                       isProjetFini(projet) && projet.objectifs_collaborateur ? 'À compléter' : 
                       'En attente'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openFicheCollaborateurForm(projet)}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    {projet.fiche_collaborateur ? (
                      <>
                        <Edit className="w-4 h-4" />
                        Modifier ma fiche
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Compléter ma fiche
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => openObjectifsForm(projet)}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    {projet.objectifs_collaborateur ? (
                      <>
                        <Edit className="w-4 h-4" />
                        Modifier objectifs
                      </>
                    ) : (
                      <>
                        <Target className="w-4 h-4" />
                        Définir objectifs
                      </>
                    )}
                  </button>

                  {isProjetFini(projet) && projet.objectifs_collaborateur && (
                    <button
                      onClick={() => openEvaluationForm(projet)}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                    >
                      {projet.evaluation_objectifs ? (
                        <>
                          <Edit className="w-4 h-4" />
                          Modifier évaluation
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-4 h-4" />
                          Auto-évaluation
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredProjetsCollaborateur.length === 0 && (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun projet collaborateur</h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? 'Aucun projet ne correspond à vos critères de recherche.'
                  : 'Vous n\'êtes actuellement affecté à aucun projet en tant que collaborateur.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create Form Modal */}
      {showCreateForm && canCreateFiche() && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Nouvelle fiche projet</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Informations générales */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Informations générales</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titre du projet *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.titre}
                    onChange={(e) => setFormData(prev => ({ ...prev, titre: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Référent projet
                  </label>
                  <select
                    value={formData.referent_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, referent_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Sélectionner un référent</option>
                    {users.filter(user => user.role === 'referent_projet' || user.role === 'direction' || user.role === 'admin').map(user => (
                      <option key={user.id} value={user.id}>{user.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Objectifs */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Objectifs</h3>
                {formData.objectifs.map((objectif, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={objectif}
                      onChange={(e) => updateArrayField('objectifs', index, e.target.value)}
                      placeholder={`Objectif ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {formData.objectifs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayField('objectifs', index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayField('objectifs')}
                  className="text-indigo-600 hover:text-indigo-700 text-sm"
                >
                  + Ajouter un objectif
                </button>
              </div>

              {/* Planning et Budget */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Planning et Budget</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de début
                    </label>
                    <input
                      type="date"
                      value={formData.date_debut}
                      onChange={(e) => setFormData(prev => ({ ...prev, date_debut: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de fin prévue
                    </label>
                    <input
                      type="date"
                      value={formData.date_fin_prevue}
                      onChange={(e) => setFormData(prev => ({ ...prev, date_fin_prevue: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Budget estimé (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.budget_estime}
                      onChange={(e) => setFormData(prev => ({ ...prev, budget_estime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Création...' : 'Créer la fiche'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fiche Collaborateur Form Modal */}
      {showCollaborateurForm && selectedProjet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedProjet.fiche_collaborateur ? 'Modifier' : 'Compléter'} ma fiche collaborateur
              </h2>
              <p className="text-gray-600 mt-1">
                Projet: {selectedProjet.projet.titre} - {selectedProjet.role_projet}
              </p>
            </div>

            <form onSubmit={handleSubmitFicheCollaborateur} className="p-6 space-y-6">
              {/* Objectifs personnels */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Mes objectifs personnels sur ce projet</h3>
                {ficheCollaborateurData.objectifs_personnels.map((objectif, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={objectif}
                      onChange={(e) => updateArrayField('objectifs_personnels', index, e.target.value, undefined, true)}
                      placeholder={`Objectif personnel ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {ficheCollaborateurData.objectifs_personnels.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayField('objectifs_personnels', index, undefined, true)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayField('objectifs_personnels', true)}
                  className="text-indigo-600 hover:text-indigo-700 text-sm"
                >
                  + Ajouter un objectif
                </button>
              </div>

              {/* Tâches réalisées */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Tâches réalisées</h3>
                {ficheCollaborateurData.taches_realisees.map((tache, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={tache}
                      onChange={(e) => updateArrayField('taches_realisees', index, e.target.value, undefined, true)}
                      placeholder={`Tâche ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {ficheCollaborateurData.taches_realisees.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayField('taches_realisees', index, undefined, true)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayField('taches_realisees', true)}
                  className="text-indigo-600 hover:text-indigo-700 text-sm"
                >
                  + Ajouter une tâche
                </button>
              </div>

              {/* Difficultés rencontrées */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Difficultés rencontrées</h3>
                {ficheCollaborateurData.difficultes_rencontrees.map((difficulte, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={difficulte}
                      onChange={(e) => updateArrayField('difficultes_rencontrees', index, e.target.value, undefined, true)}
                      placeholder={`Difficulté ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {ficheCollaborateurData.difficultes_rencontrees.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayField('difficultes_rencontrees', index, undefined, true)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayField('difficultes_rencontrees', true)}
                  className="text-indigo-600 hover:text-indigo-700 text-sm"
                >
                  + Ajouter une difficulté
                </button>
              </div>

              {/* Compétences développées */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Compétences développées</h3>
                {ficheCollaborateurData.competences_developpees.map((competence, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={competence}
                      onChange={(e) => updateArrayField('competences_developpees', index, e.target.value, undefined, true)}
                      placeholder={`Compétence ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {ficheCollaborateurData.competences_developpees.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayField('competences_developpees', index, undefined, true)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayField('competences_developpees', true)}
                  className="text-indigo-600 hover:text-indigo-700 text-sm"
                >
                  + Ajouter une compétence
                </button>
              </div>

              {/* Suggestions d'amélioration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Suggestions d'amélioration</h3>
                {ficheCollaborateurData.suggestions_amelioration.map((suggestion, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={suggestion}
                      onChange={(e) => updateArrayField('suggestions_amelioration', index, e.target.value, undefined, true)}
                      placeholder={`Suggestion ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {ficheCollaborateurData.suggestions_amelioration.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayField('suggestions_amelioration', index, undefined, true)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayField('suggestions_amelioration', true)}
                  className="text-indigo-600 hover:text-indigo-700 text-sm"
                >
                  + Ajouter une suggestion
                </button>
              </div>

              {/* Temps passé et satisfaction */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temps passé sur le projet
                  </label>
                  <input
                    type="text"
                    value={ficheCollaborateurData.temps_passe}
                    onChange={(e) => setFicheCollaborateurData(prev => ({ ...prev, temps_passe: e.target.value }))}
                    placeholder="Ex: 2 semaines, 40 heures..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Niveau de satisfaction (1-10)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={ficheCollaborateurData.satisfaction}
                    onChange={(e) => setFicheCollaborateurData(prev => ({ ...prev, satisfaction: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 (Très insatisfait)</span>
                    <span className="font-medium">{ficheCollaborateurData.satisfaction}/10</span>
                    <span>10 (Très satisfait)</span>
                  </div>
                </div>
              </div>

              {/* Commentaires libres */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commentaires libres
                </label>
                <textarea
                  rows={4}
                  value={ficheCollaborateurData.contenu}
                  onChange={(e) => setFicheCollaborateurData(prev => ({ ...prev, contenu: e.target.value }))}
                  placeholder="Ajoutez ici tout commentaire, retour d'expérience ou information complémentaire..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowCollaborateurForm(false);
                    setSelectedProjet(null);
                    resetFicheCollaborateurForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sauvegarde...' : (selectedProjet.fiche_collaborateur ? 'Mettre à jour' : 'Enregistrer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Objectifs Form Modal */}
      {showObjectifsForm && selectedProjet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedProjet.objectifs_collaborateur ? 'Modifier' : 'Définir'} mes objectifs
              </h2>
              <p className="text-gray-600 mt-1">
                Projet: {selectedProjet.projet.titre} - {selectedProjet.role_projet}
              </p>
            </div>

            <form onSubmit={handleSubmitObjectifs} className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Information importante</h3>
                <p className="text-sm text-blue-700">
                  Définissez clairement vos objectifs personnels pour ce projet. Ces objectifs vous serviront de base pour votre auto-évaluation en fin de projet.
                </p>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Mes objectifs sur ce projet</h3>
                
                {objectifsData.objectifs.map((objectif, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-md font-medium text-gray-900">Objectif {index + 1}</h4>
                      {objectifsData.objectifs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeObjectif(index)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        >
                          <AlertCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Titre de l'objectif *
                        </label>
                        <input
                          type="text"
                          required
                          value={objectif.titre}
                          onChange={(e) => updateObjectif(index, 'titre', e.target.value)}
                          placeholder="Ex: Développer une nouvelle fonctionnalité"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Échéance
                        </label>
                        <input
                          type="date"
                          value={objectif.echeance}
                          onChange={(e) => updateObjectif(index, 'echeance', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description détaillée *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={objectif.description}
                        onChange={(e) => updateObjectif(index, 'description', e.target.value)}
                        placeholder="Décrivez précisément ce que vous voulez accomplir..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Indicateurs de réussite
                      </label>
                      <textarea
                        rows={2}
                        value={objectif.indicateurs}
                        onChange={(e) => updateObjectif(index, 'indicateurs', e.target.value)}
                        placeholder="Comment mesurer la réussite de cet objectif ?"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addObjectif}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter un objectif
                </button>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowObjectifsForm(false);
                    setSelectedProjet(null);
                    resetObjectifsForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sauvegarde...' : (selectedProjet.objectifs_collaborateur ? 'Mettre à jour' : 'Enregistrer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Évaluation Form Modal */}
      {showEvaluationForm && selectedProjet && selectedProjet.objectifs_collaborateur && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                Auto-évaluation de mes objectifs
              </h2>
              <p className="text-gray-600 mt-1">
                Projet: {selectedProjet.projet.titre} - {selectedProjet.role_projet}
              </p>
            </div>

            <form onSubmit={handleSubmitEvaluation} className="p-6 space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">Auto-évaluation</h3>
                <p className="text-sm text-yellow-700">
                  Évaluez honnêtement l'atteinte de chacun de vos objectifs. Cette évaluation sera ensuite validée par votre référent projet et votre coach.
                </p>
              </div>

              <div className="space-y-6">
                {selectedProjet.objectifs_collaborateur.objectifs.map((objectif: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6">
                    <div className="mb-4">
                      <h4 className="text-lg font-medium text-gray-900 mb-2">{objectif.titre}</h4>
                      <p className="text-gray-600 mb-2">{objectif.description}</p>
                      {objectif.indicateurs && (
                        <p className="text-sm text-gray-500">
                          <strong>Indicateurs:</strong> {objectif.indicateurs}
                        </p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Statut de l'objectif *
                        </label>
                        <select
                          required
                          value={evaluationData.auto_evaluation[index.toString()]?.statut || ''}
                          onChange={(e) => updateEvaluation(index.toString(), 'statut', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Sélectionner un statut</option>
                          {objectifStatusOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Preuves/Réalisations
                        </label>
                        <textarea
                          rows={3}
                          value={evaluationData.auto_evaluation[index.toString()]?.preuves || ''}
                          onChange={(e) => updateEvaluation(index.toString(), 'preuves', e.target.value)}
                          placeholder="Décrivez les preuves de votre réalisation..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Commentaires et justification *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={evaluationData.auto_evaluation[index.toString()]?.commentaire || ''}
                        onChange={(e) => updateEvaluation(index.toString(), 'commentaire', e.target.value)}
                        placeholder="Expliquez votre évaluation, les difficultés rencontrées, les apprentissages..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaires généraux sur le projet
                </label>
                <textarea
                  rows={4}
                  value={evaluationData.commentaires_generaux}
                  onChange={(e) => setEvaluationData(prev => ({ ...prev, commentaires_generaux: e.target.value }))}
                  placeholder="Bilan global, apprentissages, suggestions pour de futurs projets..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowEvaluationForm(false);
                    setSelectedProjet(null);
                    resetEvaluationForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Soumission...' : 'Soumettre pour validation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FichesProjets;