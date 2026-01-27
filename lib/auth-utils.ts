import { Session } from "next-auth";

type UserRole = "EMPLOYEE" | "DUTY_MANAGER" | "MANAGER" | "ADMIN";

interface SessionUser {
  id: string;
  role: UserRole;
  organizationId: string;
  [key: string]: unknown;
}

/**
 * Check if the user has a manager role (MANAGER or ADMIN)
 */
export function isManager(user: SessionUser | undefined | null): boolean {
  if (!user) return false;
  return user.role === "MANAGER" || user.role === "ADMIN";
}

/**
 * Check if the user is a duty manager
 */
export function isDutyManager(user: SessionUser | undefined | null): boolean {
  if (!user) return false;
  return user.role === "DUTY_MANAGER";
}

/**
 * Check if the user has an admin role
 */
export function isAdmin(user: SessionUser | undefined | null): boolean {
  if (!user) return false;
  return user.role === "ADMIN";
}

/**
 * Check if the user is an employee (not a manager or admin)
 */
export function isEmployee(user: SessionUser | undefined | null): boolean {
  if (!user) return false;
  return user.role === "EMPLOYEE";
}

/**
 * Check if the user can access a specific organization's data
 */
export function canAccessOrganization(
  user: SessionUser | undefined | null,
  organizationId: string
): boolean {
  if (!user) return false;
  return user.organizationId === organizationId;
}

/**
 * Get a clean authorization error response
 */
export function getUnauthorizedResponse(): { error: string; status: 401 } {
  return { error: "Unauthorized", status: 401 };
}

/**
 * Get a clean forbidden error response
 */
export function getForbiddenResponse(): { error: string; status: 403 } {
  return { error: "Forbidden", status: 403 };
}
