
const { prisma } = require("../../database/db");

const ACTIVE_STATUSES = ["PENDING", "ACCEPTED"];

const USER_SELECT = {
  id: true,
  name: true,
  role: true,
};

const APPLICATION_INCLUDE = {
  applicant: {
    select: USER_SELECT,
  },
  mentor: {
    select: {
      ...USER_SELECT,
      mentorProfile: {
        select: {
          id: true,
          expertise: true,
          experienceYears: true,
          biography: true,
          availabilityStatus: true,
          areasOfInterest: true,
          location: true,
        },
      },
    },
  },
};

class MentorshipError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.name = "MentorshipError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

function throwError(statusCode, message) {
  throw new MentorshipError(statusCode, message);
}

function isSerializationConflict(error) {
  if (!error) return false;

  return (
    error.code === "P2034" ||
    error.code === "40001" ||
    error.cause?.originalCode === "40001" ||
    error.cause?.kind === "TransactionWriteConflict"
  );
}

async function runSerializableTransaction(callback) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: "Serializable",
      });
    } catch (error) {
      if (isSerializationConflict(error) && attempt < maxAttempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, 25 * attempt)
        );
        continue;
      }

      if (isSerializationConflict(error)) {
        throwError(
          409,
          "The application could not be processed due to a concurrent update. Please try again."
        );
      }

      throw error;
    }
  }
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

async function createMentorshipApplication(user, data) {
  if (user.role !== "STARTUP") {
    throwError(403, "Only startup accounts can apply for mentorship.");
  }

  return runSerializableTransaction(async (tx) => {
    const mentorProfile = await tx.mentorProfile.findUnique({
      where: {
        id: data.mentorProfileId,
      },
      select: {
        id: true,
        userId: true,
        availabilityStatus: true,
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!mentorProfile || !mentorProfile.user) {
      throwError(404, "Mentor profile not found.");
    }

    if (
      mentorProfile.user.role !== "MENTOR" ||
      mentorProfile.user.status !== "ACTIVE"
    ) {
      throwError(
        409,
        "This mentor is not currently available for applications."
      );
    }

    if (mentorProfile.availabilityStatus !== "AVAILABLE") {
      throwError(
        409,
        "This mentor is not currently accepting applications."
      );
    }

    const existingApplication =
      await tx.mentorshipApplication.findFirst({
        where: {
          applicantId: user.id,
          mentorId: mentorProfile.userId,
          status: {
            in: ACTIVE_STATUSES,
          },
        },
        select: {
          id: true,
          status: true,
        },
      });

    if (existingApplication) {
      throwError(
        409,
        "An active mentorship application already exists for this mentor."
      );
    }

    return tx.mentorshipApplication.create({
      data: {
        applicantId: user.id,
        mentorId: mentorProfile.userId,
        goals: data.goals,
        message: data.message,
      },
      include: APPLICATION_INCLUDE,
    });
  });
}

async function getSentApplications(user, filters) {
  if (user.role !== "STARTUP") {
    throwError(403, "Only startup accounts can view sent applications.");
  }

  const where = {
    applicantId: user.id,
    ...(filters.status ? { status: filters.status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.mentorshipApplication.findMany({
      where,
      include: APPLICATION_INCLUDE,
      ...getPagination(filters),
      orderBy: getListOrder(filters.sortOrder),
    }),
    prisma.mentorshipApplication.count({ where }),
  ]);

  return {
    items,
    meta: getPaginationMeta(filters.page, filters.limit, total),
  };
}

async function getReceivedApplications(user, filters) {
  if (user.role !== "MENTOR") {
    throwError(403, "Only mentors can view received applications.");
  }

  const where = {
    mentorId: user.id,
    ...(filters.status ? { status: filters.status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.mentorshipApplication.findMany({
      where,
      include: APPLICATION_INCLUDE,
      ...getPagination(filters),
      orderBy: getListOrder(filters.sortOrder),
    }),
    prisma.mentorshipApplication.count({ where }),
  ]);

  return {
    items,
    meta: getPaginationMeta(filters.page, filters.limit, total),
  };
}

async function getMentorshipApplication(user, id) {
  const application = await prisma.mentorshipApplication.findUnique({
    where: { id },
    include: APPLICATION_INCLUDE,
  });

  if (!application) {
    throwError(404, "Mentorship application not found.");
  }

  if (
    application.applicantId !== user.id &&
    application.mentorId !== user.id
  ) {
    throwError(404, "Mentorship application not found.");
  }

  return application;
}

async function updateApplicationStatus(user, id, action) {
  const actionRules = {
    accept: {
      actorField: "mentorId",
      currentStatus: "PENDING",
      nextStatus: "ACCEPTED",
      message: "Mentorship application accepted successfully.",
    },
    reject: {
      actorField: "mentorId",
      currentStatus: "PENDING",
      nextStatus: "REJECTED",
      message: "Mentorship application rejected successfully.",
    },
    cancel: {
      message: "Mentorship application cancelled successfully.",
    },
    complete: {
      actorField: "mentorId",
      currentStatus: "ACCEPTED",
      nextStatus: "COMPLETED",
      message: "Mentorship marked as completed successfully.",
    },
  };

  const rule = actionRules[action];

  if (!rule) {
    throwError(400, "Invalid mentorship action.");
  }

  const where = { id };

  if (action === "cancel") {
    where.OR = [
      { applicantId: user.id, status: "PENDING" },
      { applicantId: user.id, status: "ACCEPTED" },
      { mentorId: user.id, status: "ACCEPTED" },
    ];
  } else {
    where.status = rule.currentStatus;
    where[rule.actorField] = user.id;
  }

  const result = await prisma.mentorshipApplication.updateMany({
    where,
    data: {
      status:
        action === "cancel" ? "CANCELLED" : rule.nextStatus,
    },
  });

  if (result.count !== 1) {
    const application = await prisma.mentorshipApplication.findUnique({
      where: { id },
      select: {
        id: true,
        applicantId: true,
        mentorId: true,
        status: true,
      },
    });

    if (!application) {
      throwError(404, "Mentorship application not found.");
    }

    const isApplicant = application.applicantId === user.id;
    const isMentor = application.mentorId === user.id;

    if (!isApplicant && !isMentor) {
      throwError(404, "Mentorship application not found.");
    }

    if (
      action === "cancel" &&
      application.status === "PENDING" &&
      application.applicantId !== user.id
    ) {
      throwError(
        403,
        "Only the applicant can withdraw a pending application."
      );
    }

    if (
      rule.actorField &&
      application[rule.actorField] !== user.id
    ) {
      throwError(403, "You are not allowed to perform this action.");
    }

    throwError(
      409,
      "This mentorship application is no longer in a valid state for this action."
    );
  }

  const updatedApplication =
    await prisma.mentorshipApplication.findUnique({
      where: { id },
      include: APPLICATION_INCLUDE,
    });

  return {
    application: updatedApplication,
    message: rule.message,
  };
}

async function acceptMentorshipApplication(user, id) {
  return updateApplicationStatus(user, id, "accept");
}

async function rejectMentorshipApplication(user, id) {
  return updateApplicationStatus(user, id, "reject");
}

async function cancelMentorshipApplication(user, id) {
  return updateApplicationStatus(user, id, "cancel");
}

async function completeMentorship(user, id) {
  return updateApplicationStatus(user, id, "complete");
}

module.exports = {
  MentorshipError,
  createMentorshipApplication,
  getSentApplications,
  getReceivedApplications,
  getMentorshipApplication,
  acceptMentorshipApplication,
  rejectMentorshipApplication,
  cancelMentorshipApplication,
  completeMentorship,
};
