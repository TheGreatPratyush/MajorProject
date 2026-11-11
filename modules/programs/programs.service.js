
const { prisma } = require("../../database/db");

const PROGRAM_OWNER_ROLES = ["INCUBATOR", "ACCELERATOR"];

const PROGRAM_SELECT = {
  id: true,
  ownerId: true,
  programName: true,
  description: true,
  eligibility: true,
  category: true,
  durationDays: true,
  deadline: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: {
      id: true,
      name: true,
      role: true,
      incubatorProfile: {
        select: {
          organizationName: true,
        },
      },
      acceleratorProfile: {
        select: {
          organizationName: true,
        },
      },
    },
  },
};

const APPLICATION_INCLUDE = {
  program: {
    select: PROGRAM_SELECT,
  },
  startup: {
    select: {
      id: true,
      name: true,
      role: true,
      startupProfile: {
        select: {
          id: true,
          startupName: true,
          description: true,
          category: true,
          stage: true,
          location: true,
          website: true,
          productDescription: true,
          teamSize: true,
        },
      },
    },
  },
};

class ProgramError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.name = "ProgramError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

function throwError(statusCode, message) {
  throw new ProgramError(statusCode, message);
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
    { createdAt: sortOrder },
    { id: "asc" },
  ];
}

function isDeadlineExpired(deadline) {
  return (
    deadline !== null &&
    deadline !== undefined &&
    deadline <= new Date()
  );
}

function validateDeadline(deadline) {
  if (isDeadlineExpired(deadline)) {
    throwError(400, "Program deadline must be in the future.");
  }
}

async function requireProgramOwner(user) {
  if (!PROGRAM_OWNER_ROLES.includes(user.role)) {
    throwError(
      403,
      "Only incubators and accelerators can manage programs."
    );
  }

  const model =
    user.role === "INCUBATOR"
      ? prisma.incubatorProfile
      : prisma.acceleratorProfile;

  const profile = await model.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      userId: true,
      organizationName: true,
      verificationStatus: true,
    },
  });

  if (!profile) {
    throwError(403, "A stakeholder profile is required.");
  }

  if (profile.verificationStatus !== "VERIFIED") {
    throwError(
      403,
      "A verified profile is required to manage programs."
    );
  }

  return profile;
}

function buildProgramData(data) {
  const result = {};

  const allowedFields = [
    "programName",
    "description",
    "eligibility",
    "category",
    "durationDays",
    "deadline",
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      result[field] = data[field];
    }
  }

  return result;
}

// Locks the program row until the surrounding transaction completes.
// Application creation and program status transitions use this same lock.
async function lockProgramRow(tx, id) {
  const rows = await tx.$queryRaw`
    SELECT "id"
    FROM "IncubationProgram"
    WHERE "id" = ${id}::uuid
    FOR UPDATE
  `;

  return rows.length === 1;
}

async function createProgram(user, data) {
  await requireProgramOwner(user);

  validateDeadline(data.deadline);

  return prisma.incubationProgram.create({
    data: {
      ...buildProgramData(data),
      ownerId: user.id,
      status: "DRAFT",
    },
    select: PROGRAM_SELECT,
  });
}

async function listPrograms(filters) {
  const conditions = [
    {
      status: {
        in: ["PUBLISHED", "CLOSED", "COMPLETED"],
      },
    },
  ];

  if (filters.search) {
    conditions.push({
      OR: [
        {
          programName: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  if (filters.category) {
    conditions.push({
      category: filters.category,
    });
  }

  const where = { AND: conditions };

  const [items, total] = await Promise.all([
    prisma.incubationProgram.findMany({
      where,
      select: PROGRAM_SELECT,
      ...getPagination(filters),
      orderBy: getListOrder(filters.sortOrder),
    }),
    prisma.incubationProgram.count({ where }),
  ]);

  return {
    items,
    meta: getPaginationMeta(filters.page, filters.limit, total),
  };
}

async function listMyPrograms(user, filters) {
  if (!PROGRAM_OWNER_ROLES.includes(user.role)) {
    throwError(
      403,
      "Only incubators and accelerators can view their programs."
    );
  }

  const conditions = [
    { ownerId: user.id },
  ];

  if (filters.status) {
    conditions.push({ status: filters.status });
  }

  if (filters.search) {
    conditions.push({
      OR: [
        {
          programName: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  const where = { AND: conditions };

  const [items, total] = await Promise.all([
    prisma.incubationProgram.findMany({
      where,
      select: PROGRAM_SELECT,
      ...getPagination(filters),
      orderBy: getListOrder(filters.sortOrder),
    }),
    prisma.incubationProgram.count({ where }),
  ]);

  return {
    items,
    meta: getPaginationMeta(filters.page, filters.limit, total),
  };
}

async function getProgramById(user, id) {
  const program = await prisma.incubationProgram.findUnique({
    where: { id },
    select: PROGRAM_SELECT,
  });

  if (!program) {
    throwError(404, "Program not found.");
  }

  if (
    program.status === "DRAFT" &&
    (!user || program.ownerId !== user.id)
  ) {
    throwError(404, "Program not found.");
  }

  return program;
}

async function updateProgram(user, id, data) {
  await requireProgramOwner(user);

  if (data.deadline !== undefined && data.deadline !== null) {
    validateDeadline(data.deadline);
  }

  const result = await prisma.incubationProgram.updateMany({
    where: {
      id,
      ownerId: user.id,
      status: "DRAFT",
    },
    data: buildProgramData(data),
  });

  if (result.count !== 1) {
    const existing = await prisma.incubationProgram.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        status: true,
      },
    });

    if (!existing || existing.ownerId !== user.id) {
      throwError(404, "Program not found.");
    }

    throwError(409, "Only draft programs can be edited.");
  }

  return prisma.incubationProgram.findUnique({
    where: { id },
    select: PROGRAM_SELECT,
  });
}

async function publishProgram(user, id) {
  await requireProgramOwner(user);

  const program = await prisma.incubationProgram.findFirst({
    where: {
      id,
      ownerId: user.id,
    },
    select: {
      id: true,
      status: true,
      programName: true,
      description: true,
      deadline: true,
    },
  });

  if (!program) {
    throwError(404, "Program not found.");
  }

  if (program.status !== "DRAFT") {
    throwError(409, "Only draft programs can be published.");
  }

  if (
    !program.programName ||
    program.programName.trim().length < 3 ||
    !program.description ||
    program.description.trim().length < 10
  ) {
    throwError(
      409,
      "The program does not meet the publication requirements."
    );
  }

  validateDeadline(program.deadline);

  const result = await prisma.incubationProgram.updateMany({
    where: {
      id,
      ownerId: user.id,
      status: "DRAFT",
    },
    data: {
      status: "PUBLISHED",
    },
  });

  if (result.count !== 1) {
    throwError(409, "The program status changed. Please try again.");
  }

  return prisma.incubationProgram.findUnique({
    where: { id },
    select: PROGRAM_SELECT,
  });
}

async function transitionProgram(user, id, action) {
  await requireProgramOwner(user);

  const rules = {
    close: {
      currentStatus: "PUBLISHED",
      nextStatus: "CLOSED",
      message: "Program closed successfully.",
    },
    complete: {
      currentStatus: "CLOSED",
      nextStatus: "COMPLETED",
      message: "Program completed successfully.",
    },
  };

  const rule = rules[action];

  if (!rule) {
    throwError(400, "Invalid program action.");
  }

  return prisma.$transaction(async (tx) => {
    const locked = await lockProgramRow(tx, id);

    if (!locked) {
      throwError(404, "Program not found.");
    }

    const existing = await tx.incubationProgram.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        status: true,
      },
    });

    if (!existing || existing.ownerId !== user.id) {
      throwError(404, "Program not found.");
    }

    if (existing.status !== rule.currentStatus) {
      throwError(
        409,
        `Program must be ${rule.currentStatus} before this operation.`
      );
    }

    await tx.incubationProgram.update({
      where: { id },
      data: {
        status: rule.nextStatus,
      },
    });

    const updatedProgram = await tx.incubationProgram.findUnique({
      where: { id },
      select: PROGRAM_SELECT,
    });

    return {
      program: updatedProgram,
      message: rule.message,
    };
  });
}

async function closeProgram(user, id) {
  return transitionProgram(user, id, "close");
}

async function completeProgram(user, id) {
  return transitionProgram(user, id, "complete");
}

async function createApplication(user, programId, data) {
  if (user.role !== "STARTUP") {
    throwError(403, "Only startup accounts can apply to programs.");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const locked = await lockProgramRow(tx, programId);

      if (!locked) {
        throwError(404, "Program not found.");
      }

      const startupProfile = await tx.startupProfile.findUnique({
        where: { userId: user.id },
        select: {
          id: true,
          userId: true,
        },
      });

      if (!startupProfile) {
        throwError(403, "A startup profile is required to apply.");
      }

      const program = await tx.incubationProgram.findUnique({
        where: { id: programId },
        select: {
          id: true,
          ownerId: true,
          status: true,
          deadline: true,
        },
      });

      if (!program) {
        throwError(404, "Program not found.");
      }

      if (program.ownerId === user.id) {
        throwError(403, "You cannot apply to your own program.");
      }

      if (program.status !== "PUBLISHED") {
        throwError(
          409,
          "This program is not accepting applications."
        );
      }

      if (isDeadlineExpired(program.deadline)) {
        throwError(409, "The application deadline has passed.");
      }

      return tx.programApplication.create({
        data: {
          programId,
          startupId: user.id,
          message: data.message,
          status: "PENDING",
        },
        include: APPLICATION_INCLUDE,
      });
    });
  } catch (error) {
    if (error.code === "P2002") {
      throwError(
        409,
        "You have already applied to this program."
      );
    }

    if (error.code === "P2003" || error.code === "P2025") {
      throwError(404, "Program or startup profile not found.");
    }

    throw error;
  }
}

async function getSentApplications(user, filters) {
  if (user.role !== "STARTUP") {
    throwError(403, "Only startups can view sent applications.");
  }

  const where = {
    startupId: user.id,
    ...(filters.status ? { status: filters.status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.programApplication.findMany({
      where,
      include: APPLICATION_INCLUDE,
      ...getPagination(filters),
      orderBy: getListOrder(filters.sortOrder),
    }),
    prisma.programApplication.count({ where }),
  ]);

  return {
    items,
    meta: getPaginationMeta(filters.page, filters.limit, total),
  };
}

async function getReceivedApplications(user, filters) {
  if (!PROGRAM_OWNER_ROLES.includes(user.role)) {
    throwError(
      403,
      "Only incubators and accelerators can view received applications."
    );
  }

  const where = {
    program: {
      is: {
        ownerId: user.id,
      },
    },
    ...(filters.status ? { status: filters.status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.programApplication.findMany({
      where,
      include: APPLICATION_INCLUDE,
      ...getPagination(filters),
      orderBy: getListOrder(filters.sortOrder),
    }),
    prisma.programApplication.count({ where }),
  ]);

  return {
    items,
    meta: getPaginationMeta(filters.page, filters.limit, total),
  };
}

async function getApplicationById(user, id) {
  const application = await prisma.programApplication.findUnique({
    where: { id },
    include: APPLICATION_INCLUDE,
  });

  if (!application) {
    throwError(404, "Application not found.");
  }

  const isApplicant = application.startupId === user.id;
  const isOwner = application.program.ownerId === user.id;

  if (!isApplicant && !isOwner) {
    throwError(404, "Application not found.");
  }

  return application;
}

async function updateApplicationStatus(user, id, action) {
  const rules = {
    accept: {
      nextStatus: "ACCEPTED",
      message: "Application accepted successfully.",
    },
    reject: {
      nextStatus: "REJECTED",
      message: "Application rejected successfully.",
    },
    withdraw: {
      nextStatus: "WITHDRAWN",
      message: "Application withdrawn successfully.",
    },
  };

  const rule = rules[action];

  if (!rule) {
    throwError(400, "Invalid application action.");
  }

  const application = await prisma.programApplication.findUnique({
    where: { id },
    select: {
      id: true,
      startupId: true,
      status: true,
      program: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!application) {
    throwError(404, "Application not found.");
  }

  if (action === "withdraw") {
    if (application.startupId !== user.id) {
      throwError(404, "Application not found.");
    }

    if (user.role !== "STARTUP") {
      throwError(403, "Only the applicant can withdraw an application.");
    }
  } else {
    if (application.program.ownerId !== user.id) {
      throwError(404, "Application not found.");
    }

    if (!PROGRAM_OWNER_ROLES.includes(user.role)) {
      throwError(403, "You cannot review this application.");
    }

    await requireProgramOwner(user);
  }

  if (application.status !== "PENDING") {
    throwError(409, "This application is no longer pending.");
  }

  const result = await prisma.programApplication.updateMany({
    where: {
      id,
      status: "PENDING",
      ...(action === "withdraw"
        ? { startupId: user.id }
        : {
            program: {
              is: {
                ownerId: user.id,
              },
            },
          }),
    },
    data: {
      status: rule.nextStatus,
    },
  });

  if (result.count !== 1) {
    throwError(
      409,
      "The application status changed. Please refresh and try again."
    );
  }

  const updatedApplication = await prisma.programApplication.findUnique({
    where: { id },
    include: APPLICATION_INCLUDE,
  });

  return {
    application: updatedApplication,
    message: rule.message,
  };
}

async function acceptApplication(user, id) {
  return updateApplicationStatus(user, id, "accept");
}

async function rejectApplication(user, id) {
  return updateApplicationStatus(user, id, "reject");
}

async function withdrawApplication(user, id) {
  return updateApplicationStatus(user, id, "withdraw");
}

module.exports = {
  ProgramError,
  createProgram,
  listPrograms,
  listMyPrograms,
  getProgramById,
  updateProgram,
  publishProgram,
  closeProgram,
  completeProgram,
  createApplication,
  getSentApplications,
  getReceivedApplications,
  getApplicationById,
  acceptApplication,
  rejectApplication,
  withdrawApplication,
};
