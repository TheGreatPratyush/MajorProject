import React, { createContext, useContext, useEffect, useState } from 'react';
import { demoUsers, initialData } from '../data/demoData';
import { readStored, readUsers, saveStored, saveUsers } from '../utils/storage';
import { registerForEvent, cancelRegistration } from '../services/businessLogic';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [data, setData] = useState(() => ({
    stakeholders: readStored('stakeholders', initialData.stakeholders),
    events: readStored('events', initialData.events),
    resources: readStored('resources', initialData.resources),
    posts: readStored('posts', initialData.posts),
  }));
  const [users, setUsers] = useState(() => readUsers() || demoUsers);
  const [currentUser, setCurrentUser] = useState(() => readStored('session', null));
  const [toast, setToast] = useState(null);

  useEffect(() => saveStored('stakeholders', data.stakeholders), [data.stakeholders]);
  useEffect(() => saveStored('events', data.events), [data.events]);
  useEffect(() => saveStored('resources', data.resources), [data.resources]);
  useEffect(() => saveStored('posts', data.posts), [data.posts]);
  useEffect(() => saveUsers(users), [users]);
  useEffect(() => saveStored('session', currentUser), [currentUser]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const notify = (message, type = 'success') => setToast({ message, type, id: Date.now() });
  const updateCollection = (name, value) =>
    setData((old) => ({ ...old, [name]: typeof value === 'function' ? value(old[name]) : value }));

  const login = (email, password) => {
    const user = users.find(
      (item) =>
        item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password
    );
    if (!user) return { ok: false, error: 'Email or password is incorrect.' };
    setCurrentUser(user);
    notify(`Welcome back, ${user.name.split(' ')[0]}`);
    return { ok: true };
  };

  const register = (profile) => {
    if (users.some((item) => item.email.toLowerCase() === profile.email.trim().toLowerCase()))
      return { ok: false, error: 'An account already uses this email.' };
    const user = {
      ...profile,
      id: `u${Date.now()}`,
      role: 'Stakeholder',
      avatar: profile.name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    };
    setUsers((old) => [...old, user]);
    setCurrentUser(user);
    notify('Demo account created successfully');
    return { ok: true };
  };

  const logout = () => {
    setCurrentUser(null);
    saveStored('session', null);
    notify('You have been logged out');
  };

  const registerEvent = (eventId) => {
    const result = registerForEvent(data.events, eventId, currentUser.id);
    if (!result.ok) notify(result.error, 'error');
    else {
      updateCollection('events', result.events);
      notify(result.message);
    }
    return result;
  };

  const cancelEvent = (eventId) => {
    const result = cancelRegistration(data.events, eventId, currentUser.id);
    if (!result.ok) notify(result.error, 'error');
    else {
      updateCollection('events', result.events);
      notify(result.message);
    }
    return result;
  };

  const resetData = () => {
    setData({
      stakeholders: initialData.stakeholders,
      events: initialData.events,
      resources: initialData.resources,
      posts: initialData.posts,
    });
    setUsers(demoUsers);
    setCurrentUser(null);
    saveStored('session', null);
    notify('Demo data has been reset');
  };

  return (
    <AppContext.Provider
      value={{
        data,
        users,
        currentUser,
        setCurrentUser,
        setUsers,
        updateCollection,
        toast,
        setToast,
        notify,
        login,
        register,
        logout,
        registerEvent,
        cancelEvent,
        resetData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
