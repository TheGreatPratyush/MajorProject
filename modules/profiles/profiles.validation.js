
const { z } = require("zod");

const ayushCategories = [
  "AYURVEDA",
  "YOGA_NATUROPATHY",
  "UNANI",
  "SIDDHA",
  "SOWA_RIGPA",
  "HOMOEOPATHY",
  "MULTIPLE",
];

const startupStages = [
  "IDEA",
  "PRE_SEED",
  "EARLY_STAGE",
  "GROWTH",
  "ESTABLISHED",
];

const investorTypes = [
  "ANGEL",
  "VENTURE_CAPITAL",
  "PRIVATE_EQUITY",
  "CORPORATE",
  "OTHER",
];

const mentorAvailability = [
  "AVAILABLE",
  "BUSY",
  "UNAVAILABLE",
];

// Prisma Decimal(14,2): up to 12 integer digits and 2 decimal places.
const optionalMoney = z.union([
  z.number()
    .finite()
    .min(0)
    .max(999999999999.99)
    .refine(
      (value) => Number.isInteger(value * 100),
      "Amount can have at most 2 decimal places."
    ),

  z.string().regex(/^\d{1,12}(\.\d{1,2})?$/, {
    message: "Enter a valid non-negative amount with up to 2 decimal places.",
  }),
]).optional();

const optionalString = z.string().trim().max(2000).optional();

const optionalUrl = z.string().url().optional();

// STARTUP
const startupSchema = z.object({
  startupName: z.string().trim().min(2).max(150),
  description: z.string().trim().min(10).max(2000),
  category: z.enum(ayushCategories),
  stage: z.enum(startupStages),
  foundedYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  location: z.string().trim().max(150).optional(),
  website: optionalUrl,
  productDescription: optionalString,
  fundingRequired: optionalMoney,
  teamSize: z.number().int().positive().optional(),
}).strict();

// INVESTOR
const investorSchema = z.object({
  organizationName: z.string().trim().min(2).max(150),
  investorType: z.enum(investorTypes),
  description: optionalString,
  investmentInterests: z.array(z.string().trim().min(1).max(100)).optional(),
  preferredCategories: z.array(z.enum(ayushCategories)).optional(),
  preferredStages: z.array(z.enum(startupStages)).optional(),
  minInvestment: optionalMoney,
  maxInvestment: optionalMoney,
  location: z.string().trim().max(150).optional(),
  website: optionalUrl,
}).strict();

// MENTOR
const mentorSchema = z.object({
  expertise: z.array(z.string().trim().min(1).max(100)).optional(),
  experienceYears: z.number().int().min(0).max(80).optional(),
  biography: optionalString,
  availabilityStatus: z.enum(mentorAvailability).optional(),
  areasOfInterest: z.array(z.enum(ayushCategories)).optional(),
  location: z.string().trim().max(150).optional(),
}).strict();

// INCUBATOR
const incubatorSchema = z.object({
  organizationName: z.string().trim().min(2).max(150),
  description: z.string().trim().min(10).max(2000),
  supportedCategories: z.array(z.enum(ayushCategories)).optional(),
  location: z.string().trim().max(150).optional(),
  website: optionalUrl,
  programsOffered: z.array(z.string().trim().min(1).max(150)).optional(),
}).strict();

// ACCELERATOR
const acceleratorSchema = z.object({
  organizationName: z.string().trim().min(2).max(150),
  description: z.string().trim().min(10).max(2000),
  specialization: z.string().trim().max(500).optional(),
  location: z.string().trim().max(150).optional(),
  website: optionalUrl,
}).strict();

// GOVERNMENT
const governmentSchema = z.object({
  departmentName: z.string().trim().min(2).max(150),
  designation: z.string().trim().max(150).optional(),
  description: optionalString,
  officialWebsite: optionalUrl,
}).strict();

const schemas = {
  STARTUP: startupSchema,
  INVESTOR: investorSchema,
  MENTOR: mentorSchema,
  INCUBATOR: incubatorSchema,
  ACCELERATOR: acceleratorSchema,
  GOVERNMENT: governmentSchema,
};

function validateProfile(role, data, isUpdate = false) {
  const schema = schemas[role];

  if (!schema) {
    return {
      success: false,
      error: "This account role cannot create a stakeholder profile.",
    };
  }

  const selectedSchema = isUpdate
    ? schema.partial().refine(
        (value) => Object.keys(value).length > 0,
        "Provide at least one field to update."
      )
    : schema;

  const result = selectedSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  const validatedData = result.data;

  // Check the investment range when both values are provided.
  if (
    role === "INVESTOR" &&
    validatedData.minInvestment !== undefined &&
    validatedData.maxInvestment !== undefined &&
    Number(validatedData.minInvestment) > Number(validatedData.maxInvestment)
  ) {
    return {
      success: false,
      errors: [
        {
          field: "minInvestment",
          message: "Minimum investment cannot exceed maximum investment.",
        },
      ],
    };
  }

  return {
    success: true,
    data: validatedData,
  };
}

module.exports = { validateProfile };
