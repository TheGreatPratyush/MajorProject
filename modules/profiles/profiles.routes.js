const express = require("express");

const {
  createProfile,
  getMyProfile,
  updateMyProfile,
} = require("./profiles.controller");

const { authenticateToken } = require("../../middleware/auth.middleware");

const router = express.Router();

router.use(authenticateToken);

router.post("/", createProfile);
router.get("/me", getMyProfile);
router.patch("/me", updateMyProfile);

module.exports = router;