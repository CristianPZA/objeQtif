import React, { useState, useEffect } from 'react';
import { Save, X, User, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserProfile, Department, CareerLevel, CareerArea } from './types';

interface EditUserForm {
  full_name: string;
  email: string;
  date_naissance: string;
  date_entree_entreprise: string;
  fiche_poste: string;
  manager_id: string;
  coach_id: string;
  department: string;
  career_level_id: string;
  career_pathway_id: string;
}

interface UserEditModalProps {
  user: UserProfile;
  departments: Department[];
  careerLevels: CareerLevel[];
  careerAreas: CareerArea[];
  managers: UserProfile[];
  coaches: UserProfile[];
  roles: Array<{ value: string; label: string }>;
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const UserEditModal: React.FC<UserEditModalProps> = ({
  user,
  departments,
  careerLevels,
  careerAreas,
  managers,
  coaches,
  roles,
  onClose,
  onSuccess,
  onError
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<EditUserForm>({
    full_name: '',
    email: '',
    date_naissance: '',
    date_entree_entreprise: '',
    fiche_poste: '',
    manager_id: '',
    coach_id: '',
    department: '',
    career_level_id: '',
    career_pathway_id: ''
  });

  useEffect(() => {
    // Trouver l'ID du département actuel
    let departmentId = '';
    if (user.department) {
      const dept = departments.find(d => d.name === user.department);
      departmentId = dept?.id || '';
    }

    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      date_naissance: user.date_naissance || '',
      date_entree_entreprise: user.date_entree_entreprise || user.created_at?.split('T')[0] || '',
      fiche_poste: user.fiche_poste || '',
      manager_id: user.manager_id || '',
      coach_id: user.coach_id || '',
      department: departmentId,
      career_level_id: user.career_level_id || '',
      career_pathway_id: user.career_pathway_id || ''
    });
  }, [user, departments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Trouver l'ID du département sélectionné
      let departmentName = null;
      if (formData.department) {
        const selectedDept = departments.find(d => d.id === formData.department);
        departmentName = selectedDept?.name || null;
      }

      const updateData: any = {
        full_name: formData.full_name,
        date_naissance: formData.date_naissance || null,
        date_entree_entreprise: formData.date_entree_entreprise || null,
        fiche_poste: formData.fiche_poste || null,
        manager_id: formData.manager_id || null,
        coach_id: formData.coach_id || null,
        department: departmentName,
        career_level_id: formData.career_level_id || null,
        career_pathway_id: formData.career_pathway_id || null
      };

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }

      onSuccess();
    } catch (err) {
      console.error('Error updating user:', err);
      onError(err instanceof Error ? err.message : 'Erreur lors de la modification des informations');
    } finally {
      setSubmitting(false);
    }
  };

  const formatManagerName = (fullName: string) => {
    if (!fullName) return 'Aucun';
    
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length < 2) return fullName;
    
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    const lastNameInitial = lastName.charAt(0).toUpperCase();
    
    return `${firstName} ${lastNameInitial}.`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            Modifier les informations de {user.full_name}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nom complet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom complet *
              </label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Email (lecture seule) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Pour modifier l'email, utilisez le tableau de bord Supabase
              </p>
            </div>

            {/* Date de naissance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de naissance
              </label>
              <input
                type="date"
                value={formData.date_naissance}
                onChange={(e) => setFormData(prev => ({ ...prev, date_naissance: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Date d'entrée dans l'entreprise */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date d'entrée dans l'entreprise
              </label>
              <input
                type="date"
                value={formData.date_entree_entreprise}
                onChange={(e) => setFormData(prev => ({ ...prev, date_entree_entreprise: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Poste */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Poste
              </label>
              <input
                type="text"
                value={formData.fiche_poste}
                onChange={(e) => setFormData(prev => ({ ...prev, fiche_poste: e.target.value }))}
                placeholder="Ex: Développeur Senior, Chef de projet..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Département */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Département
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Sélectionner un département</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            {/* Niveau de carrière */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Niveau de carrière
              </label>
              <select
                value={formData.career_level_id}
                onChange={(e) => setFormData(prev => ({ ...prev, career_level_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Sélectionner un niveau</option>
                {careerLevels.map(level => (
                  <option key={level.id} value={level.id}>{level.name} - {level.description}</option>
                ))}
              </select>
            </div>

            {/* Career Pathway */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Career Pathway
              </label>
              <select
                value={formData.career_pathway_id}
                onChange={(e) => setFormData(prev => ({ ...prev, career_pathway_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Sélectionner un parcours de carrière</option>
                {careerAreas.map(area => (
                  <option key={area.id} value={area.id}>{area.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Le parcours de carrière définit les compétences et évolutions possibles pour cet employé
              </p>
            </div>

            {/* Responsable direct */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Responsable direct
              </label>
              <select
                value={formData.manager_id}
                onChange={(e) => setFormData(prev => ({ ...prev, manager_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Sélectionner un responsable</option>
                {managers.filter(m => m.id !== user?.id).map(manager => (
                  <option key={manager.id} value={manager.id}>{manager.full_name}</option>
                ))}
              </select>
            </div>

            {/* Coach */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coach RH
              </label>
              <select
                value={formData.coach_id}
                onChange={(e) => setFormData(prev => ({ ...prev, coach_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Sélectionner un coach</option>
                {coaches.filter(c => c.id !== user?.id).map(coach => (
                  <option key={coach.id} value={coach.id}>
                    {coach.full_name} ({roles.find(r => r.value === coach.role)?.label || coach.role})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Tous les utilisateurs actifs peuvent être assignés comme coach
              </p>
            </div>
          </div>

          {/* Informations en lecture seule */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Informations système (lecture seule)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Rôle:</span>
                <span className="ml-2 text-gray-900">{roles.find(r => r.value === user.role)?.label}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Créé le:</span>
                <span className="ml-2 text-gray-900">
                  {format(new Date(user.created_at), 'dd/MM/yyyy', { locale: fr })}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Dernière connexion:</span>
                <span className="ml-2 text-gray-900">
                  {user.last_login 
                    ? format(new Date(user.last_login), 'dd/MM/yyyy à HH:mm', { locale: fr })
                    : 'Jamais'
                  }
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Responsable actuel:</span>
                <span className="ml-2 text-gray-900">
                  {user.manager?.full_name ? formatManagerName(user.manager.full_name) : 'Aucun'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Coach actuel:</span>
                <span className="ml-2 text-gray-900">
                  {user.coach?.full_name ? formatManagerName(user.coach.full_name) : 'Aucun'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Niveau actuel:</span>
                <span className="ml-2 text-gray-900">
                  {user.career_level?.name || 'Aucun'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Career Pathway actuel:</span>
                <span className="ml-2 text-gray-900">
                  {user.career_pathway?.name || 'Aucun'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Modification...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserEditModal;