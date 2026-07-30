import { and, desc, eq, gt, inArray, lte, or, isNull } from "drizzle-orm";
import { db, pool } from "../config/db";
import {
  ledgerEntries,
  ledgerTransactions,
  paymentJobs,
  paymentProviderCapabilities,
  paymentProviderConfigs,
  sellerCashPreferences,
  sellerPaymentAccounts,
  type NewPaymentJob,
  type PaymentJob,
} from "@shared/schema";

export interface LedgerEntryInput {
  account: string;
  direction: "debit" | "credit";
  amountMinor: bigint;
  metadata?: Record<string, unknown>;
}

export class PaymentOperationsRepository {
  async getSellerCashPreference(sellerId: string) {
    const [preference] = await db
      .select()
      .from(sellerCashPreferences)
      .where(eq(sellerCashPreferences.sellerId, sellerId));
    return preference;
  }

  async getSellerCashPreferences(sellerIds: string[]) {
    if (!sellerIds.length) return [];
    return db
      .select()
      .from(sellerCashPreferences)
      .where(inArray(sellerCashPreferences.sellerId, sellerIds));
  }

  async upsertSellerCashPreference(
    input: typeof sellerCashPreferences.$inferInsert,
  ) {
    const [preference] = await db
      .insert(sellerCashPreferences)
      .values(input)
      .onConflictDoUpdate({
        target: sellerCashPreferences.sellerId,
        set: {
          acceptsCashAtPickup: input.acceptsCashAtPickup,
          acceptsCashOnFarmerDelivery: input.acceptsCashOnFarmerDelivery,
          updatedAt: new Date(),
        },
      })
      .returning();
    return preference;
  }

  async listSellerPaymentAccounts(sellerId: string) {
    return db
      .select()
      .from(sellerPaymentAccounts)
      .where(eq(sellerPaymentAccounts.sellerId, sellerId));
  }

  async getSellerPaymentAccount(sellerId: string, provider: string) {
    const [account] = await db
      .select()
      .from(sellerPaymentAccounts)
      .where(
        and(
          eq(sellerPaymentAccounts.sellerId, sellerId),
          eq(sellerPaymentAccounts.provider, provider),
        ),
      );
    return account;
  }

  async upsertSellerPaymentAccount(
    input: typeof sellerPaymentAccounts.$inferInsert,
  ) {
    const [account] = await db
      .insert(sellerPaymentAccounts)
      .values(input)
      .onConflictDoUpdate({
        target: [sellerPaymentAccounts.sellerId, sellerPaymentAccounts.provider],
        set: { ...input, updatedAt: new Date() },
      })
      .returning();
    return account;
  }

  async listSellerAccountsDueForReview(at = new Date()) {
    return db
      .select()
      .from(sellerPaymentAccounts)
      .where(
        or(
          and(
            isNull(sellerPaymentAccounts.nextReviewAt),
            lte(sellerPaymentAccounts.updatedAt, new Date(at.getTime() - 24 * 60 * 60 * 1000)),
          ),
          lte(sellerPaymentAccounts.nextReviewAt, at),
          lte(sellerPaymentAccounts.expiresAt, at),
        ),
      );
  }

  async getSellerPaymentAccounts(provider: string, sellerIds: string[]) {
    if (!sellerIds.length) return [];
    return db
      .select()
      .from(sellerPaymentAccounts)
      .where(
        and(
          eq(sellerPaymentAccounts.provider, provider),
          inArray(sellerPaymentAccounts.sellerId, sellerIds),
        ),
      );
  }

  async upsertProviderConfig(
    input: typeof paymentProviderConfigs.$inferInsert,
  ): Promise<typeof paymentProviderConfigs.$inferSelect> {
    const [config] = await db
      .insert(paymentProviderConfigs)
      .values(input)
      .onConflictDoUpdate({
        target: paymentProviderConfigs.provider,
        set: { ...input, updatedAt: new Date() },
      })
      .returning();
    return config;
  }

  async getProviderConfig(provider: string) {
    const [config] = await db
      .select()
      .from(paymentProviderConfigs)
      .where(eq(paymentProviderConfigs.provider, provider));
    return config;
  }

  async listProviderConfigs() {
    return db.select().from(paymentProviderConfigs);
  }

  async suspendProvider(provider: string, reason: string): Promise<void> {
    await db
      .update(paymentProviderConfigs)
      .set({ status: "suspended", suspensionReason: reason, updatedAt: new Date() })
      .where(eq(paymentProviderConfigs.provider, provider));
  }

  async activateProvider(
    provider: string,
    status: "sandbox_ready" | "active",
  ): Promise<void> {
    await db
      .update(paymentProviderConfigs)
      .set({ status, suspensionReason: null, updatedAt: new Date() })
      .where(eq(paymentProviderConfigs.provider, provider));
  }

  async markWebhookVerified(provider: string, verifiedAt = new Date()): Promise<void> {
    await db
      .update(paymentProviderConfigs)
      .set({ webhookVerifiedAt: verifiedAt, updatedAt: new Date() })
      .where(eq(paymentProviderConfigs.provider, provider));
  }

  async getLastVerifiedWebhookAt(provider: string): Promise<Date | undefined> {
    const result = await pool.query(
      `SELECT MAX(received_at) AS received_at
       FROM provider_webhook_events
       WHERE provider=$1 AND processing_status IN ('processed','ignored','pending_match')`,
      [provider],
    );
    return result.rows[0]?.received_at ?? undefined;
  }

  async recordProviderHealthEvent(input: {
    provider: string;
    evidenceSource: string;
    trusted: boolean;
    eventType: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO provider_health_events
         (provider,evidence_source,trusted,event_type,details)
       VALUES ($1,$2,$3,$4,$5::jsonb)`,
      [
        input.provider,
        input.evidenceSource,
        input.trusted,
        input.eventType,
        JSON.stringify(input.details ?? {}),
      ],
    );
  }

  async countRecentTrustedFailures(provider: string, since: Date): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM provider_health_events
       WHERE provider=$1 AND trusted=true AND event_type IN
         ('provider_authentication_failed','registered_webhook_invalid','expected_event_delivery_gap')
         AND created_at >= $2`,
      [provider, since],
    );
    return result.rows[0]?.count ?? 0;
  }

  async createRecoveryCase(
    caseType: string,
    aggregateId: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO operator_recovery_cases (case_type,aggregate_id,status,details)
       SELECT $1,$2,'open',$3::jsonb
       WHERE NOT EXISTS (
         SELECT 1 FROM operator_recovery_cases
         WHERE case_type=$1 AND aggregate_id=$2 AND status IN ('open','acknowledged')
       )`,
      [caseType, aggregateId, JSON.stringify(details)],
    );
  }

  async runRetention(input: {
    webhookBefore: Date;
    idempotencyBefore: Date;
    operationalBefore: Date;
  }): Promise<Record<string, number>> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const webhooks = await client.query(
        `DELETE FROM provider_webhook_events
         WHERE received_at<$1 AND processing_status IN ('processed','ignored')`,
        [input.webhookBefore],
      );
      const idempotency = await client.query(
        `DELETE FROM api_idempotency_keys WHERE expires_at<$1`,
        [input.idempotencyBefore],
      );
      const health = await client.query(
        `DELETE FROM provider_health_events WHERE created_at<$1`,
        [input.operationalBefore],
      );
      const jobs = await client.query(
        `DELETE FROM payment_jobs
         WHERE updated_at<$1 AND status IN ('completed','cancelled','dead')`,
        [input.operationalBefore],
      );
      await client.query("COMMIT");
      return {
        webhooks: webhooks.rowCount ?? 0,
        idempotency: idempotency.rowCount ?? 0,
        health: health.rowCount ?? 0,
        jobs: jobs.rowCount ?? 0,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async addProviderCapabilities(
    input: typeof paymentProviderCapabilities.$inferInsert,
  ) {
    const [capabilities] = await db
      .insert(paymentProviderCapabilities)
      .values(input)
      .returning();
    return capabilities;
  }

  async configureProvider(
    configInput: typeof paymentProviderConfigs.$inferInsert,
    capabilitiesInput: Omit<typeof paymentProviderCapabilities.$inferInsert, "provider">,
  ): Promise<typeof paymentProviderConfigs.$inferSelect> {
    return db.transaction(async (tx) => {
      const [config] = await tx
        .insert(paymentProviderConfigs)
        .values(configInput)
        .onConflictDoUpdate({
          target: paymentProviderConfigs.provider,
          set: { ...configInput, updatedAt: new Date() },
        })
        .returning();
      await tx.insert(paymentProviderCapabilities).values({
        ...capabilitiesInput,
        provider: configInput.provider,
      });
      return config;
    });
  }

  async getCurrentProviderCapabilities(provider: string, at = new Date()) {
    const [capabilities] = await db
      .select()
      .from(paymentProviderCapabilities)
      .where(
        and(
          eq(paymentProviderCapabilities.provider, provider),
          gt(paymentProviderCapabilities.expiresAt, at),
        ),
      )
      .orderBy(desc(paymentProviderCapabilities.verifiedAt))
      .limit(1);
    return capabilities;
  }

  async enqueueJob(input: NewPaymentJob): Promise<PaymentJob> {
    const [job] = await db.insert(paymentJobs).values(input).returning();
    return job;
  }

  async claimJob(jobType: string, leaseOwner: string, leaseSeconds = 60): Promise<PaymentJob | undefined> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `WITH candidate AS (
           SELECT id FROM payment_jobs
           WHERE job_type=$1 AND status='queued' AND available_at<=now()
             AND (lease_expires_at IS NULL OR lease_expires_at<now())
           ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1
         )
         UPDATE payment_jobs j SET status='running', lease_owner=$2,
           lease_expires_at=now()+($3::text || ' seconds')::interval,
           attempt_count=j.attempt_count+1, updated_at=now()
         FROM candidate WHERE j.id=candidate.id RETURNING j.*`,
        [jobType, leaseOwner, leaseSeconds],
      );
      await client.query("COMMIT");
      return result.rows[0] as PaymentJob | undefined;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createBalancedLedgerTransaction(
    referenceType: string,
    referenceId: string,
    currency: "GBP" | "INR",
    entries: LedgerEntryInput[],
  ): Promise<string> {
    const debit = entries
      .filter((entry) => entry.direction === "debit")
      .reduce((sum, entry) => sum + entry.amountMinor, BigInt(0));
    const credit = entries
      .filter((entry) => entry.direction === "credit")
      .reduce((sum, entry) => sum + entry.amountMinor, BigInt(0));
    if (entries.length < 2 || debit !== credit) {
      throw new Error("Ledger transaction must contain balanced debit and credit entries");
    }

    return db.transaction(async (tx) => {
      const [transaction] = await tx
        .insert(ledgerTransactions)
        .values({ referenceType, referenceId, currency })
        .returning({ id: ledgerTransactions.id });
      await tx.insert(ledgerEntries).values(
        entries.map((entry) => ({
          transactionId: transaction.id,
          account: entry.account,
          direction: entry.direction,
          amountMinor: entry.amountMinor,
          metadata: entry.metadata,
        })),
      );
      return transaction.id;
    });
  }
}

export const paymentOperationsRepository = new PaymentOperationsRepository();
