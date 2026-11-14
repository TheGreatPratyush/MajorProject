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
    const registrationCutoff = event.registrationDeadline || event.startDate;
    if (now > registrationCutoff) fail(409, "The registration deadline has passed.");
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
    const cancellationCutoff = event.registrationDeadline || (await tx.event.findUnique({ where: { id: eventId }, select: { startDate: true } })).startDate;
    if (new Date() > cancellationCutoff) fail(409, "The registration cancellation cutoff has passed.");
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
