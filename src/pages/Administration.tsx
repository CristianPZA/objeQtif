import React, { useState, useEffect } from 'react';
import { Users, Settings, AlertTriangle, CheckCircle, XCircle, Info, Flag, Calendar, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import UserManagement from '../components/administration/UserManagement';
import DepartmentManagement from '../components/administration/DepartmentManagement';

const Administration = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'settings'>('users');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserCountry, setCurrentUserCountry] = useState<string>('france');
  const [triggeringEvaluations, setTriggeringEvaluations] = useState(false);

  useEffect(() => {
    fetchCurrentUserCountry();
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

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setSuccess(null);
    // Auto-clear error after 5 seconds
    setTimeout(() => setError(null), 5000);
  };

  const handleSuccess = (successMessage: string) => {
    setSuccess(successMessage);
    setError(null);
    // Auto-clear success after 3 seconds
    setTimeout(() => setSuccess(null), 3000);
  };

  const triggerAnnualEvaluations = async () => {
    if (!confirm("Êtes-vous sûr de vouloir déclencher les auto-évaluations annuelles pour tous les utilisateurs ? Cette action enverra une notification à tous les employés.")) {
      return;
    }

    setTriggeringEvaluations(true);
    setError(null);
    setSuccess(null);

    try {
      // Récupérer l'utilisateur actuel (admin)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté");

      // Récupérer tous les utilisateurs actifs
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .eq('is_active', true)
        .eq('country', currentUserCountry); // Filtrer par pays

      if (usersError) throw usersError;
      if (!users || users.length === 0) {
        throw new Error("Aucun utilisateur actif trouvé");
      }

      const currentYear = new Date().getFullYear();

      // Créer une notification pour chaque utilisateur
      const notifications = users.map(targetUser => ({
        destinataire_id: targetUser.id,
        expediteur_id: user.id,
        titre: `Auto-évaluation annuelle ${currentYear} à compléter`,
        message: `Votre auto-évaluation annuelle pour l'année ${currentYear} est maintenant disponible. Veuillez la compléter dans la section "Objectifs Annuels".`,
        type: 'reminder',
        priority: 2,
        action_url: '/objectifs-annuels',
        metadata: {
          year: currentYear,
          action_type: 'annual_evaluation_required'
        }
      }));

      // Insérer les notifications
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) throw notificationError;

      handleSuccess(`Auto-évaluations annuelles déclenchées avec succès pour ${users.length} utilisateurs.`);
    } catch (err) {
      handleError(err instanceof Error ? err.message : "Une erreur est survenue lors du déclenchement des auto-évaluations");
    } finally {
      setTriggeringEvaluations(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-600 mt-1">Gestion des profils employés et paramètres</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              {currentUserCountry === 'france' ? '🇫🇷 France' : '🇪🇸 Espagne'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <XCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Erreur</h3>
              <div className="mt-1 text-sm text-red-700">{error}</div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-green-800">Succès</h3>
              <div className="mt-1 text-sm text-green-700">{success}</div>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-400 hover:text-green-600"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bouton de déclenchement des auto-évaluations annuelles */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Auto-évaluations annuelles</h2>
              <p className="text-sm text-gray-600 mt-1">Déclencher les auto-évaluations annuelles pour tous les utilisateurs</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">Information importante</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Cette action enverra une notification à tous les employés actifs de {currentUserCountry === 'france' ? 'France' : 'Espagne'} pour leur demander de compléter leur auto-évaluation annuelle.
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Assurez-vous que les objectifs annuels ont été définis avant de déclencher cette action.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={triggerAnnualEvaluations}
              disabled={triggeringEvaluations}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md"
            >
              <Bell className="w-5 h-5" />
              {triggeringEvaluations ? 'Envoi en cours...' : 'Déclencher les auto-évaluations annuelles'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('users');
              clearMessages();
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Gestion des employés
            </div>
          </button>
          <button
            onClick={() => {
              setActiveTab('settings');
              clearMessages();
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Paramètres
            </div>
          </button>
        </nav>
      </div>

      {/* Country Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Flag className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">Filtrage par pays</h3>
            <div className="mt-1 text-sm text-blue-700">
              <p>Les utilisateurs ne peuvent voir que les profils de leur propre pays ({currentUserCountry === 'france' ? 'France' : 'Espagne'}).</p>
              <p>Les administrateurs peuvent voir tous les profils mais doivent assigner un pays à chaque utilisateur.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">Gestion des employés</h3>
                <div className="mt-1 text-sm text-blue-700">
                  <p>Les nouveaux employés doivent être créés via l'onglet "Authentication" de Supabase.</p>
                  <p>Une fois créés, ils apparaîtront automatiquement dans ce tableau et vous pourrez modifier leurs informations.</p>
                  <p className="mt-2 font-medium">Note: La modification des emails doit être effectuée directement dans le tableau de bord Supabase pour des raisons de sécurité.</p>
                </div>
              </div>
            </div>
          </div>

          <UserManagement onError={handleError} onSuccess={handleSuccess} />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <DepartmentManagement onError={handleError} onSuccess={handleSuccess} />
        </div>
      )}
    </div>
  );
};

export default Administration;