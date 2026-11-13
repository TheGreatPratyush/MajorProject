const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} = require("./auth.validation");

const {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  changeUserPassword,
} = require("./auth.service");

// Register
async function register(req, res) {
  const validation = registerSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  try {
    const user = await registerUser(validation.data);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: user,
      meta: null,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
        errors: [],
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Registration failed",
      errors: [],
    });
  }
}

// Login
async function login(req, res) {
  const validation = loginSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  try {
    const result = await loginUser(
      validation.data.email,
      validation.data.password
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
      meta: null,
    });
  } catch (error) {
    if (
      error.message === "Invalid email or password" ||
      error.message === "Your account is not active"
    ) {
      return res.status(401).json({
        success: false,
        message: error.message,
        errors: [],
      });
    }

    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Login failed",
      errors: [],
    });
  }
}

// Get current logged-in user
async function me(req, res) {
  try {
    const user = await getCurrentUser(req.user.id);

    return res.status(200).json({
      success: true,
      message: "User details fetched successfully",
      data: user,
      meta: null,
    });
  } catch (error) {
    console.error("Get current user error:", error.message);

    return res.status(404).json({
      success: false,
      message: "User not found",
      errors: [],
    });
  }
}

// Logout
async function logout(req, res) {
  try {
    await logoutUser(req.user.sessionId);

    return res.status(200).json({
      success: true,
      message: "Logout successful",
      data: null,
      meta: null,
    });
  } catch (error) {
    console.error("Logout error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Logout failed",
      errors: [],
    });
  }
}

// Change password
async function changePassword(req, res) {
  const validation = changePasswordSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  try {
    await changeUserPassword(
      req.user.id,
      validation.data.currentPassword,
      validation.data.newPassword
    );

    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please log in again.",
      data: null,
      meta: null,
    });
  } catch (error) {
    if (error.message === "Current password is incorrect") {
      return res.status(400).json({
        success: false,
        message: error.message,
        errors: [],
      });
    }

    console.error("Password change error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Password change failed",
      errors: [],
    });
  }
}

module.exports = {
  register,
  login,
  me,
  logout,
  changePassword,
};