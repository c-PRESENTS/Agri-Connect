import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";
import { users } from "./auth";

export const studentLevelSchema = z.enum(["UG", "PG", "PhD"]);
export const studentEnrolmentStatusSchema = z.enum(["active", "suspended", "completed", "withdrawn", "expired"]);
export const studentRequestStatusSchema = z.enum(["submitted", "in_review", "awaiting_student", "resolved", "closed"]);
export const studentSupportCategorySchema = z.enum([
  "Academic support",
  "Fees and funding",
  "IT and account access",
  "Library and research",
  "Wellbeing",
  "Accessibility",
  "Careers",
  "International student support",
]);

export const studentRegistry = pgTable("student_registry", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  institutionalEmail: varchar("institutional_email", { length: 320 }).notNull(),
  studentNumber: varchar("student_number", { length: 80 }).notNull(),
  studyLevel: text("study_level").notNull(),
  programme: text("programme").notNull(),
  department: text("department"),
  enrolmentStatus: text("enrolment_status").notNull().default("active"),
  accessExpiresAt: timestamp("access_expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("student_registry_email_unique").on(table.institutionalEmail),
  uniqueIndex("student_registry_number_unique").on(table.studentNumber),
]);

export const studentEntitlements = pgTable("student_entitlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  studentRegistryId: varchar("student_registry_id").notNull().references(() => studentRegistry.id, { onDelete: "cascade" }),
  verifiedAt: timestamp("verified_at").notNull(),
  verificationMethod: text("verification_method").notNull().default("email_confirmation"),
  lastVerifiedAt: timestamp("last_verified_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("student_entitlements_user_unique").on(table.userId),
  uniqueIndex("student_entitlements_registry_unique").on(table.studentRegistryId),
]);

export const studentLoginConfirmations = pgTable("student_login_confirmations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  studentRegistryId: varchar("student_registry_id").notNull().references(() => studentRegistry.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("student_login_confirmations_token_unique").on(table.tokenHash),
  index("student_login_confirmations_user_idx").on(table.userId),
]);

export const studentResources = pgTable("student_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  url: text("url").notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  studyLevels: text("study_levels").array().notNull(),
  published: boolean("published").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const studentSupportRequests = pgTable("student_support_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentUserId: varchar("student_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 80 }).notNull(),
  subject: varchar("subject", { length: 200 }).notNull(),
  description: text("description").notNull(),
  preferredContact: text("preferred_contact").notNull(),
  status: text("status").notNull().default("submitted"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
}, (table) => [index("student_support_requests_user_idx").on(table.studentUserId)]);

export const studentSupportRequestInputSchema = z.object({
  category: studentSupportCategorySchema,
  subject: z.string().trim().min(3).max(200),
  description: z.string().trim().min(20).max(5000),
  preferredContact: z.enum(["institutional_email", "platform"]),
  privacyAcknowledged: z.literal(true),
});

export type StudentRegistryRecord = typeof studentRegistry.$inferSelect;
export type StudentEntitlement = typeof studentEntitlements.$inferSelect;
export type StudentResource = typeof studentResources.$inferSelect;
export type StudentSupportRequest = typeof studentSupportRequests.$inferSelect;
export type StudentSupportRequestInput = z.infer<typeof studentSupportRequestInputSchema>;
