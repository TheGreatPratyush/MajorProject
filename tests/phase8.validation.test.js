const test = require("node:test");
const assert = require("node:assert/strict");
const events = require("../modules/events/events.validation");
const community = require("../modules/community/community.validation");

test("event creation accepts the frozen schema fields", () => {
  const result = events.createEventSchema.safeParse({
    title: "AYUSH Startup Workshop",
    description: "A workshop for AYUSH ecosystem founders.",
    eventType: "WORKSHOP",
    startDate: "2027-01-10T10:00:00+05:30",
    endDate: "2027-01-10T12:00:00+05:30",
    registrationDeadline: "2027-01-09T23:59:00+05:30",
    capacity: 100,
  });
  assert.equal(result.success, true);
});

test("event creation rejects invalid event type and reversed dates", () => {
  const result = events.createEventSchema.safeParse({
    title: "AYUSH Workshop",
    description: "A sufficiently long event description.",
    eventType: "INVALID",
    startDate: "2027-01-10T12:00:00+05:30",
    endDate: "2027-01-10T10:00:00+05:30",
  });
  assert.equal(result.success, false);
});

test("event update rejects an empty object and unknown fields", () => {
  assert.equal(events.updateEventSchema.safeParse({}).success, false);
  assert.equal(events.updateEventSchema.safeParse({ organizerId: "bad" }).success, false);
});

test("community post and comment require non-empty content", () => {
  assert.equal(community.createPostSchema.safeParse({ content: "  " }).success, false);
  assert.equal(community.createCommentSchema.safeParse({ content: "A useful comment" }).success, true);
});

test("community payloads reject client-supplied ownership fields", () => {
  assert.equal(community.createPostSchema.safeParse({ content: "Hello", userId: "fake" }).success, false);
});
