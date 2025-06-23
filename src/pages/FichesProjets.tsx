import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, User, Target, AlertCircle, CheckCircle, Clock, Archive } from 'lucide-react';
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

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
}

const FichesProjets = () => {
  const [fiches, setFiches] = useState<FicheProjet[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  // Form state
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

  useEffect(() => {
    fetchFiches();
    fetchUsers();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Préparer les données
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

      // Reset form and close modal
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
      setShowCreateForm(false);
      fetchFiches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la fiche');
    } finally {
      setLoading(false);
    }
  };

  const addArrayField = (field: string, subField?: string) => {
    if (subField) {
      setFormData(prev => ({
        ...prev,
        [field]: {
          ...prev[field as keyof typeof prev.ressources],
          [subField]: [...(prev[field as keyof typeof prev.ressources][subField as keyof typeof prev.ressources.humaines] as string[]), '']
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field as keyof typeof prev] as string[]), '']
      }));
    }
  };

  const updateArrayField = (field: string, index: number, value: string, subField?: string) => {
    if (subField) {
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

  const removeArrayField = (field: string, index: number, subField?: string) => {
    if (subField) {
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

  if (loading && !showCreateForm) {
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
          <p className="text-gray-600 mt-1">Gérez vos projets et suivez leur avancement</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouvelle fiche projet
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par titre ou description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
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
        </div>
      </div>

      {/* Fiches List */}
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
                : 'Commencez par créer votre première fiche projet.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
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

              {/* Ressources */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Ressources</h3>
                
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-2">Ressources humaines</h4>
                  {formData.ressources.humaines.map((ressource, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={ressource}
                        onChange={(e) => updateArrayField('ressources', index, e.target.value, 'humaines')}
                        placeholder="Ressource humaine"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {formData.ressources.humaines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArrayField('ressources', index, 'humaines')}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayField('ressources', 'humaines')}
                    className="text-indigo-600 hover:text-indigo-700 text-sm"
                  >
                    + Ajouter une ressource humaine
                  </button>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-2">Ressources matérielles</h4>
                  {formData.ressources.materielles.map((ressource, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={ressource}
                        onChange={(e) => updateArrayField('ressources', index, e.target.value, 'materielles')}
                        placeholder="Ressource matérielle"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {formData.ressources.materielles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArrayField('ressources', index, 'materielles')}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayField('ressources', 'materielles')}
                    className="text-indigo-600 hover:text-indigo-700 text-sm"
                  >
                    + Ajouter une ressource matérielle
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ressources financières
                  </label>
                  <textarea
                    rows={2}
                    value={formData.ressources.financieres}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      ressources: { ...prev.ressources, financieres: e.target.value }
                    }))}
                    placeholder="Détails sur les ressources financières"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Risques */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Risques identifiés</h3>
                {formData.risques.map((risque, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={risque}
                      onChange={(e) => updateArrayField('risques', index, e.target.value)}
                      placeholder={`Risque ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {formData.risques.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayField('risques', index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayField('risques')}
                  className="text-indigo-600 hover:text-indigo-700 text-sm"
                >
                  + Ajouter un risque
                </button>
              </div>

              {/* Indicateurs */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Indicateurs de réussite</h3>
                {formData.indicateurs.map((indicateur, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={indicateur}
                      onChange={(e) => updateArrayField('indicateurs', index, e.target.value)}
                      placeholder={`Indicateur ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {formData.indicateurs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayField('indicateurs', index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayField('indicateurs')}
                  className="text-indigo-600 hover:text-indigo-700 text-sm"
                >
                  + Ajouter un indicateur
                </button>
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
    </div>
  );
};

export default FichesProjets;