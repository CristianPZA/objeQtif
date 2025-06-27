import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import LoadingSpinner from '../components/LoadingSpinner';

const MainLayout = () => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [prevLocation, setPrevLocation] = useState('');

  // Track page transitions
  useEffect(() => {
    if (prevLocation !== location.pathname) {
      setIsLoading(true);
      
      // Short timeout to allow React to prepare the new component
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);
      
      setPrevLocation(location.pathname);
      
      return () => clearTimeout(timer);
    }
  }, [location.pathname, prevLocation]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;