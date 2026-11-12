const {
  createResourceSchema,
  updateResourceSchema,
  resourceIdSchema,
  resourceListQuerySchema,
} = require("./resources.validation");

const resourcesService = require("./resources.service");

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

  console.error("Resources module error:", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
    errors: [],
  });
}

async function listResources(req, res) {
  try {
    const validation = resourceListQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const result = await resourcesService.listResources(validation.data);

    return res.status(200).json({
      success: true,
      message: "Resources retrieved successfully.",
      data: {
        items: result.items,
      },
      meta: result.meta,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function listMyResources(req, res) {
  try {
    const validation = resourceListQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const result = await resourcesService.listMyResources(
      req.user,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Your resources retrieved successfully.",
      data: {
        items: result.items,
      },
      meta: result.meta,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getResource(req, res) {
  try {
    const validation = resourceIdSchema.safeParse(req.params.id);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const resource = await resourcesService.getResourceById(validation.data);

    return res.status(200).json({
      success: true,
      message: "Resource retrieved successfully.",
      data: resource,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createResource(req, res) {
  try {
    const validation = createResourceSchema.safeParse(req.body);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const resource = await resourcesService.createResource(
      req.user,
      validation.data
    );

    return res.status(201).json({
      success: true,
      message: "Resource published successfully.",
      data: resource,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateResource(req, res) {
  try {
    const idValidation = resourceIdSchema.safeParse(req.params.id);

    if (!idValidation.success) {
      return sendValidationError(res, idValidation.error);
    }

    const bodyValidation = updateResourceSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return sendValidationError(res, bodyValidation.error);
    }

    const resource = await resourcesService.updateResource(
      req.user,
      idValidation.data,
      bodyValidation.data
    );

    return res.status(200).json({
      success: true,
      message: "Resource updated successfully.",
      data: resource,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function deleteResource(req, res) {
  try {
    const validation = resourceIdSchema.safeParse(req.params.id);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const result = await resourcesService.deleteResource(
      req.user,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Resource deleted successfully.",
      data: result,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  listResources,
  listMyResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
};
