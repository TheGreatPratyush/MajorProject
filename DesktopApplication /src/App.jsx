import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Library,
  MessageSquare,
  UserRound,
  Settings,
  Search,
  Bell,
  ChevronDown,
  Leaf,
} from 'lucide-react';
import { useApp } from './context/AppContext';
import { Toast } from './components/UI';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DirectoryPage from './pages/DirectoryPage';
import EventsPage from './pages/EventsPage';
import ResourcesPage from './pages/ResourcesPage';
import CommunityPage from './pages/CommunityPage';
import { ProfilePage, SettingsPage } from './pages/ProfileSettingsPage';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'stakeholders', label: 'Stakeholders', icon: Users },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'resources', label: 'Resources', icon: Library },
  { id: 'community', label: 'Community', icon: MessageSquare },
];

export default function App() {
  const { currentUser, toast, setToast, logout } = useApp();
  const [page, setPage] = useState('dashboard');
  const [profileMenu, setProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  if (!currentUser)
    return (
      <>
        <LoginPage />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );

  const navigate = (next) => {
    setPage(next);
    setProfileMenu(false);
  };
  const pages = {
    dashboard: <DashboardPage navigate={navigate} />,
    stakeholders: <DirectoryPage />,
    events: <EventsPage />,
    resources: <ResourcesPage />,
    community: <CommunityPage />,
    profile: <ProfilePage />,
    settings: <SettingsPage />,
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="app-brand" onClick={() => navigate('dashboard')}>
          <span className="brand-mark">
            <Leaf size={19} />
          </span>
          <div>
            <strong>Startup-AYUSH</strong>
            <small>Desktop</small>
          </div>
        </button>
        <nav>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={page === id ? 'active' : ''} onClick={() => navigate(id)}>
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={page === 'profile' ? 'active' : ''}
            onClick={() => navigate('profile')}
          >
            <UserRound size={18} />
            <span>My Profile</span>
          </button>
          <button
            className={page === 'settings' ? 'active' : ''}
            onClick={() => navigate('settings')}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="global-search">
            <Search size={16} />
            <input placeholder="Search workspace" onClick={() => navigate('stakeholders')} />
            <kbd>⌘ K</kbd>
          </div>
          <div className="top-actions">
            <div className="notification-wrap">
              <button
                className="icon-btn notification-btn"
                onClick={() => setNotifications(!notifications)}
                aria-label="Notifications"
              >
                <Bell size={18} />
                <span />
              </button>
              {notifications && (
                <div className="notification-menu">
                  <strong>Notifications</strong>
                  <p>
                    <b>AYUSH Innovation Summit</b>
                    <small>Registration and event details are available.</small>
                  </p>
                  <p>
                    <b>Local demo mode</b>
                    <small>All changes are saved on this device.</small>
                  </p>
                </div>
              )}
            </div>
            <div className="profile-wrap">
              <button className="profile-trigger" onClick={() => setProfileMenu(!profileMenu)}>
                <span className="avatar small">{currentUser.avatar}</span>
                <span>
                  <strong>{currentUser.name}</strong>
                  <small>{currentUser.role}</small>
                </span>
                <ChevronDown size={14} />
              </button>
              {profileMenu && (
                <div className="profile-menu">
                  <button onClick={() => navigate('profile')}>
                    <UserRound size={15} /> My Profile
                  </button>
                  <button onClick={() => navigate('settings')}>
                    <Settings size={15} /> Settings
                  </button>
                  <hr />
                  <button onClick={logout}>Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="main-content">{pages[page] || pages.dashboard}</main>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
