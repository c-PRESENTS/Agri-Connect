import { sql } from "drizzle-orm";
import {
  bigint,
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

export const checkoutQuotes = pgTable("checkout_quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  currency: varchar("currency", { length: 3 }).notNull(),
  subtotalMinor: bigint("subtotal_minor", { mode: "bigint" }).notNull(),
  taxMinor: bigint("tax_minor", { mode: "bigint" }).notNull(),
  shippingMinor: bigint("shipping_minor", { mode: "bigint" }).notNull(),
  platformFeeMinor: bigint("platform_fee_minor", { mode: "bigint" }).notNull(),
  totalMinor: bigint("total_minor", { mode: "bigint" }).notNull(),
  cartFingerprint: varchar("cart_fingerprint", { length: 128 }).notNull(),
  quoteData: jsonb("quote_data").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const checkoutIntents = pgTable(
  "checkout_intents",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    quoteId: varchar("quote_id").notNull().references(() => checkoutQuotes.id),
    orderId: varchar("order_id").references(() => commerceOrders.id),
    buyerId: varchar("buyer_id").notNull().references(() => users.id),
    provider: varchar("provider", { length: 20 }).notNull(),
    status: varchar("status", { length: 30 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("checkout_intents_buyer_idx").on(table.buyerId, table.createdAt)],
);

export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    checkoutIntentId: varchar("checkout_intent_id").references(() => checkoutIntents.id),
    orderId: varchar("order_id").notNull().references(() => commerceOrders.id),
    provider: varchar("provider", { length: 20 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    paymentStatus: varchar("payment_status", { length: 30 }).notNull(),
    providerCallStatus: varchar("provider_call_status", { length: 30 }).notNull(),
    reconciliationStatus: varchar("reconciliation_status", { length: 30 }).notNull(),
    idempotencyReference: varchar("idempotency_reference", { length: 160 }).notNull(),
    leaseOwner: varchar("lease_owner", { length: 120 }),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    attemptCount: integer("attempt_count").notNull().default(0),
    providerPaymentId: varchar("provider_payment_id", { length: 255 }),
    providerSessionId: varchar("provider_session_id", { length: 255 }),
    requestFingerprint: varchar("request_fingerprint", { length: 128 }).notNull(),
    responseFingerprint: varchar("response_fingerprint", { length: 128 }),
    failureCode: varchar("failure_code", { length: 120 }),
    version: integer("version").notNull().default(0),
    providerCalledAt: timestamp("provider_called_at", { withTimezone: true }),
    providerPersistedAt: timestamp("provider_persisted_at", { withTimezone: true }),
    reconciliationRequiredAt: timestamp("reconciliation_required_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("payment_attempts_idempotency_idx").on(table.provider, table.idempotencyReference),
    uniqueIndex("payment_attempts_provider_payment_idx").on(table.provider, table.providerPaymentId),
    index("payment_attempts_order_idx").on(table.orderId, table.createdAt),
    index("payment_attempts_reconciliation_idx").on(table.reconciliationStatus, table.leaseExpiresAt),
  ],
);

export const providerWebhookEvents = pgTable(
  "provider_webhook_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    provider: varchar("provider", { length: 20 }).notNull(),
    providerEventId: varchar("provider_event_id", { length: 255 }).notNull(),
    payloadHash: varchar("payload_hash", { length: 128 }).notNull(),
    eventType: varchar("event_type", { length: 160 }).notNull(),
    processingStatus: varchar("processing_status", { length: 30 }).notNull(),
    normalizedData: jsonb("normalized_data"),
    attemptCount: integer("attempt_count").notNull().default(0),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("provider_webhook_event_idx").on(table.provider, table.providerEventId)],
);

export const apiIdempotencyKeys = pgTable(
  "api_idempotency_keys",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    actorId: varchar("actor_id").notNull(),
    operation: varchar("operation", { length: 120 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
    requestHash: varchar("request_hash", { length: 128 }).notNull(),
    responseStatus: integer("response_status"),
    responseBody: jsonb("response_body"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("api_idempotency_actor_idx").on(table.actorId, table.operation, table.idempotencyKey)],
);

export const paymentRefunds = pgTable(
  "payment_refunds",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: varchar("order_id").notNull().references(() => commerceOrders.id),
    paymentAttemptId: varchar("payment_attempt_id").notNull().references(() => paymentAttempts.id),
    provider: varchar("provider", { length: 20 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    status: varchar("status", { length: 30 }).notNull(),
    providerRefundId: varchar("provider_refund_id", { length: 255 }),
    idempotencyReference: varchar("idempotency_reference", { length: 160 }).notNull(),
    scopeData: jsonb("scope_data"),
    failureCode: varchar("failure_code", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("payment_refunds_idempotency_idx").on(table.provider, table.idempotencyReference),
    uniqueIndex("payment_refunds_provider_idx").on(table.provider, table.providerRefundId),
  ],
);

export type PaymentAttempt = typeof paymentAttempts.$inferSelect;
export type NewPaymentAttempt = typeof paymentAttempts.$inferInsert;
