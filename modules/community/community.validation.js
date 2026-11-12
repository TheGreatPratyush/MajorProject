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
