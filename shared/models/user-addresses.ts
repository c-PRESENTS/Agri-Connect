import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { users } from "./auth";

export const userAddresses = pgTable(
  "user_addresses",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 60 }).notNull(),
    encryptedPayload: text("encrypted_payload").notNull(),
    encryptionKeyVersion: integer("encryption_key_version").notNull().default(1),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("user_addresses_user_updated_idx").on(table.userId, table.updatedAt),
    uniqueIndex("user_addresses_one_default_idx")
      .on(table.userId)
      .where(sql`${table.isDefault} = true`),
  ],
);

export const savedAddressDetailsSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(5).max(40),
  email: z.string().trim().email().max(254).optional(),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(120),
  county: z.string().trim().max(120).optional(),
  postcode: z.string().trim().min(1).max(20),
  country: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "Country must be an ISO-2 code")
    .transform((value) => value.toUpperCase()),
});

export const createSavedAddressSchema = savedAddressDetailsSchema.extend({
  label: z.string().trim().min(1).max(60),
  isDefault: z.boolean().optional(),
});

export const updateSavedAddressSchema = savedAddressDetailsSchema
  .extend({ label: z.string().trim().min(1).max(60) })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one address field is required");

export type SavedAddressDetails = z.infer<typeof savedAddressDetailsSchema>;
export type CreateSavedAddressInput = z.infer<typeof createSavedAddressSchema>;
export type UpdateSavedAddressInput = z.infer<typeof updateSavedAddressSchema>;

export interface SavedAddress extends SavedAddressDetails {
  id: string;
  label: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

