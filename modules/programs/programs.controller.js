
const {
  createProgramSchema,
  updateProgramSchema,
  createApplicationSchema,
  programIdSchema,
  applicationIdSchema,
  programListQuerySchema,
  myProgramsQuerySchema,
  listApplicationsQuerySchema,
} = require("./programs.validation");

const programsService = require("./programs.service");

function sendValidationError(res, error) {
  return res.status(400).json({
    success: false,
    message: "Validation failed.",
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

  console.error("Programs module error:", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
    errors: [],
  });
}

async function createProgram(req, res) {
  try {
    const validation = createProgramSchema.safeParse(req.body);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const program = await programsService.createProgram(
      req.user,
      validation.data
    );

    return res.status(201).json({
      success: true,
      message: "Program created successfully.",
      data: program,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function listPrograms(req, res) {
  try {
    const validation = programListQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const result = await programsService.listPrograms(validation.data);

    return res.status(200).json({
      success: true,
      message: "Programs retrieved successfully.",
      data: {
        items: result.items,
      },
      meta: result.meta,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function listMyPrograms(req, res) {
  try {
    const validation = myProgramsQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const result = await programsService.listMyPrograms(
      req.user,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Your programs retrieved successfully.",
      data: {
        items: result.items,
      },
      meta: result.meta,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getProgram(req, res) {
  try {
    const validation = programIdSchema.safeParse(req.params.id);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const program = await programsService.getProgramById(
      req.user,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Program retrieved successfully.",
      data: program,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateProgram(req, res) {
  try {
    const idValidation = programIdSchema.safeParse(req.params.id);

    if (!idValidation.success) {
      return sendValidationError(res, idValidation.error);
    }

    const bodyValidation = updateProgramSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return sendValidationError(res, bodyValidation.error);
    }

    const program = await programsService.updateProgram(
      req.user,
      idValidation.data,
      bodyValidation.data
    );

    return res.status(200).json({
      success: true,
      message: "Program updated successfully.",
      data: program,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function performProgramAction(req, res, action) {
  try {
    const validation = programIdSchema.safeParse(req.params.id);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    let result;

    switch (action) {
      case "publish":
        result = await programsService.publishProgram(
          req.user,
          validation.data
        );
        break;

      case "close":
        result = await programsService.closeProgram(
          req.user,
          validation.data
        );
        break;

      case "complete":
        result = await programsService.completeProgram(
          req.user,
          validation.data
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid program action.",
          errors: [],
        });
    }

    return res.status(200).json({
      success: true,
      message: result.message || `Program ${action}ed successfully.`,
      data: result.program || result,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function publishProgram(req, res) {
  try {
    const validation = programIdSchema.safeParse(req.params.id);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const program = await programsService.publishProgram(
      req.user,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Program published successfully.",
      data: program,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function closeProgram(req, res) {
  return performProgramAction(req, res, "close");
}

async function completeProgram(req, res) {
  return performProgramAction(req, res, "complete");
}

async function createApplication(req, res) {
  try {
    const idValidation = programIdSchema.safeParse(req.params.id);

    if (!idValidation.success) {
      return sendValidationError(res, idValidation.error);
    }

    const bodyValidation = createApplicationSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return sendValidationError(res, bodyValidation.error);
    }

    const application = await programsService.createApplication(
      req.user,
      idValidation.data,
      bodyValidation.data
    );

    return res.status(201).json({
      success: true,
      message: "Program application submitted successfully.",
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

    const result = await programsService.getSentApplications(
      req.user,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Sent program applications retrieved successfully.",
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

    const result = await programsService.getReceivedApplications(
      req.user,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Received program applications retrieved successfully.",
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
    const validation = applicationIdSchema.safeParse(
      req.params.applicationId
    );

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const application = await programsService.getApplicationById(
      req.user,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Program application retrieved successfully.",
      data: application,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function performApplicationAction(req, res, action) {
  try {
    const validation = applicationIdSchema.safeParse(
      req.params.applicationId
    );

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    let result;

    switch (action) {
      case "accept":
        result = await programsService.acceptApplication(
          req.user,
          validation.data
        );
        break;

      case "reject":
        result = await programsService.rejectApplication(
          req.user,
          validation.data
        );
        break;

      case "withdraw":
        result = await programsService.withdrawApplication(
          req.user,
          validation.data
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid application action.",
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
  return performApplicationAction(req, res, "accept");
}

async function rejectApplication(req, res) {
  return performApplicationAction(req, res, "reject");
}

async function withdrawApplication(req, res) {
  return performApplicationAction(req, res, "withdraw");
}

module.exports = {
  createProgram,
  listPrograms,
  listMyPrograms,
  getProgram,
  updateProgram,
  publishProgram,
  closeProgram,
  completeProgram,
  createApplication,
  getSentApplications,
  getReceivedApplications,
  getApplication,
  acceptApplication,
  rejectApplication,
  withdrawApplication,
};
