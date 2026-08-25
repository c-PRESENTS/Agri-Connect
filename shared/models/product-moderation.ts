import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";
import { users } from "./auth";
import { commerceProducts } from "./commerce";

export const PRODUCT_MODERATION_STATUSES = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "changes_requested",
  "suspended",
  "removed",
] as const;

export const productModerationStatusSchema = z.enum(PRODUCT_MODERATION_STATUSES);
export type ProductModerationStatus = z.infer<typeof productModerationStatusSchema>;

export const productModerationEvents = pgTable(
  "product_moderation_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    productId: varchar("product_id").notNull().references(() => commerceProducts.id, { onDelete: "cascade" }),
    actorId: varchar("actor_id").references(() => users.id, { onDelete: "set null" }),
    eventType: varchar("event_type", { length: 40 }).notNull(),
    fromStatus: varchar("from_status", { length: 30 }),
    toStatus: varchar("to_status", { length: 30 }),
    reason: text("reason"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("product_moderation_events_product_idx").on(table.productId, table.createdAt)],
);

export const adminProductQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(120).optional(),
  status: productModerationStatusSchema.optional(),
  categoryId: z.string().trim().min(1).max(120).optional(),
  sellerId: z.string().trim().min(1).max(160).optional(),
  regionId: z.string().uuid().optional(),
  featured: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  freshPick: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  sort: z.enum(["updatedAt", "createdAt", "name", "price", "stock", "status"]).default("updatedAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

export const productModerationActionSchema = z.object({
  expectedUpdatedAt: z.string().datetime(),
  reason: z.string().trim().min(3).max(2000).optional(),
});

export const productModerationReasonActionSchema = productModerationActionSchema.extend({
  reason: z.string().trim().min(3).max(2000),
});

export const productPromotionActionSchema = z.object({
  expectedUpdatedAt: z.string().datetime(),
  enabled: z.boolean(),
});

export const sellerProductSubmitSchema = z.object({
  expectedUpdatedAt: z.string().datetime(),
});

export interface AdminProductSellerSummary {
  id: string;
  name: string;
  avatar: string | null;
  location: string | null;
  accountStatus: string;
  verificationStatus: string;
  isEligible: boolean;
}

export interface AdminProductListItem {
  id: string;
  name: string;
  image: string | null;
  categoryId: string;
  subcategoryId: string;
  price: number;
  currency: string;
  unit: string;
  stock: number;
  moderationStatus: ProductModerationStatus;
  moderationReason: string | null;
  isFeatured: boolean;
  isFreshPick: boolean;
  regionId: string | null;
  regionName: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  moderationVersion: number;
  seller: AdminProductSellerSummary;
}

export interface AdminProductsResponse {
  products: AdminProductListItem[];
  pagination: { page: number; pageSize: number; total: number; pageCount: number };
  generatedAt: string;
}

export interface ProductModerationHistoryItem {
  id: string;
  eventType: string;
  fromStatus: ProductModerationStatus | null;
  toStatus: ProductModerationStatus | null;
  reason: string | null;
  actorId: string | null;
  actorName: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AdminProductDetailResponse {
  product: AdminProductListItem & { description: string; images: string[]; isOrganic: boolean; rating: number; reviewCount: number };
  moderationHistory: ProductModerationHistoryItem[];
  generatedAt: string;
}
