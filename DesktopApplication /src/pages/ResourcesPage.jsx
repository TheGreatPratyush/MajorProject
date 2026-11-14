import React, { useState } from 'react';
import { Search, Plus, Library, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal, ConfirmDialog, PageHeader, EmptyState } from '../components/UI';
import { validateRequired } from '../services/businessLogic';

export default function ResourcesPage() {
  const { data, updateCollection, notify } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const categories = [
    'Research papers',
    'Government schemes',
    'Educational material',
    'Guidelines',
    'AYUSH publications',
  ];
  const filtered = data.resources.filter(
    (item) =>
      `${item.title} ${item.description}`.toLowerCase().includes(search.toLowerCase()) &&
      (category === 'All' || item.category === category)
  );

  const save = (form) => {
    if (
      Object.keys(
        validateRequired({ title: form.title, description: form.description, source: form.source })
      ).length
    )
      return notify('Complete all required fields.', 'error');
    if (editing.id) {
      updateCollection(
        'resources',
        data.resources.map((item) =>
          item.id === editing.id ? { ...form, id: item.id, sample: true } : item
        )
      );
      notify('Resource updated.');
    } else {
      updateCollection('resources', [
        ...data.resources,
        { ...form, id: `r${Date.now()}`, sample: true },
      ]);
      notify('Resource added.');
    }
    setEditing(null);
  };

  return (
    <>
      <PageHeader
        title="Resources"
        subtitle="Research, schemes and educational materials"
        action={
          <button
            className="btn primary"
            onClick={() =>
              setEditing({
                title: '',
                category: 'Research papers',
                description: '',
                source: '',
                link: '',
              })
            }
          >
            <Plus size={17} /> Add resource
          </button>
        }
      />
      <div className="toolbar">
        <label className="search">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources"
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
        <div className="resource-grid">
          {filtered.map((item) => (
            <article className="resource-card" key={item.id}>
              <div className="resource-icon">
                <Library size={20} />
              </div>
              <div className="resource-body">
                <span className="category-chip">{item.category}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <small>
                  {item.source} · {item.sample ? 'Sample resource' : 'Local resource'}
                </small>
              </div>
              <div className="card-actions">
                <button className="btn secondary small" onClick={() => setDetail(item)}>
                  Details
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
          icon={Library}
          title="No resources found"
          text="Try another search or category."
        />
      )}
      {editing && (
        <ResourceModal
          item={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
      {detail && (
        <Modal
          title="Resource details"
          onClose={() => setDetail(null)}
          footer={
            <>
              <button className="btn secondary" onClick={() => setDetail(null)}>
                Close
              </button>
              {detail.link && (
                <button
                  className="btn primary"
                  onClick={() => window.open(detail.link, '_blank', 'noopener,noreferrer')}
                >
                  Open external <ExternalLink size={15} />
                </button>
              )}
            </>
          }
        >
          <div className="detail-view">
            <span className="category-chip">{detail.category}</span>
            <h2>{detail.title}</h2>
            <p>{detail.description}</p>
            <small>{detail.source} · clearly marked sample resource</small>
          </div>
        </Modal>
      )}
      {confirm && (
        <ConfirmDialog
          title="Delete resource"
          message={`Delete "${confirm.title}"?`}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            updateCollection(
              'resources',
              data.resources.filter((item) => item.id !== confirm.id)
            );
            setConfirm(null);
            notify('Resource deleted.');
          }}
        />
      )}
    </>
  );
}

function ResourceModal({ item, categories, onClose, onSave }) {
  const [form, setForm] = useState(item);
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  return (
    <Modal
      title={item.id ? 'Edit resource' : 'Add resource'}
      onClose={onClose}
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={() => onSave(form)}>
            Save resource
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label className="full">
          Title
          <input value={form.title} onChange={(e) => set('title', e.target.value)} />
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
          Source
          <input value={form.source} onChange={(e) => set('source', e.target.value)} />
        </label>
        <label className="full">
          Description
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} />
        </label>
        <label className="full">
          External link (optional)
          <input value={form.link || ''} onChange={(e) => set('link', e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}
