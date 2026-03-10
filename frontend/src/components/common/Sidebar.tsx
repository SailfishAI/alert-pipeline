import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: '\u2302' },
  { path: '/alerts', label: 'Alerts', icon: '\u26A0' },
  { path: '/incidents', label: 'Incidents', icon: '\u2139' },
  { path: '/settings', label: 'Settings', icon: '\u2699' },
];

const Sidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string): boolean => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="app-sidebar">
      <nav className="sidebar-nav" aria-label="Main navigation">
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.path} className="nav-item">
              <NavLink
                to={item.path}
                className={`nav-link ${isActive(item.path) ? 'nav-link--active' : ''}`}
                aria-current={isActive(item.path) ? 'page' : undefined}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-version">v2.4.0</div>
        <a
          href="https://docs.alertpipeline.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="sidebar-docs-link"
        >
          Documentation
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
// chore: add husky pre-commit hooks
// fix: handle Sequelize connection drops

// Shows count of unacknowledged alerts in sidebar nav
