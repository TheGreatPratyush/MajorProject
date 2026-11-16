import React from 'react';
import {
  Users,
  CalendarDays,
  Library,
  MessageSquare,
  ArrowRight,
  Plus,
  Search,
  UserPlus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function DashboardPage({ navigate }) {
  const { data, currentUser } = useApp();
  const upcoming = data.events
    .filter((event) => new Date(`${event.date}T00:00:00`) >= new Date())
    .sort((a, b) => a.date.localeCompare(b.date));
  const counts = [
    {
      label: 'Total stakeholders',
      value: data.stakeholders.length,
      icon: Users,
      color: 'green',
      page: 'stakeholders',
    },
    {
      label: 'Upcoming events',
      value: upcoming.length,
      icon: CalendarDays,
      color: 'blue',
      page: 'events',
    },
    {
      label: 'Available resources',
      value: data.resources.length,
      icon: Library,
      color: 'orange',
      page: 'resources',
    },
    {
      label: 'Community posts',
      value: data.posts.length,
      icon: MessageSquare,
      color: 'purple',
      page: 'community',
    },
  ];
  const categories = [
    'Ayurveda',
    'Yoga and Naturopathy',
    'Unani',
    'Siddha',
    'Homeopathy',
    'Research institutions',
    'Educational institutions',
    'AYUSH startups',
  ];
  return (
    <>
      <div className="dashboard-welcome">
        <div>
          <p>SATURDAY, 14 NOVEMBER</p>
          <h1>Good morning, {currentUser.name.split(' ')[0]}</h1>
          <span>Here is your AYUSH ecosystem overview.</span>
        </div>
        <button className="btn primary" onClick={() => navigate('events')}>
          <Plus size={17} /> Create event
        </button>
      </div>
      <div className="summary-grid">
        {counts.map(({ label, value, icon: Icon, color, page }) => (
          <button className="summary-card" key={label} onClick={() => navigate(page)}>
            <div className={`summary-icon ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <p>{label}</p>
              <strong>{value}</strong>
            </div>
            <ArrowRight className="summary-arrow" size={16} />
          </button>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel upcoming-panel">
          <div className="panel-header">
            <div>
              <h2>Upcoming events</h2>
              <p>Events you may want to attend</p>
            </div>
            <button className="text-btn" onClick={() => navigate('events')}>
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div className="compact-list">
            {upcoming.slice(0, 3).map((event) => (
              <button className="compact-event" key={event.id} onClick={() => navigate('events')}>
                <div className="mini-date">
                  <strong>{new Date(`${event.date}T12:00:00`).getDate()}</strong>
                  <span>
                    {new Date(`${event.date}T12:00:00`).toLocaleDateString(undefined, {
                      month: 'short',
                    })}
                  </span>
                </div>
                <div>
                  <strong>{event.title}</strong>
                  <span>
                    {event.venue} · {event.registrations.length}/{event.capacity} registered
                  </span>
                </div>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
        </section>
        <section className="panel quick-panel">
          <div className="panel-header">
            <div>
              <h2>Quick actions</h2>
            </div>
          </div>
          <button onClick={() => navigate('stakeholders')}>
            <span>
              <UserPlus size={18} />
            </span>
            <div>
              <strong>Add stakeholder</strong>
              <small>Grow the ecosystem directory</small>
            </div>
            <ArrowRight size={15} />
          </button>
          <button onClick={() => navigate('events')}>
            <span>
              <CalendarDays size={18} />
            </span>
            <div>
              <strong>Create event</strong>
              <small>Publish a new activity</small>
            </div>
            <ArrowRight size={15} />
          </button>
          <button onClick={() => navigate('resources')}>
            <span>
              <Library size={18} />
            </span>
            <div>
              <strong>Add resource</strong>
              <small>Share a useful reference</small>
            </div>
            <ArrowRight size={15} />
          </button>
        </section>
        <section className="panel activity-panel">
          <div className="panel-header">
            <div>
              <h2>Recent activity</h2>
            </div>
          </div>
          <div className="activity-list">
            <div>
              <span className="activity-dot green" />{' '}
              <p>
                <strong>Stakeholder directory updated</strong>
                <small>{data.stakeholders.length} organizations available</small>
              </p>
            </div>
            <div>
              <span className="activity-dot blue" />{' '}
              <p>
                <strong>Community has {data.posts.length} posts</strong>
                <small>
                  {data.posts.reduce((n, p) => n + p.comments.length, 0)} comments across
                  discussions
                </small>
              </p>
            </div>
            <div>
              <span className="activity-dot orange" />{' '}
              <p>
                <strong>{data.resources.length} resources in the library</strong>
                <small>Ready for stakeholders to view</small>
              </p>
            </div>
          </div>
        </section>
        <section className="panel statistics-panel">
          <div className="panel-header">
            <div>
              <h2>Stakeholder statistics</h2>
              <p>Distribution by category</p>
            </div>
          </div>
          <div className="category-bars">
            {categories.map((category) => {
              const count = data.stakeholders.filter((item) => item.category === category).length;
              const max = Math.max(
                ...categories.map(
                  (name) => data.stakeholders.filter((item) => item.category === name).length
                ),
                1
              );
              return (
                <div className="bar-row" key={category}>
                  <span>{category}</span>
                  <div>
                    <i style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
