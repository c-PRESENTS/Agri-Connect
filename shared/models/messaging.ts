import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";
import { users } from "./auth";
import { commerceProducts } from "./commerce";

export const marketplaceConversations = pgTable(
  "marketplace_conversations",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    productId: varchar("product_id").notNull().references(() => commerceProducts.id, { onDelete: "cascade" }),
    buyerId: varchar("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("marketplace_conversation_parties_product_idx").on(table.productId, table.buyerId, table.sellerId),
    index("marketplace_conversation_buyer_idx").on(table.buyerId, table.lastMessageAt),
    index("marketplace_conversation_seller_idx").on(table.sellerId, table.lastMessageAt),
  ],
);

export const marketplaceConversationMessages = pgTable(
  "marketplace_conversation_messages",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    conversationId: varchar("conversation_id").notNull().references(() => marketplaceConversations.id, { onDelete: "cascade" }),
    senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }).defaultNow().notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("marketplace_messages_conversation_idx").on(table.conversationId, table.createdAt)],
);

export const createConversationSchema = z.object({ productId: z.string().trim().min(1).max(200) });
export const createConversationMessageSchema = z.object({
  content: z.string().trim().min(1, "Enter a message").max(2000, "Messages are limited to 2,000 characters"),
});

export interface MarketplaceConversationSummary {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  status: "active" | "closed";
  lastMessageAt: string;
  unreadCount: number;
  counterpart: { id: string; name: string; avatar: string; role: string };
  product: { id: string; name: string; image: string; price: number; currency: string; unit: string; stock: number };
}

export interface MarketplaceConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  deliveredAt: string;
  readAt: string | null;
  createdAt: string;
}

export interface MarketplaceConversationMessagesPage {
  messages: MarketplaceConversationMessage[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type MarketplaceConversationRow = typeof marketplaceConversations.$inferSelect;
export type MarketplaceConversationMessageRow = typeof marketplaceConversationMessages.$inferSelect;
