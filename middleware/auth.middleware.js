const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { prisma } = require("../database/db");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication token required",
      errors: [],
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.userId || !decoded.sessionId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
        errors: [],
      });
    }

    const session = await prisma.session.findUnique({
      where: {
        id: decoded.sessionId,
      },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (
      !session ||
      session.userId !== decoded.userId ||
      session.tokenHash !== hashToken(token) ||
      session.revokedAt !== null ||
      session.expiresAt <= new Date() ||
      !session.user ||
      session.user.status !== "ACTIVE"
    ) {
      return res.status(401).json({
        success: false,
        message: "Session is invalid, expired, or revoked",
        errors: [],
      });
    }

    req.user = {
      id: session.user.id,
      role: session.user.role,
      sessionId: session.id,
    };

    next();
  } catch (error) {
    if (error.name !== "JsonWebTokenError" &&
        error.name !== "TokenExpiredError") {
      console.error("Authentication error:", error.message);
    }

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
      errors: [],
    });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
        errors: [],
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
};