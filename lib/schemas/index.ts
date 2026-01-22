import { z } from "zod";

// Common schemas
export const emailSchema = z.string().email("Invalid email format");
export const idSchema = z.string().cuid("Invalid ID format");

// Team/User schemas
export const createUserSchema = z.object({
  email: emailSchema,
  name: z.string().min(1, "Name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["EMPLOYEE", "MANAGER", "ADMIN"]).optional(),
  staffRole: z.enum(["DESK", "COACH", "SETTER", "INSTRUCTOR"]).optional(),
  primaryLocationId: idSchema.optional().nullable(),
});

// Location schemas
export const createLocationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  clockInRadiusMetres: z.number().min(0).optional(),
  breakRules: z.string().optional().nullable(),
});

// Shift schemas
export const createShiftSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  startTime: z.string().datetime("Invalid start time format"),
  endTime: z.string().datetime("Invalid end time format"),
  assignedToId: idSchema.optional().nullable(),
  categoryId: idSchema.optional().nullable(),
  locationId: idSchema.optional().nullable(),
}).refine(
  (data) => new Date(data.startTime) < new Date(data.endTime),
  {
    message: "End time must be after start time",
    path: ["endTime"],
  }
);

// Time entry schemas
export const clockInSchema = z.object({
  shiftId: idSchema,
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

// Compliance schemas
export const createComplianceItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  type: z.enum(["POLICY", "QUALIFICATION", "REVIEW"]),
  validityMonths: z.number().min(1).optional(),
  isRequired: z.boolean().optional(),
  requiredForRoles: z.array(z.string()).optional(),
  fileUrl: z.string().url("Invalid file URL").optional().nullable(),
  fileName: z.string().optional().nullable(),
  requiresProof: z.boolean().optional(),
});
