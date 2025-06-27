import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Prefetch user data when route changes
  useEffect(() => {
    if (user && !loading) {
      // Prefetch user profile data in the background
      const prefetchUserData = async () => {
        try {
          await Promise.all([
            supabase.from('user_profiles').select('full_name, role, department').eq('id', user.id).single(),
            supabase.from('notifications').select('count', { count: 'exact', head: true }).eq('destinataire_id', user.id).eq('is_read', false)
          ]);
        } catch (error) {
          // Silently fail on prefetch errors
          console.debug('User data prefetch error:', error);
        }
      };
      
      prefetchUserData();
    }
  }, [user, loading, location.pathname]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

export default PrivateRoute;