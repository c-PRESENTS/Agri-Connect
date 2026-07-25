import { pool } from "../config/db";

export interface RefundAllocation {
  id: string;
  sellerId: string;
  sellerNetMinor: string;
  refundedMinor: string;
  previousStatus: string;
  providerTransferId?: string;
  reversedMinor: string;
}

export interface PreparedRefund {
  id: string;
  orderId: string;
  paymentAttemptId: string;
  provider: "stripe" | "paypal" | "razorpay" | "mock";
  providerPaymentId: string;
  currency: "GBP" | "INR";
  amountMinor: string;
  idempotencyReference: string;
  status: string;
  providerRefundIds: string[];
  isPartial: boolean;
  allocations: RefundAllocation[];
}

export class RefundRepository {
  async prepare(input: {
    orderId: string;
    actorId: string;
    idempotencyReference: string;
    amountMinor?: string;
    allocationId?: string;
  }): Promise<{ refund: PreparedRefund; existing: boolean }> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(
        `SELECT * FROM payment_refunds WHERE idempotency_reference=$1 FOR UPDATE`,
        [input.idempotencyReference],
      );
      if (existing.rows[0]) {
        const refund = await this.hydratePrepared(client, existing.rows[0]);
        await client.query("COMMIT");
        return { refund, existing: true };
      }
      const paymentResult = await client.query(
        `SELECT * FROM payment_attempts
         WHERE order_id=$1 AND payment_status='succeeded'
         ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
        [input.orderId],
      );
      const payment = paymentResult.rows[0];
      if (!payment?.provider_payment_id) throw new Error("A verified payment was not found");
      const prior = await client.query(
        `SELECT COALESCE(SUM(amount_minor),0)::bigint AS refunded
         FROM payment_refunds
         WHERE payment_attempt_id=$1 AND status IN ('started','pending','succeeded')`,
        [payment.id],
      );
      const available = BigInt(payment.amount_minor) - BigInt(prior.rows[0].refunded);
      const requested = input.amountMinor ? BigInt(input.amountMinor) : available;
      if (requested <= BigInt(0) || requested > available) {
        throw new Error("Refund amount exceeds the remaining refundable amount");
      }
      const allocationResult = await client.query(
        `SELECT pa.*,
                (
                  SELECT st.provider_transfer_id
                  FROM seller_transfers st
                  WHERE st.allocation_id=pa.id
                ) AS provider_transfer_id,
                COALESCE((
                  SELECT st.reversed_minor
                  FROM seller_transfers st
                  WHERE st.allocation_id=pa.id
                ),0) AS reversed_minor
         FROM protected_allocations pa
         WHERE pa.order_id=$1 ${input.allocationId ? "AND pa.id=$2" : ""}
         ORDER BY pa.id
         FOR UPDATE`,
        input.allocationId ? [input.orderId, input.allocationId] : [input.orderId],
      );
      if (!allocationResult.rowCount) throw new Error("Refundable seller allocation was not found");
      if (
        requested < available &&
        allocationResult.rows.length > 1 &&
        !input.allocationId
      ) {
        throw new Error("A partial multi-seller refund must identify one seller allocation");
      }
      if (
        input.allocationId &&
        requested >
          BigInt(allocationResult.rows[0].seller_net_minor) -
            BigInt(allocationResult.rows[0].refunded_minor)
      ) {
        throw new Error("Partial refund exceeds the seller allocation balance");
      }
      const unsupported = allocationResult.rows.some((row: { status: string }) =>
        ["releasing", "refund_pending"].includes(row.status),
      );
      if (unsupported) throw new Error("Seller funds are currently changing state; retry shortly");
      const scopeData = {
        actorId: input.actorId,
        allocationId: input.allocationId,
        previousStatuses: Object.fromEntries(
          allocationResult.rows.map((row: { id: string; status: string }) => [row.id, row.status]),
        ),
      };
      const inserted = await client.query(
        `INSERT INTO payment_refunds
           (order_id,payment_attempt_id,provider,currency,amount_minor,status,
            idempotency_reference,scope_data)
         VALUES($1,$2,$3,$4,$5,'started',$6,$7::jsonb) RETURNING *`,
        [
          input.orderId,
          payment.id,
          payment.provider,
          payment.currency,
          requested.toString(),
          input.idempotencyReference,
          JSON.stringify(scopeData),
        ],
      );
      await client.query(
        `UPDATE protected_allocations SET status='refund_pending',updated_at=now(),version=version+1
         WHERE id=ANY($1::varchar[])`,
        [allocationResult.rows.map((row: { id: string }) => row.id)],
      );
      const refund = await this.hydratePrepared(client, inserted.rows[0]);
      await client.query("COMMIT");
      return { refund, existing: false };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async hydratePrepared(
    client: { query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }> },
    row: Record<string, any>,
  ): Promise<PreparedRefund> {
    const paymentResult = await client.query("SELECT * FROM payment_attempts WHERE id=$1", [
      row.payment_attempt_id,
    ]);
    const payment = paymentResult.rows[0];
    const scope = (row.scope_data ?? {}) as {
      allocationId?: string;
      previousStatuses?: Record<string, string>;
      providerRefundIds?: string[];
    };
    const allocations = await client.query(
      `SELECT pa.*,st.provider_transfer_id,COALESCE(st.reversed_minor,0) AS reversed_minor
       FROM protected_allocations pa
       LEFT JOIN seller_transfers st ON st.allocation_id=pa.id
       WHERE pa.order_id=$1 ${scope.allocationId ? "AND pa.id=$2" : ""} ORDER BY pa.id`,
      scope.allocationId ? [row.order_id, scope.allocationId] : [row.order_id],
    );
    return {
      id: row.id,
      orderId: row.order_id,
      paymentAttemptId: row.payment_attempt_id,
      provider: row.provider,
      providerPaymentId: payment.provider_payment_id,
      currency: row.currency,
      amountMinor: row.amount_minor,
      idempotencyReference: row.idempotency_reference,
      status: row.status,
      providerRefundIds:
        scope.providerRefundIds ??
        (row.provider_refund_id ? [row.provider_refund_id] : []),
      isPartial: BigInt(row.amount_minor) < BigInt(payment.amount_minor),
      allocations: allocations.rows.map((allocation) => ({
        id: allocation.id,
        sellerId: allocation.seller_id,
        sellerNetMinor: allocation.seller_net_minor,
        refundedMinor: allocation.refunded_minor,
        previousStatus: scope.previousStatuses?.[allocation.id] ?? allocation.status,
        providerTransferId: allocation.provider_transfer_id ?? undefined,
        reversedMinor: allocation.reversed_minor,
      })),
    };
  }

  async completeProviderRefund(
    refund: PreparedRefund,
    providerRefundId: string,
    providerRefundIds: string[],
    status: "pending" | "succeeded",
  ): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await client.query(
        "SELECT status FROM payment_refunds WHERE id=$1 FOR UPDATE",
        [refund.id],
      );
      if (!locked.rows[0]) throw new Error("Refund record was not found");
      if (locked.rows[0].status === "succeeded") {
        await client.query("COMMIT");
        return false;
      }
      await client.query(
        `UPDATE payment_refunds SET status=$2,provider_refund_id=$3,
           scope_data=COALESCE(scope_data,'{}'::jsonb)||$4::jsonb,updated_at=now()
         WHERE id=$1`,
        [refund.id, status, providerRefundId, JSON.stringify({ providerRefundIds })],
      );
      if (status === "succeeded") {
        const fullOrder = refund.allocations.length > 1 || !refund.isPartial;
        for (const allocation of refund.allocations) {
          const remaining =
            BigInt(allocation.sellerNetMinor) - BigInt(allocation.refundedMinor);
          const impact = fullOrder ? remaining : BigInt(refund.amountMinor);
          const nextRefunded = BigInt(allocation.refundedMinor) + impact;
          const nextStatus =
            nextRefunded >= BigInt(allocation.sellerNetMinor)
              ? "refunded"
              : allocation.previousStatus;
          await client.query(
            `UPDATE protected_allocations
             SET refunded_minor=$2,status=$3,updated_at=now(),version=version+1 WHERE id=$1`,
            [allocation.id, nextRefunded.toString(), nextStatus],
          );
        }
        const ledger = await client.query(
          `INSERT INTO ledger_transactions(reference_type,reference_id,currency)
           VALUES('payment_refund',$1,$2)
           ON CONFLICT(reference_type,reference_id) DO NOTHING RETURNING id`,
          [refund.id, refund.currency],
        );
        if (ledger.rows[0]) {
          await client.query(
            `INSERT INTO ledger_entries(transaction_id,account,direction,amount_minor)
             VALUES($1,'buyer_refunds','debit',$2),($1,'provider_cash','credit',$2)`,
            [ledger.rows[0].id, refund.amountMinor],
          );
        }
      }
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async failProviderRefund(refund: PreparedRefund, failureCode: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE payment_refunds SET status='failed',failure_code=$2,updated_at=now() WHERE id=$1`,
        [refund.id, failureCode],
      );
      for (const allocation of refund.allocations) {
        await client.query(
          `UPDATE protected_allocations SET status=$2,updated_at=now(),version=version+1 WHERE id=$1`,
          [allocation.id, allocation.previousStatus],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async recordReversal(
    allocationId: string,
    amountMinor: string,
    providerReversalId: string,
  ): Promise<void> {
    await pool.query(
      `UPDATE seller_transfers SET reversed_minor=reversed_minor+$2,
         provider_reversal_id=$3,updated_at=now() WHERE allocation_id=$1`,
      [allocationId, amountMinor, providerReversalId],
    );
  }

  async createReversalRecovery(
    refundId: string,
    allocationId: string,
    reason: string,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO operator_recovery_cases(case_type,aggregate_id,status,details)
       VALUES('transfer_reversal_failure',$1,'open',$2::jsonb)`,
      [allocationId, JSON.stringify({ refundId, reason })],
    );
  }

  async listOrderRefunds(orderId: string) {
    const result = await pool.query(
      `SELECT id,order_id,provider,currency,amount_minor,status,provider_refund_id,
              failure_code,created_at,updated_at
       FROM payment_refunds WHERE order_id=$1 ORDER BY created_at DESC`,
      [orderId],
    );
    return result.rows;
  }

  async listFailedRefunds() {
    const result = await pool.query(
      `SELECT * FROM payment_refunds WHERE status='failed' ORDER BY updated_at`,
    );
    return result.rows;
  }

  async listPendingRefundIds(limit = 100): Promise<string[]> {
    const result = await pool.query(
      `SELECT id FROM payment_refunds
       WHERE status='pending' ORDER BY updated_at LIMIT $1`,
      [limit],
    );
    return result.rows.map((row: { id: string }) => row.id);
  }

  async getPreparedRefund(refundId: string): Promise<PreparedRefund | undefined> {
    const client = await pool.connect();
    try {
      const result = await client.query("SELECT * FROM payment_refunds WHERE id=$1", [refundId]);
      return result.rows[0] ? this.hydratePrepared(client, result.rows[0]) : undefined;
    } finally {
      client.release();
    }
  }

  async restartFailed(refundId: string): Promise<PreparedRefund | undefined> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `UPDATE payment_refunds SET status='started',failure_code=NULL,updated_at=now()
         WHERE id=$1 AND status='failed' RETURNING *`,
        [refundId],
      );
      if (!result.rows[0]) {
        await client.query("COMMIT");
        return undefined;
      }
      const refund = await this.hydratePrepared(client, result.rows[0]);
      for (const allocation of refund.allocations) {
        await client.query(
          `UPDATE protected_allocations SET status='refund_pending',updated_at=now(),version=version+1
           WHERE id=$1`,
          [allocation.id],
        );
      }
      await client.query("COMMIT");
      return refund;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async isOrderFullyRefunded(orderId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT pa.amount_minor,
              COALESCE(SUM(pr.amount_minor) FILTER (WHERE pr.status='succeeded'),0) AS refunded
       FROM payment_attempts pa
       LEFT JOIN payment_refunds pr ON pr.payment_attempt_id=pa.id
       WHERE pa.order_id=$1 AND pa.payment_status='succeeded'
       GROUP BY pa.id,pa.amount_minor ORDER BY pa.created_at DESC LIMIT 1`,
      [orderId],
    );
    return Boolean(
      result.rows[0] &&
        BigInt(result.rows[0].refunded) >= BigInt(result.rows[0].amount_minor),
    );
  }
}

export const refundRepository = new RefundRepository();
