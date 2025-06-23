import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban,
  Target,
  Archive,
  HelpCircle,
  LogOut, 
  Lock,
  ChevronDown,
  ChevronUp,
  Settings,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const Sidebar = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', session.user.id)
        .limit(1);

      if (data && data.length > 0) setUserRole(data[0].role);
    };

    fetchUserRole();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (newPassword !== confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }

      if (newPassword.length < 6) {
        throw new Error('Le nouveau mot de passe doit contenir au moins 6 caractères');
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Mot de passe modifié avec succès');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      to: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      label: 'Tableau de bord',
    },
    {
      to: '/fiches-projets',
      icon: <FolderKanban className="w-5 h-5" />,
      label: 'Fiches projets',
    },
    {
      to: '/objectifs-annuels',
      icon: <Target className="w-5 h-5" />,
      label: 'Objectifs annuels',
    },
    {
      to: '/archives',
      icon: <Archive className="w-5 h-5" />,
      label: 'Archives',
    },
    {
      to: '/aide',
      icon: <HelpCircle className="w-5 h-5" />,
      label: 'Aide',
    },
  ];

  // Add administration menu item for direction and admin roles
  if (userRole === 'direction' || userRole === 'admin') {
    menuItems.push({
      to: '/administration',
      icon: <Settings className="w-5 h-5" />,
      label: 'Administration',
    });
  }

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white p-4">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-2xl font-bold mb-2">objeQtifs</h1>
        <p className="text-sm text-gray-400">{userRole || 'Chargement...'}</p>
      </div>
      
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2 p-3 rounded-lg transition-colors ${
                isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
      
      <div className="absolute bottom-4 left-4 right-4 space-y-2">
        <div className="border-t border-gray-800 pt-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center justify-between w-full p-3 text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Paramètres
            </div>
            {showSettings ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showSettings && (
            <form onSubmit={handlePasswordChange} className="p-3 space-y-3">
              {error && (
                <div className="text-sm text-red-400 bg-red-900/20 p-2 rounded">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-sm text-green-400 bg-green-900/20 p-2 rounded">
                  {success}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? 'Modification...' : 'Modifier le mot de passe'}
              </button>
            </form>
          )}
        </div>

         <div className="absolute bottom-4 left-4 right-4 space-y-2">
        <div className="border-t border-gray-800 pt-2">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2 w-full p-3 rounded-lg transition-colors ${
                isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Settings className="w-5 h-5" />
            {t('settings.title')}
          </NavLink>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full p-3 text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Déconnexion
        </button>
      </div>
    </div>
  );
};

export default Sidebar;