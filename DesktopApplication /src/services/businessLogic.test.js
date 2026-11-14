import test from 'node:test';
import assert from 'node:assert/strict';
import { registerForEvent, cancelRegistration, createEvent } from './businessLogic.js';

test('registerForEvent prevents duplicate registration', () => {
  const events = [{ id: 'e1', title: 'Forum', capacity: 10, registrations: ['user'] }];
  const result = registerForEvent(events, 'e1', 'user');
  assert.equal(result.ok, false);
  assert.match(result.error, /already registered/);
});

test('registerForEvent rejects a full event', () => {
  const events = [{ id: 'e1', title: 'Forum', capacity: 1, registrations: ['admin'] }];
  const result = registerForEvent(events, 'e1', 'user');
  assert.equal(result.ok, false);
  assert.match(result.error, /full/);
});

test('cancelRegistration removes only the selected user', () => {
  const events = [{ id: 'e1', title: 'Forum', capacity: 10, registrations: ['admin', 'user'] }];
  const result = cancelRegistration(events, 'e1', 'user');
  assert.equal(result.ok, true);
  assert.deepEqual(result.events[0].registrations, ['admin']);
});

test('createEvent rejects duplicate title and date', () => {
  const events = [{ id: 'e1', title: 'Forum', date: '2026-12-14', registrations: [] }];
  const result = createEvent(events, { title: 'Forum', date: '2026-12-14', capacity: 20 });
  assert.equal(result.ok, false);
});
