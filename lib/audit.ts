import { prisma } from "./db";

// Priority 1 - Sensitive operations
export type SensitiveAuditAction =
  | "STARTER_FORM_VIEWED"
  | "STARTER_FORM_SENSITIVE_REVEALED"
  | "STARTER_FORM_PDF_GENERATED"
  | "CASH_TRANSACTION_CREATED"
  | "CASH_TRANSACTION_DELETED";

// Priority 2 - Important operations
export type ImportantAuditAction =
  | "TIME_ENTRY_CREATED"
  | "TIME_ENTRY_UPDATED"
  | "TIME_ENTRY_APPROVED"
  | "TIME_ENTRY_REJECTED"
  | "COMPLIANCE_SIGNED"
  | "COMPLIANCE_REVIEW_COMPLETED"
  | "USER_ROLE_CHANGED"
  | "SHIFT_ASSIGNED"
  | "SHIFT_DELETED";

// Legacy actions (for backwards compatibility)
export type LegacyAuditAction =
  | "USER_CREATED"
  | "USER_DELETED"
  | "SHIFT_CREATED"
  | "CASH_TRANSACTION"
  | "COMPLIANCE_ITEM_CREATED"
  | "LOCATION_CREATED"
  | "LOCATION_DELETED";

export type AuditAction =
  | SensitiveAuditAction
  | ImportantAuditAction
  | LegacyAuditAction;

// Actions that are considered sensitive (access to PII, financial data)
const SENSITIVE_ACTIONS: AuditAction[] = [
  "STARTER_FORM_VIEWED",
  "STARTER_FORM_SENSITIVE_REVEALED",
  "STARTER_FORM_PDF_GENERATED",
  "CASH_TRANSACTION_CREATED",
  "CASH_TRANSACTION_DELETED",
];

export interface AuditLogOptions {
  action: AuditAction;
  userId: string;
  organizationId: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Logs an audit event to the database
 */
export async function logAudit(options: AuditLogOptions): Promise<void> {
  const {
    action,
    userId,
    organizationId,
    resourceType,
    resourceId,
    ipAddress,
    userAgent,
    changes,
    metadata,
  } = options;

  const sensitiveAccess = SENSITIVE_ACTIONS.includes(action);

  try {
    await prisma.auditLog.create({
      data: {
        action,
        resourceType: resourceType || inferResourceType(action),
        resourceId: resourceId || null,
        userId,
        organizationId,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        changes: changes ? JSON.stringify(changes) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        sensitiveAccess,
      },
    });
  } catch (error) {
    // Log to console but don't fail the request if audit logging fails
    console.error("[AUDIT ERROR] Failed to write audit log:", error, {
      action,
      userId,
      organizationId,
    });
  }
}

/**
 * Helper to extract request context from NextRequest headers
 */
export function getRequestContext(req: Request): {
  ipAddress: string | undefined;
  userAgent: string | undefined;
} {
  const headers = new Headers(req.headers);
  return {
    ipAddress:
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headers.get("x-real-ip") ||
      undefined,
    userAgent: headers.get("user-agent") || undefined,
  };
}

/**
 * Infer resource type from action name
 */
function inferResourceType(action: AuditAction): string {
  if (action.startsWith("STARTER_FORM")) return "StarterForm";
  if (action.startsWith("TIME_ENTRY")) return "TimeEntry";
  if (action.startsWith("CASH_TRANSACTION") || action === "CASH_TRANSACTION")
    return "CashTransaction";
  if (action.startsWith("COMPLIANCE")) return "UserCompliance";
  if (action.startsWith("USER")) return "User";
  if (action.startsWith("SHIFT")) return "Shift";
  if (action.startsWith("LOCATION")) return "Location";
  return "Unknown";
}
