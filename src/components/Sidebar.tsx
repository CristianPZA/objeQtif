import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const { userCountry } = useAuth();
  const { t } = useTranslation();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isCoach, setIsCoach] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsLoading(false);
          return;
        }

        const { data } = await supabase
          .from('user_profiles')
          .select('role, id')
          .eq('id', session.user.id)
          .limit(1);

        if (data && data.length > 0) {
          setUserRole(data[0].role);
          
          // Vérifier si l'utilisateur est coach (a des coachés)
          const { data: coachees } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('coach_id', session.user.id)
            .limit(1);
          
          setIsCoach(coachees && coachees.length > 0);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Memoize menu items to prevent unnecessary re-renders
  const menuItems = useMemo(() => {
    const items = [
      {
        to: '/dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />,
        label: t('common.dashboard'),
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
        to: '/archives',
        icon: <Archive className="w-5 h-5" />,
        label: t('common.archives'),
      },
      {
        to: '/career-pathways',
        icon: <BookOpen className="w-5 h-5" />,
        label: t('common.careerPathways'),
      },
    ];

    // Add coaching menu item if user is a coach
    if (isCoach) {
      items.push({
        to: '/mon-coaching',
        icon: <Users className="w-5 h-5" />,
        label: t('common.myCoaching'),
      });
    }

    // Add administration menu item for admin role only
    if (userRole === 'admin') {
      items.push({
        to: '/administration',
        icon: <Settings className="w-5 h-5" />,
        label: t('common.administration'),
      });
    }

    return items;
  }, [userRole, isCoach, t]);

  // Preload the next page data when hovering over a link
  const handleLinkHover = async (path: string) => {
    // Skip if already on this page
    if (location.pathname === path) return;

    // Preload data based on the path
    try {
      switch (path) {
        case '/dashboard':
          // Preload dashboard data
          await supabase.from('notifications').select('count', { count: 'exact', head: true }).limit(1);
          break;
        case '/projets':
          // Preload projects data
          await supabase.from('projets').select('count', { count: 'exact', head: true }).limit(1);
          break;
        case '/fiches-projets':
          // Preload project sheets data
          await supabase.from('projet_collaborateurs').select('count', { count: 'exact', head: true }).limit(1);
          break;
        case '/objectifs-annuels':
          // Preload annual objectives data
          await supabase.from('annual_objectives').select('count', { count: 'exact', head: true }).limit(1);
          break;
        case '/career-pathways':
          // Preload career pathways data
          await supabase.from('career_areas').select('count', { count: 'exact', head: true }).limit(1);
          break;
        case '/mon-coaching':
          // Preload coaching data
          await supabase.from('v_coaching_evaluations').select('count', { count: 'exact', head: true }).limit(1);
          break;
        case '/administration':
          // Preload admin data
          await supabase.from('user_profiles').select('count', { count: 'exact', head: true }).limit(1);
          break;
        default:
          break;
      }
    } catch (error) {
      // Silently fail on preload errors
      console.debug('Preload error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white p-4">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-2xl font-bold mb-2">objeQtifs</h1>
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
        </div>
      </div>
    );
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
            onMouseEnter={() => handleLinkHover(item.to)}
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
            onMouseEnter={() => handleLinkHover('/settings')}
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