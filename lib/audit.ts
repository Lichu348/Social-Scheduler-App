export type AuditAction =
  | "USER_CREATED"
  | "USER_DELETED"
  | "USER_ROLE_CHANGED"
  | "SHIFT_CREATED"
  | "SHIFT_DELETED"
  | "SHIFT_ASSIGNED"
  | "CASH_TRANSACTION"
  | "COMPLIANCE_SIGNED"
  | "COMPLIANCE_ITEM_CREATED"
  | "LOCATION_CREATED"
  | "LOCATION_DELETED";

export async function logAudit(
  action: AuditAction,
  performedById: string,
  organizationId: string,
  details: Record<string, unknown>
) {
  // For now, just console log - can add AuditLog model later
  console.log(`[AUDIT] ${action}`, {
    performedById,
    organizationId,
    details,
    timestamp: new Date().toISOString(),
  });
}
