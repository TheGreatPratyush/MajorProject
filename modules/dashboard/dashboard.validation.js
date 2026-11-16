const { z } = require("zod");

// The feed merges several tables, so each page reads up to page * limit
// rows per table. Capping that depth keeps every request bounded.
const MAX_ACTIVITY_DEPTH = 500;

const activityQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .strict()
  .refine((query) => query.page * query.limit <= MAX_ACTIVITY_DEPTH, {
    message: `page * limit cannot exceed ${MAX_ACTIVITY_DEPTH}`,
    path: ["page"],
  });

module.exports = {
  MAX_ACTIVITY_DEPTH,
  activityQuerySchema,
};
