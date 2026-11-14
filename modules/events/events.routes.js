const express = require("express");
const { authenticateToken, optionalAuthenticateToken } = require("../../middleware/auth.middleware");
const c = require("./events.controller");
const router = express.Router();

router.get("/", c.listEvents);
router.get("/mine", authenticateToken, c.listMyEvents);
router.get("/registrations/mine", authenticateToken, c.myRegistrations);
router.post("/", authenticateToken, c.createEvent);
router.get("/:id/registrations", authenticateToken, c.eventRegistrations);
router.post("/:id/publish", authenticateToken, c.publishEvent);
router.post("/:id/cancel", authenticateToken, c.cancelEvent);
router.post("/:id/complete", authenticateToken, c.completeEvent);
router.post("/:id/register", authenticateToken, c.register);
router.delete("/:id/register", authenticateToken, c.cancelRegistration);
router.patch("/:id", authenticateToken, c.updateEvent);
router.delete("/:id", authenticateToken, c.deleteEvent);
router.get("/:id", optionalAuthenticateToken, c.getEvent);
module.exports = router;
