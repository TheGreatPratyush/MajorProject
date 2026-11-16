import React, { useState } from 'react';
import {
  Search,
  Plus,
  Users,
  MoreHorizontal,
  Trash2,
  Pencil,
  MapPin,
  Mail,
  Phone,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { categories } from '../data/demoData';
import { isValidEmail, validateRequired } from '../services/businessLogic';
import { Modal, ConfirmDialog, PageHeader, EmptyState } from '../components/UI';

export default function DirectoryPage() {
  const { data, updateCollection, notify } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const filtered = data.stakeholders.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) &&
      (category === 'All' || item.category === category)
  );

  const save = (item) => {
    const errors = validateRequired({
      name: item.name,
      category: item.category,
      email: item.email,
      location: item.location,
    });
    if (Object.keys(errors).length) return notify('Complete all required fields.', 'error');
    if (!isValidEmail(item.email)) return notify('Enter a valid email address.', 'error');
    if (editing?.id) {
      updateCollection(
        'stakeholders',
        data.stakeholders.map((old) => (old.id === editing.id ? { ...item, id: old.id } : old))
      );
      notify('Stakeholder updated.');
    } else {
      updateCollection('stakeholders', [
        ...data.stakeholders,
        { ...item, id: `s${Date.now()}`, status: 'Pending' },
      ]);
      notify('Stakeholder added.');
    }
    setEditing(null);
  };

  return (
    <>
      <PageHeader
        title="Stakeholders"
        subtitle={`${data.stakeholders.length} organizations in the AYUSH ecosystem`}
        action={
          <button
            className="btn primary"
            onClick={() =>
              setEditing({
                name: '',
                category: 'Ayurveda',
                organization: '',
                email: '',
                phone: '',
                location: '',
                description: '',
              })
            }
          >
            <Plus size={17} /> Add stakeholder
          </button>
        }
      />
      <div className="toolbar">
        <label className="search">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stakeholders"
          />
        </label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option>All</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      {filtered.length ? (
        <div className="card-grid stakeholder-grid">
          {filtered.map((item) => (
            <article className="stakeholder-card" key={item.id}>
              <div className="card-top">
                <span className="avatar">
                  {item.name
                    .split(' ')
                    .map((word) => word[0])
                    .slice(0, 2)
                    .join('')}
                </span>
                <span className={`status ${item.status === 'Verified' ? 'green' : 'amber'}`}>
                  {item.status}
                </span>
              </div>
              <h3>{item.name}</h3>
              <p className="muted">{item.category}</p>
              <div className="card-meta">
                <span>
                  <MapPin size={14} />
                  {item.location}
                </span>
                <span>
                  <Mail size={14} />
                  {item.email}
                </span>
              </div>
              <div className="card-actions">
                <button className="btn secondary small" onClick={() => setDetail(item)}>
                  View details
                </button>
                <button className="icon-btn" onClick={() => setEditing(item)} aria-label="Edit">
                  <Pencil size={15} />
                </button>
                <button
                  className="icon-btn danger-text"
                  onClick={() => setConfirm(item)}
                  aria-label="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No stakeholders found"
          text="Try a different search or category."
        />
      )}
      {editing && (
        <StakeholderModal item={editing} onClose={() => setEditing(null)} onSave={save} />
      )}
      {detail && (
        <Modal
          title="Stakeholder details"
          onClose={() => setDetail(null)}
          footer={
            <button className="btn secondary" onClick={() => setDetail(null)}>
              Close
            </button>
          }
        >
          <Detail item={detail} />
        </Modal>
      )}
      {confirm && (
        <ConfirmDialog
          title="Delete stakeholder"
          message={`Delete ${confirm.name}? This action cannot be undone.`}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            updateCollection(
              'stakeholders',
              data.stakeholders.filter((item) => item.id !== confirm.id)
            );
            setConfirm(null);
            notify('Stakeholder deleted.');
          }}
        />
      )}
    </>
  );
}

function StakeholderModal({ item, onClose, onSave }) {
  const [form, setForm] = useState(item);
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  return (
    <Modal
      title={item.id ? 'Edit stakeholder' : 'Add stakeholder'}
      onClose={onClose}
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={() => onSave(form)}>
            Save stakeholder
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label>
          Organization name
          <input value={form.name} onChange={(e) => set('name', e.target.value)} />
        </label>
        <label>
          Category
          <select value={form.category} onChange={(e) => set('category', e.target.value)}>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Organization
          <input
            value={form.organization || ''}
            onChange={(e) => set('organization', e.target.value)}
          />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </label>
        <label>
          Phone
          <input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
        </label>
        <label>
          Location
          <input value={form.location} onChange={(e) => set('location', e.target.value)} />
        </label>
        <label className="full">
          Description
          <textarea
            value={form.description || ''}
            onChange={(e) => set('description', e.target.value)}
          />
        </label>
      </div>
    </Modal>
  );
}

function Detail({ item }) {
  return (
    <div className="detail-view">
      <div className="detail-hero">
        <span className="avatar large">
          {item.name
            .split(' ')
            .map((word) => word[0])
            .slice(0, 2)
            .join('')}
        </span>
        <div>
          <h2>{item.name}</h2>
          <p>{item.category}</p>
        </div>
      </div>
      <p>{item.description || 'No description has been added.'}</p>
      <div className="detail-list">
        <span>
          <MapPin size={16} />
          {item.location}
        </span>
        <span>
          <Mail size={16} />
          {item.email}
        </span>
        <span>
          <Phone size={16} />
          {item.phone || 'No phone provided'}
        </span>
      </div>
    </div>
  );
}
