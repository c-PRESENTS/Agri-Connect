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

export const commerceProducts = pgTable(
  "commerce_products",
  {
    id: varchar("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    priceMinor: bigint("price_minor", { mode: "bigint" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("GBP"),
    unit: varchar("unit", { length: 40 }).notNull(),
    stock: integer("stock").notNull(),
    categoryId: varchar("category_id").notNull(),
    subcategoryId: varchar("subcategory_id").notNull(),
    farmerId: varchar("farmer_id").notNull(),
    productData: jsonb("product_data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("commerce_products_category_idx").on(table.categoryId, table.subcategoryId),
    index("commerce_products_farmer_idx").on(table.farmerId),
  ],
);

export const commerceCarts = pgTable(
  "commerce_carts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("commerce_carts_user_idx").on(table.userId)],
);

export const commerceCartItems = pgTable(
  "commerce_cart_items",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    cartId: varchar("cart_id")
      .notNull()
      .references(() => commerceCarts.id, { onDelete: "cascade" }),
    productId: varchar("product_id")
      .notNull()
      .references(() => commerceProducts.id),
    quantity: integer("quantity").notNull(),
    unitPriceMinor: bigint("unit_price_minor", { mode: "bigint" }),
    purchaseMode: varchar("purchase_mode", { length: 20 }),
    subFrequency: varchar("sub_frequency", { length: 20 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("commerce_cart_product_idx").on(table.cartId, table.productId)],
);

export const commerceOrders = pgTable(
  "commerce_orders",
  {
    id: varchar("id").primaryKey(),
    orderNumber: varchar("order_number", { length: 40 }).notNull().unique(),
    buyerId: varchar("buyer_id")
      .notNull()
      .references(() => users.id),
    status: varchar("status", { length: 40 }).notNull(),
    paymentMethod: varchar("payment_method", { length: 30 }).notNull(),
    paymentStatus: varchar("payment_status", { length: 30 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("GBP"),
    subtotalMinor: bigint("subtotal_minor", { mode: "bigint" }).notNull(),
    taxMinor: bigint("tax_minor", { mode: "bigint" }).notNull(),
    deliveryFeeMinor: bigint("delivery_fee_minor", { mode: "bigint" }).notNull(),
    shippingTotalMinor: bigint("shipping_total_minor", { mode: "bigint" }).notNull(),
    totalMinor: bigint("total_minor", { mode: "bigint" }).notNull(),
    orderData: jsonb("order_data").notNull(),
    stockRestored: boolean("stock_restored").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("commerce_orders_buyer_idx").on(table.buyerId, table.createdAt),
    index("commerce_orders_status_idx").on(table.status),
  ],
);

export const commerceOrderItems = pgTable(
  "commerce_order_items",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: varchar("order_id")
      .notNull()
      .references(() => commerceOrders.id, { onDelete: "cascade" }),
    productId: varchar("product_id").notNull(),
    sellerId: varchar("seller_id").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceMinor: bigint("unit_price_minor", { mode: "bigint" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    itemData: jsonb("item_data").notNull(),
  },
  (table) => [
    index("commerce_order_items_order_idx").on(table.orderId),
    index("commerce_order_items_seller_idx").on(table.sellerId),
  ],
);

export const commerceOrderStatusHistory = pgTable(
  "commerce_order_status_history",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: varchar("order_id")
      .notNull()
      .references(() => commerceOrders.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 40 }).notNull(),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("commerce_order_history_idx").on(table.orderId, table.occurredAt)],
);

export const inventoryReservations = pgTable(
  "inventory_reservations",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: varchar("order_id").references(() => commerceOrders.id, { onDelete: "cascade" }),
    productId: varchar("product_id")
      .notNull()
      .references(() => commerceProducts.id),
    buyerId: varchar("buyer_id").notNull(),
    quantity: integer("quantity").notNull(),
    status: varchar("status", { length: 30 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("inventory_reservations_product_idx").on(table.productId, table.status),
    index("inventory_reservations_expiry_idx").on(table.status, table.expiresAt),
  ],
);

export type CommerceProductRow = typeof commerceProducts.$inferSelect;
export type CommerceOrderRow = typeof commerceOrders.$inferSelect;
