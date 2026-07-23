import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { commerceOrders } from "./commerce";
import { paymentAttempts, paymentRefunds } from "./payments";

export const sellerPaymentAccounts = pgTable(
  "seller_payment_accounts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sellerId: varchar("seller_id").notNull().references(() => users.id),
    provider: varchar("provider", { length: 20 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }),
    status: varchar("status", { length: 40 }).notNull(),
    country: varchar("country", { length: 2 }),
    currencies: jsonb("currencies").notNull().default(sql`'[]'::jsonb`),
    capabilities: jsonb("capabilities").notNull().default(sql`'{}'::jsonb`),
    kycVerifiedAt: timestamp("kyc_verified_at", { withTimezone: true }),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    suspensionReason: text("suspension_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("seller_payment_provider_idx").on(table.sellerId, table.provider)],
);

export const protectedAllocations = pgTable(
  "protected_allocations",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: varchar("order_id").notNull().references(() => commerceOrders.id),
    paymentAttemptId: varchar("payment_attempt_id").notNull().references(() => paymentAttempts.id),
    sellerId: varchar("seller_id").notNull().references(() => users.id),
    currency: varchar("currency", { length: 3 }).notNull(),
    grossMinor: bigint("gross_minor", { mode: "bigint" }).notNull(),
    platformFeeMinor: bigint("platform_fee_minor", { mode: "bigint" }).notNull(),
    sellerNetMinor: bigint("seller_net_minor", { mode: "bigint" }).notNull(),
    status: varchar("status", { length: 40 }).notNull(),
    deliveryVerifiedAt: timestamp("delivery_verified_at", { withTimezone: true }),
    releaseDueAt: timestamp("release_due_at", { withTimezone: true }),
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("protected_allocations_order_seller_idx").on(table.orderId, table.sellerId)],
);

export const sellerTransfers = pgTable("seller_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  allocationId: varchar("allocation_id").notNull().references(() => protectedAllocations.id),
  provider: varchar("provider", { length: 20 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
  status: varchar("status", { length: 40 }).notNull(),
  providerTransferId: varchar("provider_transfer_id", { length: 255 }),
  idempotencyReference: varchar("idempotency_reference", { length: 160 }).notNull(),
  failureCode: varchar("failure_code", { length: 120 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const paymentDisputes = pgTable("payment_disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => commerceOrders.id),
  allocationId: varchar("allocation_id").references(() => protectedAllocations.id),
  openedBy: varchar("opened_by").notNull().references(() => users.id),
  status: varchar("status", { length: 40 }).notNull(),
  reason: varchar("reason", { length: 120 }).notNull(),
  resolutionData: jsonb("resolution_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const disputeEvents = pgTable("dispute_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  disputeId: varchar("dispute_id").notNull().references(() => paymentDisputes.id, { onDelete: "cascade" }),
  actorId: varchar("actor_id").references(() => users.id),
  eventType: varchar("event_type", { length: 80 }).notNull(),
  eventData: jsonb("event_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const disputeEvidence = pgTable("dispute_evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  disputeId: varchar("dispute_id").notNull().references(() => paymentDisputes.id, { onDelete: "cascade" }),
  submittedBy: varchar("submitted_by").notNull().references(() => users.id),
  evidenceType: varchar("evidence_type", { length: 80 }).notNull(),
  storageReference: text("storage_reference").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const paymentProviderConfigs = pgTable("payment_provider_configs", {
  provider: varchar("provider", { length: 20 }).primaryKey(),
  mode: varchar("mode", { length: 20 }).notNull(),
  status: varchar("status", { length: 40 }).notNull(),
  platformCountry: varchar("platform_country", { length: 2 }),
  configuration: jsonb("configuration").notNull().default(sql`'{}'::jsonb`),
  approvalVerifiedAt: timestamp("approval_verified_at", { withTimezone: true }),
  webhookVerifiedAt: timestamp("webhook_verified_at", { withTimezone: true }),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  suspensionReason: text("suspension_reason"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const paymentProviderCapabilities = pgTable(
  "payment_provider_capabilities",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    provider: varchar("provider", { length: 20 }).notNull().references(() => paymentProviderConfigs.provider),
    maximumSellersPerCheckout: integer("maximum_sellers_per_checkout").notNull(),
    maximumAllocationsPerPayment: integer("maximum_allocations_per_payment").notNull(),
    supportsPartialSellerRefund: boolean("supports_partial_seller_refund").notNull(),
    supportsIndependentSellerRelease: boolean("supports_independent_seller_release").notNull(),
    supportsIdempotentPaymentCreation: boolean("supports_idempotent_payment_creation").notNull(),
    supportsLookupByMerchantReference: boolean("supports_lookup_by_merchant_reference").notNull(),
    source: varchar("source", { length: 40 }).notNull(),
    sourceReference: text("source_reference").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("provider_capabilities_current_idx").on(table.provider, table.expiresAt)],
);

export const paymentJobs = pgTable(
  "payment_jobs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    jobType: varchar("job_type", { length: 80 }).notNull(),
    aggregateId: varchar("aggregate_id").notNull(),
    status: varchar("status", { length: 30 }).notNull(),
    payload: jsonb("payload").notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(),
    leaseOwner: varchar("lease_owner", { length: 120 }),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("payment_jobs_claim_idx").on(table.status, table.availableAt, table.leaseExpiresAt)],
);

export const ledgerTransactions = pgTable("ledger_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referenceType: varchar("reference_type", { length: 60 }).notNull(),
  referenceId: varchar("reference_id").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ledgerEntries = pgTable("ledger_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").notNull().references(() => ledgerTransactions.id, { onDelete: "cascade" }),
  account: varchar("account", { length: 80 }).notNull(),
  direction: varchar("direction", { length: 10 }).notNull(),
  amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
  metadata: jsonb("metadata"),
});

export const reconciliationRuns = pgTable("reconciliation_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: varchar("provider", { length: 20 }).notNull(),
  status: varchar("status", { length: 30 }).notNull(),
  summary: jsonb("summary"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const operatorRecoveryCases = pgTable("operator_recovery_cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseType: varchar("case_type", { length: 80 }).notNull(),
  aggregateId: varchar("aggregate_id").notNull(),
  status: varchar("status", { length: 30 }).notNull(),
  details: jsonb("details").notNull(),
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const providerHealthEvents = pgTable("provider_health_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: varchar("provider", { length: 20 }).notNull(),
  evidenceSource: varchar("evidence_source", { length: 80 }).notNull(),
  trusted: boolean("trusted").notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PaymentJob = typeof paymentJobs.$inferSelect;
export type NewPaymentJob = typeof paymentJobs.$inferInsert;
