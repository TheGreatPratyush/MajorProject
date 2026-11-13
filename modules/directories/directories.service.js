const { prisma } = require("../../database/db");

const directoryConfig = {
  startups: {
    model: prisma.startupProfile,
    visibility: {
      isVisible: true,
      verificationStatus: "VERIFIED",
      user: {
        is: { status: "ACTIVE" },
      },
    },
    select: {
      id: true,
      startupName: true,
      description: true,
      category: true,
      stage: true,
      foundedYear: true,
      location: true,
      website: true,
      productDescription: true,
      teamSize: true,
      createdAt: true,
    },
    searchFields: [
      "startupName",
      "description",
      "productDescription",
    ],
  },

  investors: {
    model: prisma.investorProfile,
    visibility: {
      user: {
        is: { status: "ACTIVE" },
      },
    },
    select: {
      id: true,
      organizationName: true,
      investorType: true,
      description: true,
      investmentInterests: true,
      preferredCategories: true,
      preferredStages: true,
      minInvestment: true,
      maxInvestment: true,
      location: true,
      website: true,
      createdAt: true,
    },
    searchFields: [
      "organizationName",
      "description",
    ],
  },

  mentors: {
    model: prisma.mentorProfile,
    visibility: {
      user: {
        is: { status: "ACTIVE" },
      },
    },
    select: {
      id: true,
      expertise: true,
      experienceYears: true,
      biography: true,
      availabilityStatus: true,
      areasOfInterest: true,
      location: true,
      createdAt: true,
    },
    searchFields: [
      "biography",
    ],
  },

  incubators: {
    model: prisma.incubatorProfile,
    visibility: {
      verificationStatus: "VERIFIED",
      user: {
        is: { status: "ACTIVE" },
      },
    },
    select: {
      id: true,
      organizationName: true,
      description: true,
      supportedCategories: true,
      location: true,
      website: true,
      programsOffered: true,
      createdAt: true,
    },
    searchFields: [
      "organizationName",
      "description",
    ],
  },

  accelerators: {
    model: prisma.acceleratorProfile,
    visibility: {
      verificationStatus: "VERIFIED",
      user: {
        is: { status: "ACTIVE" },
      },
    },
    select: {
      id: true,
      organizationName: true,
      description: true,
      specialization: true,
      location: true,
      website: true,
      createdAt: true,
    },
    searchFields: [
      "organizationName",
      "description",
      "specialization",
    ],
  },
};

function buildWhere(type, filters) {
  const config = directoryConfig[type];
  const conditions = [config.visibility];

  if (filters.search && config.searchFields.length > 0) {
    conditions.push({
      OR: config.searchFields.map((field) => ({
        [field]: {
          contains: filters.search,
          mode: "insensitive",
        },
      })),
    });
  }

  if (filters.location) {
    conditions.push({
      location: {
        contains: filters.location,
        mode: "insensitive",
      },
    });
  }

  if (type === "startups") {
    if (filters.category) {
      conditions.push({
        category: { in: filters.category },
      });
    }

    if (filters.stage) {
      conditions.push({
        stage: { in: filters.stage },
      });
    }
  }

  if (type === "investors" && filters.investorType) {
    conditions.push({
      investorType: { in: filters.investorType },
    });
  }

  if (type === "mentors") {
    if (filters.expertise) {
      conditions.push({
        expertise: {
          has: filters.expertise,
        },
      });
    }

    if (filters.availabilityStatus) {
      conditions.push({
        availabilityStatus: filters.availabilityStatus,
      });
    }
  }

  if (type === "incubators" && filters.category) {
    conditions.push({
      supportedCategories: {
        hasSome: filters.category,
      },
    });
  }

  if (type === "accelerators" && filters.specialization) {
    conditions.push({
      specialization: {
        contains: filters.specialization,
        mode: "insensitive",
      },
    });
  }

  return { AND: conditions };
}

async function listDirectory(type, filters) {
  const config = directoryConfig[type];

  const where = buildWhere(type, filters);
  const skip = (filters.page - 1) * filters.limit;

  const [records, total] = await Promise.all([
    config.model.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: [
        { [filters.sortBy]: filters.sortOrder },
        { id: "asc" },
      ],
      select: config.select,
    }),

    config.model.count({ where }),
  ]);

  return {
    records,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}

async function getDirectoryProfile(type, id) {
  const config = directoryConfig[type];

  return config.model.findFirst({
    where: {
      AND: [
        { id },
        config.visibility,
      ],
    },
    select: config.select,
  });
}

module.exports = {
  listDirectory,
  getDirectoryProfile,
};