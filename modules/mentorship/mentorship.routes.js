
const express = require("express");

const { authenticateToken } = require("../../middleware/auth.middleware");

const {
  createApplication,
  getSentApplications,
  getReceivedApplications,
  getApplication,
  acceptApplication,
  rejectApplication,
  cancelApplication,
  completeMentorship,
} = require("./mentorship.controller");

const router = express.Router();

router.use(authenticateToken);

// Application creation and lists
router.post("/applications", createApplication);
router.get("/applications/sent", getSentApplications);
router.get("/applications/received", getReceivedApplications);

// Specific action routes before the detail route
router.patch("/applications/:id/accept", acceptApplication);
router.patch("/applications/:id/reject", rejectApplication);
router.patch("/applications/:id/cancel", cancelApplication);
router.patch("/applications/:id/complete", completeMentorship);

// Application detail
router.get("/applications/:id", getApplication);

module.exports = router;
