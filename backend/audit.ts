/**
 * Minimal, structured audit foundation. It intentionally records identifiers
 * and outcomes only—never request bodies, passwords, tokens, addresses, or
 * notification content. Configure a durable log sink in hosting before
 * treating this as a production audit trail.
 */
export type AuditAction =
  | "cart.item_added"
  | "cart.item_updated"
  | "cart.item_removed"
  | "cart.checked_out"
  | "order.created"
  | "order.status_changed"
  | "payment.stripe_verified"
  | "payment.paypal_verified"
  | "payment.razorpay_verified"
  | "seller.product_created"
  | "seller.product_updated"
  | "seller.product_deleted"
  | "seller.dashboard_viewed"
  | "operator.dashboard_viewed"
  | "student.login_requested"
  | "student.access_verified"
  | "student.support_requested";

type AuditEvent = {
  action: AuditAction;
  actorId?: string;
  targetType: "cart" | "order" | "product" | "dashboard" | "student_access" | "student_support";
  targetId?: string;
  outcome?: "success" | "denied" | "failed";
};

export function audit(event: AuditEvent): void {
  if (process.env.ENABLE_AUDIT_LOG !== "true") return;
  try {
    console.info("[audit]", JSON.stringify({
      at: new Date().toISOString(),
      action: event.action,
      actorId: event.actorId,
      targetType: event.targetType,
      targetId: event.targetId,
      outcome: event.outcome ?? "success",
    }));
  } catch {
    // Audit logging is observational and must not affect application flows.
  }
}
