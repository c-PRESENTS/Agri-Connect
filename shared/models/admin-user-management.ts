import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";
import { users } from "./auth";

export const adminUserAccountStatusSchema = z.enum(["active", "suspended", "deactivated"]);
export const adminUserVerificationFilterSchema = z.enum([
  "not_verified",
  "not_started",
  "in_progress",
  "pending_review",
  "needs_information",
  "verified",
  "rejected",
  "expired",
  "suspended",
]);
export const adminUserNoteClassificationSchema = z.enum(["general", "support", "compliance", "risk"]);

export const adminUserNotes = pgTable(
  "admin_user_notes",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    subjectUserId: varchar("subject_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    authorUserId: varchar("author_user_id").references(() => users.id, { onDelete: "set null" }),
    classification: varchar("classification", { length: 30 }).notNull(),
    noteText: text("note_text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("admin_user_notes_subject_created_idx").on(table.subjectUserId, table.createdAt)],
);

export const adminUserMutationSchema = z.object({
  reason: z.string().trim().min(3).max(1_000),
  expectedUpdatedAt: z.string().datetime(),
});

export const adminUserNoteInputSchema = z.object({
  classification: adminUserNoteClassificationSchema,
  text: z.string().trim().min(3).max(4_000),
});

export const adminVerificationReviewInputSchema = z.object({
  decision: z.enum(["verified", "needs_information", "rejected", "suspended"]),
  reason: z.string().trim().min(3).max(2_000),
  expectedUpdatedAt: z.string().datetime(),
  documentDecisions: z.array(z.object({
    documentId: z.string().uuid(),
    status: z.enum(["verified", "rejected"]),
    reason: z.string().trim().max(1_000).optional(),
  })).max(100).default([]),
});

export type AdminUserAccountStatus = z.infer<typeof adminUserAccountStatusSchema>;
export type AdminUserVerificationFilter = z.infer<typeof adminUserVerificationFilterSchema>;
export type AdminUserNoteClassification = z.infer<typeof adminUserNoteClassificationSchema>;

export interface AdminUserListItem {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  accountType: string;
  sellerEnabled: boolean;
  accountStatus: AdminUserAccountStatus;
  verificationStatus: AdminUserVerificationFilter;
  country: string | null;
  region: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface AdminUsersResponse {
  users: AdminUserListItem[];
  pagination: { page: number; pageSize: number; total: number; pageCount: number };
  filters: {
    accountTypes: string[];
    accountStatuses: AdminUserAccountStatus[];
    verificationStatuses: AdminUserVerificationFilter[];
    countries: string[];
    regions: string[];
  };
  generatedAt: string;
}

export interface AdminUserDetailResponse {
  user: AdminUserListItem & {
    avatar: string | null;
    rating: number;
    reviewCount: number;
    profileComplete: boolean;
    accountStatusReason: string | null;
  };
  publicPreview: {
    displayName: string;
    avatar: string | null;
    location: string | null;
    isPubliclyVerified: boolean;
    isPubliclyDiscoverable: boolean;
  };
  seller: null | {
    legalName: string;
    tradingName: string | null;
    country: string;
    entityType: string;
    primaryActivities: string[];
    verificationCaseId: string | null;
    verificationStatus: string;
    verificationUpdatedAt: string | null;
    capabilities: Record<string, boolean>;
  };
  summary: {
    products: { total: number; published: number; draft: number; suspended: number };
    orders: { asBuyer: number; asSeller: number; valueByCurrency: Array<{ currency: string; amountMinor: string }> };
  };
  loginHistory: Array<{ id: string; outcome: string; method: string; failureCode: string | null; occurredAt: string }>;
  notes: Array<{ id: string; classification: AdminUserNoteClassification; text: string; authorName: string; createdAt: string; updatedAt: string }>;
  auditTimeline: Array<{ id: string; action: string; outcome: string; actorName: string; occurredAt: string }>;
  generatedAt: string;
}

export interface AdminVerificationQueueItem {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string | null;
  legalName: string;
  status: string;
  country: string;
  entityType: string;
  submittedAt: string | null;
  updatedAt: string;
  accountStatus: AdminUserAccountStatus;
}

export interface AdminVerificationQueueResponse {
  cases: AdminVerificationQueueItem[];
  pagination: { page: number; pageSize: number; total: number; pageCount: number };
  filters: { statuses: string[]; countries: string[]; entityTypes: string[] };
  generatedAt: string;
}

export interface AdminVerificationDetailResponse {
  case: {
    id: string;
    sellerId: string;
    status: string;
    country: string;
    entityType: string;
    requirementsVersion: string;
    provider: string;
    submittedAt: string | null;
    reviewedAt: string | null;
    reviewReason: string | null;
    expiresAt: string | null;
    updatedAt: string;
  };
  seller: {
    displayName: string;
    email: string | null;
    accountStatus: AdminUserAccountStatus;
    publicProfileUrl: string;
    isPubliclyVerified: boolean;
    isRegionallyEligible: boolean;
  };
  business: {
    legalName: string;
    tradingName: string | null;
    registrationNumberMasked: string | null;
    country: string;
    entityType: string;
    primaryActivities: string[];
    website: string | null;
    contactEmail: string;
    contactPhone: string;
  };
  identifiers: Array<{ id: string; country: string; type: string; maskedValue: string; status: string; verifiedAt: string | null }>;
  people: Array<{ id: string; fullName: string; role: string; ownershipPercent: number | null; country: string }>;
  documents: Array<{
    id: string;
    requirementCode: string;
    documentType: string;
    issuingCountry: string;
    originalFileName: string;
    contentType: string;
    sizeBytes: number | null;
    status: string;
    rejectionReason: string | null;
    issuedAt: string | null;
    expiresAt: string | null;
    uploadedAt: string | null;
    reviewedAt: string | null;
    viewUrl: string | null;
  }>;
  requirements: Array<{ code: string; label: string; description: string; kind: string; required: boolean; complete: boolean }>;
  events: Array<{ id: string; eventType: string; actorName: string; createdAt: string }>;
  generatedAt: string;
}
