
const express = require("express");

const { authenticateToken, optionalAuthenticateToken } = require("../../middleware/auth.middleware");

const {
  createProgram,
  listPrograms,
  listMyPrograms,
  getProgram,
  updateProgram,
  publishProgram,
  closeProgram,
  completeProgram,
  createApplication,
  getSentApplications,
  getReceivedApplications,
  getApplication,
  acceptApplication,
  rejectApplication,
  withdrawApplication,
} = require("./programs.controller");

const router = express.Router();

// Public program directory.
router.get("/", listPrograms);

// Authenticated program owner's directory.
router.get("/mine", authenticateToken, listMyPrograms);

// Application lists.
router.get(
  "/applications/sent",
  authenticateToken,
  getSentApplications
);

router.get(
  "/applications/received",
  authenticateToken,
  getReceivedApplications
);

// Application actions.
router.patch(
  "/applications/:applicationId/accept",
  authenticateToken,
  acceptApplication
);

router.patch(
  "/applications/:applicationId/reject",
  authenticateToken,
  rejectApplication
);

router.patch(
  "/applications/:applicationId/withdraw",
  authenticateToken,
  withdrawApplication
);

// Application detail.
router.get(
  "/applications/:applicationId",
  authenticateToken,
  getApplication
);

// Program creation.
router.post("/", authenticateToken, createProgram);

// Startup application creation.
router.post(
  "/:id/applications",
  authenticateToken,
  createApplication
);

// Program lifecycle actions.
router.patch(
  "/:id/publish",
  authenticateToken,
  publishProgram
);

router.patch(
  "/:id/close",
  authenticateToken,
  closeProgram
);

router.patch(
  "/:id/complete",
  authenticateToken,
  completeProgram
);

// Draft editing.
router.patch(
  "/:id",
  authenticateToken,
  updateProgram
);

// Keep public program detail last to prevent conflicts with static routes.
router.get("/:id", optionalAuthenticateToken, getProgram);

module.exports = router;
