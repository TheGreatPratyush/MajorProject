require("dotenv/config");

const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { hashToken } = require("../modules/auth/auth.service");
const { prisma } = require("../database/db");

const BASE = process.env.TEST_API_URL || "http://127.0.0.1:5001/api/v1";
const tag = crypto.randomUUID().slice(0, 8);
const users = {};
const emails = [];
const ids = {};

async function request(path, token) {
  const response = await fetch(`${BASE}${path}`, {
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
  const email = `phase10-dash-${tag}-${key}@example.test`;
  emails.push(email);

  const user = await prisma.user.create({
    data: {
      name: `Dash ${key} ${tag}`,
      email,
      passwordHash: await bcrypt.hash("Phase10_Dash_Password_2026", 4),
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

  users[key] = { id: user.id, role, name: user.name, token };
}

// Timestamps are staggered so the activity order is deterministic:
// t(1) is the oldest record, t(6) the newest.
const base = Date.now() - 600000;
const t = (n) => new Date(base + n * 1000);
const day = 24 * 60 * 60 * 1000;

async function seed() {
  const { startup, investor, mentor, incubator, government } = users;

  await prisma.startupProfile.create({
    data: {
      userId: startup.id,
      startupName: `Dash Startup ${tag}`,
      description: "Phase 10 dashboard test",
      category: "AYURVEDA",
      stage: "IDEA",
    },
  });

  await prisma.incubatorProfile.create({
    data: {
      userId: incubator.id,
      organizationName: `Dash Incubator ${tag}`,
      description: "Phase 10 dashboard test",
      verificationStatus: "VERIFIED",
    },
  });

  ids.connSent = (await prisma.connectionRequest.create({
    data: { senderId: startup.id, receiverId: investor.id, createdAt: t(1), updatedAt: t(1) },
  })).id;

  ids.connReceived = (await prisma.connectionRequest.create({
    data: { senderId: mentor.id, receiverId: startup.id, status: "ACCEPTED", createdAt: t(2), updatedAt: t(2) },
  })).id;

  ids.mentorship = (await prisma.mentorshipApplication.create({
    data: { applicantId: startup.id, mentorId: mentor.id, createdAt: t(3), updatedAt: t(3) },
  })).id;

  const program = await prisma.incubationProgram.create({
    data: {
      ownerId: incubator.id,
      programName: `Dash Program ${tag}`,
      description: "Phase 10 dashboard test",
      status: "PUBLISHED",
    },
  });

  await prisma.incubationProgram.create({
    data: {
      ownerId: incubator.id,
      programName: `Dash Draft ${tag}`,
      description: "Phase 10 dashboard test",
    },
  });

  ids.application = (await prisma.programApplication.create({
    data: { programId: program.id, startupId: startup.id, createdAt: t(4), updatedAt: t(4) },
  })).id;

  const liveEvent = await prisma.event.create({
    data: {
      organizerId: government.id,
      title: `Dash Live Event ${tag}`,
      description: "Phase 10 dashboard test",
      eventType: "WEBINAR",
      startDate: new Date(Date.now() + day),
      endDate: new Date(Date.now() + 2 * day),
      status: "PUBLISHED",
    },
  });

  const cancelledEvent = await prisma.event.create({
    data: {
      organizerId: government.id,
      title: `Dash Cancelled Event ${tag}`,
      description: "Phase 10 dashboard test",
      eventType: "WORKSHOP",
      startDate: new Date(Date.now() + day),
      endDate: new Date(Date.now() + 2 * day),
      status: "CANCELLED",
    },
  });

  ids.regLive = (await prisma.eventRegistration.create({
    data: { eventId: liveEvent.id, userId: startup.id, createdAt: t(5) },
  })).id;

  ids.regCancelled = (await prisma.eventRegistration.create({
    data: { eventId: cancelledEvent.id, userId: startup.id, createdAt: t(6) },
  })).id;

  await prisma.resource.create({
    data: {
      publisherId: government.id,
      title: `Dash Resource ${tag}`,
      description: "Phase 10 dashboard test",
      category: "FUNDING",
      sourceUrl: "https://example.test/resource",
    },
  });

  await prisma.communityPost.createMany({
    data: [
      { userId: startup.id, content: "Visible post" },
      { userId: startup.id, content: "Hidden post", status: "HIDDEN" },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { userId: startup.id, title: "One", message: "Unread" },
      { userId: startup.id, title: "Two", message: "Unread" },
      { userId: startup.id, title: "Three", message: "Read", isRead: true },
    ],
  });
}

const zeros = (values) => Object.fromEntries(values.map((v) => [v, 0]));
const MENTORSHIP = ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED", "COMPLETED"];
const APPLICATION = ["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"];
const PROGRAM = ["DRAFT", "PUBLISHED", "CLOSED", "COMPLETED"];
const EVENT = ["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"];

async function summaryTests() {
  const { startup, investor, mentor, incubator, government, publicUser, admin } = users;

  expectStatus(await request("/dashboard/summary"), 401);
  expectStatus(await request("/dashboard/activity"), 401);

  const adminResult = await request("/dashboard/summary", admin.token);
  expectStatus(adminResult, 403);
  assert.equal(adminResult.body.success, false);
  expectStatus(await request("/dashboard/activity", admin.token), 403);

  // STARTUP
  const s = await request("/dashboard/summary", startup.token);
  expectStatus(s, 200);
  assert.equal(s.body.success, true);
  assert.equal(s.body.meta, null);
  assert.deepEqual(s.body.data, {
    role: "STARTUP",
    profile: { exists: true, verificationStatus: "PENDING" },
    metrics: {
      notifications: { unread: 2 },
      connections: { pendingReceived: 0, pendingSent: 1, accepted: 1 },
      events: { activeRegistrations: 1 },
      community: { posts: 1 },
      programApplications: { byStatus: { ...zeros(APPLICATION), PENDING: 1 } },
      mentorship: { sent: { byStatus: { ...zeros(MENTORSHIP), PENDING: 1 } } },
    },
  });

  // INVESTOR: common block only, profile model without verification.
  const i = await request("/dashboard/summary", investor.token);
  expectStatus(i, 200);
  assert.deepEqual(i.body.data, {
    role: "INVESTOR",
    profile: { exists: false, verificationStatus: null },
    metrics: {
      notifications: { unread: 0 },
      connections: { pendingReceived: 1, pendingSent: 0, accepted: 0 },
      events: { activeRegistrations: 0 },
      community: { posts: 0 },
    },
  });

  // MENTOR
  const m = await request("/dashboard/summary", mentor.token);
  expectStatus(m, 200);
  assert.deepEqual(m.body.data.metrics.connections, { pendingReceived: 0, pendingSent: 0, accepted: 1 });
  assert.deepEqual(m.body.data.metrics.mentorship, {
    received: { byStatus: { ...zeros(MENTORSHIP), PENDING: 1 } },
  });
  assert.equal(m.body.data.metrics.programApplications, undefined);

  // INCUBATOR
  const inc = await request("/dashboard/summary", incubator.token);
  expectStatus(inc, 200);
  assert.deepEqual(inc.body.data.profile, { exists: true, verificationStatus: "VERIFIED" });
  assert.deepEqual(inc.body.data.metrics.programs, {
    byStatus: { ...zeros(PROGRAM), DRAFT: 1, PUBLISHED: 1 },
  });
  assert.deepEqual(inc.body.data.metrics.programApplications, {
    received: { byStatus: { ...zeros(APPLICATION), PENDING: 1 } },
  });
  assert.deepEqual(inc.body.data.metrics.organizedEvents, { byStatus: zeros(EVENT) });

  // GOVERNMENT
  const g = await request("/dashboard/summary", government.token);
  expectStatus(g, 200);
  assert.deepEqual(g.body.data.metrics.resources, { published: 1 });
  assert.deepEqual(g.body.data.metrics.organizedEvents, {
    byStatus: { ...zeros(EVENT), PUBLISHED: 1, CANCELLED: 1 },
  });
  assert.equal(g.body.data.metrics.programs, undefined);

  // PUBLIC: no profile model, common block only.
  const p = await request("/dashboard/summary", publicUser.token);
  expectStatus(p, 200);
  assert.deepEqual(p.body.data.profile, { exists: false, verificationStatus: null });
  assert.deepEqual(Object.keys(p.body.data.metrics).sort(), ["community", "connections", "events", "notifications"]);
}

async function activityTests() {
  const { startup, investor, mentor, incubator, government, publicUser } = users;
  const summary = (u) => ({ id: u.id, name: u.name, role: u.role });

  const a = await request("/dashboard/activity", startup.token);
  expectStatus(a, 200);
  assert.equal(a.body.meta, null);

  const items = a.body.data.items;
  assert.deepEqual(items.map((x) => [x.kind, x.id]), [
    ["EVENT_REGISTRATION", ids.regCancelled],
    ["EVENT_REGISTRATION", ids.regLive],
    ["PROGRAM_APPLICATION", ids.application],
    ["MENTORSHIP", ids.mentorship],
    ["CONNECTION", ids.connReceived],
    ["CONNECTION", ids.connSent],
  ]);

  const byId = Object.fromEntries(items.map((x) => [x.id, x]));
  assert.deepEqual(byId[ids.connSent], {
    kind: "CONNECTION",
    id: ids.connSent,
    status: "PENDING",
    title: "Connection request sent",
    counterpart: summary(investor),
    updatedAt: t(1).toISOString(),
  });
  assert.equal(byId[ids.connReceived].title, "Connection request received");
  assert.deepEqual(byId[ids.connReceived].counterpart, summary(mentor));
  assert.equal(byId[ids.mentorship].title, "Mentorship request sent");
  assert.deepEqual(byId[ids.mentorship].counterpart, summary(mentor));
  assert.equal(byId[ids.application].title, `Dash Program ${tag}`);
  assert.deepEqual(byId[ids.application].counterpart, summary(incubator));
  assert.equal(byId[ids.regLive].status, "REGISTERED");
  assert.deepEqual(byId[ids.regLive].counterpart, summary(government));
  assert.equal(byId[ids.regLive].updatedAt, t(5).toISOString());

  // Limit keeps the newest records.
  const limited = await request("/dashboard/activity?limit=2", startup.token);
  assert.deepEqual(limited.body.data.items.map((x) => x.id), [ids.regCancelled, ids.regLive]);

  expectStatus(await request("/dashboard/activity?limit=0", startup.token), 400);
  expectStatus(await request("/dashboard/activity?limit=51", startup.token), 400);
  expectStatus(await request("/dashboard/activity?userId=x", startup.token), 400);

  // Other roles see only records they are part of, from their own side.
  const mentorFeed = (await request("/dashboard/activity", mentor.token)).body.data.items;
  assert.deepEqual(mentorFeed.map((x) => [x.kind, x.title]), [
    ["MENTORSHIP", "Mentorship request received"],
    ["CONNECTION", "Connection request sent"],
  ]);
  assert.deepEqual(mentorFeed[0].counterpart, summary(startup));

  const incubatorFeed = (await request("/dashboard/activity", incubator.token)).body.data.items;
  assert.deepEqual(incubatorFeed.map((x) => x.id), [ids.application]);
  assert.deepEqual(incubatorFeed[0].counterpart, summary(startup));

  const investorFeed = (await request("/dashboard/activity", investor.token)).body.data.items;
  assert.deepEqual(investorFeed.map((x) => [x.id, x.title]), [[ids.connSent, "Connection request received"]]);

  // Organizing an event is not a registration; no records means an empty feed.
  assert.deepEqual((await request("/dashboard/activity", government.token)).body.data.items, []);
  assert.deepEqual((await request("/dashboard/activity", publicUser.token)).body.data.items, []);
}

test("Phase 10 dashboard integration", { timeout: 60000 }, async (t) => {
  try {
    const health = await fetch(`${BASE}/health`);
    assert.equal(health.status, 200, "Backend must be running on port 5001");
    assert.ok(process.env.JWT_SECRET, "JWT_SECRET must be configured");

    await createUser("startup", "STARTUP");
    await createUser("investor", "INVESTOR");
    await createUser("mentor", "MENTOR");
    await createUser("incubator", "INCUBATOR");
    await createUser("government", "GOVERNMENT");
    await createUser("publicUser", "PUBLIC");
    await createUser("admin", "ADMIN");
    await seed();

    await t.test("dashboard summary", summaryTests);
    await t.test("dashboard activity", activityTests);
  } finally {
    if (emails.length) {
      await prisma.user.deleteMany({ where: { email: { in: emails } } });
    }
    await prisma.$disconnect();
  }
});
