const { z } = require("zod");

const AYUSH_CATEGORIES = [
  "AYURVEDA",
  "YOGA_NATUROPATHY",
  "UNANI",
  "SIDDHA",
  "SOWA_RIGPA",
  "HOMOEOPATHY",
  "MULTIPLE",
];

const STARTUP_STAGES = [
  "IDEA",
  "PRE_SEED",
  "EARLY_STAGE",
  "GROWTH",
  "ESTABLISHED",
];

const INVESTOR_TYPES = [
  "ANGEL",
  "VENTURE_CAPITAL",
  "PRIVATE_EQUITY",
  "CORPORATE",
  "OTHER",
];

const MENTOR_AVAILABILITY = [
  "AVAILABLE",
  "BUSY",
  "UNAVAILABLE",
];

function commaSeparatedEnum(values) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;

      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    },
    z.array(z.enum(values)).min(1).optional()
  );
}

const commonFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().min(1).max(100).optional(),
  sortBy: z.enum(["createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
};

const locationField = z.string().trim().min(1).max(100).optional();

const directorySchemas = {
  startups: z.object({
    ...commonFields,
    category: commaSeparatedEnum(AYUSH_CATEGORIES),
    stage: commaSeparatedEnum(STARTUP_STAGES),
    location: locationField,
  }).strict(),

  investors: z.object({
    ...commonFields,
    investorType: commaSeparatedEnum(INVESTOR_TYPES),
    location: locationField,
  }).strict(),

  mentors: z.object({
    ...commonFields,
    expertise: z.string().trim().min(1).max(100).optional(),
    availabilityStatus: z.enum(MENTOR_AVAILABILITY).optional(),
    location: locationField,
  }).strict(),

  incubators: z.object({
    ...commonFields,
    category: commaSeparatedEnum(AYUSH_CATEGORIES),
    location: locationField,
  }).strict(),

  accelerators: z.object({
    ...commonFields,
    specialization: z.string().trim().min(1).max(100).optional(),
    location: locationField,
  }).strict(),
};

function formatValidationErrors(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "query",
    message: issue.message,
  }));
}

function validateDirectoryQuery(type, query) {
  const schema = directorySchemas[type];

  if (!schema) {
    const error = new Error("Invalid directory type.");
    error.statusCode = 400;
    throw error;
  }

  const result = schema.safeParse(query);

  if (!result.success) {
    const error = new Error("Invalid query parameters.");
    error.statusCode = 400;
    error.errors = formatValidationErrors(result.error);
    throw error;
  }

  return result.data;
}

function validateDirectoryId(id) {
  const result = z.string().uuid().safeParse(id);

  if (!result.success) {
    const error = new Error("Invalid profile ID.");
    error.statusCode = 400;
    error.errors = [
      {
        field: "id",
        message: "A valid UUID is required.",
      },
    ];
    throw error;
  }

  return result.data;
}

module.exports = {
  validateDirectoryQuery,
  validateDirectoryId,
};