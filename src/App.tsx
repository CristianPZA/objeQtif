import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import PrivateRoute from './components/PrivateRoute';
import MainLayout from './layouts/MainLayout';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load pages to improve initial load time
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FichesProjets = lazy(() => import('./pages/FichesProjets'));
const FicheProjetDetail = lazy(() => import('./pages/FicheProjetDetail'));
const Projets = lazy(() => import('./pages/Projets'));
const ProjetDetail = lazy(() => import('./pages/ProjetDetail'));
const ObjectifsAnnuels = lazy(() => import('./pages/ObjectifsAnnuels'));
const Administration = lazy(() => import('./pages/Administration'));
const Settings = lazy(() => import('./pages/Settings'));
const CareerPathways = lazy(() => import('./pages/CareerPathways'));
const CareerPathwayDetail = lazy(() => import('./pages/CareerPathwayDetail'));
const MonCoaching = lazy(() => import('./pages/MonCoaching'));

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/complete-profile" element={
                <PrivateRoute>
                  <CompleteProfile />
                </PrivateRoute>
              } />
              <Route path="/" element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="objectifs-annuels" element={<ObjectifsAnnuels />} />
                <Route path="fiches-projets" element={<FichesProjets />} />
                <Route path="fiche-projet/:collaborationId" element={<FicheProjetDetail />} />
                <Route path="projets" element={<Projets />} />
                <Route path="projet/:id" element={<ProjetDetail />} />
                <Route path="administration" element={<Administration />} />
                <Route path="settings" element={<Settings />} />
                <Route path="career-pathways" element={<CareerPathways />} />
                <Route path="career-pathway/:areaId" element={<CareerPathwayDetail />} />
                <Route path="mon-coaching" element={<MonCoaching />} />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App