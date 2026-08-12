import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { users } from "./auth";
import { commerceProducts } from "./commerce";
import { organisations } from "./organisations";

export const marketRegionTypeSchema = z.enum(["country", "state", "province", "district", "county", "city", "locality", "zone"]);
export const regionalAssignmentStatusSchema = z.enum(["pending", "active", "rejected", "suspended", "expired"]);
export const opportunityStatusSchema = z.enum(["open", "claimed", "listing_submitted", "completed", "cancelled", "expired"]);

export const marketRegions = pgTable("market_regions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").references((): AnyPgColumn => marketRegions.id, { onDelete: "restrict" }),
  code: varchar("code", { length: 120 }).notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  countryCode: varchar("country_code", { length: 2 }).notNull(),
  type: varchar("type", { length: 30 }).notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  boundaryData: jsonb("boundary_data").notNull().default(sql`'{}'::jsonb`),
  dataVersion: varchar("data_version", { length: 40 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("market_regions_code_unique").on(table.code),
  index("market_regions_parent_idx").on(table.parentId, table.active),
  index("market_regions_country_type_idx").on(table.countryCode, table.type, table.active),
]);

export const organisationRegionAssignments = pgTable("organisation_region_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organisationId: varchar("organisation_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  regionId: varchar("region_id").notNull().references(() => marketRegions.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  canApproveSellers: boolean("can_approve_sellers").notNull().default(false),
  canApproveProducts: boolean("can_approve_products").notNull().default(false),
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
  effectiveAt: timestamp("effective_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("organisation_region_unique").on(table.organisationId, table.regionId),
  index("organisation_region_status_idx").on(table.regionId, table.status),
]);

export const sellerRegionAssignments = pgTable("seller_region_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organisationId: varchar("organisation_id").references(() => organisations.id, { onDelete: "set null" }),
  regionId: varchar("region_id").notNull().references(() => marketRegions.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  canPublish: boolean("can_publish").notNull().default(false),
  canFulfil: boolean("can_fulfil").notNull().default(false),
  requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  effectiveAt: timestamp("effective_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("seller_region_unique").on(table.sellerId, table.regionId),
  index("seller_region_status_idx").on(table.regionId, table.status),
  index("seller_region_seller_status_idx").on(table.sellerId, table.status),
]);

export const regionalCatalogTargets = pgTable("regional_catalog_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  regionId: varchar("region_id").notNull().references(() => marketRegions.id, { onDelete: "cascade" }),
  productKey: varchar("product_key", { length: 180 }).notNull(),
  productName: varchar("product_name", { length: 200 }).notNull(),
  categoryId: varchar("category_id", { length: 120 }).notNull(),
  subcategoryId: varchar("subcategory_id", { length: 120 }).notNull(),
  minimumActiveListings: integer("minimum_active_listings").notNull().default(1),
  active: boolean("active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("regional_catalog_target_unique").on(table.regionId, table.productKey),
  index("regional_catalog_target_active_idx").on(table.regionId, table.active),
]);

export const regionalProductOpportunities = pgTable("regional_product_opportunities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  targetId: varchar("target_id").notNull().references(() => regionalCatalogTargets.id, { onDelete: "cascade" }),
  regionId: varchar("region_id").notNull().references(() => marketRegions.id, { onDelete: "cascade" }),
  productKey: varchar("product_key", { length: 180 }).notNull(),
  productName: varchar("product_name", { length: 200 }).notNull(),
  categoryId: varchar("category_id", { length: 120 }).notNull(),
  subcategoryId: varchar("subcategory_id", { length: 120 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("open"),
  claimedBy: varchar("claimed_by").references(() => users.id, { onDelete: "set null" }),
  claimExpiresAt: timestamp("claim_expires_at", { withTimezone: true }),
  listingId: varchar("listing_id").references(() => commerceProducts.id, { onDelete: "set null" }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("regional_opportunity_region_status_idx").on(table.regionId, table.status),
  index("regional_opportunity_claim_expiry_idx").on(table.status, table.claimExpiresAt),
]);

export const marketplaceNotifications = pgTable("marketplace_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 80 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  actionUrl: varchar("action_url", { length: 500 }),
  data: jsonb("data").notNull().default(sql`'{}'::jsonb`),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("marketplace_notifications_user_idx").on(table.userId, table.readAt, table.createdAt)]);

export const regionInputSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  code: z.string().trim().min(2).max(120).regex(/^[A-Za-z0-9._:-]+$/),
  name: z.string().trim().min(2).max(180),
  countryCode: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()),
  type: marketRegionTypeSchema,
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

export const sellerRegionRequestSchema = z.object({
  regionId: z.string().uuid(),
  organisationId: z.string().uuid().nullable().optional(),
});

export const regionalAssignmentReviewSchema = z.object({
  status: z.enum(["active", "rejected", "suspended"]),
  reason: z.string().trim().min(3).max(1000),
  canPublish: z.boolean().default(true),
  canFulfil: z.boolean().default(true),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const regionalTargetInputSchema = z.object({
  regionId: z.string().uuid(),
  productName: z.string().trim().min(2).max(200),
  categoryId: z.string().trim().min(1).max(120),
  subcategoryId: z.string().trim().min(1).max(120),
  minimumActiveListings: z.number().int().min(1).max(100).default(1),
});

export const regionalOrganisationInputSchema = z.object({
  name: z.string().trim().min(2).max(200),
  officialEmail: z.string().email().max(320),
  managerEmail: z.string().email().max(320),
  regionId: z.string().uuid(),
});

export const opportunityCompleteSchema = z.object({ listingId: z.string().min(1) });

export type MarketRegion = typeof marketRegions.$inferSelect;
export type SellerRegionAssignment = typeof sellerRegionAssignments.$inferSelect;
export type RegionalProductOpportunity = typeof regionalProductOpportunities.$inferSelect;
