import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import GeneralSettings from './GeneralSettings';
import Notifications from './Notifications';
import IntegrationSettings from './IntegrationSettings';
import TeamSettings from './TeamSettings';

const settingsTabs = [
  { path: 'general', label: 'General', component: GeneralSettings },
  { path: 'notifications', label: 'Notifications', component: Notifications },
  { path: 'integrations', label: 'Integrations', component: IntegrationSettings },
  { path: 'team', label: 'Team', component: TeamSettings },
];

const Settings: React.FC = () => {
  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="settings-layout">
        <nav className="settings-nav">
          {settingsTabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={`/settings/${tab.path}`}
              className={({ isActive }) =>
                `settings-nav-item ${isActive ? 'settings-nav-item--active' : ''}`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <div className="settings-content">
          <Routes>
            <Route index element={<Navigate to="general" replace />} />
            {settingsTabs.map((tab) => (
              <Route key={tab.path} path={tab.path} element={<tab.component />} />
            ))}
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Settings;
// feat: add metric anomaly detection
