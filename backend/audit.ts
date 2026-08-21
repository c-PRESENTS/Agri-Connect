/**
 * Minimal, structured audit foundation. It intentionally records identifiers
 * and outcomes only—never request bodies, passwords, tokens, addresses, or
 * notification content. Configure a durable log sink in hosting before
 * treating this as a production audit trail.
 */
export type AuditAction =
  | "account.mode_switched"
  | "cart.item_added"
  | "cart.item_updated"
  | "cart.item_removed"
  | "cart.order_reordered"
  | "cart.checked_out"
  | "order.created"
  | "order.status_changed"
  | "payment.stripe_verified"
  | "payment.paypal_verified"
  | "payment.razorpay_verified"
  | "payment.delivery_confirmed"
  | "payment.payout_retry_scheduled"
  | "payment.refund_requested"
  | "payment.dispute_opened"
  | "payment.dispute_resolved"
  | "payment.reconciliation_requested"
  | "payment.recovery_case_updated"
  | "payment.provider_configuration_updated"
  | "payment.provider_activation_requested"
  | "payment.provider_suspended"
  | "payment.recovery_drill_run"
  | "seller.product_created"
  | "seller.product_updated"
  | "seller.product_deleted"
  | "seller.product_published"
  | "seller.dashboard_viewed"
  | "operator.dashboard_viewed"
  | "student.login_requested"
  | "student.access_verified"
  | "student.support_requested";

type AuditEvent = {
  action: AuditAction;
  actorId?: string;
  targetType: "account" | "cart" | "order" | "product" | "dashboard" | "protected_allocation" | "payment_dispute" | "payment_attempt" | "payment_provider" | "payment_recovery_case" | "student_access" | "student_support";
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
