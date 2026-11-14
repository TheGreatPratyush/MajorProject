import React, { useState } from 'react';
import { CalendarDays, Search, Plus, MapPin, Users, Clock, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { createEvent, updateEvent, deleteEvent, validateRequired } from '../services/businessLogic';
import { Modal, ConfirmDialog, PageHeader, EmptyState } from '../components/UI';

export default function EventsPage() {
  const { data, currentUser, updateCollection, notify, registerEvent, cancelEvent } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const filtered = data.events.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) &&
      (category === 'All' || item.category === category)
  );
  const categories = ['Conference', 'Workshop', 'Networking', 'Webinar'];

  const save = (form) => {
    const errors = validateRequired({
      title: form.title,
      description: form.description,
      date: form.date,
      venue: form.venue,
      capacity: form.capacity,
      organizer: form.organizer,
    });
    if (Object.keys(errors).length) return notify('Complete all required fields.', 'error');
    if (Number(form.capacity) < 1) return notify('Capacity must be at least 1.', 'error');
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(form.date) ||
      new Date(`${form.date}T00:00:00`) < new Date(new Date().setHours(0, 0, 0, 0))
    )
      return notify('Enter a valid future event date.', 'error');
    const payload = { ...form, capacity: Number(form.capacity) };
    const result = editing.id
      ? updateEvent(data.events, editing.id, payload)
      : createEvent(data.events, payload);
    if (!result.ok) return notify(result.error, 'error');
    updateCollection('events', result.events);
    setEditing(null);
    notify(result.message);
  };

  const remove = () => {
    const result = deleteEvent(data.events, confirm.id);
    if (!result.ok) return notify(result.error, 'error');
    updateCollection('events', result.events);
    setConfirm(null);
    notify(result.message);
  };

  return (
    <>
      <PageHeader
        title="Events"
        subtitle="Discover and manage AYUSH ecosystem events"
        action={
          <button
            className="btn primary"
            onClick={() =>
              setEditing({
                title: '',
                description: '',
                category: 'Conference',
                date: '',
                venue: '',
                capacity: 50,
                organizer: '',
              })
            }
          >
            <Plus size={17} /> Create event
          </button>
        }
      />
      <div className="toolbar">
        <label className="search">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events"
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
        <div className="event-list">
          {filtered.map((item) => {
            const registered = item.registrations.includes(currentUser.id);
            const full = item.registrations.length >= Number(item.capacity);
            return (
              <article className="event-row" key={item.id}>
                <div className="date-block">
                  <strong>
                    {new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, {
                      day: '2-digit',
                    })}
                  </strong>
                  <span>
                    {new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, {
                      month: 'short',
                    })}
                  </span>
                </div>

                <div className="event-main">
                  <div className="event-labels">
                    <span className="category-chip">{item.category}</span>
                    {registered && <span className="status green">Registered</span>}
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <div className="event-meta">
                    <span>
                      <MapPin size={14} />
                      {item.venue}
                    </span>
                    <span>
                      <Users size={14} />
                      {item.registrations.length}/{item.capacity}
                    </span>
                    <span>
                      <Clock size={14} />
                      {item.organizer}
                    </span>
                  </div>
                </div>

                <div className="event-actions">
                  <button className="btn secondary small" onClick={() => setDetail(item)}>
                    View
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => setEditing(item)}
                    aria-label="Edit event"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-btn danger-text"
                    onClick={() => setConfirm(item)}
                    aria-label="Delete event"
                  >
                    <Trash2 size={15} />
                  </button>
                  {registered ? (
                    <button
                      className="btn danger-outline small"
                      onClick={() => cancelEvent(item.id)}
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      className="btn primary small"
                      disabled={full}
                      onClick={() => registerEvent(item.id)}
                    >
                      {full ? 'Event full' : 'Register'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="No events found"
          text="Create an event or adjust your search."
        />
      )}
      {editing && <EventModal item={editing} onClose={() => setEditing(null)} onSave={save} />}
      {detail && (
        <Modal
          title="Event details"
          onClose={() => setDetail(null)}
          footer={
            <>
              {detail.registrations.includes(currentUser.id) ? (
                <button
                  className="btn danger-outline"
                  onClick={() => {
                    cancelEvent(detail.id);
                    setDetail(null);
                  }}
                >
                  Cancel registration
                </button>
              ) : (
                <button
                  className="btn primary"
                  disabled={detail.registrations.length >= detail.capacity}
                  onClick={() => {
                    registerEvent(detail.id);
                    setDetail(null);
                  }}
                >
                  {detail.registrations.length >= detail.capacity
                    ? 'Event full'
                    : 'Register for event'}
                </button>
              )}
            </>
          }
        >
          <EventDetail item={detail} />
        </Modal>
      )}
      {confirm && (
        <ConfirmDialog
          title="Delete event"
          message={`Delete "${confirm.title}"? Existing registrations will be removed.`}
          onClose={() => setConfirm(null)}
          onConfirm={remove}
        />
      )}
    </>
  );
}

function EventModal({ item, onClose, onSave }) {
  const [form, setForm] = useState(item);
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  return (
    <Modal
      title={item.id ? 'Edit event' : 'Create event'}
      onClose={onClose}
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={() => onSave(form)}>
            {item.id ? 'Save changes' : 'Create event'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label className="full">
          Event title
          <input value={form.title} onChange={(e) => set('title', e.target.value)} />
        </label>
        <label className="full">
          Description
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} />
        </label>
        <label>
          Category
          <select value={form.category} onChange={(e) => set('category', e.target.value)}>
            {['Conference', 'Workshop', 'Networking', 'Webinar'].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
        </label>
        <label>
          Venue
          <input value={form.venue} onChange={(e) => set('venue', e.target.value)} />
        </label>
        <label>
          Capacity
          <input
            type="number"
            min="1"
            value={form.capacity}
            onChange={(e) => set('capacity', e.target.value)}
          />
        </label>
        <label className="full">
          Organizer
          <input value={form.organizer} onChange={(e) => set('organizer', e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}

function EventDetail({ item }) {
  return (
    <div className="detail-view">
      <div className="event-detail-date">
        <CalendarDays size={20} />
        <div>
          <strong>
            {new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </strong>
          <span>{item.category}</span>
        </div>
      </div>
      <p>{item.description}</p>
      <div className="detail-list">
        <span>
          <MapPin size={16} />
          {item.venue}
        </span>
        <span>
          <Users size={16} />
          {item.registrations.length} of {item.capacity} registrations
        </span>
        <span>
          <Clock size={16} />
          {item.organizer}
        </span>
      </div>
    </div>
  );
}
