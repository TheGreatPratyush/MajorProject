const express = require("express");

const {
  register,
  login,
  me,
  logout,
  changePassword,
} = require("./auth.controller");

const { authenticateToken } = require("../../middleware/auth.middleware");

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.get("/me", authenticateToken, me);
router.post("/logout", authenticateToken, logout);
router.patch("/change-password", authenticateToken, changePassword);

module.exports = router;