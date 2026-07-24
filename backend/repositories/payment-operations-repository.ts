import { and, desc, eq, gt } from "drizzle-orm";
import { db, pool } from "../config/db";
import {
  ledgerEntries,
  ledgerTransactions,
  paymentJobs,
  paymentProviderCapabilities,
  paymentProviderConfigs,
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

  async addProviderCapabilities(
    input: typeof paymentProviderCapabilities.$inferInsert,
  ) {
    const [capabilities] = await db
      .insert(paymentProviderCapabilities)
      .values(input)
      .returning();
    return capabilities;
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
