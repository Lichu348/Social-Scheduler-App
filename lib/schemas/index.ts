import { z } from "zod";

// Common schemas
export const emailSchema = z.string().email("Invalid email format");
export const idSchema = z.string().cuid("Invalid ID format");

// Team/User schemas
export const createUserSchema = z.object({
  email: emailSchema,
  name: z.string().min(1, "Name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["EMPLOYEE", "DUTY_MANAGER", "MANAGER", "ADMIN"]).optional(),
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

// Cash transaction schemas
export const createCashTransactionSchema = z.object({
  type: z.enum(["TAKING", "BANKING", "PURCHASE", "ADJUSTMENT"], {
    error: "Invalid transaction type",
  }),
  amount: z.number({ error: "Amount is required" }),
  notes: z.string().optional().nullable(),
  locationId: idSchema.optional().nullable(),
});

// Cash up session schemas
export const createCashUpSessionSchema = z.object({
  date: z.string().datetime({ error: "Invalid date format" }),
  locationId: idSchema,
  expectedCash: z.number().optional(),
  expectedPdq: z.number().optional(),
  expectedOnline: z.number().optional(),
  expectedZRead: z.number().optional(),
  actualCash: z.number().optional(),
  actualPdq: z.number().optional(),
  actualOnline: z.number().optional(),
  actualZRead: z.number().optional(),
  giftCardsRedeemed: z.number().optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "SUBMITTED", "REVIEWED"]).optional(),
});

// Manual time entry schemas
export const createManualTimeEntrySchema = z.object({
  userId: idSchema,
  shiftId: idSchema.optional().nullable(),
  clockIn: z.string().datetime({ error: "Invalid clock-in time format" }),
  clockOut: z.string().datetime({ error: "Invalid clock-out time format" }).optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine(
  (data) => !data.clockOut || new Date(data.clockIn) < new Date(data.clockOut),
  {
    message: "Clock-out must be after clock-in",
    path: ["clockOut"],
  }
);
