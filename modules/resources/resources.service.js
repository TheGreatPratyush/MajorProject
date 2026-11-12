const { prisma } = require("../../database/db");

const PUBLISHER_ROLES = ["GOVERNMENT", "ADMIN"];

const RESOURCE_SELECT = {
  id: true,
  title: true,
  description: true,
  category: true,
  sourceUrl: true,
  publisherId: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  publisher: {
    select: {
      id: true,
      name: true,
      role: true,
    },
  },
};

class ResourceError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.name = "ResourceError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

function throwError(statusCode, message) {
  throw new ResourceError(statusCode, message);
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

function getResourceWhere(filters) {
  return {
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.search
      ? {
          OR: [
            {
              title: {
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
        }
      : {}),
  };
}

function assertPublisherRole(user) {
  if (!user || !PUBLISHER_ROLES.includes(user.role)) {
    throwError(
      403,
      "Only verified government accounts and administrators can manage resources."
    );
  }
}

async function requireVerifiedGovernment(user) {
  if (user.role === "ADMIN") {
    return null;
  }

  if (user.role !== "GOVERNMENT") {
    throwError(403, "You do not have permission to manage resources.");
  }

  const profile = await prisma.governmentProfile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      userId: true,
      verificationStatus: true,
    },
  });

  if (!profile) {
    throwError(403, "A government profile is required to publish resources.");
  }

  if (profile.verificationStatus !== "VERIFIED") {
    throwError(
      403,
      "A verified government profile is required to manage resources."
    );
  }

  return profile;
}

function assertCanViewOwnResources(user) {
  if (!user || !PUBLISHER_ROLES.includes(user.role)) {
    throwError(
      403,
      "Only government publishers and administrators can view their published resources."
    );
  }
}

async function listResources(filters) {
  const where = getResourceWhere(filters);

  const [items, total] = await Promise.all([
    prisma.resource.findMany({
      where,
      select: RESOURCE_SELECT,
      ...getPagination(filters),
      orderBy: [
        { publishedAt: filters.sortOrder },
        { id: "asc" },
      ],
    }),
    prisma.resource.count({ where }),
  ]);

  return {
    items,
    meta: getPaginationMeta(filters.page, filters.limit, total),
  };
}

async function listMyResources(user, filters) {
  assertCanViewOwnResources(user);

  const where = {
    publisherId: user.id,
    ...getResourceWhere(filters),
  };

  const [items, total] = await Promise.all([
    prisma.resource.findMany({
      where,
      select: RESOURCE_SELECT,
      ...getPagination(filters),
      orderBy: [
        { publishedAt: filters.sortOrder },
        { id: "asc" },
      ],
    }),
    prisma.resource.count({ where }),
  ]);

  return {
    items,
    meta: getPaginationMeta(filters.page, filters.limit, total),
  };
}

async function getResourceById(id) {
  const resource = await prisma.resource.findUnique({
    where: { id },
    select: RESOURCE_SELECT,
  });

  if (!resource) {
    throwError(404, "Resource not found.");
  }

  return resource;
}

async function createResource(user, data) {
  assertPublisherRole(user);
  await requireVerifiedGovernment(user);

  return prisma.resource.create({
    data: {
      title: data.title,
      description: data.description,
      category: data.category,
      sourceUrl: data.sourceUrl,
      publisherId: user.id,
    },
    select: RESOURCE_SELECT,
  });
}

async function getOwnedResourceOrThrow(user, id) {
  const resource = await prisma.resource.findUnique({
    where: { id },
    select: {
      id: true,
      publisherId: true,
    },
  });

  if (!resource) {
    throwError(404, "Resource not found.");
  }

  if (user.role !== "ADMIN" && resource.publisherId !== user.id) {
    throwError(404, "Resource not found.");
  }

  return resource;
}

async function updateResource(user, id, data) {
  assertPublisherRole(user);

  await getOwnedResourceOrThrow(user, id);
  await requireVerifiedGovernment(user);

  const where =
    user.role === "ADMIN"
      ? { id }
      : { id, publisherId: user.id };

  const result = await prisma.resource.updateMany({
    where,
    data,
  });

  if (result.count !== 1) {
    throwError(404, "Resource not found.");
  }

  return prisma.resource.findUnique({
    where: { id },
    select: RESOURCE_SELECT,
  });
}

async function deleteResource(user, id) {
  assertPublisherRole(user);

  await getOwnedResourceOrThrow(user, id);
  await requireVerifiedGovernment(user);

  const where =
    user.role === "ADMIN"
      ? { id }
      : { id, publisherId: user.id };

  const result = await prisma.resource.deleteMany({ where });

  if (result.count !== 1) {
    throwError(404, "Resource not found.");
  }

  return {
    id,
  };
}

module.exports = {
  ResourceError,
  listResources,
  listMyResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
};
