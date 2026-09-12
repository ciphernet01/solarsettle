import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Web3Provider } from './context/Web3Context';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ProsumerDashboard from './pages/dashboards/ProsumerDashboard';
import BuyerDashboard from './pages/dashboards/BuyerDashboard';
import GovtDashboard from './pages/dashboards/GovtDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';
import './styles-extra.css';

/**
 * SolarSettle app shell.
 *
 * Routing model:
 *   /          Landing page (public) - hero, live marketplace preview, stats
 *   /login     Wallet sign-in - resolves the user's role on-chain
 *   /prosumer  Prosumer dashboard (registered & pending prosumers)
 *   /buyer     Buyer dashboard (open to every signed-in wallet)
 *   /govt      Government dashboard (contract owner only)
 */
function App() {
  return (
    <Web3Provider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/prosumer"
            element={
              <ProtectedRoute allowed={['prosumer', 'pending-prosumer']}>
                <ProsumerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyer"
            element={
              <ProtectedRoute allowed={['buyer', 'prosumer', 'pending-prosumer', 'government']}>
                <BuyerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/govt"
            element={
              <ProtectedRoute allowed={['government']}>
                <GovtDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </Web3Provider>
  );
}

export default App;
