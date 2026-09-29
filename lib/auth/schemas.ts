import { z } from "zod";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";

// Runtime validation for the auth endpoints. Strict objects: unexpected
// keys (e.g. a smuggled `role` or `userId`) are rejected, not ignored.

const emailSchema = z
  .string({ invalid_type_error: "Enter a valid email address" })
  .trim()
  .max(254, "Enter a valid email address")
  .email("Enter a valid email address")
  .transform((email) => email.toLowerCase());

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z
      .string({ invalid_type_error: "Password is required" })
      .min(1, "Password is required")
      .max(PASSWORD_MAX_LENGTH, "Invalid email or password."),
  })
  .strict();

export const signupSchema = z
  .object({
    name: z
      .string({ invalid_type_error: "Name is required" })
      .trim()
      .min(1, "Name is required")
      .max(80, "Name must be 80 characters or fewer")
      .refine((name) => !/[\u0000-\u001f\u007f]/.test(name), "Name contains invalid characters"),
    email: emailSchema,
    password: z
      .string({ invalid_type_error: "Password is required" })
      .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
      .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`),
  })
  .strict();
