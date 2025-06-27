import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Hook to prefetch data for the current route
 * This helps reduce loading times by starting data fetching early
 */
export const usePrefetchData = () => {
  const location = useLocation();

  useEffect(() => {
    const prefetchData = async () => {
      try {
        const path = location.pathname;
        
        // Prefetch data based on the current path
        switch (true) {
          case path === '/dashboard':
            // Prefetch dashboard data
            await Promise.all([
              supabase.from('notifications').select('count', { count: 'exact', head: true }),
              supabase.from('user_profiles').select('full_name, role, department, manager_id').limit(1)
            ]);
            break;
            
          case path === '/projets':
            // Prefetch projects data
            await supabase.from('v_projets_complets').select('id, nom_client, titre, statut').limit(10);
            break;
            
          case path === '/fiches-projets':
            // Prefetch project sheets data
            await supabase.from('projet_collaborateurs').select('id, projet_id, employe_id').limit(10);
            break;
            
          case path === '/objectifs-annuels':
            // Prefetch annual objectives data
            await supabase.from('annual_objectives').select('id, year, status').limit(10);
            break;
            
          case path === '/career-pathways':
            // Prefetch career pathways data
            await supabase.from('career_areas').select('id, name, description').limit(10);
            break;
            
          case path === '/mon-coaching':
            // Prefetch coaching data
            await supabase.from('v_coaching_evaluations').select('evaluation_id, employe_nom').limit(10);
            break;
            
          case path === '/administration':
            // Prefetch admin data
            await supabase.from('user_profiles').select('id, full_name, role').limit(10);
            break;
            
          case path.startsWith('/projet/'):
            // Prefetch specific project data
            const projectId = path.split('/').pop();
            if (projectId) {
              await supabase.from('v_projets_complets').select('*').eq('id', projectId).limit(1);
            }
            break;
            
          case path.startsWith('/fiche-projet/'):
            // Prefetch specific project sheet data
            const collaborationId = path.split('/').pop();
            if (collaborationId) {
              await supabase.from('projet_collaborateurs').select('*').eq('id', collaborationId).limit(1);
            }
            break;
            
          case path.startsWith('/career-pathway/'):
            // Prefetch specific career pathway data
            const areaId = path.split('/').pop();
            if (areaId) {
              await Promise.all([
                supabase.from('career_areas').select('*').eq('id', areaId).limit(1),
                supabase.from('development_themes').select('*').eq('career_area_id', areaId).limit(10)
              ]);
            }
            break;
            
          default:
            break;
        }
      } catch (error) {
        // Silently fail on prefetch errors
        console.debug('Prefetch error:', error);
      }
    };

    prefetchData();
  }, [location.pathname]);
};