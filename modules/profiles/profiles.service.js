
const { prisma } = require("../../database/db");

const profileModels = {
  STARTUP: prisma.startupProfile,
  INVESTOR: prisma.investorProfile,
  MENTOR: prisma.mentorProfile,
  INCUBATOR: prisma.incubatorProfile,
  ACCELERATOR: prisma.acceleratorProfile,
  GOVERNMENT: prisma.governmentProfile,
};

const safeUserFields = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
};

function getProfileModel(role) {
  const model = profileModels[role];

  if (!model) {
    const error = new Error(
      "This account role cannot manage a stakeholder profile."
    );
    error.statusCode = 403;
    throw error;
  }

  return model;
}

function validateInvestmentRange(minInvestment, maxInvestment) {
  if (
    minInvestment != null &&
    maxInvestment != null &&
    Number(minInvestment) > Number(maxInvestment)
  ) {
    const error = new Error(
      "Minimum investment cannot exceed maximum investment."
    );
    error.statusCode = 400;
    throw error;
  }
}

async function createProfile(user, data) {
  const model = getProfileModel(user.role);

  if (user.role === "INVESTOR") {
    validateInvestmentRange(data.minInvestment, data.maxInvestment);
  }

  return model.create({
    data: {
      ...data,
      userId: user.id,
    },
    include: {
      user: { select: safeUserFields },
    },
  });
}

async function getMyProfile(user) {
  const model = getProfileModel(user.role);

  return model.findUnique({
    where: { userId: user.id },
    include: {
      user: { select: safeUserFields },
    },
  });
}

async function updateMyProfile(user, data) {
  const model = getProfileModel(user.role);

  const existingProfile = await model.findUnique({
    where: { userId: user.id },
  });

  if (!existingProfile) {
    return null;
  }

  if (user.role === "INVESTOR") {
    const minInvestment =
      data.minInvestment !== undefined
        ? data.minInvestment
        : existingProfile.minInvestment;

    const maxInvestment =
      data.maxInvestment !== undefined
        ? data.maxInvestment
        : existingProfile.maxInvestment;

    validateInvestmentRange(minInvestment, maxInvestment);
  }

  return model.update({
    where: { userId: user.id },
    data,
    include: {
      user: { select: safeUserFields },
    },
  });
}

module.exports = {
  createProfile,
  getMyProfile,
  updateMyProfile,
};
