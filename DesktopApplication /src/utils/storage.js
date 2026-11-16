const PREFIX = 'startup-ayush-desktop';

export function readStored(key, fallback) {
  try {
    const raw = localStorage.getItem(`${PREFIX}:${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveStored(key, value) {
  localStorage.setItem(`${PREFIX}:${key}`, JSON.stringify(value));
}

export function readUsers() {
  return readStored('users', null);
}

export function saveUsers(users) {
  saveStored('users', users);
}
