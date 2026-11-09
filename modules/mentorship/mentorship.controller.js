
const {
  createApplicationSchema,
  applicationIdSchema,
  listApplicationsQuerySchema,
} = require("./mentorship.validation");

const mentorshipService = require("./mentorship.service");

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

  console.error("Mentorship module error:", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
    errors: [],
  });
}

async function createApplication(req, res) {
  try {
    const validation = createApplicationSchema.safeParse(req.body);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const application =
      await mentorshipService.createMentorshipApplication(
        req.user,
        validation.data
      );

    return res.status(201).json({
      success: true,
      message: "Mentorship application submitted successfully.",
      data: application,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getSentApplications(req, res) {
  try {
    const validation = listApplicationsQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const result = await mentorshipService.getSentApplications(
      req.user,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Sent mentorship applications retrieved successfully.",
      data: {
        items: result.items,
      },
      meta: result.meta,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getReceivedApplications(req, res) {
  try {
    const validation = listApplicationsQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const result = await mentorshipService.getReceivedApplications(
      req.user,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Received mentorship applications retrieved successfully.",
      data: {
        items: result.items,
      },
      meta: result.meta,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getApplication(req, res) {
  try {
    const validation = applicationIdSchema.safeParse(req.params.id);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const application =
      await mentorshipService.getMentorshipApplication(
        req.user,
        validation.data
      );

    return res.status(200).json({
      success: true,
      message: "Mentorship application retrieved successfully.",
      data: application,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function performStatusAction(req, res, action) {
  try {
    const validation = applicationIdSchema.safeParse(req.params.id);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    let result;

    switch (action) {
      case "accept":
        result = await mentorshipService.acceptMentorshipApplication(
          req.user,
          validation.data
        );
        break;

      case "reject":
        result = await mentorshipService.rejectMentorshipApplication(
          req.user,
          validation.data
        );
        break;

      case "cancel":
        result = await mentorshipService.cancelMentorshipApplication(
          req.user,
          validation.data
        );
        break;

      case "complete":
        result = await mentorshipService.completeMentorship(
          req.user,
          validation.data
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid mentorship action.",
          errors: [],
        });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.application,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function acceptApplication(req, res) {
  return performStatusAction(req, res, "accept");
}

async function rejectApplication(req, res) {
  return performStatusAction(req, res, "reject");
}

async function cancelApplication(req, res) {
  return performStatusAction(req, res, "cancel");
}

async function completeMentorship(req, res) {
  return performStatusAction(req, res, "complete");
}

module.exports = {
  createApplication,
  getSentApplications,
  getReceivedApplications,
  getApplication,
  acceptApplication,
  rejectApplication,
  cancelApplication,
  completeMentorship,
};
