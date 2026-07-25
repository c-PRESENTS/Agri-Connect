import { pool } from "../config/db";

export interface DisputeContext {
  id: string;
  orderId: string;
  allocationId: string;
  buyerId: string;
  sellerId: string;
  openedBy: string;
  status: string;
  reason: string;
  currency: "GBP" | "INR";
  sellerNetMinor: string;
  refundedMinor: string;
  allocationStatus: string;
  previousAllocationStatus: string;
  postRelease: boolean;
  resolutionActorId?: string;
}

export interface OrderAllocationRow {
  id: string;
  order_id: string;
  seller_id: string;
  currency: "GBP" | "INR";
  gross_minor: string;
  seller_net_minor: string;
  refunded_minor: string;
  status: string;
  delivery_verified_at: Date | null;
  release_due_at: Date | null;
}

export interface OrderDisputeRow {
  id: string;
  allocation_id: string;
  [key: string]: unknown;
}

export class DisputeRepository {
  async listOrderAllocations(orderId: string): Promise<OrderAllocationRow[]> {
    const result = await pool.query(
      `SELECT pa.id,pa.order_id,pa.seller_id,pa.currency,pa.gross_minor,
              pa.seller_net_minor,pa.refunded_minor,pa.status,pa.delivery_verified_at,
              pa.release_due_at
       FROM protected_allocations pa WHERE pa.order_id=$1 ORDER BY pa.seller_id`,
      [orderId],
    );
    return result.rows as OrderAllocationRow[];
  }

  async create(input: {
    orderId: string;
    allocationId: string;
    buyerId: string;
    reason: string;
    details: string;
    filingDays: number;
    responseDays: number;
  }): Promise<string> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const orderResult = await client.query(
        `SELECT co.id,co.buyer_id,co.payment_status,co.created_at,
                COALESCE(
                  (SELECT MAX(occurred_at) FROM commerce_order_status_history
                   WHERE order_id=co.id AND status='delivered'),
                  co.created_at
                ) AS dispute_window_started_at
         FROM commerce_orders co WHERE co.id=$1 FOR UPDATE`,
        [input.orderId],
      );
      const order = orderResult.rows[0];
      if (!order || order.buyer_id !== input.buyerId) throw new Error("Order not found");
      if (order.payment_status !== "paid") throw new Error("Only paid orders can be disputed");
      const filingDeadline =
        new Date(order.dispute_window_started_at).getTime() +
        input.filingDays * 24 * 60 * 60 * 1000;
      if (Date.now() > filingDeadline) throw new Error("The marketplace dispute window has closed");
      const allocationResult = await client.query(
        `SELECT * FROM protected_allocations
         WHERE id=$1 AND order_id=$2 FOR UPDATE`,
        [input.allocationId, input.orderId],
      );
      const allocation = allocationResult.rows[0];
      if (!allocation) throw new Error("Seller allocation not found");
      if (["releasing", "refund_pending"].includes(allocation.status)) {
        throw new Error("Seller funds are currently changing state; retry shortly");
      }
      if (allocation.status === "refunded") {
        throw new Error("This seller allocation has already been refunded");
      }
      const postRelease = allocation.status === "released";
      const responseDueAt = new Date(
        Date.now() + input.responseDays * 24 * 60 * 60 * 1000,
      );
      const dispute = await client.query(
        `INSERT INTO payment_disputes
           (order_id,allocation_id,opened_by,status,reason,resolution_data,response_due_at)
         VALUES($1,$2,$3,'open',$4,$5::jsonb,$6) RETURNING id`,
        [
          input.orderId,
          input.allocationId,
          input.buyerId,
          input.reason,
          JSON.stringify({
            details: input.details,
            previousAllocationStatus: allocation.status,
            postRelease,
          }),
          responseDueAt,
        ],
      );
      if (!postRelease) {
        await client.query(
          `UPDATE protected_allocations
           SET status='disputed',updated_at=now(),version=version+1 WHERE id=$1`,
          [input.allocationId],
        );
      }
      await client.query(
        `INSERT INTO dispute_events(dispute_id,actor_id,event_type,event_data)
         VALUES($1,$2,'opened',$3::jsonb)`,
        [
          dispute.rows[0].id,
          input.buyerId,
          JSON.stringify({ reason: input.reason, postRelease }),
        ],
      );
      await client.query("COMMIT");
      return dispute.rows[0].id;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getContext(disputeId: string): Promise<DisputeContext | undefined> {
    const result = await pool.query(
      `SELECT pd.*,co.buyer_id,pa.seller_id,pa.currency,pa.seller_net_minor,
              pa.refunded_minor,pa.status AS allocation_status
       FROM payment_disputes pd
       JOIN commerce_orders co ON co.id=pd.order_id
       JOIN protected_allocations pa ON pa.id=pd.allocation_id
       WHERE pd.id=$1`,
      [disputeId],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    const resolution = (row.resolution_data ?? {}) as {
      previousAllocationStatus?: string;
      postRelease?: boolean;
      resolutionActorId?: string;
    };
    return {
      id: row.id,
      orderId: row.order_id,
      allocationId: row.allocation_id,
      buyerId: row.buyer_id,
      sellerId: row.seller_id,
      openedBy: row.opened_by,
      status: row.status,
      reason: row.reason,
      currency: row.currency,
      sellerNetMinor: row.seller_net_minor,
      refundedMinor: row.refunded_minor,
      allocationStatus: row.allocation_status,
      previousAllocationStatus: resolution.previousAllocationStatus ?? "held",
      postRelease: resolution.postRelease === true,
      resolutionActorId: resolution.resolutionActorId,
    };
  }

  async addEvidence(input: {
    disputeId: string;
    actorId: string;
    evidenceType: string;
    evidenceData: Record<string, unknown>;
    contentHash: string;
  }): Promise<string> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO dispute_evidence
           (dispute_id,submitted_by,evidence_type,storage_reference,evidence_data,content_hash)
         VALUES($1,$2,$3,$4,$5::jsonb,$6) RETURNING id`,
        [
          input.disputeId,
          input.actorId,
          input.evidenceType,
          `inline:sha256:${input.contentHash}`,
          JSON.stringify(input.evidenceData),
          input.contentHash,
        ],
      );
      await client.query(
        `INSERT INTO dispute_events(dispute_id,actor_id,event_type,event_data)
         VALUES($1,$2,'evidence_added',$3::jsonb)`,
        [
          input.disputeId,
          input.actorId,
          JSON.stringify({
            evidenceId: inserted.rows[0].id,
            evidenceType: input.evidenceType,
            contentHash: input.contentHash,
          }),
        ],
      );
      await client.query("COMMIT");
      return inserted.rows[0].id;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listForOrder(orderId: string): Promise<OrderDisputeRow[]> {
    const result = await pool.query(
      `SELECT pd.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id',de.id,'submittedBy',de.submitted_by,'evidenceType',de.evidence_type,
                    'evidenceData',de.evidence_data,'contentHash',de.content_hash,
                    'createdAt',de.created_at
                  ) ORDER BY de.created_at
                ) FILTER (WHERE de.id IS NOT NULL),
                '[]'::json
              ) AS evidence
       FROM payment_disputes pd
       LEFT JOIN dispute_evidence de ON de.dispute_id=pd.id
       WHERE pd.order_id=$1
       GROUP BY pd.id ORDER BY pd.created_at DESC`,
      [orderId],
    );
    return result.rows as OrderDisputeRow[];
  }

  async listForOperator(limit: number, offset: number, status?: string) {
    const values: unknown[] = [limit, offset];
    const statusFilter = status ? `WHERE pd.status=$3` : "";
    if (status) values.push(status);
    const result = await pool.query(
      `SELECT pd.*,pa.seller_id,pa.currency,pa.seller_net_minor,pa.status AS allocation_status,
              co.buyer_id,COUNT(*) OVER()::int AS total_count
       FROM payment_disputes pd
       JOIN protected_allocations pa ON pa.id=pd.allocation_id
       JOIN commerce_orders co ON co.id=pd.order_id
       ${statusFilter}
       ORDER BY pd.created_at DESC LIMIT $1 OFFSET $2`,
      values,
    );
    return {
      items: result.rows,
      total: result.rows[0]?.total_count ?? 0,
    };
  }

  async listForSeller(sellerId: string, limit: number, offset: number) {
    const result = await pool.query(
      `SELECT pd.*,pa.order_id,pa.currency,pa.seller_net_minor,
              pa.status AS allocation_status,COUNT(*) OVER()::int AS total_count
       FROM payment_disputes pd
       JOIN protected_allocations pa ON pa.id=pd.allocation_id
       WHERE pa.seller_id=$1
       ORDER BY pd.created_at DESC LIMIT $2 OFFSET $3`,
      [sellerId, limit, offset],
    );
    return { items: result.rows, total: result.rows[0]?.total_count ?? 0 };
  }

  async markUnderReview(disputeId: string, actorId: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const updated = await client.query(
        `UPDATE payment_disputes SET status='under_review',updated_at=now()
         WHERE id=$1 AND status IN ('open','needs_action') RETURNING id`,
        [disputeId],
      );
      if (updated.rows[0]) {
        await client.query(
          `INSERT INTO dispute_events(dispute_id,actor_id,event_type)
           VALUES($1,$2,'review_started')`,
          [disputeId, actorId],
        );
      }
      await client.query("COMMIT");
      return Boolean(updated.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async markResolutionPending(
    disputeId: string,
    actorId: string,
    resolution: string,
    refundAmountMinor?: string,
  ): Promise<boolean> {
    const result = await pool.query(
      `UPDATE payment_disputes
       SET status='resolution_pending',
           resolution_data=COALESCE(resolution_data,'{}'::jsonb)||$2::jsonb,
           updated_at=now()
       WHERE id=$1 AND status IN ('open','under_review','needs_action')
       RETURNING id`,
      [
        disputeId,
        JSON.stringify({ resolution, refundAmountMinor, resolutionActorId: actorId }),
      ],
    );
    if (!result.rows[0]) return false;
    await pool.query(
      `INSERT INTO dispute_events(dispute_id,actor_id,event_type,event_data)
       VALUES($1,$2,'resolution_started',$3::jsonb)`,
      [disputeId, actorId, JSON.stringify({ resolution, refundAmountMinor })],
    );
    return true;
  }

  async completeResolution(
    dispute: DisputeContext,
    actorId: string,
    resolution: "buyer" | "seller" | "split",
    refundId?: string,
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const allocation = await client.query(
        "SELECT status,refunded_minor,seller_net_minor,release_due_at FROM protected_allocations WHERE id=$1 FOR UPDATE",
        [dispute.allocationId],
      );
      const row = allocation.rows[0];
      if (!row) throw new Error("Dispute allocation not found");
      if (resolution === "seller") {
        await client.query(
          `UPDATE protected_allocations SET status=$2,updated_at=now(),version=version+1
           WHERE id=$1 AND status='disputed'`,
          [dispute.allocationId, dispute.previousAllocationStatus],
        );
      } else if (row.status === "disputed") {
        const fullyRefunded = BigInt(row.refunded_minor) >= BigInt(row.seller_net_minor);
        await client.query(
          `UPDATE protected_allocations SET status=$2,updated_at=now(),version=version+1 WHERE id=$1`,
          [
            dispute.allocationId,
            fullyRefunded
              ? "refunded"
              : dispute.previousAllocationStatus === "released"
                ? "released"
                : "release_scheduled",
          ],
        );
      }
      await client.query(
        `UPDATE payment_disputes
         SET status=$2,resolved_at=now(),
             resolution_data=COALESCE(resolution_data,'{}'::jsonb)||$3::jsonb,
             updated_at=now()
         WHERE id=$1`,
        [
          dispute.id,
          resolution === "buyer"
            ? "resolved_buyer"
            : resolution === "seller"
              ? "resolved_seller"
              : "resolved_split",
          JSON.stringify({ refundId }),
        ],
      );
      await client.query(
        `INSERT INTO dispute_events(dispute_id,actor_id,event_type,event_data)
         VALUES($1,$2,'resolved',$3::jsonb)`,
        [dispute.id, actorId, JSON.stringify({ resolution, refundId })],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async markResolutionFailed(disputeId: string, actorId: string, reason: string): Promise<void> {
    await pool.query(
      `UPDATE payment_disputes SET status='needs_action',updated_at=now(),
         resolution_data=COALESCE(resolution_data,'{}'::jsonb)||$2::jsonb WHERE id=$1`,
      [disputeId, JSON.stringify({ resolutionFailure: reason })],
    );
    await pool.query(
      `INSERT INTO dispute_events(dispute_id,actor_id,event_type,event_data)
       VALUES($1,$2,'resolution_failed',$3::jsonb)`,
      [disputeId, actorId, JSON.stringify({ reason })],
    );
  }

  async withdraw(dispute: DisputeContext, actorId: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const updated = await client.query(
        `UPDATE payment_disputes SET status='withdrawn',resolved_at=now(),updated_at=now()
         WHERE id=$1 AND opened_by=$2 AND status='open' RETURNING id`,
        [dispute.id, actorId],
      );
      if (!updated.rows[0]) {
        await client.query("ROLLBACK");
        return false;
      }
      if (!dispute.postRelease) {
        await client.query(
          `UPDATE protected_allocations SET status=$2,updated_at=now(),version=version+1
           WHERE id=$1 AND status='disputed'`,
          [dispute.allocationId, dispute.previousAllocationStatus],
        );
      }
      await client.query(
        `INSERT INTO dispute_events(dispute_id,actor_id,event_type)
         VALUES($1,$2,'withdrawn')`,
        [dispute.id, actorId],
      );
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async escalateOverdue(at = new Date()): Promise<number> {
    const result = await pool.query(
      `WITH overdue AS (
         UPDATE payment_disputes
         SET status='needs_action',updated_at=now()
         WHERE status='open' AND response_due_at<=$1
         RETURNING id
       )
       INSERT INTO dispute_events(dispute_id,event_type,event_data)
       SELECT id,'response_deadline_elapsed',$2::jsonb FROM overdue
       RETURNING id`,
      [at, JSON.stringify({ escalatedAt: at.toISOString() })],
    );
    return result.rowCount ?? 0;
  }
}

export const disputeRepository = new DisputeRepository();
