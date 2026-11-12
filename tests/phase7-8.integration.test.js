require("dotenv/config");

const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { hashToken } = require("../modules/auth/auth.service");
const crypto = require("crypto");
const { prisma } = require("../database/db");

const BASE = process.env.TEST_API_URL || "http://127.0.0.1:5001/api/v1";
const PASSWORD = "Phase7_8_Test_Password_2026";
const tag = crypto.randomUUID().slice(0, 8);
const users = {};
const emails = [];

async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  let json;
  try {
    json = await response.json();
  } catch {
    json = {};
  }

  return { status: response.status, ok: response.ok, body: json };
}

function idOf(result) {
  const data = result.body?.data;
  const candidates = [
    data?.id,
    data?.resource?.id,
    data?.event?.id,
    data?.post?.id,
    data?.comment?.id,
    data?.registration?.id,
  ];

  const id = candidates.find(Boolean);
  assert.ok(id, `Expected an ID in response: ${JSON.stringify(result.body)}`);
  return id;
}

function expectSuccess(result, expectedStatus) {
  assert.equal(
    result.status,
    expectedStatus,
    JSON.stringify(result.body)
  );
  assert.equal(result.body.success, true, JSON.stringify(result.body));
}

function expectDenied(result) {
  assert.ok(
    !result.ok,
    `Expected request to be denied, received ${result.status}: ${JSON.stringify(result.body)}`
  );
}

async function createUser(key, role, verificationStatus) {
  const email = `phase78-${tag}-${key}@example.test`;
  emails.push(email);

  const user = await prisma.user.create({
    data: {
      name: `Phase 7-8 Test ${key}`,
      email,
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      role,
      ...(role === "GOVERNMENT"
        ? {
            governmentProfile: {
              create: {
                departmentName: "Integration Test Department",
                verificationStatus,
              },
            },
          }
        : {}),
    },
  });

  assert.ok(process.env.JWT_SECRET, "JWT_SECRET must be configured");

  const sessionId = crypto.randomUUID();
  const token = jwt.sign(
    { userId: user.id, role: user.role, sessionId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );

  const decoded = jwt.decode(token);

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(decoded.exp * 1000),
    },
  });

  users[key] = { id: user.id, token, role };
}

async function setup() {
  await createUser("admin", "ADMIN");
  await createUser("gov", "GOVERNMENT", "VERIFIED");
  await createUser("gov2", "GOVERNMENT", "VERIFIED");
  await createUser("pendingGov", "GOVERNMENT", "PENDING");
  await createUser("incubator", "INCUBATOR");
  await createUser("startup", "STARTUP");
  await createUser("startup2", "STARTUP");
  await createUser("public", "PUBLIC");
}

async function resourceTests() {
  const resourceBody = {
    title: `Integration Test Scheme ${tag}`,
    description: "Temporary integration test resource.",
    category: "GOVERNMENT_SCHEME",
    sourceUrl: "https://example.com/test-scheme",
  };

  const anonymousList = await request("/resources");
  expectSuccess(anonymousList, 200);

  expectDenied(await request("/resources", {
    method: "POST",
    token: users.startup.token,
    body: resourceBody,
  }));

  expectDenied(await request("/resources", {
    method: "POST",
    token: users.pendingGov.token,
    body: resourceBody,
  }));

  const created = await request("/resources", {
    method: "POST",
    token: users.gov.token,
    body: resourceBody,
  });
  expectSuccess(created, 201);
  const resourceId = idOf(created);

  const publicDetail = await request(`/resources/${resourceId}`);
  expectSuccess(publicDetail, 200);

  expectDenied(await request(`/resources/${resourceId}`, {
    method: "PATCH",
    token: users.gov2.token,
    body: { title: "Unauthorized edit" },
  }));

  expectDenied(await request(`/resources/${resourceId}`, {
    method: "DELETE",
    token: users.gov2.token,
  }));

  const ownerEdit = await request(`/resources/${resourceId}`, {
    method: "PATCH",
    token: users.gov.token,
    body: { title: `Updated Scheme ${tag}` },
  });
  expectSuccess(ownerEdit, 200);

  const adminEdit = await request(`/resources/${resourceId}`, {
    method: "PATCH",
    token: users.admin.token,
    body: { title: `Admin Updated Scheme ${tag}` },
  });
  expectSuccess(adminEdit, 200);

  await prisma.governmentProfile.update({
    where: { userId: users.gov.id },
    data: { verificationStatus: "REJECTED" },
  });

  expectDenied(await request(`/resources/${resourceId}`, {
    method: "PATCH",
    token: users.gov.token,
    body: { title: "Should be blocked" },
  }));

  expectSuccess(await request(`/resources/${resourceId}`), 200);

  const adminDelete = await request(`/resources/${resourceId}`, {
    method: "DELETE",
    token: users.admin.token,
  });
  expectSuccess(adminDelete, 200);

  const adminResource = await request("/resources", {
    method: "POST",
    token: users.admin.token,
    body: { ...resourceBody, title: `Admin Resource ${tag}` },
  });
  expectSuccess(adminResource, 201);
}

function futureDate(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function createPublishedEvent(title, capacity = 1) {
  const created = await request("/events", {
    method: "POST",
    token: users.incubator.token,
    body: {
      title,
      description: "Temporary integration test event.",
      eventType: "WEBINAR",
      location: "Online",
      startDate: futureDate(5),
      endDate: futureDate(5.1),
      registrationDeadline: futureDate(3),
      capacity,
    },
  });

  expectSuccess(created, 201);
  const eventId = idOf(created);

  const hidden = await request(`/events/${eventId}`);
  expectDenied(hidden);

  const published = await request(`/events/${eventId}/publish`, {
    method: "POST",
    token: users.incubator.token,
  });
  expectSuccess(published, 200);

  return eventId;
}

async function eventTests() {
  expectDenied(await request("/events", {
    method: "POST",
    token: users.startup.token,
    body: {
      title: "Unauthorized event",
      description: "Should fail",
      eventType: "WEBINAR",
      startDate: futureDate(5),
      endDate: futureDate(5.1),
    },
  }));

  const eventId = await createPublishedEvent(`Capacity Event ${tag}`, 1);

  const publicDetail = await request(`/events/${eventId}`);
  expectSuccess(publicDetail, 200);

  const registration = await request(`/events/${eventId}/register`, {
    method: "POST",
    token: users.startup.token,
  });
  expectSuccess(registration, 200);

  expectDenied(await request(`/events/${eventId}/register`, {
    method: "POST",
    token: users.startup.token,
  }));

  expectDenied(await request(`/events/${eventId}/register`, {
    method: "POST",
    token: users.startup2.token,
  }));

  expectDenied(await request(`/events/${eventId}/registrations`, {
    token: users.startup.token,
  }));

  const organizerRegistrations = await request(
    `/events/${eventId}/registrations`,
    { token: users.incubator.token }
  );
  expectSuccess(organizerRegistrations, 200);

  const cancelled = await request(`/events/${eventId}/register`, {
    method: "DELETE",
    token: users.startup.token,
  });
  expectSuccess(cancelled, 200);

  const reregistered = await request(`/events/${eventId}/register`, {
    method: "POST",
    token: users.startup.token,
  });
  expectSuccess(reregistered, 200);

  expectDenied(await request(`/events/${eventId}`, {
    method: "DELETE",
    token: users.incubator.token,
  }));

  expectDenied(await request(`/events/${eventId}`, {
    method: "PATCH",
    token: users.gov2.token,
    body: { title: "Unauthorized event edit" },
  }));

  const adminCancel = await request(`/events/${eventId}/cancel`, {
    method: "POST",
    token: users.admin.token,
  });
  expectSuccess(adminCancel, 200);
}

async function communityTests() {
  const post = await request("/community/posts", {
    method: "POST",
    token: users.public.token,
    body: { content: `Public test post ${tag}` },
  });
  expectSuccess(post, 201);
  const postId = idOf(post);

  expectSuccess(await request("/community/posts"), 200);
  expectSuccess(await request(`/community/posts/${postId}`), 200);

  const comment = await request(`/community/posts/${postId}/comments`, {
    method: "POST",
    token: users.startup.token,
    body: { content: `Test comment ${tag}` },
  });
  expectSuccess(comment, 201);
  const commentId = idOf(comment);

  expectDenied(await request(`/community/posts/${postId}`, {
    method: "PATCH",
    token: users.startup.token,
    body: { content: "Unauthorized post edit" },
  }));

  expectDenied(await request(`/community/comments/${commentId}`, {
    method: "PATCH",
    token: users.public.token,
    body: { content: "Unauthorized comment edit" },
  }));

  const adminPostEdit = await request(`/community/posts/${postId}`, {
    method: "PATCH",
    token: users.admin.token,
    body: { content: `Admin edited post ${tag}` },
  });
  expectSuccess(adminPostEdit, 200);

  const adminCommentEdit = await request(`/community/comments/${commentId}`, {
    method: "PATCH",
    token: users.admin.token,
    body: { content: `Admin edited comment ${tag}` },
  });
  expectSuccess(adminCommentEdit, 200);

  const authorDelete = await request(`/community/comments/${commentId}`, {
    method: "DELETE",
    token: users.startup.token,
  });
  expectSuccess(authorDelete, 200);

  const adminDelete = await request(`/community/posts/${postId}`, {
    method: "DELETE",
    token: users.admin.token,
  });
  expectSuccess(adminDelete, 200);
}

test("Phase 7 and 8 database integration", { timeout: 120000 }, async (t) => {
  try {
    const health = await fetch(`${BASE}/resources`);
    assert.equal(health.status, 200, "Backend must be running on port 5001");

    await setup();

    await t.test("Phase 7: resources and government verification", resourceTests);
    await t.test("Phase 8: events and registrations", eventTests);
    await t.test("Phase 8: community posts and comments", communityTests);
  } finally {
    if (emails.length) {
      await prisma.user.deleteMany({
        where: { email: { in: emails } },
      });
    }
    await prisma.$disconnect();
  }
});
