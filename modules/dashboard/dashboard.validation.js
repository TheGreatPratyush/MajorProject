const { z } = require("zod");

const activityQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .strict();

module.exports = {
  activityQuerySchema,
};
