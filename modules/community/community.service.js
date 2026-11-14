const { prisma } = require("../../database/db");
class CommunityError extends Error {
  constructor(statusCode, message) { super(message); this.statusCode = statusCode; this.errors = []; }
}
function fail(code, message) { throw new CommunityError(code, message); }
function pagination(f) { return { skip: (f.page - 1) * f.limit, take: f.limit }; }
function meta(page, limit, total) { return { page, limit, total, totalPages: Math.ceil(total / limit) }; }
const author = { select: { id: true, name: true, role: true } };
const postSelect = { id: true, userId: true, content: true, status: true, createdAt: true, updatedAt: true, user: author };
const commentSelect = { id: true, postId: true, userId: true, content: true, createdAt: true, updatedAt: true, user: author };
async function visiblePost(user, id) {
  const post = await prisma.communityPost.findUnique({ where: { id }, select: postSelect });
  if (!post || (post.status === "HIDDEN" && (!user || (user.role !== "ADMIN" && post.userId !== user.id)))) fail(404, "Post not found.");
  return post;
}
async function listPosts(filters) {
  const where = { status: "ACTIVE" };
  const [items, total] = await Promise.all([
    prisma.communityPost.findMany({ where, select: postSelect, ...pagination(filters), orderBy: [{ createdAt: filters.sortOrder }, { id: "asc" }] }),
    prisma.communityPost.count({ where }),
  ]);
  return { items, meta: meta(filters.page, filters.limit, total) };
}
async function getPost(user, id) { return visiblePost(user, id); }
async function createPost(user, data) {
  return prisma.communityPost.create({ data: { content: data.content, userId: user.id, status: "ACTIVE" }, select: postSelect });
}
async function updatePost(user, id, data) {
  const post = await visiblePost(user, id);
  if (user.role !== "ADMIN" && post.userId !== user.id) fail(404, "Post not found.");
  const result = await prisma.communityPost.updateMany({ where: user.role === "ADMIN" ? { id } : { id, userId: user.id }, data });
  if (result.count !== 1) fail(404, "Post not found.");
  return prisma.communityPost.findUnique({ where: { id }, select: postSelect });
}
async function deletePost(user, id) {
  const post = await visiblePost(user, id);
  if (user.role !== "ADMIN" && post.userId !== user.id) fail(404, "Post not found.");
  const result = await prisma.communityPost.deleteMany({ where: user.role === "ADMIN" ? { id } : { id, userId: user.id } });
  if (result.count !== 1) fail(404, "Post not found.");
  return { id };
}
async function listComments(user, postId, filters) {
  await visiblePost(user, postId);
  const where = { postId };
  const [items, total] = await Promise.all([
    prisma.comment.findMany({ where, select: commentSelect, ...pagination(filters), orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    prisma.comment.count({ where }),
  ]);
  return { items, meta: meta(filters.page, filters.limit, total) };
}
async function createComment(user, postId, data) {
  const post = await visiblePost(user, postId);
  if (post.status !== "ACTIVE") fail(409, "Comments are closed for this post.");
  return prisma.comment.create({ data: { postId, userId: user.id, content: data.content }, select: commentSelect });
}
async function getCommentOrThrow(id) {
  const comment = await prisma.comment.findUnique({ where: { id }, select: commentSelect });
  if (!comment) fail(404, "Comment not found.");
  return comment;
}
async function updateComment(user, id, data) {
  const comment = await getCommentOrThrow(id);
  if (user.role !== "ADMIN" && comment.userId !== user.id) fail(404, "Comment not found.");
  const result = await prisma.comment.updateMany({ where: user.role === "ADMIN" ? { id } : { id, userId: user.id }, data });
  if (result.count !== 1) fail(404, "Comment not found.");
  return prisma.comment.findUnique({ where: { id }, select: commentSelect });
}
async function deleteComment(user, id) {
  const comment = await getCommentOrThrow(id);
  if (user.role !== "ADMIN" && comment.userId !== user.id) fail(404, "Comment not found.");
  const result = await prisma.comment.deleteMany({ where: user.role === "ADMIN" ? { id } : { id, userId: user.id } });
  if (result.count !== 1) fail(404, "Comment not found.");
  return { id };
}
module.exports = { CommunityError, listPosts, getPost, createPost, updatePost, deletePost, listComments, createComment, updateComment, deleteComment };
