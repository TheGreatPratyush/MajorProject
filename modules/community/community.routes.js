const express = require("express");
const { authenticateToken, optionalAuthenticateToken } = require("../../middleware/auth.middleware");
const c = require("./community.controller");
const router = express.Router();

router.get("/posts", c.listPosts);
router.get("/posts/:postId/comments", optionalAuthenticateToken, c.listComments);
router.post("/posts", authenticateToken, c.createPost);
router.post("/posts/:postId/comments", authenticateToken, c.createComment);
router.patch("/posts/:postId", authenticateToken, c.updatePost);
router.delete("/posts/:postId", authenticateToken, c.deletePost);
router.patch("/comments/:commentId", authenticateToken, c.updateComment);
router.delete("/comments/:commentId", authenticateToken, c.deleteComment);
router.get("/posts/:postId", optionalAuthenticateToken, c.getPost);
module.exports = router;
