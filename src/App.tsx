import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import FichesProjets from './pages/FichesProjets';
import FicheProjetDetail from './pages/FicheProjetDetail';
import ObjectiveDefinition from './pages/ObjectiveDefinition';
import Projets from './pages/Projets';
import ProjetDetail from './pages/ProjetDetail';
import ObjectifsAnnuels from './pages/ObjectifsAnnuels';
import Administration from './pages/Administration';
import Settings from './pages/Settings';
import CareerPathways from './pages/CareerPathways';
import CareerPathwayDetail from './pages/CareerPathwayDetail';
import CompleteProfile from './pages/CompleteProfile';
import MonCoaching from './pages/MonCoaching';
import Employees from './pages/Employees'; // Nouvelle page Employees
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import PrivateRoute from './components/PrivateRoute';
import MainLayout from './layouts/MainLayout';

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
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
              <Route path="objectifs-definition/:collaborationId" element={<ObjectiveDefinition />} />
              <Route path="projets" element={<Projets />} />
              <Route path="projet/:id" element={<ProjetDetail />} />
              <Route path="administration" element={
                <PrivateRoute adminOnly={true}>
                  <Administration />
                </PrivateRoute>
              } />
              <Route path="settings" element={<Settings />} />
              <Route path="career-pathways" element={<CareerPathways />} />
              <Route path="career-pathway/:areaId" element={<CareerPathwayDetail />} />
              <Route path="mon-coaching" element={<MonCoaching />} />
              <Route path="employees" element={<Employees />} />
            </Route>
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App