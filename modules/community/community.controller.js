const v = require("./community.validation");
const s = require("./community.service");
function handleError(res, e) {
  if (e.statusCode) return res.status(e.statusCode).json({ success: false, message: e.message, errors: e.errors || [] });
  console.error("Community module error:", e);
  return res.status(500).json({ success: false, message: "An unexpected server error occurred.", errors: [] });
}
function parse(schema, value, res) {
  const r = schema.safeParse(value);
  if (!r.success) {
    res.status(400).json({ success: false, message: "Validation failed.", errors: r.error.issues.map((x) => ({ field: x.path.join("."), message: x.message })) });
    return null;
  }
  return r.data;
}
const run = (fn, message, status = 200) => async (req, res) => {
  try {
    const value = await fn(req, res);
    if (value === null || res.headersSent) return;
    return res.status(status).json({ success: true, message, data: value?.items ? { items: value.items } : value, meta: value?.meta || null });
  } catch (e) { return handleError(res, e); }
};
const listPosts = run((req, res) => { const q = parse(v.listQuerySchema, req.query, res); return q && s.listPosts(q); }, "Community posts retrieved.");
const getPost = run((req, res) => { const id = parse(v.postIdSchema, req.params.postId, res); return id && s.getPost(req.user, id); }, "Post retrieved.");
const createPost = run((req, res) => { const d = parse(v.createPostSchema, req.body, res); return d && s.createPost(req.user, d); }, "Post created.", 201);
const updatePost = run((req, res) => { const id = parse(v.postIdSchema, req.params.postId, res); const d = parse(v.updatePostSchema, req.body, res); return id && d && s.updatePost(req.user, id, d); }, "Post updated.");
const deletePost = run((req, res) => { const id = parse(v.postIdSchema, req.params.postId, res); return id && s.deletePost(req.user, id); }, "Post deleted.");
const listComments = run((req, res) => { const id = parse(v.postIdSchema, req.params.postId, res); const q = parse(v.listQuerySchema, req.query, res); return id && q && s.listComments(req.user, id, q); }, "Comments retrieved.");
const createComment = run((req, res) => { const id = parse(v.postIdSchema, req.params.postId, res); const d = parse(v.createCommentSchema, req.body, res); return id && d && s.createComment(req.user, id, d); }, "Comment created.", 201);
const updateComment = run((req, res) => { const id = parse(v.commentIdSchema, req.params.commentId, res); const d = parse(v.updateCommentSchema, req.body, res); return id && d && s.updateComment(req.user, id, d); }, "Comment updated.");
const deleteComment = run((req, res) => { const id = parse(v.commentIdSchema, req.params.commentId, res); return id && s.deleteComment(req.user, id); }, "Comment deleted.");
module.exports = { listPosts, getPost, createPost, updatePost, deletePost, listComments, createComment, updateComment, deleteComment };
