
const { prisma } = require("../../database/db");

const ELIGIBLE_ROLES = [
  "STARTUP",
  "INVESTOR",
  "INCUBATOR",
  "ACCELERATOR",
  "MENTOR",
  "GOVERNMENT",
  "PUBLIC",
];

const USER_SELECT = {
  id: true,
  name: true,
  role: true,
};

const CONNECTION_INCLUDE = {
  sender: {
    select: USER_SELECT,
  },
  receiver: {
    select: USER_SELECT,
  },
};

class ConnectionError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.name = "ConnectionError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

function throwError(statusCode, message) {
  throw new ConnectionError(statusCode, message);
}

function isPrismaError(error, code) {
  return error && error.code === code;
}

function getPagination(filters) {
  return {
    skip: (filters.page - 1) * filters.limit,
    take: filters.limit,
  };
}

function getPaginationMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

function getListOrder(sortOrder) {
  return [
    { updatedAt: sortOrder },
    { id: "asc" },
  ];
}

async function runSerializableTransaction(callback) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: "Serializable",
      });
    } catch (error) {
      if (isPrismaError(error, "P2034") && attempt < maxAttempts) {
        continue;
      }

      if (isPrismaError(error, "P2034")) {
        throwError(
          409,
          "The connection request could not be processed due to a concurrent update. Please try again."
        );
      }

      throw error;
    }
  }
}


async function sendConnectionRequest(user, data) {
  if (!ELIGIBLE_ROLES.includes(user.role)) {
    throwError(
      403,
      "Your account is not allowed to send connection requests."
    );
  }

  if (user.id === data.receiverId) {
    throwError(400, "You cannot send a connection request to yourself.");
  }

  try {
    return await runSerializableTransaction(async (tx) => {
      const receiver = await tx.user.findUnique({
        where: { id: data.receiverId },
        select: {
          id: true,
          name: true,
          role: true,
          status: true,
        },
      });

      if (!receiver) {
        throwError(404, "Receiver not found.");
      }

      if (!ELIGIBLE_ROLES.includes(receiver.role)) {
        throwError(
          403,
          "This account cannot receive connection requests."
        );
      }

      if (receiver.status !== "ACTIVE") {
        throwError(
          409,
          "This user is not currently available for connections."
        );
      }

      const existingRequest = await tx.connectionRequest.findUnique({
        where: {
          senderId_receiverId: {
            senderId: user.id,
            receiverId: receiver.id,
          },
        },
      });

      if (existingRequest) {
        if (existingRequest.status === "PENDING") {
          throwError(409, "A connection request is already pending.");
        }

        if (existingRequest.status === "ACCEPTED") {
          throwError(409, "You are already connected with this user.");
        }

        if (existingRequest.status === "REJECTED") {
          throwError(
            409,
            "This request was rejected. The other user must initiate a new request."
          );
        }
      }

      // Check the reverse direction before reopening or creating a request.
      const reverseRequest = await tx.connectionRequest.findUnique({
        where: {
          senderId_receiverId: {
            senderId: receiver.id,
            receiverId: user.id,
          },
        },
      });

      if (reverseRequest) {
        if (reverseRequest.status === "PENDING") {
          throwError(
            409,
            "This user has already sent you a request. Please respond to the incoming request."
          );
        }

        if (reverseRequest.status === "ACCEPTED") {
          throwError(409, "You are already connected with this user.");
        }
      }

      // Reopen the existing cancelled request only after reverse checks.
      if (existingRequest?.status === "CANCELLED") {
        return {
          request: await tx.connectionRequest.update({
            where: { id: existingRequest.id },
            data: {
              status: "PENDING",
              message: data.message ?? null,
            },
            include: CONNECTION_INCLUDE,
          }),
          reopened: true,
        };
      }

      // Create a new request when no same-direction record exists.
      return {
        request: await tx.connectionRequest.create({
          data: {
            senderId: user.id,
            receiverId: receiver.id,
            message: data.message,
          },
          include: CONNECTION_INCLUDE,
        }),
        reopened: false,
      };
    });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      throwError(
        409,
        "A connection request already exists between these users."
      );
    }

    throw error;
  }
}


async function getSentRequests(user, filters) {
  const where = {
    senderId: user.id,
    ...(filters.status ? { status: filters.status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.connectionRequest.findMany({
      where,
      include: CONNECTION_INCLUDE,
      ...getPagination(filters),
      orderBy: getListOrder(filters.sortOrder),
    }),
    prisma.connectionRequest.count({ where }),
  ]);

  return {
    items,
    meta: getPaginationMeta(filters.page, filters.limit, total),
  };
}

async function getReceivedRequests(user, filters) {
  const where = {
    receiverId: user.id,
    ...(filters.status ? { status: filters.status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.connectionRequest.findMany({
      where,
      include: CONNECTION_INCLUDE,
      ...getPagination(filters),
      orderBy: getListOrder(filters.sortOrder),
    }),
    prisma.connectionRequest.count({ where }),
  ]);

  return {
    items,
    meta: getPaginationMeta(filters.page, filters.limit, total),
  };
}

async function getAcceptedConnections(user, filters) {
  const where = {
    status: "ACCEPTED",
    OR: [
      { senderId: user.id },
      { receiverId: user.id },
    ],
  };

  const [requests, total] = await Promise.all([
    prisma.connectionRequest.findMany({
      where,
      include: CONNECTION_INCLUDE,
      ...getPagination(filters),
      orderBy: getListOrder(filters.sortOrder),
    }),
    prisma.connectionRequest.count({ where }),
  ]);

  const items = requests.map((request) => {
    const otherUser =
      request.senderId === user.id
        ? request.receiver
        : request.sender;

    return {
      id: request.id,
      status: request.status,
      connectedAt: request.updatedAt,
      user: otherUser,
    };
  });

  return {
    items,
    meta: getPaginationMeta(filters.page, filters.limit, total),
  };
}

async function getConnectionRequest(user, id) {
  const request = await prisma.connectionRequest.findUnique({
    where: { id },
    include: CONNECTION_INCLUDE,
  });

  if (!request) {
    throwError(404, "Connection request not found.");
  }

  if (request.senderId !== user.id && request.receiverId !== user.id) {
    throwError(404, "Connection request not found.");
  }

  return request;
}

async function updateRequestStatus(user, id, action) {
  const actionRules = {
    accept: {
      actorField: "receiverId",
      status: "ACCEPTED",
      message: "Connection request accepted successfully.",
    },
    reject: {
      actorField: "receiverId",
      status: "REJECTED",
      message: "Connection request rejected successfully.",
    },
    cancel: {
      actorField: "senderId",
      status: "CANCELLED",
      message: "Connection request cancelled successfully.",
    },
  };

  const rule = actionRules[action];

  if (!rule) {
    throwError(400, "Invalid connection action.");
  }

  const result = await prisma.connectionRequest.updateMany({
    where: {
      id,
      [rule.actorField]: user.id,
      status: "PENDING",
    },
    data: {
      status: rule.status,
    },
  });

  if (result.count !== 1) {
    const request = await prisma.connectionRequest.findUnique({
      where: { id },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        status: true,
      },
    });

    if (!request) {
      throwError(404, "Connection request not found.");
    }

    if (request.senderId !== user.id && request.receiverId !== user.id) {
      throwError(404, "Connection request not found.");
    }

    if (request[rule.actorField] !== user.id) {
      throwError(403, "You are not allowed to perform this action.");
    }

    throwError(
      409,
      "This connection request is no longer pending and cannot be changed."
    );
  }

  const updatedRequest = await prisma.connectionRequest.findUnique({
    where: { id },
    include: CONNECTION_INCLUDE,
  });

  return {
    request: updatedRequest,
    message: rule.message,
  };
}

async function acceptConnectionRequest(user, id) {
  return updateRequestStatus(user, id, "accept");
}

async function rejectConnectionRequest(user, id) {
  return updateRequestStatus(user, id, "reject");
}

async function cancelConnectionRequest(user, id) {
  return updateRequestStatus(user, id, "cancel");
}

module.exports = {
  ConnectionError,
  sendConnectionRequest,
  getSentRequests,
  getReceivedRequests,
  getAcceptedConnections,
  getConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  cancelConnectionRequest,
};
