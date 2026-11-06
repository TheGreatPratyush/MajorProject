const {
  validateDirectoryQuery,
  validateDirectoryId,
} = require("./directories.validation");

const {
  listDirectory,
  getDirectoryProfile,
} = require("./directories.service");

function handleError(res, error) {
  if (error.statusCode === 400) {
    return res.status(400).json({
      success: false,
      message: error.message,
      errors: error.errors || [],
    });
  }

  console.error("Directory error:", error.message);

  return res.status(500).json({
    success: false,
    message: "An unexpected error occurred.",
    errors: [],
  });
}

function createListController(type, label) {
  return async (req, res) => {
    try {
      const filters = validateDirectoryQuery(type, req.query);

      const result = await listDirectory(type, filters);

      return res.status(200).json({
        success: true,
        message: `${label} retrieved successfully.`,
        data: result.records,
        meta: result.meta,
      });
    } catch (error) {
      return handleError(res, error);
    }
  };
}

function createDetailController(type, label) {
  return async (req, res) => {
    try {
      const id = validateDirectoryId(req.params.id);

      const profile = await getDirectoryProfile(type, id);

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: `${label} not found.`,
          errors: [],
        });
      }

      return res.status(200).json({
        success: true,
        message: `${label} retrieved successfully.`,
        data: profile,
        meta: null,
      });
    } catch (error) {
      return handleError(res, error);
    }
  };
}

module.exports = {
  listStartups: createListController("startups", "Startups"),
  getStartup: createDetailController("startups", "Startup"),

  listInvestors: createListController("investors", "Investors"),
  getInvestor: createDetailController("investors", "Investor"),

  listMentors: createListController("mentors", "Mentors"),
  getMentor: createDetailController("mentors", "Mentor"),

  listIncubators: createListController("incubators", "Incubators"),
  getIncubator: createDetailController("incubators", "Incubator"),

  listAccelerators: createListController("accelerators", "Accelerators"),
  getAccelerator: createDetailController("accelerators", "Accelerator"),
};