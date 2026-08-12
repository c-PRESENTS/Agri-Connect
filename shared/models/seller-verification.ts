import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { users } from "./auth";

export const sellerEntityTypeSchema = z.enum([
  "individual",
  "sole_proprietor",
  "partnership",
  "company",
  "cooperative",
  "nonprofit",
]);

export const sellerVerificationStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "pending_review",
  "needs_information",
  "verified",
  "rejected",
  "expired",
  "suspended",
]);

export const sellerDocumentStatusSchema = z.enum([
  "awaiting_upload",
  "uploaded",
  "pending_review",
  "verified",
  "rejected",
  "expired",
]);

export const sellerBusinessProfiles = pgTable(
  "seller_business_profiles",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    country: varchar("country", { length: 2 }).notNull(),
    entityType: varchar("entity_type", { length: 40 }).notNull(),
    legalName: varchar("legal_name", { length: 200 }).notNull(),
    tradingName: varchar("trading_name", { length: 200 }),
    registrationNumber: varchar("registration_number", { length: 120 }),
    registeredAddress: jsonb("registered_address").notNull(),
    operatingAddress: jsonb("operating_address").notNull(),
    primaryActivities: jsonb("primary_activities").notNull().default(sql`'[]'::jsonb`),
    website: varchar("website", { length: 500 }),
    contactEmail: varchar("contact_email", { length: 320 }).notNull(),
    contactPhone: varchar("contact_phone", { length: 40 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("seller_business_profiles_seller_idx").on(table.sellerId)],
);

export const sellerVerificationCases = pgTable(
  "seller_verification_cases",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 40 }).notNull().default("not_started"),
    country: varchar("country", { length: 2 }).notNull(),
    entityType: varchar("entity_type", { length: 40 }).notNull(),
    requirementsVersion: varchar("requirements_version", { length: 40 }).notNull(),
    provider: varchar("provider", { length: 40 }).notNull().default("manual"),
    externalCaseId: varchar("external_case_id", { length: 255 }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewReason: text("review_reason"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("seller_verification_cases_seller_idx").on(table.sellerId),
    index("seller_verification_cases_queue_idx").on(table.status, table.submittedAt),
  ],
);

export const sellerTaxIdentifiers = pgTable(
  "seller_tax_identifiers",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    country: varchar("country", { length: 2 }).notNull(),
    type: varchar("type", { length: 40 }).notNull(),
    encryptedValue: text("encrypted_value").notNull(),
    valueHash: varchar("value_hash", { length: 64 }).notNull(),
    maskedValue: varchar("masked_value", { length: 80 }).notNull(),
    status: varchar("status", { length: 30 }).notNull().default("pending"),
    verificationSource: varchar("verification_source", { length: 80 }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("seller_tax_identifiers_seller_type_idx").on(table.sellerId, table.country, table.type),
    index("seller_tax_identifiers_hash_idx").on(table.valueHash),
  ],
);

export const sellerAssociatedPersons = pgTable(
  "seller_associated_persons",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    role: varchar("role", { length: 40 }).notNull(),
    ownershipPercent: real("ownership_percent"),
    country: varchar("country", { length: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("seller_associated_persons_seller_idx").on(table.sellerId)],
);

export const sellerVerificationDocuments = pgTable(
  "seller_verification_documents",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    caseId: varchar("case_id").notNull().references(() => sellerVerificationCases.id, { onDelete: "cascade" }),
    requirementCode: varchar("requirement_code", { length: 100 }).notNull(),
    documentType: varchar("document_type", { length: 80 }).notNull(),
    issuingCountry: varchar("issuing_country", { length: 2 }).notNull(),
    originalFileName: varchar("original_file_name", { length: 255 }).notNull(),
    contentType: varchar("content_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes"),
    storageKey: text("storage_key"),
    sha256: varchar("sha256", { length: 64 }),
    status: varchar("status", { length: 30 }).notNull().default("awaiting_upload"),
    rejectionReason: text("rejection_reason"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("seller_verification_documents_case_idx").on(table.caseId, table.status),
    index("seller_verification_documents_seller_idx").on(table.sellerId, table.createdAt),
  ],
);

export const sellerVerificationEvents = pgTable(
  "seller_verification_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    caseId: varchar("case_id").notNull().references(() => sellerVerificationCases.id, { onDelete: "cascade" }),
    actorId: varchar("actor_id").references(() => users.id, { onDelete: "set null" }),
    eventType: varchar("event_type", { length: 80 }).notNull(),
    eventData: jsonb("event_data").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("seller_verification_events_case_idx").on(table.caseId, table.createdAt)],
);

const addressSchema = z.object({
  line1: z.string().trim().min(2).max(200),
  line2: z.string().trim().max(200).optional().default(""),
  city: z.string().trim().min(1).max(120),
  region: z.string().trim().max(120).optional().default(""),
  postalCode: z.string().trim().min(2).max(30),
  country: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()),
});

export const sellerBusinessProfileInputSchema = z.object({
  country: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()),
  entityType: sellerEntityTypeSchema,
  legalName: z.string().trim().min(2).max(200),
  tradingName: z.string().trim().max(200).optional().default(""),
  registrationNumber: z.string().trim().max(120).optional().default(""),
  registeredAddress: addressSchema,
  operatingAddress: addressSchema,
  primaryActivities: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  website: z.string().url().max(500).optional().or(z.literal("")),
  contactEmail: z.string().email().max(320),
  contactPhone: z.string().trim().min(5).max(40),
});

export const sellerTaxIdentifierInputSchema = z.object({
  country: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()),
  type: z.string().trim().min(2).max(40),
  value: z.string().trim().min(4).max(80),
});

export const sellerAssociatedPersonInputSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  role: z.enum(["representative", "director", "partner", "beneficial_owner", "controller"]),
  ownershipPercent: z.number().min(0).max(100).optional(),
  country: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()),
});

export const sellerDocumentInputSchema = z.object({
  requirementCode: z.string().trim().min(2).max(100),
  documentType: z.string().trim().min(2).max(80),
  issuingCountry: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
  issuedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const sellerVerificationReviewSchema = z.object({
  decision: z.enum(["verified", "needs_information", "rejected", "suspended"]),
  reason: z.string().trim().min(3).max(2000),
  documentDecisions: z.array(z.object({
    documentId: z.string().min(1),
    status: z.enum(["verified", "rejected"]),
    reason: z.string().trim().max(1000).optional(),
  })).max(100).default([]),
});

export type SellerBusinessProfileInput = z.infer<typeof sellerBusinessProfileInputSchema>;
export type SellerVerificationStatus = z.infer<typeof sellerVerificationStatusSchema>;

export interface SellerVerificationCapability {
  canCreateDraftListings: boolean;
  canPublishListings: boolean;
  canSellRegulatedProducts: boolean;
  canAcceptCashOrders: boolean;
  canAcceptOnlinePayments: boolean;
  canReceivePayouts: boolean;
  canUseProtectedPayments: boolean;
}

export interface SellerVerificationRequirement {
  code: string;
  label: string;
  description: string;
  kind: "profile" | "tax_id" | "person" | "document" | "provider";
  required: boolean;
  acceptedDocumentTypes?: string[];
  condition?: string;
}
