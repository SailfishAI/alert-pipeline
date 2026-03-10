import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UserInfo {
  name: string;
  email: string;
  role: string;
}

const Header: React.FC = () => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const userInfo: UserInfo = {
    name: localStorage.getItem('user_name') || 'User',
    email: localStorage.getItem('user_email') || '',
    role: localStorage.getItem('user_role') || 'viewer',
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_role');
    window.location.href = '/login';
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <div
          className="header-logo"
          onClick={() => navigate('/dashboard')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/dashboard')}
        >
          <span className="logo-icon">AP</span>
          <span className="logo-text">Alert Pipeline</span>
        </div>
      </div>

      <div className="header-center">
        <div className="global-search">
          <input
            type="text"
            placeholder="Search alerts, incidents..."
            className="search-input search-input--global"
            onFocus={() => {}}
          />
        </div>
      </div>

      <div className="header-right">
        <button
          className="header-btn notification-bell"
          aria-label="Notifications"
          onClick={() => navigate('/notifications')}
        >
          <span className="bell-icon">&#128276;</span>
        </button>

        <div className="user-menu-container" ref={menuRef}>
          <button
            className="header-btn user-avatar"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-expanded={showUserMenu}
            aria-haspopup="true"
          >
            <span className="avatar-text">
              {userInfo.name.charAt(0).toUpperCase()}
            </span>
          </button>

          {showUserMenu && (
            <div className="user-dropdown" role="menu">
              <div className="user-dropdown-header">
                <strong>{userInfo.name}</strong>
                <span>{userInfo.email}</span>
                <span className="role-badge">{userInfo.role}</span>
              </div>
              <div className="user-dropdown-divider" />
              <button
                className="user-dropdown-item"
                role="menuitem"
                onClick={() => { navigate('/settings/general'); setShowUserMenu(false); }}
              >
                Settings
              </button>
              <button
                className="user-dropdown-item"
                role="menuitem"
                onClick={() => { navigate('/settings/team'); setShowUserMenu(false); }}
              >
                Team
              </button>
              <div className="user-dropdown-divider" />
              <button
                className="user-dropdown-item user-dropdown-item--danger"
                role="menuitem"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

// Cmd+K / Ctrl+K opens global search
