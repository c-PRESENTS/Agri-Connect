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
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const shareCareListings = pgTable(
  "share_care_listings",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    donorId: varchar("donor_id").references(() => users.id, { onDelete: "set null" }),
    donorName: text("donor_name").notNull(),
    sourceType: varchar("source_type", { length: 30 }).notNull(),
    name: text("name").notNull(),
    category: varchar("category", { length: 80 }).notNull(),
    quantity: integer("quantity").notNull(),
    unit: varchar("unit", { length: 40 }).notNull(),
    isFree: boolean("is_free").notNull().default(true),
    priceMinor: integer("price_minor").notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("GBP"),
    location: text("location").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    emoji: varchar("emoji", { length: 20 }).notNull().default("🎁"),
    urgency: varchar("urgency", { length: 20 }).notNull().default("safe"),
    status: varchar("status", { length: 20 }).notNull().default("available"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    listingData: jsonb("listing_data").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("share_care_available_idx").on(table.status, table.isFree, table.expiresAt),
    index("share_care_donor_idx").on(table.donorId, table.createdAt),
  ],
);

export const shareCareReservations = pgTable(
  "share_care_reservations",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    listingId: varchar("listing_id")
      .notNull()
      .references(() => shareCareListings.id, { onDelete: "cascade" }),
    reserverId: varchar("reserver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("share_care_active_listing_reservation_idx").on(table.listingId),
    index("share_care_reserver_idx").on(table.reserverId, table.createdAt),
  ],
);

export type ShareCareListingRow = typeof shareCareListings.$inferSelect;
export type ShareCareReservationRow = typeof shareCareReservations.$inferSelect;
