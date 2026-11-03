const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { prisma } = require("../../database/db");

// Hash the JWT before storing it in the database.
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Ensure the JWT secret is configured.
function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return process.env.JWT_SECRET;
}

// Create a database session and return its JWT.
async function createUserSession(user) {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || "1d";

  const sessionId = crypto.randomUUID();

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      sessionId,
    },
    secret,
    { expiresIn }
  );

  const decodedToken = jwt.decode(token);

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(decodedToken.exp * 1000),
    },
  });

  return token;
}

// Register a new stakeholder.
async function registerUser(userData) {
  const existingUser = await prisma.user.findUnique({
    where: { email: userData.email },
  });

  if (existingUser) {
    throw new Error("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(userData.password, 12);

  const user = await prisma.user.create({
    data: {
      name: userData.name,
      email: userData.email,
      passwordHash,
      role: userData.role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return user;
}

// Login and create a session.
async function loginUser(email, password) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new Error("Invalid email or password");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("Your account is not active");
  }

  const token = await createUserSession(user);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
    token,
  };
}

// Get the currently authenticated user's details.
async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  if (!user || user.status !== "ACTIVE") {
    throw new Error("User account is not available");
  }

  return user;
}

// Logout by revoking the current session.
async function logoutUser(sessionId) {
  await prisma.session.updateMany({
    where: {
      id: sessionId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

// Change password and revoke all existing sessions.
async function changeUserPassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const passwordMatches = await bcrypt.compare(
    currentPassword,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new Error("Current password is incorrect");
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    }),

    prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    }),
  ]);
}

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  changeUserPassword,
  hashToken,
};