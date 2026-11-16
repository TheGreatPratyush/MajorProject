const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const notifications = require("../modules/notifications/notifications.validation");

test("notification list query applies defaults", () => {
  const result = notifications.listNotificationQuerySchema.safeParse({});
  assert.equal(result.success, true);
  assert.deepEqual(result.data, { page: 1, limit: 10 });
});

test("notification list query maps isRead text to booleans", () => {
  const unread = notifications.listNotificationQuerySchema.parse({ isRead: "false" });
  const read = notifications.listNotificationQuerySchema.parse({ isRead: "true" });
  assert.equal(unread.isRead, false);
  assert.equal(read.isRead, true);
});

test("notification list query rejects invalid values and unknown fields", () => {
  const schema = notifications.listNotificationQuerySchema;
  assert.equal(schema.safeParse({ isRead: "yes" }).success, false);
  assert.equal(schema.safeParse({ type: "INVALID" }).success, false);
  assert.equal(schema.safeParse({ limit: "101" }).success, false);
  assert.equal(schema.safeParse({ page: "0" }).success, false);
  assert.equal(schema.safeParse({ userId: crypto.randomUUID() }).success, false);
});

test("notification list query accepts every NotificationType", () => {
  for (const type of notifications.notificationTypes) {
    assert.equal(notifications.listNotificationQuerySchema.safeParse({ type }).success, true);
  }
});

test("notification id must be a UUID", () => {
  assert.equal(notifications.notificationIdSchema.safeParse("abc").success, false);
  assert.equal(notifications.notificationIdSchema.safeParse(crypto.randomUUID()).success, true);
});

test("internal notification payload is validated", () => {
  const schema = notifications.createNotificationSchema;
  const valid = {
    userId: crypto.randomUUID(),
    type: "CONNECTION",
    title: "New connection request",
    message: "Someone wants to connect.",
  };

  const parsed = schema.parse(valid);
  assert.equal(parsed.relatedEntityId, null);

  assert.equal(schema.safeParse({ ...valid, title: "  " }).success, false);
  assert.equal(schema.safeParse({ ...valid, type: "UNKNOWN" }).success, false);
  assert.equal(schema.safeParse({ ...valid, relatedEntityId: "not-a-uuid" }).success, false);
  assert.equal(schema.safeParse({ ...valid, isRead: true }).success, false);
});

const dashboard = require("../modules/dashboard/dashboard.validation");

test("dashboard activity query applies defaults and bounds", () => {
  const schema = dashboard.activityQuerySchema;
  assert.deepEqual(schema.parse({}), { page: 1, limit: 10 });
  assert.deepEqual(schema.parse({ page: "2", limit: "50" }), { page: 2, limit: 50 });
  assert.equal(schema.safeParse({ limit: "0" }).success, false);
  assert.equal(schema.safeParse({ limit: "51" }).success, false);
  assert.equal(schema.safeParse({ limit: "abc" }).success, false);
  assert.equal(schema.safeParse({ page: "0" }).success, false);
  assert.equal(schema.safeParse({ page: "1.5" }).success, false);
  assert.equal(schema.safeParse({ userId: "x" }).success, false);
});

test("dashboard activity depth is capped at page * limit", () => {
  const schema = dashboard.activityQuerySchema;
  const max = dashboard.MAX_ACTIVITY_DEPTH;
  assert.equal(max, 500);
  assert.equal(schema.safeParse({ page: "10", limit: "50" }).success, true);
  assert.equal(schema.safeParse({ page: "500", limit: "1" }).success, true);

  const tooDeep = schema.safeParse({ page: "11", limit: "50" });
  assert.equal(tooDeep.success, false);
  assert.deepEqual(tooDeep.error.issues.map((issue) => issue.path.join(".")), ["page"]);
});
