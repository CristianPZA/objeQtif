import React, { useState, useEffect } from 'react';
import { Building, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Department } from './types';

interface DepartmentManagementProps {
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

const DepartmentManagement: React.FC<DepartmentManagementProps> = ({ onError, onSuccess }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDepartment, setNewDepartment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUserCountry, setCurrentUserCountry] = useState<string>('france');

  useEffect(() => {
    fetchCurrentUserCountry();
    fetchDepartments();
  }, []);

  const fetchCurrentUserCountry = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('country')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data && data.country) {
        setCurrentUserCountry(data.country);
      }
    } catch (err) {
      console.error('Error fetching user country:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setDepartments(data || []);
    } catch (err) {
      onError('Erreur lors du chargement des départements');
    }
  };

  const addDepartment = async () => {
    if (!newDepartment.trim()) return;

    try {
      setSubmitting(true);

      const maxSortOrder = Math.max(...departments.map(d => d.sort_order), 0);
      
      const { error } = await supabase
        .from('departments')
        .insert([{
          name: newDepartment.trim(),
          sort_order: maxSortOrder + 1
        }]);

      if (error) throw error;

      onSuccess('Département ajouté avec succès');
      setNewDepartment('');
      fetchDepartments();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout du département');
    } finally {
      setSubmitting(false);
    }
  };

  const removeDepartment = async (departmentId: string, departmentName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le département "${departmentName}" ?`)) {
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('departments')
        .update({ is_active: false })
        .eq('id', departmentId);

      if (error) throw error;

      onSuccess('Département supprimé avec succès');
      fetchDepartments();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erreur lors de la suppression du département');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Building className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Gestion des départements</h2>
            <p className="text-sm text-gray-600">Ajoutez ou supprimez les départements de votre entreprise</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Pays actuel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Pays actuel:</strong> {currentUserCountry === 'france' ? '🇫🇷 France' : '🇪🇸 Espagne'}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Les départements sont partagés entre tous les pays.
          </p>
        </div>

        {/* Ajouter un département */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Ajouter un département</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newDepartment}
              onChange={(e) => setNewDepartment(e.target.value)}
              placeholder="Nom du nouveau département"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              onKeyPress={(e) => e.key === 'Enter' && addDepartment()}
            />
            <button
              onClick={addDepartment}
              disabled={!newDepartment.trim() || departments.some(d => d.name === newDepartment.trim()) || submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {submitting ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        </div>

        {/* Liste des départements */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Départements existants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {departments.map((department) => (
              <div
                key={department.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div>
                  <span className="text-sm font-medium text-gray-900">{department.name}</span>
                  {department.description && (
                    <p className="text-xs text-gray-500">{department.description}</p>
                  )}
                </div>
                <button
                  onClick={() => removeDepartment(department.id, department.name)}
                  disabled={submitting}
                  className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 disabled:opacity-50"
                  title="Supprimer ce département"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {departments.length === 0 && (
            <p className="text-gray-500 text-center py-4">Aucun département configuré</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentManagement;