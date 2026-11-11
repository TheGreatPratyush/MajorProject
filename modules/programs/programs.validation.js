
const { z } = require("zod");

const programStatuses = [
  "DRAFT",
  "PUBLISHED",
  "CLOSED",
  "COMPLETED",
];

const applicationStatuses = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
];

const ayushCategories = [
  "AYURVEDA",
  "YOGA_NATUROPATHY",
  "UNANI",
  "SIDDHA",
  "SOWA_RIGPA",
  "HOMOEOPATHY",
  "MULTIPLE",
];

const nullableText = (max) =>
  z.string().trim().max(max).nullable().optional();

const nullableDeadline = z
  .string()
  .datetime({ offset: true })
  .nullable()
  .optional()
  .transform((value) => {
    if (value === undefined || value === null) return value;
    return new Date(value);
  });

const createProgramSchema = z.object({
  programName: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10).max(2000),
  eligibility: nullableText(2000),
  category: z.enum(ayushCategories).nullable().optional(),
  durationDays: z.number().int().positive().nullable().optional(),
  deadline: nullableDeadline,
}).strict();

const updateProgramSchema = z.object({
  programName: z.string().trim().min(3).max(150).optional(),
  description: z.string().trim().min(10).max(2000).optional(),
  eligibility: nullableText(2000),
  category: z.enum(ayushCategories).nullable().optional(),
  durationDays: z.number().int().positive().nullable().optional(),
  deadline: nullableDeadline,
})
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field to update."
  );

const createApplicationSchema = z.object({
  message: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((value) => value || null),
}).strict();

const programIdSchema = z.string().uuid(
  "A valid program UUID is required."
);

const applicationIdSchema = z.string().uuid(
  "A valid application UUID is required."
);

const programListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().min(1).max(100).optional(),
  category: z.enum(ayushCategories).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();

const myProgramsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().min(1).max(100).optional(),
  status: z.enum(programStatuses).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();

const listApplicationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(applicationStatuses).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();

module.exports = {
  createProgramSchema,
  updateProgramSchema,
  createApplicationSchema,
  programIdSchema,
  applicationIdSchema,
  programListQuerySchema,
  myProgramsQuerySchema,
  listApplicationsQuerySchema,
};
