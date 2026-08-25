import { sql } from "drizzle-orm";
import {
  boolean,
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

export const categoryLifecycleStatusSchema = z.enum(["draft", "pending_review", "published", "archived"]);
export type CategoryLifecycleStatus = z.infer<typeof categoryLifecycleStatusSchema>;

export const catalogCategories = pgTable(
  "catalog_categories",
  {
    id: varchar("id", { length: 160 }).primaryKey().default(sql`gen_random_uuid()`),
    canonicalId: varchar("canonical_id", { length: 160 }).notNull(),
    parentId: varchar("parent_id", { length: 160 }).references((): AnyPgColumn => catalogCategories.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    icon: varchar("icon", { length: 80 }).notNull().default("Leaf"),
    imageUrl: text("image_url"),
    buyerVisible: boolean("buyer_visible").notNull().default(true),
    sellerOnly: boolean("seller_only").notNull().default(false),
    status: varchar("status", { length: 30 }).notNull().default("draft"),
    displayOrder: integer("display_order").notNull().default(0),
    translations: jsonb("translations").notNull().default(sql`'{}'::jsonb`),
    content: jsonb("content").notNull().default(sql`'{}'::jsonb`),
    publishedData: jsonb("published_data"),
    version: integer("version").notNull().default(1),
    createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
    reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    publishedBy: varchar("published_by").references(() => users.id, { onDelete: "set null" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("catalog_categories_slug_unique").on(table.slug),
    index("catalog_categories_parent_order_idx").on(table.parentId, table.displayOrder),
    index("catalog_categories_status_order_idx").on(table.status, table.displayOrder),
    index("catalog_categories_canonical_idx").on(table.canonicalId),
  ],
);

export const catalogCategoryEvents = pgTable(
  "catalog_category_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    categoryId: varchar("category_id", { length: 160 }).notNull().references(() => catalogCategories.id, { onDelete: "cascade" }),
    actorId: varchar("actor_id").references(() => users.id, { onDelete: "set null" }),
    eventType: varchar("event_type", { length: 50 }).notNull(),
    fromStatus: varchar("from_status", { length: 30 }),
    toStatus: varchar("to_status", { length: 30 }),
    reason: text("reason"),
    snapshot: jsonb("snapshot").notNull().default(sql`'{}'::jsonb`),
    version: integer("version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("catalog_category_events_category_idx").on(table.categoryId, table.createdAt)],
);

export const catalogCategoryVersions = pgTable(
  "catalog_category_versions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    categoryId: varchar("category_id", { length: 160 }).notNull().references(() => catalogCategories.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    lifecycleStatus: varchar("lifecycle_status", { length: 30 }).notNull(),
    data: jsonb("data").notNull(),
    createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("catalog_category_versions_category_version_unique").on(table.categoryId, table.version)],
);

export const catalogTaxonomyImports = pgTable("catalog_taxonomy_imports", {
  importKey: varchar("import_key", { length: 80 }).primaryKey(),
  rowCount: integer("row_count").notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow().notNull(),
});

const categoryNameSchema = z.string().trim().min(2).max(160);
const categorySlugSchema = z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const categoryImageSchema = z.string().trim().max(2_800_000).refine(
  (value) => value === "" || value.startsWith("/") || /^https:\/\//i.test(value) || /^data:image\/(?:png|jpeg|webp);base64,/i.test(value),
  "Use a local asset path, HTTPS image URL, or PNG/JPEG/WebP image up to 2 MB.",
);
const translationsSchema = z.record(z.string().min(2).max(16), z.object({ name: z.string().trim().min(1).max(160) })).default({});
const contentSchema = z.object({ description: z.string().trim().max(2000).optional() }).passthrough().default({});

export const createCatalogCategorySchema = z.object({
  parentId: z.string().trim().min(1).max(160).nullable().default(null),
  name: categoryNameSchema,
  slug: categorySlugSchema,
  icon: z.string().trim().min(1).max(80).default("Leaf"),
  imageUrl: categoryImageSchema.nullable().optional(),
  buyerVisible: z.boolean().default(true),
  sellerOnly: z.boolean().default(false),
  translations: translationsSchema,
  content: contentSchema,
});

export const updateCatalogCategorySchema = createCatalogCategorySchema.partial().extend({
  expectedVersion: z.number().int().positive(),
}).refine((value) => Object.keys(value).some((key) => key !== "expectedVersion"), "At least one category field is required.");

export const categoryTransitionSchema = z.object({
  expectedVersion: z.number().int().positive(),
  reason: z.string().trim().min(3).max(1000).optional(),
});

export const categoryReasonTransitionSchema = categoryTransitionSchema.extend({
  reason: z.string().trim().min(3).max(1000),
});

export const reorderCatalogCategoriesSchema = z.object({
  parentId: z.string().trim().min(1).max(160).nullable(),
  orderedIds: z.array(z.string().trim().min(1).max(160)).min(1).max(250),
  expectedVersions: z.record(z.string(), z.number().int().positive()),
}).superRefine((value, context) => {
  if (new Set(value.orderedIds).size !== value.orderedIds.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["orderedIds"], message: "Category order cannot contain duplicates." });
  }
  if (value.orderedIds.some((id) => value.expectedVersions[id] === undefined)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["expectedVersions"], message: "Every category must include its expected version." });
  }
});

export type CreateCatalogCategoryInput = z.infer<typeof createCatalogCategorySchema>;
export type UpdateCatalogCategoryInput = z.infer<typeof updateCatalogCategorySchema>;
export type CategoryTransitionInput = z.infer<typeof categoryTransitionSchema>;
export type ReorderCatalogCategoriesInput = z.infer<typeof reorderCatalogCategoriesSchema>;

export interface AdminCatalogCategory {
  id: string;
  canonicalId: string;
  parentId: string | null;
  name: string;
  slug: string;
  icon: string;
  imageUrl: string | null;
  buyerVisible: boolean;
  sellerOnly: boolean;
  status: CategoryLifecycleStatus;
  displayOrder: number;
  translations: Record<string, { name: string }>;
  content: Record<string, unknown>;
  version: number;
  referenceCount: number;
  childCount: number;
  createdBy: string | null;
  reviewedBy: string | null;
  publishedBy: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
