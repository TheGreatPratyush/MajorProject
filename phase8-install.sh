#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
if [ ! -f "$ROOT/package.json" ] || [ ! -f "$ROOT/prisma/schema.prisma" ] || [ ! -f "$ROOT/index.js" ]; then
  printf 'Run this installer from the majorProject backend root.\n'
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
cp index.js "index.js.phase8-backup-$STAMP"
cp package.json "package.json.phase8-backup-$STAMP"

mkdir -p modules/events modules/community tests

cat > modules/events/events.validation.js <<'EOF'
const { z } = require("zod");

const eventTypes = ["WEBINAR", "WORKSHOP", "CONFERENCE", "NETWORKING", "OTHER"];
const eventStatuses = ["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"];

const nullableText = (max) => z.string().trim().max(max).nullable().optional();
const dateTime = z.string().datetime({ offset: true }).transform((value) => new Date(value));

const createEventSchema = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10).max(5000),
  eventType: z.enum(eventTypes),
  location: nullableText(250),
  onlineMeetingUrl: z.string().url().max(2048).nullable().optional(),
  startDate: dateTime,
  endDate: dateTime,
  registrationDeadline: z.string().datetime({ offset: true }).nullable().optional()
    .transform((value) => value == null ? value : new Date(value)),
  capacity: z.number().int().positive().nullable().optional(),
}).strict().refine((data) => data.endDate > data.startDate, {
  path: ["endDate"], message: "End date must be after start date.",
}).refine((data) => !data.registrationDeadline || data.registrationDeadline <= data.startDate, {
  path: ["registrationDeadline"], message: "Registration deadline must be on or before the event start.",
});

const updateEventSchema = z.object({
  title: z.string().trim().min(3).max(150).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  eventType: z.enum(eventTypes).optional(),
  location: nullableText(250),
  onlineMeetingUrl: z.string().url().max(2048).nullable().optional(),
  startDate: dateTime.optional(),
  endDate: dateTime.optional(),
  registrationDeadline: z.string().datetime({ offset: true }).nullable().optional()
    .transform((value) => value == null ? value : new Date(value)),
  capacity: z.number().int().positive().nullable().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, "Provide at least one field to update.");

const eventIdSchema = z.string().uuid("A valid event UUID is required.");
const registrationListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(["REGISTERED", "CANCELLED"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();

const eventListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().min(1).max(100).optional(),
  eventType: z.enum(eventTypes).optional(),
  status: z.enum(eventStatuses).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
}).strict();

module.exports = {
  createEventSchema, updateEventSchema, eventIdSchema, eventListQuerySchema,
  eventTypes, eventStatuses,
};
EOF

cat > modules/events/events.service.js <<'EOF'
const { prisma } = require("../../database/db");

const ORGANIZER_ROLES = ["INCUBATOR", "ACCELERATOR", "GOVERNMENT", "ADMIN"];
const EVENT_SELECT = {
  id: true, organizerId: true, title: true, description: true, eventType: true,
  location: true, onlineMeetingUrl: true, startDate: true, endDate: true,
  registrationDeadline: true, capacity: true, status: true, createdAt: true,
  updatedAt: true,
  organizer: { select: { id: true, name: true, role: true } },
};

class EventError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.errors = [];
  }
}
function fail(code, message) { throw new EventError(code, message); }
function pagination(f) { return { skip: (f.page - 1) * f.limit, take: f.limit }; }
function meta(page, limit, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
function requireOrganizer(user) {
  if (!user || !ORGANIZER_ROLES.includes(user.role)) fail(403, "Only incubators, accelerators, government accounts and administrators can organize events.");
}
function assertEventDates(data) {
  if (data.startDate && data.endDate && data.endDate <= data.startDate) fail(400, "End date must be after start date.");
  if (data.registrationDeadline && data.startDate && data.registrationDeadline > data.startDate) fail(400, "Registration deadline must be on or before the event start.");
}
async function lockEvent(tx, id) {
  const rows = await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id" = ${id}::uuid FOR UPDATE`;
  return rows.length === 1;
}
async function getOwnedEvent(user, id, tx = prisma) {
  const event = await tx.event.findUnique({ where: { id }, select: { id: true, organizerId: true, status: true } });
  if (!event || (user.role !== "ADMIN" && event.organizerId !== user.id)) fail(404, "Event not found.");
  return event;
}
async function listEvents(filters) {
  const conditions = [{ status: "PUBLISHED" }];
  if (filters.search) conditions.push({ OR: [
    { title: { contains: filters.search, mode: "insensitive" } },
    { description: { contains: filters.search, mode: "insensitive" } },
    { location: { contains: filters.search, mode: "insensitive" } },
  ] });
  if (filters.eventType) conditions.push({ eventType: filters.eventType });
  const where = { AND: conditions };
  const [items, total] = await Promise.all([
    prisma.event.findMany({ where, select: EVENT_SELECT, ...pagination(filters), orderBy: [{ startDate: filters.sortOrder }, { id: "asc" }] }),
    prisma.event.count({ where }),
  ]);
  return { items, meta: meta(filters.page, filters.limit, total) };
}
async function listMyEvents(user, filters) {
  requireOrganizer(user);
  const where = { ...(user.role === "ADMIN" ? {} : { organizerId: user.id }), ...(filters.status ? { status: filters.status } : {}) };
  const [items, total] = await Promise.all([
    prisma.event.findMany({ where, select: EVENT_SELECT, ...pagination(filters), orderBy: [{ startDate: filters.sortOrder }, { id: "asc" }] }),
    prisma.event.count({ where }),
  ]);
  return { items, meta: meta(filters.page, filters.limit, total) };
}
async function getEvent(user, id) {
  const event = await prisma.event.findUnique({ where: { id }, select: EVENT_SELECT });
  if (!event || (event.status !== "PUBLISHED" && (!user || (user.role !== "ADMIN" && event.organizerId !== user.id)))) fail(404, "Event not found.");
  return event;
}
async function createEvent(user, data) {
  requireOrganizer(user);
  assertEventDates(data);
  return prisma.event.create({ data: { ...data, organizerId: user.id, status: "DRAFT" }, select: EVENT_SELECT });
}
async function updateEvent(user, id, data) {
  requireOrganizer(user);
  assertEventDates(data);
  const existing = await getOwnedEvent(user, id);
  if (["CANCELLED", "COMPLETED"].includes(existing.status)) fail(409, "Cancelled or completed events cannot be edited.");
  const current = await prisma.event.findUnique({ where: { id }, select: { startDate: true, endDate: true, registrationDeadline: true } });
  const merged = { ...current, ...data };
  assertEventDates(merged);
  const result = await prisma.event.updateMany({
    where: user.role === "ADMIN" ? { id } : { id, organizerId: user.id },
    data,
  });
  if (result.count !== 1) fail(409, "The event changed. Please try again.");
  return prisma.event.findUnique({ where: { id }, select: EVENT_SELECT });
}
async function publishEvent(user, id) {
  requireOrganizer(user);
  const event = await getOwnedEvent(user, id);
  if (event.status !== "DRAFT") fail(409, "Only draft events can be published.");
  const result = await prisma.event.updateMany({
    where: user.role === "ADMIN" ? { id, status: "DRAFT" } : { id, organizerId: user.id, status: "DRAFT" },
    data: { status: "PUBLISHED" },
  });
  if (result.count !== 1) fail(409, "The event status changed. Please try again.");
  return prisma.event.findUnique({ where: { id }, select: EVENT_SELECT });
}
async function transitionEvent(user, id, status) {
  requireOrganizer(user);
  const allowed = status === "CANCELLED" ? ["DRAFT", "PUBLISHED"] : ["PUBLISHED"];
  const event = await getOwnedEvent(user, id);
  if (!allowed.includes(event.status)) fail(409, `Event cannot be changed to ${status} from ${event.status}.`);
  const result = await prisma.event.updateMany({
    where: user.role === "ADMIN" ? { id, status: event.status } : { id, organizerId: user.id, status: event.status },
    data: { status },
  });
  if (result.count !== 1) fail(409, "The event status changed. Please try again.");
  return prisma.event.findUnique({ where: { id }, select: EVENT_SELECT });
}
async function deleteEvent(user, id) {
  requireOrganizer(user);
  return prisma.$transaction(async (tx) => {
    await lockEvent(tx, id);
    const event = await getOwnedEvent(user, id, tx);
    const count = await tx.eventRegistration.count({ where: { eventId: id } });
    if (count > 0) fail(409, "Events with registration records cannot be deleted. Cancel or close the event instead.");
    const result = await tx.event.deleteMany({ where: user.role === "ADMIN" ? { id } : { id, organizerId: user.id } });
    if (result.count !== 1) fail(409, "The event could not be deleted.");
    return { id, status: event.status };
  });
}
async function register(user, eventId) {
  return prisma.$transaction(async (tx) => {
    if (!(await lockEvent(tx, eventId))) fail(404, "Event not found.");
    const event = await tx.event.findUnique({ where: { id: eventId }, select: { id: true, status: true, registrationDeadline: true, capacity: true, startDate: true } });
    if (!event || event.status !== "PUBLISHED") fail(409, "This event is not accepting registrations.");
    const now = new Date();
    const registrationCutoff = event.registrationDeadline || event.startDate;\n    if (now > registrationCutoff) fail(409, "The registration deadline has passed.");
    if (now >= event.startDate) fail(409, "This event has already started.");
    const existing = await tx.eventRegistration.findUnique({ where: { eventId_userId: { eventId, userId: user.id } } });
    if (existing?.registrationStatus === "REGISTERED") fail(409, "You are already registered for this event.");
    if (event.capacity !== null) {
      const count = await tx.eventRegistration.count({ where: { eventId, registrationStatus: "REGISTERED" } });
      if (count >= event.capacity) fail(409, "This event has reached its registration capacity.");
    }
    if (existing) {
      return tx.eventRegistration.update({
        where: { id: existing.id },
        data: { registrationStatus: "REGISTERED" },
        include: { event: { select: EVENT_SELECT } },
      });
    }
    return tx.eventRegistration.create({
      data: { eventId, userId: user.id, registrationStatus: "REGISTERED" },
      include: { event: { select: EVENT_SELECT } },
    });
  });
}
async function cancelRegistration(user, eventId) {
  return prisma.$transaction(async (tx) => {
    if (!(await lockEvent(tx, eventId))) fail(404, "Event not found.");
    const event = await tx.event.findUnique({ where: { id: eventId }, select: { id: true, registrationDeadline: true } });
    if (!event) fail(404, "Event not found.");
    const cancellationCutoff = event.registrationDeadline || (await tx.event.findUnique({ where: { id: eventId }, select: { startDate: true } })).startDate;\n    if (new Date() > cancellationCutoff) fail(409, "The registration cancellation cutoff has passed.");
    const registration = await tx.eventRegistration.findUnique({ where: { eventId_userId: { eventId, userId: user.id } } });
    if (!registration || registration.registrationStatus !== "REGISTERED") fail(404, "Active registration not found.");
    return tx.eventRegistration.update({ where: { id: registration.id }, data: { registrationStatus: "CANCELLED" }, select: { id: true, eventId: true, registrationStatus: true, createdAt: true } });
  });
}
async function myRegistrations(user, filters) {
  const where = { userId: user.id, ...(filters.status ? { registrationStatus: filters.status } : {}) };
  const [items, total] = await Promise.all([
    prisma.eventRegistration.findMany({ where, include: { event: { select: EVENT_SELECT } }, ...pagination(filters), orderBy: [{ createdAt: filters.sortOrder }, { id: "asc" }] }),
    prisma.eventRegistration.count({ where }),
  ]);
  return { items, meta: meta(filters.page, filters.limit, total) };
}
async function eventRegistrations(user, id, filters) {
  requireOrganizer(user);
  await getOwnedEvent(user, id);
  const where = { eventId: id, ...(filters.status ? { registrationStatus: filters.status } : {}) };
  const [items, total] = await Promise.all([
    prisma.eventRegistration.findMany({ where, select: { id: true, eventId: true, registrationStatus: true, createdAt: true, user: { select: { id: true, name: true, role: true } } }, ...pagination(filters), orderBy: [{ createdAt: filters.sortOrder }, { id: "asc" }] }),
    prisma.eventRegistration.count({ where }),
  ]);
  return { items, meta: meta(filters.page, filters.limit, total) };
}
module.exports = {
  EventError, listEvents, listMyEvents, getEvent, createEvent, updateEvent,
  publishEvent, cancelEvent: (u, id) => transitionEvent(u, id, "CANCELLED"),
  completeEvent: (u, id) => transitionEvent(u, id, "COMPLETED"),
  deleteEvent, register, cancelRegistration, myRegistrations, eventRegistrations,
};
EOF

cat > modules/events/events.controller.js <<'EOF'
const v = require("./events.validation");
const s = require("./events.service");

function validationError(res, error) {
  return res.status(400).json({ success: false, message: "Validation failed.", errors: error.issues.map((x) => ({ field: x.path.join("."), message: x.message })) });
}
function handleError(res, error) {
  if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message, errors: error.errors || [] });
  if (error.code === "P2002") return res.status(409).json({ success: false, message: "A registration already exists.", errors: [] });
  console.error("Events module error:", error);
  return res.status(500).json({ success: false, message: "An unexpected server error occurred.", errors: [] });
}
const run = (fn, status = 200, message = "Request completed successfully.") => async (req, res) => {
  try {
    const result = await fn(req);
    return res.status(status).json({ success: true, message, data: result?.items ? { items: result.items } : result, meta: result?.meta || null });
  } catch (e) { return handleError(res, e); }
};
const parse = (schema, value, res) => {
  const r = schema.safeParse(value);
  if (!r.success) { validationError(res, r.error); return null; }
  return r.data;
};
const listEvents = run((req) => {
  const q = parse(v.eventListQuerySchema, req.query, req.res);
  return q && s.listEvents(q);
}, 200, "Events retrieved successfully.");
const listMyEvents = run((req) => {
  const q = parse(v.eventListQuerySchema, req.query, req.res);
  return q && s.listMyEvents(req.user, q);
}, 200, "Your events retrieved successfully.");
const getEvent = run((req) => {
  const id = parse(v.eventIdSchema, req.params.id, req.res);
  return id && s.getEvent(req.user, id);
}, 200, "Event retrieved successfully.");
const createEvent = run((req) => {
  const d = parse(v.createEventSchema, req.body, req.res);
  return d && s.createEvent(req.user, d);
}, 201, "Event created as draft.");
const updateEvent = run((req) => {
  const id = parse(v.eventIdSchema, req.params.id, req.res);
  const d = parse(v.updateEventSchema, req.body, req.res);
  return id && d && s.updateEvent(req.user, id, d);
}, 200, "Event updated successfully.");
const action = (method, message) => run((req) => {
  const id = parse(v.eventIdSchema, req.params.id, req.res);
  return id && s[method](req.user, id);
}, 200, message);
const publishEvent = action("publishEvent", "Event published successfully.");
const cancelEvent = action("cancelEvent", "Event cancelled successfully.");
const completeEvent = action("completeEvent", "Event completed successfully.");
const deleteEvent = action("deleteEvent", "Event deleted successfully.");
const register = action("register", "Event registration successful.");
const cancelRegistration = action("cancelRegistration", "Event registration cancelled.");
const myRegistrations = run((req) => {
  const q = parse(v.eventListQuerySchema, req.query, req.res);
  return q && s.myRegistrations(req.user, q);
}, 200, "Your registrations retrieved successfully.");
const eventRegistrations = run((req) => {
  const id = parse(v.eventIdSchema, req.params.id, req.res);
  const q = parse(v.eventListQuerySchema, req.query, req.res);
  return id && q && s.eventRegistrations(req.user, id, q);
}, 200, "Event registrations retrieved successfully.");
module.exports = { listEvents, listMyEvents, getEvent, createEvent, updateEvent, publishEvent, cancelEvent, completeEvent, deleteEvent, register, cancelRegistration, myRegistrations, eventRegistrations };
EOF

cat > modules/events/events.routes.js <<'EOF'
const express = require("express");
const { authenticateToken, optionalAuthenticateToken } = require("../../middleware/auth.middleware");
const c = require("./events.controller");
const router = express.Router();

router.get("/", c.listEvents);
router.get("/mine", authenticateToken, c.listMyEvents);
router.get("/registrations/mine", authenticateToken, c.myRegistrations);
router.post("/", authenticateToken, c.createEvent);
router.get("/:id/registrations", authenticateToken, c.eventRegistrations);
router.post("/:id/publish", authenticateToken, c.publishEvent);
router.post("/:id/cancel", authenticateToken, c.cancelEvent);
router.post("/:id/complete", authenticateToken, c.completeEvent);
router.post("/:id/register", authenticateToken, c.register);
router.delete("/:id/register", authenticateToken, c.cancelRegistration);
router.patch("/:id", authenticateToken, c.updateEvent);
router.delete("/:id", authenticateToken, c.deleteEvent);
router.get("/:id", optionalAuthenticateToken, c.getEvent);
module.exports = router;
EOF

cat > modules/community/community.validation.js <<'EOF'
const { z } = require("zod");
const postIdSchema = z.string().uuid("A valid post UUID is required.");
const commentIdSchema = z.string().uuid("A valid comment UUID is required.");
const createPostSchema = z.object({ content: z.string().trim().min(1).max(10000) }).strict();
const updatePostSchema = createPostSchema;
const createCommentSchema = z.object({ content: z.string().trim().min(1).max(5000) }).strict();
const updateCommentSchema = createCommentSchema;
const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();
module.exports = { postIdSchema, commentIdSchema, createPostSchema, updatePostSchema, createCommentSchema, updateCommentSchema, listQuerySchema };
EOF

cat > modules/community/community.service.js <<'EOF'
const { prisma } = require("../../database/db");
class CommunityError extends Error {
  constructor(statusCode, message) { super(message); this.statusCode = statusCode; this.errors = []; }
}
function fail(code, message) { throw new CommunityError(code, message); }
function pagination(f) { return { skip: (f.page - 1) * f.limit, take: f.limit }; }
function meta(page, limit, total) { return { page, limit, total, totalPages: Math.ceil(total / limit) }; }
const author = { select: { id: true, name: true, role: true } };
const postSelect = { id: true, userId: true, content: true, status: true, createdAt: true, updatedAt: true, user: author };
const commentSelect = { id: true, postId: true, userId: true, content: true, createdAt: true, updatedAt: true, user: author };
async function visiblePost(user, id) {
  const post = await prisma.communityPost.findUnique({ where: { id }, select: postSelect });
  if (!post || (post.status === "HIDDEN" && (!user || (user.role !== "ADMIN" && post.userId !== user.id)))) fail(404, "Post not found.");
  return post;
}
async function listPosts(filters) {
  const where = { status: "ACTIVE" };
  const [items, total] = await Promise.all([
    prisma.communityPost.findMany({ where, select: postSelect, ...pagination(filters), orderBy: [{ createdAt: filters.sortOrder }, { id: "asc" }] }),
    prisma.communityPost.count({ where }),
  ]);
  return { items, meta: meta(filters.page, filters.limit, total) };
}
async function getPost(user, id) { return visiblePost(user, id); }
async function createPost(user, data) {
  return prisma.communityPost.create({ data: { content: data.content, userId: user.id, status: "ACTIVE" }, select: postSelect });
}
async function updatePost(user, id, data) {
  const post = await visiblePost(user, id);
  if (user.role !== "ADMIN" && post.userId !== user.id) fail(404, "Post not found.");
  const result = await prisma.communityPost.updateMany({ where: user.role === "ADMIN" ? { id } : { id, userId: user.id }, data });
  if (result.count !== 1) fail(404, "Post not found.");
  return prisma.communityPost.findUnique({ where: { id }, select: postSelect });
}
async function deletePost(user, id) {
  const post = await visiblePost(user, id);
  if (user.role !== "ADMIN" && post.userId !== user.id) fail(404, "Post not found.");
  const result = await prisma.communityPost.deleteMany({ where: user.role === "ADMIN" ? { id } : { id, userId: user.id } });
  if (result.count !== 1) fail(404, "Post not found.");
  return { id };
}
async function listComments(user, postId, filters) {
  await visiblePost(user, postId);
  const where = { postId };
  const [items, total] = await Promise.all([
    prisma.comment.findMany({ where, select: commentSelect, ...pagination(filters), orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    prisma.comment.count({ where }),
  ]);
  return { items, meta: meta(filters.page, filters.limit, total) };
}
async function createComment(user, postId, data) {
  const post = await visiblePost(user, postId);
  if (post.status !== "ACTIVE") fail(409, "Comments are closed for this post.");
  return prisma.comment.create({ data: { postId, userId: user.id, content: data.content }, select: commentSelect });
}
async function getCommentOrThrow(id) {
  const comment = await prisma.comment.findUnique({ where: { id }, select: commentSelect });
  if (!comment) fail(404, "Comment not found.");
  return comment;
}
async function updateComment(user, id, data) {
  const comment = await getCommentOrThrow(id);
  if (user.role !== "ADMIN" && comment.userId !== user.id) fail(404, "Comment not found.");
  const result = await prisma.comment.updateMany({ where: user.role === "ADMIN" ? { id } : { id, userId: user.id }, data });
  if (result.count !== 1) fail(404, "Comment not found.");
  return prisma.comment.findUnique({ where: { id }, select: commentSelect });
}
async function deleteComment(user, id) {
  const comment = await getCommentOrThrow(id);
  if (user.role !== "ADMIN" && comment.userId !== user.id) fail(404, "Comment not found.");
  const result = await prisma.comment.deleteMany({ where: user.role === "ADMIN" ? { id } : { id, userId: user.id } });
  if (result.count !== 1) fail(404, "Comment not found.");
  return { id };
}
module.exports = { CommunityError, listPosts, getPost, createPost, updatePost, deletePost, listComments, createComment, updateComment, deleteComment };
EOF

cat > modules/community/community.controller.js <<'EOF'
const v = require("./community.validation");
const s = require("./community.service");
function handleError(res, e) {
  if (e.statusCode) return res.status(e.statusCode).json({ success: false, message: e.message, errors: e.errors || [] });
  console.error("Community module error:", e);
  return res.status(500).json({ success: false, message: "An unexpected server error occurred.", errors: [] });
}
function parse(schema, value, res) {
  const r = schema.safeParse(value);
  if (!r.success) {
    res.status(400).json({ success: false, message: "Validation failed.", errors: r.error.issues.map((x) => ({ field: x.path.join("."), message: x.message })) });
    return null;
  }
  return r.data;
}
const run = (fn, message, status = 200) => async (req, res) => {
  try {
    const value = await fn(req, res);
    if (value === null || res.headersSent) return;
    return res.status(status).json({ success: true, message, data: value?.items ? { items: value.items } : value, meta: value?.meta || null });
  } catch (e) { return handleError(res, e); }
};
const listPosts = run((req, res) => { const q = parse(v.listQuerySchema, req.query, res); return q && s.listPosts(q); }, "Community posts retrieved.");
const getPost = run((req, res) => { const id = parse(v.postIdSchema, req.params.postId, res); return id && s.getPost(req.user, id); }, "Post retrieved.");
const createPost = run((req, res) => { const d = parse(v.createPostSchema, req.body, res); return d && s.createPost(req.user, d); }, "Post created.", 201);
const updatePost = run((req, res) => { const id = parse(v.postIdSchema, req.params.postId, res); const d = parse(v.updatePostSchema, req.body, res); return id && d && s.updatePost(req.user, id, d); }, "Post updated.");
const deletePost = run((req, res) => { const id = parse(v.postIdSchema, req.params.postId, res); return id && s.deletePost(req.user, id); }, "Post deleted.");
const listComments = run((req, res) => { const id = parse(v.postIdSchema, req.params.postId, res); const q = parse(v.listQuerySchema, req.query, res); return id && q && s.listComments(req.user, id, q); }, "Comments retrieved.");
const createComment = run((req, res) => { const id = parse(v.postIdSchema, req.params.postId, res); const d = parse(v.createCommentSchema, req.body, res); return id && d && s.createComment(req.user, id, d); }, "Comment created.", 201);
const updateComment = run((req, res) => { const id = parse(v.commentIdSchema, req.params.commentId, res); const d = parse(v.updateCommentSchema, req.body, res); return id && d && s.updateComment(req.user, id, d); }, "Comment updated.");
const deleteComment = run((req, res) => { const id = parse(v.commentIdSchema, req.params.commentId, res); return id && s.deleteComment(req.user, id); }, "Comment deleted.");
module.exports = { listPosts, getPost, createPost, updatePost, deletePost, listComments, createComment, updateComment, deleteComment };
EOF

cat > modules/community/community.routes.js <<'EOF'
const express = require("express");
const { authenticateToken, optionalAuthenticateToken } = require("../../middleware/auth.middleware");
const c = require("./community.controller");
const router = express.Router();

router.get("/posts", c.listPosts);
router.get("/posts/:postId/comments", optionalAuthenticateToken, c.listComments);
router.post("/posts", authenticateToken, c.createPost);
router.post("/posts/:postId/comments", authenticateToken, c.createComment);
router.patch("/posts/:postId", authenticateToken, c.updatePost);
router.delete("/posts/:postId", authenticateToken, c.deletePost);
router.patch("/comments/:commentId", authenticateToken, c.updateComment);
router.delete("/comments/:commentId", authenticateToken, c.deleteComment);
router.get("/posts/:postId", optionalAuthenticateToken, c.getPost);
module.exports = router;
EOF

cat > tests/phase8.validation.test.js <<'EOF'
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
EOF

node - <<'EOF'
const fs = require("fs");
const path = "index.js";
let source = fs.readFileSync(path, "utf8");
if (!source.includes('require("./modules/events/events.routes")')) {
  source = source.replace(
    'const resourcesRoutes = require("./modules/resources/resources.routes");',
    'const resourcesRoutes = require("./modules/resources/resources.routes");\nconst eventsRoutes = require("./modules/events/events.routes");\nconst communityRoutes = require("./modules/community/community.routes");'
  );
}
if (!source.includes('app.use("/api/v1/events", eventsRoutes);')) {
  source = source.replace(
    'app.use("/api/v1/resources", resourcesRoutes);',
    'app.use("/api/v1/resources", resourcesRoutes);\n\n// Events and community\napp.use("/api/v1/events", eventsRoutes);\napp.use("/api/v1/community", communityRoutes);'
  );
}
if (!source.includes('const eventsRoutes = require("./modules/events/events.routes");') ||
    !source.includes('app.use("/api/v1/events", eventsRoutes);') ||
    !source.includes('app.use("/api/v1/community", communityRoutes);')) {
  throw new Error("Could not safely add Phase 8 routes. Restore index.js backup and inspect its route section.");
}
fs.writeFileSync(path, source);
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
pkg.scripts = pkg.scripts || {};
pkg.scripts.test = "node --test tests/*.test.js";
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
EOF

printf '\nPhase 8 files created. Running syntax checks and validation tests...\n'
node --check modules/events/events.validation.js
node --check modules/events/events.service.js
node --check modules/events/events.controller.js
node --check modules/events/events.routes.js
node --check modules/community/community.validation.js
node --check modules/community/community.service.js
node --check modules/community/community.controller.js
node --check modules/community/community.routes.js
node --check index.js
npm test
printf '\nInstaller finished. Backups: index.js.phase8-backup-%s and package.json.phase8-backup-%s\n' "$STAMP" "$STAMP"
printf 'No migration or commit was performed.\n'
