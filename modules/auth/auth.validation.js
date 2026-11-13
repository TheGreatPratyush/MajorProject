const { z } = require("zod");

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(100, "Name is too long"),

  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .toLowerCase(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),

  role: z.enum([
    "STARTUP",
    "INVESTOR",
    "INCUBATOR",
    "ACCELERATOR",
    "MENTOR",
    "PUBLIC",
  ]),
});

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .toLowerCase(),

  password: z
    .string()
    .min(1, "Password is required"),
});

const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, "Current password is required"),

  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(72, "New password is too long"),
}).refine(
  (data) => data.currentPassword !== data.newPassword,
  {
    message: "New password must be different from current password",
    path: ["newPassword"],
  }
);

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
};