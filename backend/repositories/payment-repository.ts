import { and, eq, sql } from "drizzle-orm";
import { db } from "../config/db";
import {
  apiIdempotencyKeys,
  checkoutQuotes,
  paymentAttempts,
  providerWebhookEvents,
  type NewPaymentAttempt,
  type PaymentAttempt,
} from "@shared/schema";

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
      .where(eq(paymentAttempts.id, id))
      .returning();
    return attempt;
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
        ),
      )
      .returning();
    return attempt;
  }

  async recordWebhookEvent(input: typeof providerWebhookEvents.$inferInsert): Promise<boolean> {
    const inserted = await db
      .insert(providerWebhookEvents)
      .values(input)
      .onConflictDoNothing({
        target: [providerWebhookEvents.provider, providerWebhookEvents.providerEventId],
      })
      .returning({ id: providerWebhookEvents.id });
    return inserted.length === 1;
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
