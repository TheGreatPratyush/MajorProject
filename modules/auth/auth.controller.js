
const { registerSchema, loginSchema } = require("./auth.validation");
const { registerUser, loginUser } = require("./auth.service");

async function register(req, res) {
  try {
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

    const user = await registerUser(validation.data);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: user,
      meta: null,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
      errors: [],
    });
  }
}

async function login(req, res) {
  try {
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
    return res.status(401).json({
      success: false,
      message: error.message,
      errors: [],
    });
  }
}

module.exports = { register, login };
