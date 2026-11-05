
const profileService = require("./profiles.service");
const { validateProfile } = require("./profiles.validation");

function handleError(res, error) {
  if (error.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "A profile already exists for this account.",
      errors: [],
    });
  }

  if (error.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Profile not found.",
      errors: [],
    });
  }

  const statusCode = error.statusCode || 500;

  if (statusCode === 500) {
    console.error("Profile operation failed:", error.message);
  }

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "An unexpected error occurred."
        : error.message,
    errors: [],
  });
}

function handleValidationError(res, validation) {
  // Unsupported account roles cannot manage stakeholder profiles.
  if (validation.error) {
    return res.status(403).json({
      success: false,
      message: validation.error,
      errors: [],
    });
  }

  return res.status(400).json({
    success: false,
    message: "Validation failed.",
    errors: validation.errors || [],
  });
}

async function createProfile(req, res) {
  const validation = validateProfile(req.user.role, req.body);

  if (!validation.success) {
    return handleValidationError(res, validation);
  }

  try {
    const profile = await profileService.createProfile(
      req.user,
      validation.data
    );

    return res.status(201).json({
      success: true,
      message: "Profile created successfully.",
      data: profile,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getMyProfile(req, res) {
  try {
    const profile = await profileService.getMyProfile(req.user);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found. Please create your profile first.",
        errors: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile retrieved successfully.",
      data: profile,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateMyProfile(req, res) {
  const validation = validateProfile(req.user.role, req.body, true);

  if (!validation.success) {
    return handleValidationError(res, validation);
  }

  try {
    const profile = await profileService.updateMyProfile(
      req.user,
      validation.data
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found. Create your profile first.",
        errors: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: profile,
      meta: null,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  createProfile,
  getMyProfile,
  updateMyProfile,
};
