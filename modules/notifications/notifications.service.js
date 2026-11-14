const { prisma } = require("../../database/db");
const { createNotificationSchema } = require("./notifications.validation");

// userId is never returned: every query is already scoped to the caller.
const NOTIFICATION_SELECT = {
  id: true,
  title: true,
  message: true,
  type: true,
  relatedEntityId: true,
  isRead: true,
  createdAt: true,
};

class NotificationError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.name = "NotificationError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

function throwError(statusCode, message) {
  throw new NotificationError(statusCode, message);
}

function getPaginationMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

// ------------------------------------------
// Read API (always scoped to the logged-in user)
// ------------------------------------------

async function listNotifications(user, filters) {
  const where = { userId: user.id };

  if (filters.isRead !== undefined) {
    where.isRead = filters.isRead;
  }

  if (filters.type) {
    where.type = filters.type;
  }

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      select: NOTIFICATION_SELECT,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    items,
    meta: getPaginationMeta(filters.page, filters.limit, total),
  };
}

async function getUnreadCount(user) {
  const count = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });

  return { count };
}

// Idempotent: marking an already-read notification succeeds.
// Another user's notification is reported as "not found".
async function markAsRead(user, id) {
  const result = await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { isRead: true },
  });

  if (result.count !== 1) {
    throwError(404, "Notification not found.");
  }

  return prisma.notification.findUnique({
    where: { id },
    select: NOTIFICATION_SELECT,
  });
}

async function markAllAsRead(user) {
  const result = await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });

  return { updated: result.count };
}

async function deleteNotification(user, id) {
  const result = await prisma.notification.deleteMany({
    where: { id, userId: user.id },
  });

  if (result.count !== 1) {
    throwError(404, "Notification not found.");
  }

  return { id };
}

// ------------------------------------------
// Internal helpers for other modules
// ------------------------------------------
// Pass the caller's transaction client (tx) so the notification is saved
// or rolled back together with the action that caused it. The actor is
// never notified about their own action.

function prepareNotifications(notifications, actorId) {
  const seen = new Set();
  const rows = [];

  for (const notification of notifications) {
    const data = createNotificationSchema.parse(notification);

    if (data.userId === actorId || seen.has(data.userId)) {
      continue;
    }

    seen.add(data.userId);
    rows.push(data);
  }

  return rows;
}

async function notifyUser(client, notification, actorId = null) {
  const [data] = prepareNotifications([notification], actorId);

  if (!data) {
    return null;
  }

  return client.notification.create({
    data,
    select: NOTIFICATION_SELECT,
  });
}

// Sends one notification per distinct recipient.
async function notifyUsers(client, notifications, actorId = null) {
  const rows = prepareNotifications(notifications, actorId);

  if (rows.length === 0) {
    return { count: 0 };
  }

  return client.notification.createMany({ data: rows });
}

module.exports = {
  NotificationError,
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  notifyUser,
  notifyUsers,
};
