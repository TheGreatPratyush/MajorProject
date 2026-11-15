const { activityQuerySchema } = require("./dashboard.validation");
const dashboardService = require("./dashboard.service");

function sendValidationError(res, error) {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  });
}

function handleError(res, error) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.errors || [],
    });
  }

  console.error("Dashboard module error:", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
    errors: [],
  });
}

async function getSummary(req, res) {
  try {
    const summary = await dashboardService.getSummary(req.user);

    return res.status(200).json({
      success: true,
      message: "Dashboard summary retrieved successfully.",
      data: summary,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getActivity(req, res) {
  try {
    const validation = activityQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const result = await dashboardService.getActivity(req.user, validation.data);

    return res.status(200).json({
      success: true,
      message: "Dashboard activity retrieved successfully.",
      data: { items: result.items },
      meta: result.meta,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  getSummary,
  getActivity,
};
