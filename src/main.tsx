import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initI18n } from './i18n';

// Preload critical resources
const preloadResources = () => {
  // Preload common routes
  const routes = ['/dashboard', '/projets', '/fiches-projets', '/objectifs-annuels'];
  routes.forEach(route => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = route;
    document.head.appendChild(link);
  });
};

// Initialize the app - now async to wait for i18n
const initApp = async () => {
  // Initialize i18n before rendering React components
  await initI18n();
  
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
};

// Start preloading resources
preloadResources();

// Initialize the app
initApp();