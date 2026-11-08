const {
  sendConnectionSchema,
  connectionIdSchema,
  listConnectionQuerySchema,
  acceptedConnectionQuerySchema,
} = require("./connections.validation");

const connectionService = require("./connections.service");

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

  console.error("Connections module error:", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
    errors: [],
  });
}

async function sendRequest(req, res) {
  try {
    const validation = sendConnectionSchema.safeParse(req.body);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const result = await connectionService.sendConnectionRequest(
      req.user,
      validation.data
    );

    return res.status(201).json({
      success: true,
      message: result.reopened
        ? "Connection request reopened successfully."
        : "Connection request sent successfully.",
      data: result.request,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getSentRequests(req, res) {
  try {
    const validation = listConnectionQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const result = await connectionService.getSentRequests(
      req.user,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Sent connection requests retrieved successfully.",
      data: {
        items: result.items,
      },
      meta: result.meta,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getReceivedRequests(req, res) {
  try {
    const validation = listConnectionQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const result = await connectionService.getReceivedRequests(
      req.user,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Received connection requests retrieved successfully.",
      data: {
        items: result.items,
      },
      meta: result.meta,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getAcceptedConnections(req, res) {
  try {
    const validation = acceptedConnectionQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const result = await connectionService.getAcceptedConnections(
      req.user,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Accepted connections retrieved successfully.",
      data: {
        items: result.items,
      },
      meta: result.meta,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getConnectionRequest(req, res) {
  try {
    const validation = connectionIdSchema.safeParse(req.params.id);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const request = await connectionService.getConnectionRequest(
      req.user,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Connection request retrieved successfully.",
      data: request,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function performStatusAction(req, res, action) {
  try {
    const validation = connectionIdSchema.safeParse(req.params.id);

    if (!validation.success) {
      return sendValidationError(res, validation.error);
    }

    const result =
      action === "accept"
        ? await connectionService.acceptConnectionRequest(
            req.user,
            validation.data
          )
        : action === "reject"
          ? await connectionService.rejectConnectionRequest(
              req.user,
              validation.data
            )
          : await connectionService.cancelConnectionRequest(
              req.user,
              validation.data
            );

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.request,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function acceptRequest(req, res) {
  return performStatusAction(req, res, "accept");
}

async function rejectRequest(req, res) {
  return performStatusAction(req, res, "reject");
}

async function cancelRequest(req, res) {
  return performStatusAction(req, res, "cancel");
}

module.exports = {
  sendRequest,
  getSentRequests,
  getReceivedRequests,
  getAcceptedConnections,
  getConnectionRequest,
  acceptRequest,
  rejectRequest,
  cancelRequest,
};