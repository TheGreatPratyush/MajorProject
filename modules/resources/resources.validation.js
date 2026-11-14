const { z } = require("zod");

const resourceCategories = [
  "GOVERNMENT_SCHEME",
  "FUNDING",
  "REGULATORY_GUIDELINE",
  "RESEARCH",
  "EDUCATION",
  "OTHER",
];

const httpUrlSchema = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "Source URL must use HTTP or HTTPS.");

const createResourceSchema = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10).max(3000),
  category: z.enum(resourceCategories),
  sourceUrl: httpUrlSchema,
}).strict();

const updateResourceSchema = z
  .object({
    title: z.string().trim().min(3).max(150).optional(),
    description: z.string().trim().min(10).max(3000).optional(),
    category: z.enum(resourceCategories).optional(),
    sourceUrl: httpUrlSchema.optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field to update."
  );

const resourceIdSchema = z.string().uuid(
  "A valid resource UUID is required."
);

const resourceListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().min(1).max(100).optional(),
  category: z.enum(resourceCategories).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();

module.exports = {
  createResourceSchema,
  updateResourceSchema,
  resourceIdSchema,
  resourceListQuerySchema,
};
