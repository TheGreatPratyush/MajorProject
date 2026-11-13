const express = require("express");

const { authenticateToken } = require("../../middleware/auth.middleware");

const {
  sendRequest,
  getSentRequests,
  getReceivedRequests,
  getAcceptedConnections,
  getConnectionRequest,
  acceptRequest,
  rejectRequest,
  cancelRequest,
} = require("./connections.controller");

const router = express.Router();

router.use(authenticateToken);

router.post("/", sendRequest);

router.get("/sent", getSentRequests);
router.get("/received", getReceivedRequests);
router.get("/accepted", getAcceptedConnections);

router.get("/:id", getConnectionRequest);

router.patch("/:id/accept", acceptRequest);
router.patch("/:id/reject", rejectRequest);
router.patch("/:id/cancel", cancelRequest);

module.exports = router;