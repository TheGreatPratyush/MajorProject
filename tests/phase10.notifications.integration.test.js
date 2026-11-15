require("dotenv/config");

const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { hashToken } = require("../modules/auth/auth.service");
const { prisma } = require("../database/db");
const { notifyUser, notifyUsers } = require("../modules/notifications/notifications.service");

const BASE = process.env.TEST_API_URL || "http://127.0.0.1:5001/api/v1";
const tag = crypto.randomUUID().slice(0, 8);
const users = {};
const emails = [];

async function request(path, { method = "GET", token } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  let body;
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  return { status: response.status, body };
}

function expectStatus(result, status) {
  assert.equal(result.status, status, JSON.stringify(result.body));
}

async function createUser(key, role) {
  const email = `phase10-${tag}-${key}@example.test`;
  emails.push(email);

  const user = await prisma.user.create({
    data: {
      name: `Phase 10 Test ${key}`,
      email,
      passwordHash: await bcrypt.hash("Phase10_Test_Password_2026", 4),
      role,
    },
  });

  const sessionId = crypto.randomUUID();
  const token = jwt.sign(
    { userId: user.id, role: user.role, sessionId },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(jwt.decode(token).exp * 1000),
    },
  });

  users[key] = { id: user.id, token };
}

// Rows are created one at a time with distinct timestamps so ordering is deterministic.
async function seedNotifications() {
  const base = Date.now() - 60000;
  const seeds = [
    { type: "CONNECTION", title: "First" },
    { type: "MENTORSHIP", title: "Second" },
    { type: "EVENT", title: "Third" },
  ];

  const ids = [];
  for (const [index, seed] of seeds.entries()) {
    const row = await prisma.notification.create({
      data: {
        userId: users.owner.id,
        type: seed.type,
        title: seed.title,
        message: `Phase 10 test ${tag}`,
        createdAt: new Date(base + index * 1000),
      },
    });
    ids.push(row.id);
  }

  return ids;
}

async function helperTests() {
  // Self-notification is skipped.
  const skipped = await notifyUser(prisma, {
    userId: users.owner.id,
    type: "SYSTEM",
    title: "Self",
    message: "Should not be stored",
  }, users.owner.id);
  assert.equal(skipped, null);

  // A normal notification is stored and returned without userId.
  const created = await notifyUser(prisma, {
    userId: users.other.id,
    type: "CONNECTION",
    title: "Helper single",
    message: "Stored by notifyUser",
    relatedEntityId: crypto.randomUUID(),
  }, users.owner.id);
  assert.equal(created.isRead, false);
  assert.equal(created.userId, undefined);

  // notifyUsers skips the actor and duplicate recipients.
  const many = await notifyUsers(prisma, [
    { userId: users.other.id, type: "EVENT", title: "Bulk", message: "One" },
    { userId: users.other.id, type: "EVENT", title: "Bulk", message: "Duplicate" },
    { userId: users.third.id, type: "EVENT", title: "Bulk", message: "Two" },
    { userId: users.owner.id, type: "EVENT", title: "Bulk", message: "Actor" },
  ], users.owner.id);
  assert.equal(many.count, 2);

  assert.deepEqual(await notifyUsers(prisma, [], null), { count: 0 });

  // A rolled-back transaction leaves no notification behind.
  const marker = `Rollback ${tag}`;
  await assert.rejects(
    prisma.$transaction(async (tx) => {
      await notifyUser(tx, {
        userId: users.other.id,
        type: "OTHER",
        title: marker,
        message: "Must be rolled back",
      });
      throw new Error("force rollback");
    }),
    /force rollback/
  );
  assert.equal(await prisma.notification.count({ where: { title: marker } }), 0);

  // Invalid payloads are rejected before reaching the database.
  await assert.rejects(
    notifyUser(prisma, { userId: users.other.id, type: "BAD", title: "x", message: "y" }),
    { name: "ZodError" }
  );

  // Clean the helper rows so the API tests start from a known state.
  await prisma.notification.deleteMany({
    where: { userId: { in: [users.other.id, users.third.id] } },
  });
}

async function apiTests() {
  const [firstId, secondId, thirdId] = await seedNotifications();

  // Authentication is required on every route.
  for (const [method, path] of [
    ["GET", "/notifications"],
    ["GET", "/notifications/unread-count"],
    ["PATCH", "/notifications/read-all"],
    ["PATCH", `/notifications/${firstId}/read`],
    ["DELETE", `/notifications/${firstId}`],
  ]) {
    expectStatus(await request(path, { method }), 401);
  }

  // List: newest first, envelope and pagination meta, no userId exposed.
  const list = await request("/notifications", { token: users.owner.token });
  expectStatus(list, 200);
  assert.equal(list.body.success, true);
  assert.deepEqual(list.body.data.items.map((n) => n.id), [thirdId, secondId, firstId]);
  assert.deepEqual(list.body.meta, { page: 1, limit: 10, total: 3, totalPages: 1 });
  assert.equal(list.body.data.items[0].userId, undefined);

  const paged = await request("/notifications?page=2&limit=2", { token: users.owner.token });
  expectStatus(paged, 200);
  assert.deepEqual(paged.body.data.items.map((n) => n.id), [firstId]);
  assert.equal(paged.body.meta.totalPages, 2);

  const byType = await request("/notifications?type=EVENT", { token: users.owner.token });
  assert.deepEqual(byType.body.data.items.map((n) => n.id), [thirdId]);

  // A page past the end is empty but still reports the real total.
  const pastEnd = await request("/notifications?page=5&limit=2", { token: users.owner.token });
  expectStatus(pastEnd, 200);
  assert.deepEqual(pastEnd.body.data.items, []);
  assert.deepEqual(pastEnd.body.meta, { page: 5, limit: 2, total: 3, totalPages: 2 });

  // Filters combine (type AND isRead).
  const combined = await request("/notifications?type=MENTORSHIP&isRead=false", { token: users.owner.token });
  assert.deepEqual(combined.body.data.items.map((n) => n.id), [secondId]);
  const noMatch = await request("/notifications?type=MENTORSHIP&isRead=true", { token: users.owner.token });
  assert.deepEqual(noMatch.body.data.items, []);
  assert.equal(noMatch.body.meta.total, 0);

  // Validation errors.
  expectStatus(await request("/notifications?isRead=yes", { token: users.owner.token }), 400);
  expectStatus(await request("/notifications?userId=x", { token: users.owner.token }), 400);
  expectStatus(await request("/notifications/not-a-uuid/read", { method: "PATCH", token: users.owner.token }), 400);
  expectStatus(await request("/notifications/not-a-uuid", { method: "DELETE", token: users.owner.token }), 400);

  // Ownership: another user (even ADMIN) cannot see, read or delete them.
  const otherList = await request("/notifications", { token: users.other.token });
  expectStatus(otherList, 200);
  assert.equal(otherList.body.data.items.length, 0);
  expectStatus(await request(`/notifications/${firstId}/read`, { method: "PATCH", token: users.other.token }), 404);
  expectStatus(await request(`/notifications/${firstId}`, { method: "DELETE", token: users.other.token }), 404);
  const otherReadAll = await request("/notifications/read-all", { method: "PATCH", token: users.other.token });
  assert.equal(otherReadAll.body.data.updated, 0);

  const untouched = await prisma.notification.findUnique({ where: { id: firstId } });
  assert.equal(untouched.isRead, false);

  // Unread count.
  const count = await request("/notifications/unread-count", { token: users.owner.token });
  expectStatus(count, 200);
  assert.deepEqual(count.body.data, { count: 3 });

  // Mark one as read; repeating it is idempotent.
  const read = await request(`/notifications/${firstId}/read`, { method: "PATCH", token: users.owner.token });
  expectStatus(read, 200);
  assert.equal(read.body.data.isRead, true);
  expectStatus(await request(`/notifications/${firstId}/read`, { method: "PATCH", token: users.owner.token }), 200);

  const unreadOnly = await request("/notifications?isRead=false", { token: users.owner.token });
  assert.deepEqual(unreadOnly.body.data.items.map((n) => n.id), [thirdId, secondId]);
  const readOnly = await request("/notifications?isRead=true", { token: users.owner.token });
  assert.deepEqual(readOnly.body.data.items.map((n) => n.id), [firstId]);

  // Mark all as read.
  const readAll = await request("/notifications/read-all", { method: "PATCH", token: users.owner.token });
  expectStatus(readAll, 200);
  assert.deepEqual(readAll.body.data, { updated: 2 });
  const readAllAgain = await request("/notifications/read-all", { method: "PATCH", token: users.owner.token });
  assert.deepEqual(readAllAgain.body.data, { updated: 0 });
  const zero = await request("/notifications/unread-count", { token: users.owner.token });
  assert.equal(zero.body.data.count, 0);

  // Delete is permanent; deleting again is 404.
  const deleted = await request(`/notifications/${secondId}`, { method: "DELETE", token: users.owner.token });
  expectStatus(deleted, 200);
  assert.deepEqual(deleted.body.data, { id: secondId });
  assert.equal(await prisma.notification.count({ where: { id: secondId } }), 0);
  expectStatus(await request(`/notifications/${secondId}`, { method: "DELETE", token: users.owner.token }), 404);
  expectStatus(await request(`/notifications/${crypto.randomUUID()}/read`, { method: "PATCH", token: users.owner.token }), 404);
}

test("Phase 10 notifications integration", { timeout: 60000 }, async (t) => {
  try {
    const health = await fetch(`${BASE}/health`);
    assert.equal(health.status, 200, "Backend must be running on port 5001");
    assert.ok(process.env.JWT_SECRET, "JWT_SECRET must be configured");

    await createUser("owner", "STARTUP");
    await createUser("other", "ADMIN");
    await createUser("third", "PUBLIC");

    await t.test("notification helper", helperTests);
    await t.test("notification API", apiTests);
  } finally {
    if (emails.length) {
      await prisma.user.deleteMany({ where: { email: { in: emails } } });
    }
    await prisma.$disconnect();
  }
});
