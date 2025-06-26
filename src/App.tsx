import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import FichesProjets from './pages/FichesProjets';
import Projets from './pages/Projets';
import ProjetDetail from './pages/ProjetDetail';
import ObjectifsAnnuels from './pages/ObjectifsAnnuels';
import Administration from './pages/Administration';
import Settings from './pages/Settings';
import CareerPathways from './pages/CareerPathways';
import CareerPathwayDetail from './pages/CareerPathwayDetail';
import CompleteProfile from './pages/CompleteProfile';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import MainLayout from './layouts/MainLayout';

function App() {
  return (
    <BrowserRouter>
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
            <Route path="projets" element={<Projets />} />
            <Route path="projet/:id" element={<ProjetDetail />} />
            <Route path="administration" element={<Administration />} />
            <Route path="settings" element={<Settings />} />
            <Route path="career-pathways" element={<CareerPathways />} />
            <Route path="career-pathway/:areaId" element={<CareerPathwayDetail />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App