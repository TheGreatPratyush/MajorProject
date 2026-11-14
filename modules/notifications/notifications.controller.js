const {
  listNotificationQuerySchema,
  notificationIdSchema,
} = require("./notifications.validation");

const notificationService = require("./notifications.service");

function sendValidationError(res, error) {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  });
}

function handleError(res, error) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.errors || [],
    });
  }

  console.error("Notifications module error:", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
    errors: [],
  });
}

async function listNotifications(req, res) {
  try {
    const validation = listNotificationQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const result = await notificationService.listNotifications(
      req.user,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Notifications retrieved successfully.",
      data: {
        items: result.items,
      },
      meta: result.meta,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getUnreadCount(req, res) {
  try {
    const result = await notificationService.getUnreadCount(req.user);

    return res.status(200).json({
      success: true,
      message: "Unread notification count retrieved successfully.",
      data: result,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function markAllAsRead(req, res) {
  try {
    const result = await notificationService.markAllAsRead(req.user);

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
      data: result,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function markAsRead(req, res) {
  try {
    const validation = notificationIdSchema.safeParse(req.params.id);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const notification = await notificationService.markAsRead(
      req.user,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      data: notification,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function deleteNotification(req, res) {
  try {
    const validation = notificationIdSchema.safeParse(req.params.id);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const result = await notificationService.deleteNotification(
      req.user,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully.",
      data: result,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  deleteNotification,
};
