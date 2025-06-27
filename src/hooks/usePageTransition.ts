import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to manage page transitions and loading states
 * @param delay - Optional delay in ms before showing loading state (prevents flicker for fast loads)
 * @returns Object with loading state
 */
export const usePageTransition = (delay: number = 100) => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [prevLocation, setPrevLocation] = useState('');
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    let loadingTimer: number;
    let showLoaderTimer: number;

    if (prevLocation !== location.pathname) {
      // Start loading state
      setIsLoading(true);
      
      // Only show the loader after a delay to prevent flicker
      showLoaderTimer = window.setTimeout(() => {
        setShowLoader(true);
      }, delay);
      
      // Set a timeout to finish loading
      loadingTimer = window.setTimeout(() => {
        setIsLoading(false);
        setShowLoader(false);
      }, 500);
      
      setPrevLocation(location.pathname);
    }

    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(showLoaderTimer);
    };
  }, [location.pathname, prevLocation, delay]);

  return { isLoading: isLoading && showLoader };
};