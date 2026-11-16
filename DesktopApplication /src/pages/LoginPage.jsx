import React, { useState } from 'react';
import { Leaf, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isValidEmail, validateRequired } from '../services/businessLogic';

export default function LoginPage() {
  const { login, register } = useApp();
  const [mode, setMode] = useState('login');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    organization: '',
    category: 'AYUSH startups',
  });
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    setError('');
    const required =
      mode === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };
    if (Object.keys(validateRequired(required)).length)
      return setError('Please complete all required fields.');
    if (!isValidEmail(form.email)) return setError('Enter a valid email address.');
    if (mode === 'login') {
      const result = login(form.email, form.password);
      if (!result.ok) setError(result.error);
    } else {
      if (form.password.length < 6) return setError('Password must contain at least 6 characters.');
      const result = register(form);
      if (!result.ok) setError(result.error);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-brand">
        <div className="brand-mark large">
          <Leaf size={30} />
        </div>
        <h1>Startup-AYUSH</h1>
        <p>Desktop</p>
        <div className="brand-illustration">
          <div className="leaf leaf-one" />
          <div className="leaf leaf-two" />
          <div className="leaf leaf-three" />
        </div>
        <div className="brand-footer">
          <ShieldMark /> Professional AYUSH ecosystem workspace
        </div>
      </section>
      <section className="login-panel">
        <form className="login-form" onSubmit={submit}>
          <div className="login-heading">
            <span>{mode === 'login' ? 'Welcome back' : 'Create your demo account'}</span>
            <h2>{mode === 'login' ? 'Sign in to your workspace' : 'Join the AYUSH community'}</h2>
          </div>
          {mode === 'register' && (
            <label>
              Full name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Enter your full name"
              />
            </label>
          )}
          <label>
            Email address
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@example.com"
            />
          </label>
          {mode === 'register' && (
            <label>
              Organization
              <input
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                placeholder="Organization name"
              />
            </label>
          )}
          <label>
            Password
            <div className="password-input">
              <input
                type={show ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label="Toggle password visibility"
              >
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="btn primary login-button" type="submit">
            {mode === 'login' ? <LogIn size={17} /> : <UserPlus size={17} />}{' '}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          <button
            type="button"
            className="mode-switch"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
          >
            {mode === 'login'
              ? 'New to Startup-AYUSH? Create a demo account'
              : 'Already have an account? Sign in'}
          </button>
          {mode === 'login' && (
            <div className="demo-accounts">
              <strong>Demo accounts</strong>
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, email: 'admin@startupayush.demo', password: 'Demo@123' })
                }
              >
                <span>Administrator</span>
                <code>admin@startupayush.demo</code>
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, email: 'user@startupayush.demo', password: 'Demo@123' })
                }
              >
                <span>Stakeholder</span>
                <code>user@startupayush.demo</code>
              </button>
              <small>
                Password: <code>Demo@123</code>
              </small>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}

function ShieldMark() {
  return <span className="shield-mark">AYUSH</span>;
}
