const express = require("express");
const { authenticateToken } = require("../../middleware/auth.middleware");
const { getSummary, getActivity } = require("./dashboard.controller");

const router = express.Router();

// Read-only; every metric is scoped to the logged-in user.
router.use(authenticateToken);

router.get("/summary", getSummary);
router.get("/activity", getActivity);

module.exports = router;
