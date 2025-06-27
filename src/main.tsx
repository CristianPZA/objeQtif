import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n';

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

// Initialize the app
const initApp = () => {
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