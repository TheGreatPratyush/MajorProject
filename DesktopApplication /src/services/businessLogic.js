export function validateRequired(fields) {
  return Object.entries(fields).reduce((errors, [key, value]) => {
    if (!String(value ?? '').trim()) errors[key] = 'This field is required.';
    return errors;
  }, {});
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

export function registerForEvent(events, eventId, userId) {
  const event = events.find((item) => item.id === eventId);
  if (!event) return { ok: false, error: 'Event not found.', events };
  if (event.registrations.includes(userId))
    return { ok: false, error: 'You are already registered for this event.', events };
  if (event.registrations.length >= Number(event.capacity))
    return {
      ok: false,
      error: 'This event is full. No additional registrations are available.',
      events,
    };
  const updated = events.map((item) =>
    item.id === eventId ? { ...item, registrations: [...item.registrations, userId] } : item
  );
  return {
    ok: true,
    events: updated,
    event: updated.find((item) => item.id === eventId),
    message: 'Registration confirmed.',
  };
}

export function cancelRegistration(events, eventId, userId) {
  const event = events.find((item) => item.id === eventId);
  if (!event) return { ok: false, error: 'Event not found.', events };
  if (!event.registrations.includes(userId))
    return { ok: false, error: 'You do not have a registration for this event.', events };
  const updated = events.map((item) =>
    item.id === eventId
      ? { ...item, registrations: item.registrations.filter((id) => id !== userId) }
      : item
  );
  return { ok: true, events: updated, message: 'Registration cancelled.' };
}

export function createEvent(events, event) {
  const duplicate = events.some(
    (item) =>
      item.title.toLowerCase() === event.title.trim().toLowerCase() && item.date === event.date
  );
  if (duplicate)
    return { ok: false, error: 'An event with this title and date already exists.', events };
  const item = { ...event, id: `e${Date.now()}`, registrations: [] };
  return { ok: true, events: [...events, item], event: item, message: 'Event created.' };
}

export function updateEvent(events, eventId, changes) {
  if (!events.some((item) => item.id === eventId))
    return { ok: false, error: 'Event not found.', events };
  const updated = events.map((item) => (item.id === eventId ? { ...item, ...changes } : item));
  return { ok: true, events: updated, message: 'Event updated.' };
}

export function deleteEvent(events, eventId) {
  if (!events.some((item) => item.id === eventId))
    return { ok: false, error: 'Event not found.', events };
  return {
    ok: true,
    events: events.filter((item) => item.id !== eventId),
    message: 'Event deleted.',
  };
}
