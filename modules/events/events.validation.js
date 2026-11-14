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
  createEventSchema, updateEventSchema, eventIdSchema, eventListQuerySchema, registrationListQuerySchema,
  eventTypes, eventStatuses,
};
