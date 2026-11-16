import React, { useState } from 'react';
import { LogOut, ShieldCheck, RotateCcw, User, Info, Database } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { categories } from '../data/demoData';
import { isValidEmail } from '../services/businessLogic';
import { Modal, PageHeader } from '../components/UI';

export function ProfilePage() {
  const { currentUser, setCurrentUser, setUsers, users, logout, notify } = useApp();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(currentUser);
  const save = () => {
    if (!form.name.trim() || !isValidEmail(form.email))
      return notify('Enter a name and valid email.', 'error');
    setUsers(users.map((user) => (user.id === form.id ? form : user)));
    setCurrentUser(form);
    setEditing(false);
    notify('Profile updated.');
  };
  return (
    <>
      <PageHeader title="My Profile" subtitle="Manage your local demo profile" />
      <div className="profile-layout">
        <aside className="profile-card">
          <span className="avatar profile-avatar">{currentUser.avatar}</span>
          <h2>{currentUser.name}</h2>
          <p>{currentUser.role}</p>
          <button className="btn secondary" onClick={() => setEditing(true)}>
            Edit profile
          </button>
          <button className="btn danger-outline" onClick={logout}>
            <LogOut size={16} /> Logout
          </button>
        </aside>
        <section className="panel profile-details">
          <h2>Profile information</h2>
          <div className="profile-fields">
            <span>
              <small>Name</small>
              <strong>{currentUser.name}</strong>
            </span>
            <span>
              <small>Email</small>
              <strong>{currentUser.email}</strong>
            </span>
            <span>
              <small>Organization</small>
              <strong>{currentUser.organization || 'Not provided'}</strong>
            </span>
            <span>
              <small>Stakeholder category</small>
              <strong>{currentUser.category || 'Not selected'}</strong>
            </span>
          </div>
        </section>
      </div>
      {editing && (
        <Modal
          title="Edit profile"
          onClose={() => setEditing(false)}
          footer={
            <>
              <button className="btn secondary" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="btn primary" onClick={save}>
                Save profile
              </button>
            </>
          }
        >
          <div className="form-grid">
            <label>
              Name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Email
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              Organization
              <input
                value={form.organization || ''}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
              />
            </label>
            <label>
              Category
              <select
                value={form.category || categories[0]}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
        </Modal>
      )}
    </>
  );
}

export function SettingsPage() {
  const { resetData, currentUser, logout, notify } = useApp();
  const [confirm, setConfirm] = useState(false);
  const [version, setVersion] = useState('Checking...');
  React.useEffect(() => {
    window.startupAyushDesktop
      ?.getVersion()
      .then(setVersion)
      .catch(() => setVersion('1.0.0'));
  }, []);
  return (
    <>
      <PageHeader title="Settings" subtitle="Application and demo configuration" />
      <div className="settings-layout">
        <section className="settings-section">
          <h2>
            <ShieldCheck size={18} /> Demo account
          </h2>
          <div className="settings-row">
            <div>
              <strong>Signed in as</strong>
              <p>{currentUser.email}</p>
            </div>
            <button className="btn danger-outline" onClick={logout}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </section>
        <section className="settings-section">
          <h2>
            <Database size={18} /> Demo data
          </h2>
          <div className="settings-row">
            <div>
              <strong>Local demonstration storage</strong>
              <p>Records are saved in this browser profile using localStorage.</p>
            </div>
            <button className="btn danger-outline" onClick={() => setConfirm(true)}>
              <RotateCcw size={16} /> Reset demo data
            </button>
          </div>
        </section>
        <section className="settings-section">
          <h2>
            <Info size={18} /> Application information
          </h2>
          <div className="settings-row">
            <div>
              <strong>Startup-AYUSH Desktop</strong>
              <p>Version {version} · Standalone Electron demonstration</p>
            </div>
          </div>
          <div className="notice">
            <strong>Important:</strong> This app is not synchronized with the original PostgreSQL
            backend. Authentication and data are for demonstration only and are not production
            security.
          </div>
        </section>
      </div>
      {confirm && (
        <Modal
          title="Reset demo data"
          onClose={() => setConfirm(false)}
          footer={
            <>
              <button className="btn secondary" onClick={() => setConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  resetData();
                  setConfirm(false);
                }}
              >
                Reset data
              </button>
            </>
          }
        >
          <p>
            This will restore the original stakeholders, events, resources, posts and demo accounts.
            Your locally created records will be removed.
          </p>
        </Modal>
      )}
    </>
  );
}
