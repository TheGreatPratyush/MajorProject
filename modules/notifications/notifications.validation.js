const { z } = require("zod");

const notificationTypes = [
  "CONNECTION",
  "MENTORSHIP",
  "APPLICATION",
  "EVENT",
  "SYSTEM",
  "OTHER",
];

// Query strings arrive as text, so "true"/"false" are mapped explicitly.
// z.coerce.boolean() would treat the string "false" as true.
const booleanQuery = z
  .enum(["true", "false"], {
    message: "isRead must be true or false",
  })
  .transform((value) => value === "true");

const listNotificationQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    isRead: booleanQuery.optional(),
    type: z.enum(notificationTypes).optional(),
  })
  .strict();

const notificationIdSchema = z
  .string()
  .uuid("A valid notification UUID is required");

// Used internally by the notification helper (not exposed as an API).
const createNotificationSchema = z
  .object({
    userId: z.string().uuid("A valid recipient UUID is required"),
    type: z.enum(notificationTypes),
    title: z.string().trim().min(1).max(150),
    message: z.string().trim().min(1).max(1000),
    relatedEntityId: z
      .string()
      .uuid("relatedEntityId must be a UUID")
      .nullable()
      .optional()
      .transform((value) => value || null),
  })
  .strict();

module.exports = {
  notificationTypes,
  listNotificationQuerySchema,
  notificationIdSchema,
  createNotificationSchema,
};
