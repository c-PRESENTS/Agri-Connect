import { and, eq, sql } from "drizzle-orm";
import { db, pool } from "../config/db";
import {
  apiIdempotencyKeys,
  checkoutQuotes,
  paymentAttempts,
  providerWebhookEvents,
  type NewPaymentAttempt,
  type PaymentAttempt,
} from "@shared/schema";
import type { ProviderCheckoutInput } from "../payments/types";
import { paymentRuntimeConfig } from "../payments/config";

export class PaymentRepository {
  async createQuote(input: typeof checkoutQuotes.$inferInsert) {
    const [quote] = await db.insert(checkoutQuotes).values(input).returning();
    return quote;
  }

  async getQuote(id: string) {
    const [quote] = await db.select().from(checkoutQuotes).where(eq(checkoutQuotes.id, id));
    return quote;
  }

  async createAttempt(input: NewPaymentAttempt): Promise<PaymentAttempt> {
    const [attempt] = await db.insert(paymentAttempts).values(input).returning();
    return attempt;
  }

  async getAttempt(id: string): Promise<PaymentAttempt | undefined> {
    const [attempt] = await db.select().from(paymentAttempts).where(eq(paymentAttempts.id, id));
    return attempt;
  }

  async getAttemptByIdempotency(
    provider: string,
    idempotencyReference: string,
  ): Promise<PaymentAttempt | undefined> {
    const [attempt] = await db
      .select()
      .from(paymentAttempts)
      .where(
        and(
          eq(paymentAttempts.provider, provider),
          eq(paymentAttempts.idempotencyReference, idempotencyReference),
        ),
      );
    return attempt;
  }

  async getAttemptByProviderPayment(
    provider: string,
    providerPaymentId: string,
  ): Promise<PaymentAttempt | undefined> {
    const [attempt] = await db
      .select()
      .from(paymentAttempts)
      .where(
        and(
          eq(paymentAttempts.provider, provider),
          eq(paymentAttempts.providerPaymentId, providerPaymentId),
        ),
      );
    return attempt;
  }

  async getAttemptByProviderSession(
    provider: string,
    providerSessionId: string,
  ): Promise<PaymentAttempt | undefined> {
    const [attempt] = await db
      .select()
      .from(paymentAttempts)
      .where(
        and(
          eq(paymentAttempts.provider, provider),
          eq(paymentAttempts.providerSessionId, providerSessionId),
        ),
      );
    return attempt;
  }

  async getSucceededAttemptByOrder(orderId: string): Promise<PaymentAttempt | undefined> {
    const [attempt] = await db
      .select()
      .from(paymentAttempts)
      .where(
        and(
          eq(paymentAttempts.orderId, orderId),
          eq(paymentAttempts.paymentStatus, "succeeded"),
        ),
      );
    return attempt;
  }

  async replaceProviderPaymentReference(
    id: string,
    providerPaymentId: string,
  ): Promise<PaymentAttempt | undefined> {
    const [attempt] = await db
      .update(paymentAttempts)
      .set({
        providerPaymentId,
        updatedAt: new Date(),
        version: sql`${paymentAttempts.version} + 1`,
      })
      .where(eq(paymentAttempts.id, id))
      .returning();
    return attempt;
  }

  async applyVerifiedPaymentStatus(
    id: string,
    status: "processing" | "succeeded" | "failed" | "cancelled",
  ): Promise<PaymentAttempt | undefined> {
    const [attempt] = await db
      .update(paymentAttempts)
      .set({
        paymentStatus: status === "cancelled" ? "cancelled" : status,
        reconciliationStatus: "resolved",
        updatedAt: new Date(),
        version: sql`${paymentAttempts.version} + 1`,
      })
      .where(
        and(
          eq(paymentAttempts.id, id),
          sql`(
            ${paymentAttempts.paymentStatus} = ${status}
            OR ${paymentAttempts.paymentStatus} IN ('created','processing','requires_action')
          )`,
        ),
      )
      .returning();
    return attempt;
  }

  async markAttemptRefunded(id: string): Promise<void> {
    await db
      .update(paymentAttempts)
      .set({
        paymentStatus: "refunded",
        updatedAt: new Date(),
        version: sql`${paymentAttempts.version} + 1`,
      })
      .where(
        and(
          eq(paymentAttempts.id, id),
          eq(paymentAttempts.paymentStatus, "succeeded"),
        ),
      );
  }

  /**
   * This transaction must commit before a caller performs network I/O.
   * The repository deliberately accepts no provider callback.
   */
  async markProviderCallStarted(
    id: string,
    leaseOwner: string,
    leaseExpiresAt: Date,
  ): Promise<PaymentAttempt | undefined> {
    return db.transaction(async (tx) => {
      const [attempt] = await tx
        .update(paymentAttempts)
        .set({
          providerCallStatus: "started",
          leaseOwner,
          leaseExpiresAt,
          attemptCount: sql`${paymentAttempts.attemptCount} + 1`,
          providerCalledAt: new Date(),
          updatedAt: new Date(),
          version: sql`${paymentAttempts.version} + 1`,
        })
        .where(
          and(
            eq(paymentAttempts.id, id),
            eq(paymentAttempts.providerCallStatus, "queued"),
          ),
        )
        .returning();
      return attempt;
    });
  }

  async persistProviderResult(
    id: string,
    input: {
      providerCallStatus: "completed" | "failed" | "outcome_unknown";
      paymentStatus?: PaymentAttempt["paymentStatus"];
      providerPaymentId?: string;
      providerSessionId?: string;
      responseFingerprint?: string;
      failureCode?: string;
    },
  ): Promise<PaymentAttempt | undefined> {
    const [attempt] = await db
      .update(paymentAttempts)
      .set({
        ...input,
        leaseOwner: null,
        leaseExpiresAt: null,
        providerPersistedAt: new Date(),
        updatedAt: new Date(),
        version: sql`${paymentAttempts.version} + 1`,
      })
      .where(eq(paymentAttempts.id, id))
      .returning();
    return attempt;
  }

  async markReconciliationPending(id: string): Promise<PaymentAttempt | undefined> {
    const [attempt] = await db
      .update(paymentAttempts)
      .set({
        reconciliationStatus: "pending",
        reconciliationRequiredAt: new Date(),
        updatedAt: new Date(),
        version: sql`${paymentAttempts.version} + 1`,
      })
      .where(eq(paymentAttempts.id, id))
      .returning();
    return attempt;
  }

  async getReconciliationCheckoutInput(
    attemptId: string,
  ): Promise<ProviderCheckoutInput | undefined> {
    const result = await pool.query(
      `SELECT pa.id AS attempt_id,pa.order_id,pa.idempotency_reference,
              pa.currency,pa.amount_minor,cq.platform_fee_minor,
              coi.seller_id,
              SUM(coi.unit_price_minor*coi.quantity)::bigint AS seller_subtotal_minor,
              spa.provider_account_id
       FROM payment_attempts pa
       JOIN checkout_intents ci ON ci.id=pa.checkout_intent_id
       JOIN checkout_quotes cq ON cq.id=ci.quote_id
       JOIN commerce_order_items coi ON coi.order_id=pa.order_id
       LEFT JOIN seller_payment_accounts spa
         ON spa.seller_id=coi.seller_id AND spa.provider=pa.provider
       WHERE pa.id=$1
       GROUP BY pa.id,pa.order_id,pa.idempotency_reference,pa.currency,
                pa.amount_minor,cq.platform_fee_minor,coi.seller_id,spa.provider_account_id
       ORDER BY coi.seller_id`,
      [attemptId],
    );
    if (!result.rows.length || !paymentRuntimeConfig.returnBaseUrl) return undefined;
    const first = result.rows[0] as {
      attempt_id: string;
      order_id: string;
      idempotency_reference: string;
      currency: "GBP" | "INR";
      amount_minor: string;
      platform_fee_minor: string;
    };
    const rows = result.rows as Array<{
      seller_id: string;
      seller_subtotal_minor: string;
      provider_account_id: string | null;
    }>;
    const subtotal = rows.reduce(
      (sum, row) => sum + BigInt(row.seller_subtotal_minor),
      BigInt(0),
    );
    if (subtotal <= BigInt(0)) return undefined;
    const total = BigInt(first.amount_minor);
    const totalFee = BigInt(first.platform_fee_minor);
    let allocated = BigInt(0);
    let allocatedFee = BigInt(0);
    const allocations = rows.map((row, index) => {
      const last = index === rows.length - 1;
      const amount = last
        ? total - allocated
        : (total * BigInt(row.seller_subtotal_minor)) / subtotal;
      const fee = last
        ? totalFee - allocatedFee
        : (totalFee * BigInt(row.seller_subtotal_minor)) / subtotal;
      allocated += amount;
      allocatedFee += fee;
      return {
        sellerId: row.seller_id,
        providerAccountId: row.provider_account_id ?? "",
        amount: { currency: first.currency, amountMinor: amount.toString() },
        platformFeeMinor: fee.toString(),
      };
    });
    return {
      attemptId: first.attempt_id,
      orderId: first.order_id,
      idempotencyReference: first.idempotency_reference,
      amount: { currency: first.currency, amountMinor: first.amount_minor },
      sellerIds: rows.map((row) => row.seller_id),
      allocationCount: rows.length,
      allocations,
      returnBaseUrl: paymentRuntimeConfig.returnBaseUrl,
    };
  }

  async cancelAttempt(id: string): Promise<PaymentAttempt | undefined> {
    const [attempt] = await db
      .update(paymentAttempts)
      .set({
        paymentStatus: "cancelled",
        providerCallStatus: "failed",
        updatedAt: new Date(),
        version: sql`${paymentAttempts.version} + 1`,
      })
      .where(
        and(
          eq(paymentAttempts.id, id),
          eq(paymentAttempts.paymentStatus, "created"),
          eq(paymentAttempts.providerCallStatus, "queued"),
        ),
      )
      .returning();
    return attempt;
  }

  async cancelExpiredProviderAttempt(id: string): Promise<PaymentAttempt | undefined> {
    const [attempt] = await db
      .update(paymentAttempts)
      .set({
        paymentStatus: "cancelled",
        reconciliationStatus: "resolved",
        updatedAt: new Date(),
        version: sql`${paymentAttempts.version} + 1`,
      })
      .where(
        and(
          eq(paymentAttempts.id, id),
          sql`${paymentAttempts.paymentStatus} IN ('created','processing','requires_action')`,
        ),
      )
      .returning();
    return attempt;
  }

  async recordWebhookEvent(
    input: typeof providerWebhookEvents.$inferInsert,
  ): Promise<"inserted" | "retry" | "duplicate" | "conflict"> {
    const inserted = await db
      .insert(providerWebhookEvents)
      .values(input)
      .onConflictDoNothing({
        target: [providerWebhookEvents.provider, providerWebhookEvents.providerEventId],
      })
      .returning({ id: providerWebhookEvents.id });
    if (inserted.length === 1) return "inserted";
    const [existing] = await db
      .select({
        processingStatus: providerWebhookEvents.processingStatus,
        payloadHash: providerWebhookEvents.payloadHash,
      })
      .from(providerWebhookEvents)
      .where(
        and(
          eq(providerWebhookEvents.provider, input.provider),
          eq(providerWebhookEvents.providerEventId, input.providerEventId),
        ),
      );
    if (existing && existing.payloadHash !== input.payloadHash) return "conflict";
    return existing && ["received", "pending_match"].includes(existing.processingStatus)
      ? "retry"
      : "duplicate";
  }

  async markWebhookEventProcessed(
    provider: string,
    providerEventId: string,
    processingStatus: "processed" | "pending_match" | "ignored",
  ): Promise<void> {
    await db
      .update(providerWebhookEvents)
      .set({
        processingStatus,
        processedAt: processingStatus === "pending_match" ? null : new Date(),
        attemptCount: sql`${providerWebhookEvents.attemptCount} + 1`,
      })
      .where(
        and(
          eq(providerWebhookEvents.provider, provider),
          eq(providerWebhookEvents.providerEventId, providerEventId),
        ),
      );
  }

  async reserveIdempotencyKey(
    input: typeof apiIdempotencyKeys.$inferInsert,
  ): Promise<typeof apiIdempotencyKeys.$inferSelect | undefined> {
    const inserted = await db
      .insert(apiIdempotencyKeys)
      .values(input)
      .onConflictDoNothing({
        target: [
          apiIdempotencyKeys.actorId,
          apiIdempotencyKeys.operation,
          apiIdempotencyKeys.idempotencyKey,
        ],
      })
      .returning();
    return inserted[0];
  }
}

export const paymentRepository = new PaymentRepository();
