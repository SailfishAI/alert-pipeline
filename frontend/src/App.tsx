import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import LoadingSpinner from './components/common/LoadingSpinner';

const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'));
const AlertList = lazy(() => import('./components/Alerts/AlertList'));
const AlertDetail = lazy(() => import('./components/Alerts/AlertDetail'));
const CreateAlert = lazy(() => import('./components/Alerts/CreateAlert'));
const IncidentList = lazy(() => import('./components/Incidents/IncidentList'));
const IncidentTimeline = lazy(() => import('./components/Incidents/IncidentTimeline'));
const Settings = lazy(() => import('./components/Settings/Settings'));

const App: React.FC = () => {
  return (
    <div className="app-layout">
      <Header />
      <div className="app-content">
        <Sidebar />
        <main className="main-content">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/alerts" element={<AlertList />} />
              <Route path="/alerts/new" element={<CreateAlert />} />
              <Route path="/alerts/:id" element={<AlertDetail />} />
              <Route path="/incidents" element={<IncidentList />} />
              <Route path="/incidents/:id" element={<IncidentTimeline />} />
              <Route path="/settings/*" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default App;
// fix: handle Redis cluster failover
