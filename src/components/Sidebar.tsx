import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban,
  Target,
  Archive,
  BookOpen,
  LogOut, 
  Settings,
  Briefcase,
  Users,
  Flag
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const Sidebar = () => {
  const navigate = useNavigate();
  const { userCountry, userRole } = useAuth();
  const { t } = useTranslation();
  const [isCoach, setIsCoach] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('user_profiles')
        .select('role, id')
        .eq('id', session.user.id)
        .limit(1);

      if (data && data.length > 0) {
        // Vérifier si l'utilisateur est coach (a des coachés)
        const { data: coachees } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('coach_id', session.user.id)
          .limit(1);
        
        setIsCoach(coachees && coachees.length > 0);
      }
    };

    fetchUserRole();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const menuItems = [
    {
      to: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      label: t('common.home'),
    },
    {
      to: '/objectifs-annuels',
      icon: <Target className="w-5 h-5" />,
      label: t('common.annualObjectives'),
    },    
    {
      to: '/fiches-projets',
      icon: <FolderKanban className="w-5 h-5" />,
      label: t('common.projectSheets'),
    },
    {
      to: '/projets',
      icon: <Briefcase className="w-5 h-5" />,
      label: t('common.projects'),
    },
    {
      to: '/career-pathways',
      icon: <BookOpen className="w-5 h-5" />,
      label: t('common.careerPathways'),
    },
  ];

  // Add coaching menu item if user is a coach
  if (isCoach) {
    menuItems.push({
      to: '/mon-coaching',
      icon: <Users className="w-5 h-5" />,
      label: t('common.myCoaching'),
    });
  }
  
  // Add employees page for coaches and admins
  if (isCoach || userRole === 'admin') {
    menuItems.push({
      to: '/employees',
      icon: <Archive className="w-5 h-5" />,
      label: 'Dossiers Employés',
    });
  }

  // Add administration menu item for admin role only
  if (userRole === 'admin') {
    menuItems.push({
      to: '/administration',
      icon: <Settings className="w-5 h-5" />,
      label: t('common.administration'),
    });
  }

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white p-4">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-2xl font-bold mb-2">objeQtifs</h1>
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-400">
            {userRole === 'admin' ? t('administration.currentRole.admin') : t('administration.currentRole.employee')}
          </p>
          {userCountry && (
            <span className="text-sm bg-gray-800 px-2 py-1 rounded">
              {userCountry === 'france' ? '🇫🇷' : '🇪🇸'}
            </span>
          )}
        </div>
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
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2 w-full p-3 rounded-lg transition-colors ${
                isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Settings className="w-5 h-5" />
            {t('common.settings')}
          </NavLink>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full p-3 text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          {t('common.logout')}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;