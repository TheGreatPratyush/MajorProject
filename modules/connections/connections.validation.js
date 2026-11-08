const { z } = require("zod");

const connectionStatus = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "CANCELLED",
];

const sendConnectionSchema = z
  .object({
    receiverId: z.string().uuid("A valid receiver UUID is required"),
    message: z
      .string()
      .trim()
      .max(500, "Message cannot exceed 500 characters")
      .optional()
      .transform((value) => value || null),
  })
  .strict();

const connectionIdSchema = z
  .string()
  .uuid("A valid connection request UUID is required");

const listConnectionQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(connectionStatus).optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

const acceptedConnectionQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

module.exports = {
  sendConnectionSchema,
  connectionIdSchema,
  listConnectionQuerySchema,
  acceptedConnectionQuerySchema,
};