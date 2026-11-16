const express = require("express");
const { authenticateToken } = require("../../middleware/auth.middleware");
const {
  listNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  deleteNotification,
} = require("./notifications.controller");

const router = express.Router();

// Every user manages only their own notifications.
router.use(authenticateToken);

router.get("/", listNotifications);
router.get("/unread-count", getUnreadCount);

// Static route before the :id routes.
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;
