
const { z } = require("zod");

const mentorshipStatuses = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
];

const createApplicationSchema = z
  .object({
    mentorProfileId: z.string().uuid("A valid mentor profile UUID is required."),
    goals: z
      .string()
      .trim()
      .min(10, "Goals must contain at least 10 characters.")
      .max(2000, "Goals cannot exceed 2000 characters."),
    message: z
      .string()
      .trim()
      .max(500, "Message cannot exceed 500 characters.")
      .optional()
      .transform((value) => value || null),
  })
  .strict();

const applicationIdSchema = z.string().uuid(
  "A valid mentorship application UUID is required."
);

const listApplicationsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(mentorshipStatuses).optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

module.exports = {
  createApplicationSchema,
  applicationIdSchema,
  listApplicationsQuerySchema,
};
