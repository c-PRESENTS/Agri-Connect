import { pool } from "../config/db";

export interface AllocationForRelease {
  id: string;
  orderId: string;
  paymentAttemptId: string;
  sellerId: string;
  currency: "GBP" | "INR";
  sellerNetMinor: string;
  status: string;
  releaseDueAt: Date | null;
  provider: "stripe" | "paypal" | "razorpay" | "mock";
  providerPaymentId: string;
  providerAccountId: string;
  orderSellerCount: number;
}

export class SettlementRepository {
  async getOrderProtectionWindow(orderId: string): Promise<{
    provider: string;
    startedAt: Date;
  } | undefined> {
    const result = await pool.query(
      `SELECT pay.provider,MIN(pa.created_at) AS started_at
       FROM protected_allocations pa
       JOIN payment_attempts pay ON pay.id=pa.payment_attempt_id
       WHERE pa.order_id=$1 GROUP BY pay.provider`,
      [orderId],
    );
    return result.rows[0]
      ? { provider: result.rows[0].provider, startedAt: result.rows[0].started_at }
      : undefined;
  }

  async createHeldAllocations(paymentAttemptId: string): Promise<string[]> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const attempt = await client.query(
        `SELECT pa.id,pa.order_id,pa.currency,pa.payment_status,pa.amount_minor,
                COALESCE((
                  SELECT cq.platform_fee_minor
                  FROM checkout_intents ci
                  JOIN checkout_quotes cq ON cq.id=ci.quote_id
                  WHERE ci.id=pa.checkout_intent_id
                ),0) AS platform_fee_minor
         FROM payment_attempts pa
         WHERE pa.id=$1
         FOR UPDATE`,
        [paymentAttemptId],
      );
      const payment = attempt.rows[0];
      if (!payment || payment.payment_status !== "succeeded") {
        throw new Error("Protected allocations require a succeeded payment");
      }
      const sellers = await client.query(
        `SELECT seller_id,SUM(unit_price_minor*quantity)::bigint AS gross_minor
         FROM commerce_order_items WHERE order_id=$1
         GROUP BY seller_id ORDER BY seller_id`,
        [payment.order_id],
      );
      if (!sellers.rowCount) throw new Error("Order has no seller items");
      const grossTotal = sellers.rows.reduce(
        (sum: bigint, row: { gross_minor: string }) => sum + BigInt(row.gross_minor),
        BigInt(0),
      );
      let assignedFee = BigInt(0);
      const ids: string[] = [];
      for (let index = 0; index < sellers.rows.length; index += 1) {
        const seller = sellers.rows[index];
        const grossMinor = BigInt(seller.gross_minor);
        const feeMinor =
          index === sellers.rows.length - 1
            ? BigInt(payment.platform_fee_minor) - assignedFee
            : (BigInt(payment.platform_fee_minor) * grossMinor) / grossTotal;
        assignedFee += feeMinor;
        const inserted = await client.query(
          `INSERT INTO protected_allocations
             (order_id,payment_attempt_id,seller_id,currency,gross_minor,
              platform_fee_minor,seller_net_minor,status)
           VALUES($1,$2,$3,$4,$5,$6,$7,'held')
           ON CONFLICT(order_id,seller_id) DO NOTHING
           RETURNING id`,
          [
            payment.order_id,
            paymentAttemptId,
            seller.seller_id,
            payment.currency,
            grossMinor.toString(),
            feeMinor.toString(),
            (grossMinor - feeMinor).toString(),
          ],
        );
        if (inserted.rows[0]) ids.push(inserted.rows[0].id);
      }
      await client.query("COMMIT");
      return ids;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async confirmDelivery(orderId: string, releaseDueAt: Date): Promise<number> {
    const result = await pool.query(
      `UPDATE protected_allocations
       SET status='release_scheduled',delivery_verified_at=COALESCE(delivery_verified_at,now()),
           release_due_at=COALESCE(release_due_at,$2),updated_at=now(),version=version+1
       WHERE order_id=$1 AND status='held'`,
      [orderId, releaseDueAt],
    );
    return result.rowCount ?? 0;
  }

  async claimDueAllocation(at = new Date()): Promise<AllocationForRelease | undefined> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `WITH candidate AS (
           SELECT id FROM protected_allocations
           WHERE status='release_scheduled' AND release_due_at<=$1
           ORDER BY release_due_at,id FOR UPDATE SKIP LOCKED LIMIT 1
         )
         UPDATE protected_allocations pa SET status='releasing',updated_at=now(),version=version+1
         FROM candidate WHERE pa.id=candidate.id
         RETURNING pa.id,pa.order_id,pa.payment_attempt_id,pa.seller_id,pa.currency,
                   (pa.seller_net_minor-pa.refunded_minor) AS seller_net_minor,
                   pa.status,pa.release_due_at`,
        [at],
      );
      if (!result.rows[0]) {
        await client.query("COMMIT");
        return undefined;
      }
      const row = result.rows[0];
      const context = await client.query(
        `SELECT pay.provider,pay.provider_payment_id,spa.provider_account_id,
                (SELECT COUNT(*)::int FROM protected_allocations x WHERE x.order_id=pa.order_id) AS seller_count
         FROM protected_allocations pa
         JOIN payment_attempts pay ON pay.id=pa.payment_attempt_id
         LEFT JOIN seller_payment_accounts spa ON spa.seller_id=pa.seller_id AND spa.provider=pay.provider
         WHERE pa.id=$1`,
        [row.id],
      );
      await client.query("COMMIT");
      if (
        !context.rows[0]?.provider_payment_id ||
        (!context.rows[0]?.provider_account_id && context.rows[0]?.provider !== "mock")
      ) {
        throw new Error("Allocation provider context is incomplete");
      }
      return {
        id: row.id,
        orderId: row.order_id,
        paymentAttemptId: row.payment_attempt_id,
        sellerId: row.seller_id,
        currency: row.currency,
        sellerNetMinor: row.seller_net_minor,
        status: row.status,
        releaseDueAt: row.release_due_at,
        provider: context.rows[0].provider,
        providerPaymentId: context.rows[0].provider_payment_id,
        providerAccountId: context.rows[0].provider_account_id ?? row.seller_id,
        orderSellerCount: context.rows[0].seller_count,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getAllocationContext(id: string): Promise<AllocationForRelease | undefined> {
    const result = await pool.query(
      `SELECT pa.id,pa.order_id,pa.payment_attempt_id,pa.seller_id,pa.currency,
              (pa.seller_net_minor-pa.refunded_minor) AS seller_net_minor,
              pa.status,pa.release_due_at,
              pay.provider,pay.provider_payment_id,spa.provider_account_id,
              (SELECT COUNT(*)::int FROM protected_allocations x WHERE x.order_id=pa.order_id) AS seller_count
       FROM protected_allocations pa
       JOIN payment_attempts pay ON pay.id=pa.payment_attempt_id
       LEFT JOIN seller_payment_accounts spa ON spa.seller_id=pa.seller_id AND spa.provider=pay.provider
       WHERE pa.id=$1`,
      [id],
    );
    const row = result.rows[0];
    if (!row?.provider_payment_id || (!row?.provider_account_id && row?.provider !== "mock")) {
      return undefined;
    }
    return {
      id: row.id,
      orderId: row.order_id,
      paymentAttemptId: row.payment_attempt_id,
      sellerId: row.seller_id,
      currency: row.currency,
      sellerNetMinor: row.seller_net_minor,
      status: row.status,
      releaseDueAt: row.release_due_at,
      provider: row.provider,
      providerPaymentId: row.provider_payment_id,
      providerAccountId: row.provider_account_id ?? row.seller_id,
      orderSellerCount: row.seller_count,
    };
  }

  async ensureTransfer(allocation: AllocationForRelease) {
    const result = await pool.query(
      `INSERT INTO seller_transfers
         (allocation_id,provider,currency,amount_minor,status,idempotency_reference)
       VALUES($1,$2,$3,$4,'started',$5)
       ON CONFLICT(allocation_id) DO UPDATE SET updated_at=now()
       RETURNING *`,
      [
        allocation.id,
        allocation.provider,
        allocation.currency,
        allocation.sellerNetMinor,
        `payout:${allocation.id}`,
      ],
    );
    return result.rows[0] as Record<string, unknown>;
  }

  async markTransferSucceeded(
    allocationId: string,
    providerTransferId: string,
    status: "held" | "pending" | "succeeded",
  ): Promise<void> {
    const allocationStatus = status === "succeeded" ? "released" : status === "held" ? "provider_held" : "releasing";
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE seller_transfers SET status=$2,provider_transfer_id=$3,failure_code=NULL,updated_at=now()
         WHERE allocation_id=$1`,
        [allocationId, status, providerTransferId],
      );
      await client.query(
        `UPDATE protected_allocations SET status=$2,updated_at=now(),version=version+1 WHERE id=$1`,
        [allocationId, allocationStatus],
      );
      if (status === "succeeded") {
        const allocation = await client.query(
          "SELECT currency,seller_net_minor FROM protected_allocations WHERE id=$1",
          [allocationId],
        );
        const ledger = await client.query(
          `INSERT INTO ledger_transactions(reference_type,reference_id,currency)
           VALUES('seller_payout',$1,$2)
           ON CONFLICT(reference_type,reference_id) DO NOTHING RETURNING id`,
          [allocationId, allocation.rows[0].currency],
        );
        if (ledger.rows[0]) {
          await client.query(
            `INSERT INTO ledger_entries(transaction_id,account,direction,amount_minor)
             VALUES($1,'protected_seller_funds','debit',$2),
                   ($1,'provider_cash','credit',$2)`,
            [ledger.rows[0].id, allocation.rows[0].seller_net_minor],
          );
        }
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async markTransferFailed(allocationId: string, failureCode: string): Promise<void> {
    await pool.query(
      `UPDATE seller_transfers SET status='failed',failure_code=$2,updated_at=now()
       WHERE allocation_id=$1`,
      [allocationId, failureCode],
    );
    await pool.query(
      `UPDATE protected_allocations SET status='payout_failed',updated_at=now(),version=version+1
       WHERE id=$1`,
      [allocationId],
    );
    await pool.query(
      `INSERT INTO operator_recovery_cases(case_type,aggregate_id,status,details)
       VALUES('payout_failure',$1,'open',$2::jsonb)`,
      [allocationId, JSON.stringify({ failureCode })],
    );
  }

  async resetFailedAllocation(id: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE protected_allocations SET status='release_scheduled',release_due_at=now(),
         updated_at=now(),version=version+1
       WHERE id=$1 AND status='payout_failed'`,
      [id],
    );
    return (result.rowCount ?? 0) === 1;
  }

  async listSellerPayouts(sellerId: string) {
    const result = await pool.query(
      `SELECT pa.*,st.provider,st.status AS payout_status,st.provider_transfer_id,st.failure_code
       FROM protected_allocations pa
       LEFT JOIN seller_transfers st ON st.allocation_id=pa.id
       WHERE pa.seller_id=$1 ORDER BY pa.created_at DESC`,
      [sellerId],
    );
    return result.rows;
  }

  async listPayoutFailures() {
    const result = await pool.query(
      `SELECT pa.*,st.provider,st.failure_code,st.updated_at AS payout_updated_at
       FROM protected_allocations pa JOIN seller_transfers st ON st.allocation_id=pa.id
       WHERE pa.status='payout_failed' ORDER BY st.updated_at`,
    );
    return result.rows;
  }

  async listPendingTransfers(limit = 100): Promise<Array<{
    allocationId: string;
    provider: "stripe" | "paypal" | "razorpay" | "mock";
    providerTransferId: string;
    status: string;
  }>> {
    const result = await pool.query(
      `SELECT allocation_id,provider,provider_transfer_id,status
       FROM seller_transfers
       WHERE status IN ('held','pending')
         AND provider_transfer_id IS NOT NULL
       ORDER BY updated_at LIMIT $1`,
      [limit],
    );
    return result.rows.map((row: {
      allocation_id: string;
      provider: "stripe" | "paypal" | "razorpay" | "mock";
      provider_transfer_id: string;
      status: string;
    }) => ({
      allocationId: row.allocation_id,
      provider: row.provider,
      providerTransferId: row.provider_transfer_id,
      status: row.status,
    }));
  }

  async listSucceededAttemptsWithoutAllocations(limit = 25): Promise<string[]> {
    const result = await pool.query(
      `SELECT pa.id FROM payment_attempts pa
       WHERE pa.payment_status='succeeded'
         AND NOT EXISTS (
           SELECT 1 FROM protected_allocations a WHERE a.payment_attempt_id=pa.id
         )
       ORDER BY pa.updated_at LIMIT $1`,
      [limit],
    );
    return result.rows.map((row: { id: string }) => row.id);
  }
}

export const settlementRepository = new SettlementRepository();
