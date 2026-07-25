import { pool } from "../config/db";

export class PaymentDashboardRepository {
  async listBuyerTransactions(
    buyerId: string,
    limit: number,
    offset: number,
    status?: string,
  ) {
    const values: unknown[] = [buyerId, limit, offset];
    const statusFilter = status ? "AND pa.payment_status=$4" : "";
    if (status) values.push(status);
    const result = await pool.query(
      `SELECT pa.id,pa.order_id,co.order_number,pa.provider,pa.currency,
              pa.amount_minor,pa.payment_status,pa.provider_call_status,
              pa.reconciliation_status,pa.created_at,pa.updated_at,
              COALESCE((
                SELECT SUM(pr.amount_minor) FROM payment_refunds pr
                WHERE pr.payment_attempt_id=pa.id AND pr.status IN ('pending','succeeded')
              ),0)::bigint AS refunded_minor,
              (SELECT COUNT(*)::int FROM payment_disputes pd WHERE pd.order_id=pa.order_id) AS dispute_count,
              COUNT(*) OVER()::int AS total_count
       FROM payment_attempts pa
       JOIN commerce_orders co ON co.id=pa.order_id
       WHERE co.buyer_id=$1 ${statusFilter}
       ORDER BY pa.created_at DESC LIMIT $2 OFFSET $3`,
      values,
    );
    return { items: result.rows, total: result.rows[0]?.total_count ?? 0 };
  }

  async getSellerBalance(sellerId: string) {
    const result = await pool.query(
      `SELECT currency,
              COALESCE(SUM(seller_net_minor-refunded_minor)
                FILTER (WHERE status IN ('held','disputed','refund_pending','release_scheduled','provider_held','releasing')),0)::bigint AS held_minor,
              COALESCE(SUM(seller_net_minor-refunded_minor)
                FILTER (WHERE status='payout_failed'),0)::bigint AS failed_minor,
              COALESCE(SUM(seller_net_minor-refunded_minor)
                FILTER (WHERE status='released'),0)::bigint AS released_minor,
              COALESCE(SUM(refunded_minor),0)::bigint AS refunded_minor
       FROM protected_allocations WHERE seller_id=$1 GROUP BY currency ORDER BY currency`,
      [sellerId],
    );
    return result.rows;
  }

  async listSellerPayoutHistory(sellerId: string, limit: number, offset: number) {
    const result = await pool.query(
      `SELECT pa.id,pa.order_id,pa.currency,pa.seller_net_minor,pa.refunded_minor,
              pa.status AS allocation_status,pa.delivery_verified_at,pa.release_due_at,
              st.provider,st.status AS payout_status,st.provider_transfer_id,
              st.reversed_minor,st.failure_code,st.created_at,st.updated_at,
              COUNT(*) OVER()::int AS total_count
       FROM protected_allocations pa
       LEFT JOIN seller_transfers st ON st.allocation_id=pa.id
       WHERE pa.seller_id=$1 ORDER BY pa.created_at DESC LIMIT $2 OFFSET $3`,
      [sellerId, limit, offset],
    );
    return { items: result.rows, total: result.rows[0]?.total_count ?? 0 };
  }

  async getOperatorOverview() {
    const providers = await pool.query(
      `SELECT ppc.provider,ppc.mode,ppc.status,ppc.platform_country,
              ppc.approval_verified_at,ppc.webhook_verified_at,ppc.next_review_at,
              ppc.expires_at,ppc.suspension_reason,ppc.updated_at,
              caps.maximum_sellers_per_checkout,caps.maximum_allocations_per_payment,
              caps.supports_partial_seller_refund,caps.supports_independent_seller_release,
              caps.source,caps.source_reference,caps.verified_at AS capabilities_verified_at,
              caps.expires_at AS capabilities_expires_at,
              (SELECT MAX(received_at) FROM provider_webhook_events pwe
               WHERE pwe.provider=ppc.provider) AS last_webhook_received_at,
              (SELECT COUNT(*)::int FROM provider_health_events phe
               WHERE phe.provider=ppc.provider AND phe.created_at>now()-interval '24 hours') AS health_events_24h
       FROM payment_provider_configs ppc
       LEFT JOIN LATERAL (
         SELECT * FROM payment_provider_capabilities c
         WHERE c.provider=ppc.provider ORDER BY c.verified_at DESC LIMIT 1
       ) caps ON true ORDER BY ppc.provider`,
    );
    const counts = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM payment_attempts
          WHERE reconciliation_status='pending' OR provider_call_status='outcome_unknown') AS reconciliation_pending,
         (SELECT COUNT(*)::int FROM payment_refunds WHERE status IN ('started','pending','failed')) AS refund_attention,
         (SELECT COUNT(*)::int FROM payment_disputes
          WHERE status IN ('open','under_review','resolution_pending','needs_action')) AS dispute_attention,
         (SELECT COUNT(*)::int FROM protected_allocations WHERE status='payout_failed') AS payout_failures,
         (SELECT COUNT(*)::int FROM operator_recovery_cases WHERE status='open') AS recovery_cases,
         (SELECT COUNT(*)::int FROM provider_webhook_events WHERE processing_status<>'processed') AS webhook_attention`,
    );
    return { providers: providers.rows, counts: counts.rows[0] };
  }

  async listReconciliationAttention(limit: number, offset: number) {
    const result = await pool.query(
      `SELECT pa.id,pa.order_id,pa.provider,pa.currency,pa.amount_minor,
              pa.payment_status,pa.provider_call_status,pa.reconciliation_status,
              pa.attempt_count,pa.failure_code,pa.lease_expires_at,pa.updated_at,
              COUNT(*) OVER()::int AS total_count
       FROM payment_attempts pa
       WHERE pa.reconciliation_status='pending'
          OR pa.provider_call_status='outcome_unknown'
          OR (pa.provider_call_status='started' AND pa.lease_expires_at<now())
       ORDER BY pa.updated_at LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return { items: result.rows, total: result.rows[0]?.total_count ?? 0 };
  }

  async listRecoveryCases(limit: number, offset: number, status = "open") {
    const result = await pool.query(
      `SELECT id,case_type,aggregate_id,status,details,assigned_to,created_at,updated_at,
              COUNT(*) OVER()::int AS total_count
       FROM operator_recovery_cases WHERE status=$1
       ORDER BY created_at LIMIT $2 OFFSET $3`,
      [status, limit, offset],
    );
    return { items: result.rows, total: result.rows[0]?.total_count ?? 0 };
  }

  async updateRecoveryCase(
    id: string,
    status: "acknowledged" | "resolved",
    operatorId: string,
  ): Promise<boolean> {
    const result = await pool.query(
      `UPDATE operator_recovery_cases SET status=$2,assigned_to=$3,updated_at=now()
       WHERE id=$1 AND status IN ('open','acknowledged') RETURNING id`,
      [id, status, operatorId],
    );
    return Boolean(result.rows[0]);
  }
}

export const paymentDashboardRepository = new PaymentDashboardRepository();
